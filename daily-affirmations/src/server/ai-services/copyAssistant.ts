import { getOpenAIClient, parseStructuredResponse } from './openaiClient';
import { retryWithBackoff } from '../utils/retry';
import { MODELS } from '../config/models';
import { isTestMode } from '../config/settings';
import { findBannedPhrase, normalizeForComparison } from '../utils/textStats';
import type { CustomerPersona, FeatureMarketingProfile, MarketingIdentity, Settings } from '@/types/domain';

export interface HookSuggestionsRequest {
  currentHook: string;
  marketingIdentity: MarketingIdentity;
  feature: Pick<FeatureMarketingProfile, 'coreProblem' | 'corePromise' | 'painPoints' | 'benefits' | 'transformation' | 'supportingProof'>;
  persona?: Pick<CustomerPersona, 'biggestProblems' | 'biggestFears' | 'desiredOutcomes' | 'emotionalTriggers' | 'preferredCommunicationStyle'>;
  objectiveLabel?: string;
}

export interface HookSuggestionsResult {
  suggestions: string[];
  source: 'openai' | 'mock';
}

/**
 * Rewrites/varies one existing headline — the "AI Copy Assistant." Never generates from nothing:
 * every suggestion is grounded in Marketing Intelligence a person already authored, and both
 * branches below run through the same anti-fabrication filter rather than trusting either source
 * on its own.
 */
export async function generateHookSuggestions(settings: Settings, request: HookSuggestionsRequest): Promise<HookSuggestionsResult> {
  const wordsToAvoid = request.marketingIdentity.wordsWeAvoid;
  if (isTestMode(settings)) {
    return { suggestions: filterSuggestions(buildMockSuggestions(request), request.currentHook, wordsToAvoid), source: 'mock' };
  }
  const raw = await callOpenAiForHookSuggestions(settings.openaiApiKey, request);
  return {
    suggestions: filterSuggestions([raw.variationOne, raw.variationTwo, raw.variationThree], request.currentHook, wordsToAvoid),
    source: 'openai',
  };
}

/**
 * Deterministic, network-free variations for Test Mode — no Math.random/Date.now, so directly
 * assertable in tests. Each is a mechanical composition of facts already stored on the feature/
 * persona, never invented, matching the "never fabricate" rule even in the free mock path.
 */
export function buildMockSuggestions(request: HookSuggestionsRequest): string[] {
  const baseline = request.currentHook.trim();
  const candidates: string[] = [];

  if (baseline) candidates.push(`Sound familiar? "${baseline.replace(/[.?!]+$/, '')}"`);

  const corePromise = request.feature.corePromise.trim();
  if (corePromise) candidates.push(corePromise);

  // biggestProblems entries are stored as complete first-person sentences (e.g. "I don't know if
  // payroll paid me correctly."), not noun phrases — quoted back directly rather than spliced into
  // a template, since splicing a full sentence into "deal with X" reads as broken grammar.
  const topProblem = request.persona?.biggestProblems[0]?.trim();
  if (topProblem) candidates.push(`"${topProblem.replace(/[.?!]+$/, '')}" — not anymore.`);

  return candidates;
}

/**
 * Drops anything identical to the baseline hook (no point "suggesting" what's already there),
 * drops exact duplicates against each other, and drops anything tripping the brand's own
 * wordsWeAvoid list (reused from textStats.ts, not reimplemented). Deliberately does not retry the
 * caller's request if this leaves fewer than 3 — callers/UI handle 0-3 gracefully. Deliberately
 * does not run jaccardSimilarity dedup between survivors: all variations are intentionally
 * grounded in the same small set of stored facts, so shared vocabulary is expected, not a sign of
 * low-value near-duplicates the way it is for the much longer, free-form scripts jaccardSimilarity
 * was originally built to police.
 */
export function filterSuggestions(candidates: string[], baselineHook: string, wordsToAvoid: string[]): string[] {
  const baselineNormalized = normalizeForComparison(baselineHook);
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const raw of candidates) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const normalized = normalizeForComparison(trimmed);
    if (normalized === baselineNormalized || seen.has(normalized)) continue;
    if (findBannedPhrase(trimmed, wordsToAvoid)) continue;
    seen.add(normalized);
    kept.push(trimmed);
  }
  return kept;
}

interface RawHookSuggestions {
  variationOne: string;
  variationTwo: string;
  variationThree: string;
}

