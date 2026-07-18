import type { BrandId, Settings } from '@/types/domain';
import { getBrand } from '@/server/config/brands';
import { MODELS } from '@/server/config/models';
import { createLogger } from '@/server/utils/logger';
import { retryWithBackoff } from '@/server/utils/retry';
import { containsEmoji, findBannedPhrase, hasRepetitiveSentenceOpenings, jaccardSimilarity, wordCount } from '@/server/utils/textStats';
import { getOpenAIClient, parseStructuredResponse } from './openaiClient';
import { generateMockAffirmation } from './scriptWriterMock';

const log = createLogger('scriptWriter');

export interface ScriptResult {
  text: string;
  topicKey: string;
  topicLabel: string;
  wordCount: number;
  source: 'openai' | 'mock';
  attempts: number;
}

export interface ScriptRequest {
  brand: BrandId;
  topicKey: string;
  settings: Settings;
  avoidExamples: string[];
}

// Widened from the old 38-74 to give the 5-part cinematic-monologue structure (recognition,
// validation, shared experience, comfort, hope) room to actually breathe instead of compressing
// all five beats into a single generic-affirmation-length script. Exported so qualityChecks.ts's
// tone check enforces the exact same bounds — see also the matching duration ceiling in
// orchestrator.ts and voiceGeneratorMock.ts, sized for this range at the app's 110-130wpm pace.
export const MIN_WORDS = 45;
export const MAX_WORDS = 85;
const MAX_CONTENT_ATTEMPTS = 4;

function validate(text: string, brand: BrandId, avoidExamples: string[]): string | null {
  const wc = wordCount(text);
  if (wc < MIN_WORDS || wc > MAX_WORDS) return `word count ${wc} outside ${MIN_WORDS}-${MAX_WORDS}`;
  if (containsEmoji(text)) return 'contains emoji';
  if (/["“”]/.test(text)) return 'contains quotation marks';
  const banned = findBannedPhrase(text, getBrand(brand).bannedPhrases);
  if (banned) return `contains banned phrase: "${banned}"`;
  if (hasRepetitiveSentenceOpenings(text)) return 'repetitive, list-like sentence openings (an AI-writing tell)';
  for (const example of avoidExamples) {
    if (jaccardSimilarity(text, example) >= 0.55) return 'too similar to a recent affirmation';
  }
  return null;
}

function buildPrompt(brand: BrandId, topicLabel: string, avoidExamples: string[]) {
  const brandDef = getBrand(brand);
  const system = [
    brandDef.systemPrompt,
    '',
    'Rules you must follow exactly:',
    ...brandDef.toneRules.map((r) => `- ${r}`),
    '- Structure: a powerful opening line, one to two sentences of emotional encouragement grounded in the topic, then a short, memorable closing sentence.',
    '- Length: between 40 and 70 words, spoken length (this will be read aloud in 15-30 seconds).',
    '- Never plagiarize or lightly reword a known quote, song lyric, or slogan.',
    `- Never use any of these words or phrases, or close paraphrases of them: ${brandDef.bannedPhrases.join(', ')}.`,
    'Respond with strict JSON matching the given schema. The "affirmation" field must contain only the affirmation itself — no title, no labels, no surrounding quotation marks.',
  ].join('\n');

  const avoidBlock =
    avoidExamples.length > 0
      ? `\n\nDo not repeat the ideas, phrasing, or structure of these recent affirmations:\n${avoidExamples.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
      : '';

  const user = `Write one new affirmation for the topic: "${topicLabel}". Audience: ${brandDef.audience.join(', ')}.${avoidBlock}`;

  return { system, user };
}

async function callOpenAI(brand: BrandId, topicLabel: string, settings: Settings, avoidExamples: string[]): Promise<string> {
  const client = getOpenAIClient(settings.openaiApiKey);
  const { system, user } = buildPrompt(brand, topicLabel, avoidExamples);

  const response = await client.responses.create({
    model: MODELS.script,
    instructions: system,
    input: user,
    // presence_penalty/frequency_penalty used to push the model toward fresher phrasing on
    // older chat-completions models, but the Responses API doesn't expose either knob at all —
    // reasoning-tier models (o-series, gpt-5.x) reject them outright ("Unsupported parameter").
    // Variety now comes entirely from the avoid-list in the prompt and the content-validation
    // retry loop below, which already has to catch repetitive phrasing regardless.
    text: {
      format: {
        type: 'json_schema',
        name: 'affirmation',
        strict: true,
        schema: {
          type: 'object',
          properties: { affirmation: { type: 'string' } },
          required: ['affirmation'],
          additionalProperties: false,
        },
      },
    },
  });

  const parsed = parseStructuredResponse<{ affirmation: string }>(response, `the ${brand} affirmation script`);
  return parsed.affirmation.trim().replace(/^["“]|["”]$/g, '');
}

export async function writeAffirmationScript(request: ScriptRequest): Promise<ScriptResult> {
  const { brand, topicKey, settings, avoidExamples } = request;
  const topicLabel = getBrand(brand).topics.find((t) => t.key === topicKey)?.label ?? topicKey;

  if (!settings.openaiApiKey) {
    const text = generateMockAffirmation(brand, topicKey);
    log.info(`Test Mode: generated mock script for ${brand}/${topicKey}`);
    return { text, topicKey, topicLabel, wordCount: wordCount(text), source: 'mock', attempts: 1 };
  }

  let lastRejectionReason: string | null = null;
  for (let attempt = 1; attempt <= MAX_CONTENT_ATTEMPTS; attempt++) {
    const extraAvoid = lastRejectionReason ? [...avoidExamples] : avoidExamples;
    const text = await retryWithBackoff(() => callOpenAI(brand, topicLabel, settings, extraAvoid), {
      label: `script writer (${brand}/${topicKey}, attempt ${attempt})`,
      retries: 3,
    });
    const rejection = validate(text, brand, avoidExamples);
    if (!rejection) {
      return { text, topicKey, topicLabel, wordCount: wordCount(text), source: 'openai', attempts: attempt };
    }
    lastRejectionReason = rejection;
    log.warn(`Rejected script for ${brand}/${topicKey} (attempt ${attempt}): ${rejection}`);
  }

  throw new Error(`Script writer could not produce a valid affirmation for ${brand}/${topicKey} after ${MAX_CONTENT_ATTEMPTS} attempts (last reason: ${lastRejectionReason})`);
}
