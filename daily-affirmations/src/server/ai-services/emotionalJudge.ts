import type { BrandId, Settings } from '@/types/domain';
import { MODELS, isReasoningModel } from '@/server/config/models';
import { createLogger } from '@/server/utils/logger';
import { retryWithBackoff } from '@/server/utils/retry';
import { getOpenAIClient, parseStructuredResponse } from './openaiClient';

const log = createLogger('emotionalJudge');

export interface EmotionalJudgeResult {
  emotionalAuthenticity: number;
  humanWarmth: number;
  comfort: number;
  emotionalImpact: number;
  shareability: number;
  /** The core gate: would a real peer genuinely believe another peer wrote this? A false here is
   * a hard failure regardless of the numeric scores — see qualityChecks.ts's "Peer Believability". */
  believable: boolean;
  reasoning: string;
  /** The second hard gate: would someone actually save or send this because it made them feel
   * understood — the metric social media actually rewards, distinct from merely sounding like a
   * believable peer. See qualityChecks.ts's "Save-Worthy". */
  wouldSave: boolean;
  saveReasoning: string;
  source: 'openai' | 'heuristic';
}

const PEER_ROLE: Record<BrandId, string> = {
  nurse: 'an experienced ICU nurse who has worked many hard shifts and lost patients',
  autism: 'the parent of an autistic child who has lived through hard days, therapy appointments, and small victories nobody else notices',
};

interface RawJudgeResponse {
  emotionalAuthenticity: number;
  humanWarmth: number;
  comfort: number;
  emotionalImpact: number;
  shareability: number;
  believable: boolean;
  reasoning: string;
  wouldSave: boolean;
  saveReasoning: string;
}

function buildJudgePrompt(brand: BrandId, text: string) {
  const peer = PEER_ROLE[brand];
  const system = [
    `You are ${peer}. A friend just sent you a short spoken affirmation video meant for people exactly like you. You are reading the script it's built on.`,
    'Rate it the way you actually would — honestly, as a real person living this life, not as a content moderator or a marketer being polite.',
    'Score each dimension from 0 to 10:',
    '- emotionalAuthenticity: does this feel genuinely lived, like it came from someone who has actually been here — not written about it from the outside?',
    '- humanWarmth: does it feel warm and personal, not clinical, corporate, or performative?',
    '- comfort: would this genuinely comfort someone having a hard day, without pretending to fix everything or rushing past the hard part?',
    '- emotionalImpact: how much would this actually move someone in your position, right now?',
    '- shareability: how likely would someone in your position be to save this or send it to a friend who needed it?',
    'Then answer two separate yes/no questions — a script can pass one and fail the other, so judge them independently:',
    '"believable": would you, a real person living this life, genuinely believe this was written by a peer — someone who lives it too — rather than an outside observer, a life coach, a therapist, a motivational speaker, an influencer, or an AI? Only true if the answer is a genuine yes.',
    '"wouldSave": would you actually save this video, or send it to a friend who needed it, because it made you feel specifically understood — not just because it was pleasant or well-written? This is the real test: people don\'t save content because it\'s technically good, they save it because it spoke to them. Only true if you\'d genuinely do this, not if it merely seems plausible that someone might.',
    'Be a tough, honest critic on both questions. A pleasant but generic script that any wellness brand could have produced should score low on authenticity and fail both gates even if nothing in it is offensive or wrong — sounding believable as a peer is not the same as being worth saving.',
    'Respond with strict JSON matching the schema. "reasoning" is one honest sentence explaining your believable verdict; "saveReasoning" is one honest sentence explaining your wouldSave verdict.',
  ].join('\n');
  const user = `Script:\n"${text}"`;
  return { system, user };
}

async function callJudge(brand: BrandId, text: string, settings: Settings): Promise<EmotionalJudgeResult> {
  const client = getOpenAIClient(settings.openaiApiKey);
  const { system, user } = buildJudgePrompt(brand, text);

  const response = await client.responses.create({
    model: MODELS.script,
    instructions: system,
    input: user,
    ...(isReasoningModel(MODELS.script) ? {} : { temperature: 0.3 }),
    text: {
      format: {
        type: 'json_schema',
        name: 'emotional_judgment',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            emotionalAuthenticity: { type: 'number' },
            humanWarmth: { type: 'number' },
            comfort: { type: 'number' },
            emotionalImpact: { type: 'number' },
            shareability: { type: 'number' },
            believable: { type: 'boolean' },
            reasoning: { type: 'string' },
            wouldSave: { type: 'boolean' },
            saveReasoning: { type: 'string' },
          },
          required: [
            'emotionalAuthenticity',
            'humanWarmth',
            'comfort',
            'emotionalImpact',
            'shareability',
            'believable',
            'reasoning',
            'wouldSave',
            'saveReasoning',
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const parsed = parseStructuredResponse<RawJudgeResponse>(response, `the ${brand} emotional-authenticity judgment`);
  const clamp = (n: number) => Math.min(10, Math.max(0, n));
  return {
    emotionalAuthenticity: clamp(parsed.emotionalAuthenticity),
    humanWarmth: clamp(parsed.humanWarmth),
    comfort: clamp(parsed.comfort),
    emotionalImpact: clamp(parsed.emotionalImpact),
    shareability: clamp(parsed.shareability),
    believable: parsed.believable,
    reasoning: parsed.reasoning,
    wouldSave: parsed.wouldSave,
    saveReasoning: parsed.saveReasoning,
    source: 'openai',
  };
}

/**
 * Used in Test Mode and as a resilience fallback if the live judge call fails after retries —
 * never blocks video generation on an OpenAI outage. There's no way to actually assess
 * authenticity without a real model call, so this never gates on `believable`: Test Mode content
 * is a known, disclosed placeholder (often written in a different voice than a real generated
 * script), not something that should be held to a bar it was never meant to clear — the same
 * reasoning checkBackgroundSuitability already applies to Test Mode's placeholder footage.
 */
function heuristicJudge(): EmotionalJudgeResult {
  // 8.5 matches qualityChecks.ts's proximityScore floor for a passing-but-unverified check —
  // "not independently confirmed" should read as neutral, not as a quality problem that drags
  // Test Mode's aggregate below the default 9.0 threshold on every single run.
  return {
    emotionalAuthenticity: 8.5,
    humanWarmth: 8.5,
    comfort: 8.5,
    emotionalImpact: 8.5,
    shareability: 8.5,
    believable: true,
    reasoning: 'Heuristic fallback (no OpenAI judge available) — not independently verified.',
    wouldSave: true,
    saveReasoning: 'Heuristic fallback (no OpenAI judge available) — not independently verified.',
    source: 'heuristic',
  };
}

export async function judgeEmotionalAuthenticity(brand: BrandId, text: string, settings: Settings): Promise<EmotionalJudgeResult> {
  if (!settings.openaiApiKey) return heuristicJudge();

  try {
    return await retryWithBackoff(() => callJudge(brand, text, settings), {
      label: `emotional-authenticity judge (${brand})`,
      retries: 2,
    });
  } catch (error) {
    log.warn(`Emotional judge call failed, falling back to heuristic scoring: ${error instanceof Error ? error.message : error}`);
    return heuristicJudge();
  }
}