// Fixed named string fields, NOT a `variations: string[]` array with minItems/maxItems. OpenAI's
// Responses API json_schema strict mode has known restrictions on array-length keywords, so relying
// on them to guarantee "exactly 3 items" is unsafe. Three required named properties sidesteps it.
const HOOK_SUGGESTIONS_SCHEMA = {
  type: 'object',
  properties: {
    variationOne: { type: 'string' },
    variationTwo: { type: 'string' },
    variationThree: { type: 'string' },
  },
  required: ['variationOne', 'variationTwo', 'variationThree'],
  additionalProperties: false,
} as const;

async function callOpenAiForHookSuggestions(apiKey: string, request: HookSuggestionsRequest): Promise<RawHookSuggestions> {
  const client = getOpenAIClient(apiKey);
  const response = await retryWithBackoff(
    () =>
      client.responses.create({
        model: MODELS.copy,
        instructions: buildInstructions(request),
        input: 'Generate the 3 headline variations now, as instructed.',
        text: { format: { type: 'json_schema', name: 'hook_suggestions', strict: true, schema: HOOK_SUGGESTIONS_SCHEMA } },
      }),
    { label: 'AI Copy Assistant hook suggestions' },
  );
  return parseStructuredResponse<RawHookSuggestions>(response, 'hook suggestions');
}

function buildInstructions(request: HookSuggestionsRequest): string {
  const { marketingIdentity: mi, feature, persona, objectiveLabel } = request;
  const lines = [
    'You are an ad copywriter varying ONE existing headline for a mobile app advertisement.',
    'You may only rephrase, restructure, or re-emphasize the facts given below. Never invent a new claim, statistic, feature, screenshot, or testimonial that is not explicitly listed below. If nothing distinctive is listed for a section, vary tone/structure instead of adding substance.',
    '',
    mi.communicationStyle && `Brand voice: ${mi.communicationStyle}`,
    mi.brandPersonality.length > 0 && `Brand personality: ${mi.brandPersonality.join(', ')}`,
    mi.wordsWePrefer.length > 0 && `Prefer words like: ${mi.wordsWePrefer.join(', ')}`,
    mi.wordsWeAvoid.length > 0 && `Never use these words/phrases: ${mi.wordsWeAvoid.join(', ')}`,
    mi.styleGuardrails.length > 0 && `Style rules: ${mi.styleGuardrails.join('; ')}`,
    mi.coreMessage && `Core brand message: ${mi.coreMessage}`,
    mi.whyThisAppExists && `Why this app exists: ${mi.whyThisAppExists}`,
    mi.mission && `Mission: ${mi.mission}`,
    mi.corePromise && `Product core promise: ${mi.corePromise}`,
    '',
    feature.coreProblem && `The problem this feature solves: ${feature.coreProblem}`,
    feature.corePromise && `This feature's promise: ${feature.corePromise}`,
    feature.painPoints.length > 0 && `Pain points it addresses: ${feature.painPoints.join('; ')}`,
    feature.benefits.length > 0 && `Benefits: ${feature.benefits.join('; ')}`,
    (feature.transformation.from || feature.transformation.to) &&
      `Transformation: from "${feature.transformation.from}" to "${feature.transformation.to}"`,
    feature.supportingProof && `Supporting proof (real, already verified — reference it, never elaborate beyond it): ${feature.supportingProof}`,
  ];
  if (persona) {
    lines.push(
      '',
      persona.biggestProblems.length > 0 && `This ad targets someone whose biggest problems are: ${persona.biggestProblems.join('; ')}`,
      persona.biggestFears.length > 0 && `Their biggest fears: ${persona.biggestFears.join('; ')}`,
      persona.desiredOutcomes.length > 0 && `What they want instead: ${persona.desiredOutcomes.join('; ')}`,
      persona.emotionalTriggers.length > 0 && `Emotional triggers: ${persona.emotionalTriggers.join('; ')}`,
      persona.preferredCommunicationStyle && `Their preferred communication style: ${persona.preferredCommunicationStyle}`,
    );
  }
  if (objectiveLabel) lines.push('', `Campaign objective: ${objectiveLabel}`);
  lines.push(
    '',
    `Current headline to vary: "${request.currentHook}"`,
    'Produce exactly 3 alternate phrasings of this headline, each a short standalone headline of roughly the same length as the original — not a paragraph. Do not repeat the original verbatim. Do not number them or wrap them in quotation marks.',
  );
  return lines.filter((l): l is string => Boolean(l)).join('\n');
}
