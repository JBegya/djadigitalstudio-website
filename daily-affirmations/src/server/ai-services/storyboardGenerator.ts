import { getOpenAIClient, parseStructuredResponse } from './openaiClient';
import { retryWithBackoff } from '../utils/retry';
import { MODELS } from '../config/models';
import { isTestMode } from '../config/settings';
import { flagScenes } from '@/lib/storyboards/flagScenes';
import { DEFAULT_SCENE_DURATION_SECONDS } from '@/lib/storyboards/sceneDuration';
import type { CustomerPersona, DeviceKind, FeatureMarketingProfile, MarketingIdentity, Settings, StoryboardScene } from '@/types/domain';

export { flagScenes };

export interface StoryboardGenerationRequest {
  /** The pack's own already-chosen, already-approved hook (AdCreation.headline) — the Hook scene
   * builds on this, it never replaces it with an AI-invented opening line. */
  packHook: string;
  marketingIdentity: MarketingIdentity;
  feature: Pick<FeatureMarketingProfile, 'coreProblem' | 'corePromise' | 'painPoints' | 'benefits' | 'transformation' | 'supportingProof' | 'suggestedDevice'>;
  persona?: Pick<CustomerPersona, 'biggestProblems' | 'biggestFears' | 'desiredOutcomes' | 'emotionalTriggers' | 'preferredCommunicationStyle'>;
  objectiveLabel?: string;
}

export interface StoryboardGenerationResult {
  scenes: StoryboardScene[];
  source: 'openai' | 'mock';
  /** Computed once here for the immediate success toast; the Storyboards screen recomputes this
   * live afterward via the same flagScenes() so it stays correct across edits. */
  flaggedSceneNumbers: number[];
}

const MAX_SCENES = 12;

// Pacing default (seconds) per scene goal — every video engine needs timing, so every generated
// scene gets a sensible duration up front rather than leaving a future Video Generator to invent
// pacing. Matched by keyword against the scene's free-text goal (not exact equality), since the
// real branch's goals are AI-generated and won't always match Test Mode's canonical labels
// verbatim. Deterministic and app-assigned, not asked of the AI — pacing is a production concern,
// not a copy-creativity one.
const GOAL_DURATION_DEFAULTS: { keyword: string; seconds: number }[] = [
  { keyword: 'hook', seconds: 3 },
  { keyword: 'problem', seconds: 4 },
  { keyword: 'solution', seconds: 5 },
  { keyword: 'proof', seconds: 4 },
  { keyword: 'differentiator', seconds: 4 },
  { keyword: 'benefit', seconds: 4 },
  { keyword: 'cta', seconds: 3 },
  { keyword: 'call to action', seconds: 3 },
];

export function defaultDurationForGoal(goal: string): number {
  const normalized = goal.toLowerCase();
  for (const { keyword, seconds } of GOAL_DURATION_DEFAULTS) {
    if (normalized.includes(keyword)) return seconds;
  }
  return DEFAULT_SCENE_DURATION_SECONDS;
}

/**
 * Generates a fixed sequence of structured storyboard scenes FROM an existing Marketing Pack —
 * grounded in the same Marketing Intelligence the AI Copy Assistant reads, never inventing beyond
 * it. Both branches below run through the same flagScenes() rather than trusting either on its own.
 */
export async function generateStoryboardScenes(settings: Settings, request: StoryboardGenerationRequest): Promise<StoryboardGenerationResult> {
  const testMode = isTestMode(settings);
  const scenes = testMode ? buildMockScenes(request) : normalizeScenes(await callOpenAiForStoryboardScenes(settings.openaiApiKey, request));
  return { scenes, source: testMode ? 'mock' : 'openai', flaggedSceneNumbers: flagScenes(scenes, request.marketingIdentity.wordsWeAvoid) };
}

/**
 * Deterministic, network-free scenes for Test Mode — no Math.random/Date.now, so directly
 * assertable in tests. Every field is either a stored fact verbatim, an empty string when nothing
 * is stored, or a mechanical composition of two stored facts — never invented.
 */
export function buildMockScenes(request: StoryboardGenerationRequest): StoryboardScene[] {
  const { feature, persona, marketingIdentity: mi, packHook } = request;
  const device: DeviceKind | undefined = feature.suggestedDevice;
  const problemText = persona?.biggestProblems[0]?.trim() || feature.coreProblem.trim();
  const hasProof = Boolean(feature.supportingProof.trim());
  const proofText = hasProof ? feature.supportingProof.trim() : (feature.benefits[0]?.trim() ?? '');
  const hasTransformation = Boolean(feature.transformation.from.trim() || feature.transformation.to.trim());
  const differentiatorText = hasTransformation
    ? `From "${feature.transformation.from}" to "${feature.transformation.to}"`
    : (feature.benefits[hasProof ? 0 : 1]?.trim() ?? '');
  const cta = mi.callToAction.trim();

  const scenes: Omit<StoryboardScene, 'number'>[] = [
    {
      goal: 'Hook',
      visualDescription: 'Opening shot that visually sets up the hook — a relatable, everyday moment, no product UI yet.',
      onScreenText: packHook,
      voiceover: packHook,
    },
    {
      goal: 'Problem',
      visualDescription: 'Text card or lifestyle image depicting the problem — no product UI yet.',
      onScreenText: problemText,
      voiceover: problemText,
    },
    {
      goal: 'Solution',
      visualDescription: 'Device mockup demonstrating the feature that solves this.',
      onScreenText: feature.corePromise.trim(),
      voiceover: feature.corePromise.trim(),
      device,
    },
    {
      goal: hasProof ? 'Proof' : 'Benefit',
      visualDescription: hasProof ? 'Testimonial-style text card presenting the real, stored proof point.' : 'Benefit-focused text card.',
      onScreenText: proofText,
      voiceover: proofText,
    },
    {
      goal: hasTransformation ? 'Differentiator' : 'Benefit',
      visualDescription: 'Device mockup or text card highlighting what changes for the user.',
      onScreenText: differentiatorText,
      voiceover: differentiatorText,
      device,
    },
    {
      goal: 'Call to Action',
      visualDescription: 'Closing screen with the app icon/logo and a clear call-to-action.',
      onScreenText: cta,
      voiceover: cta,
      device,
      cta: cta || undefined,
    },
  ];
  return scenes.map((scene, i) => ({ number: i + 1, ...scene, durationSeconds: defaultDurationForGoal(scene.goal) }));
}

interface RawStoryboardScene {
  goal: string;
  visualDescription: string;
  onScreenText: string;
  voiceover: string;
  cta: string;
}

// Deliberately no minItems/maxItems — OpenAI's Responses API json_schema strict mode has known
// restrictions on array-length keywords (the reason the AI Copy Assistant's hook-suggestions
// schema uses 3 fixed named fields instead of an array). A plain unconstrained array has no such
// restriction, so a genuinely variable 5-8 scene count is safe here.
const STORYBOARD_SCENES_SCHEMA = {
  type: 'object',
  properties: {
    scenes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          goal: { type: 'string' },
          visualDescription: { type: 'string' },
          onScreenText: { type: 'string' },
          voiceover: { type: 'string' },
          // "" is the sentinel for "no CTA on this scene" — strict mode requires every property to
          // be listed as required, so this can't be a schema-optional field.
          cta: { type: 'string' },
        },
        required: ['goal', 'visualDescription', 'onScreenText', 'voiceover', 'cta'],
        additionalProperties: false,
      },
    },
  },
  required: ['scenes'],
  additionalProperties: false,
} as const;

async function callOpenAiForStoryboardScenes(apiKey: string, request: StoryboardGenerationRequest): Promise<RawStoryboardScene[]> {
  const client = getOpenAIClient(apiKey);
  const response = await retryWithBackoff(
    () =>
      client.responses.create({
        model: MODELS.copy,
        instructions: buildInstructions(request),
        input: 'Generate the storyboard scenes now, as instructed.',
        text: { format: { type: 'json_schema', name: 'storyboard_scenes', strict: true, schema: STORYBOARD_SCENES_SCHEMA } },
      }),
    { label: 'Storyboard Generator scenes' },
  );
  return parseStructuredResponse<{ scenes: RawStoryboardScene[] }>(response, 'storyboard scenes').scenes;
}

function normalizeScenes(raw: RawStoryboardScene[]): StoryboardScene[] {
  if (raw.length === 0) throw new Error('OpenAI returned a storyboard with no scenes.');
  if (raw.length > MAX_SCENES) throw new Error(`OpenAI returned an unreasonably long storyboard (${raw.length} scenes).`);
  return raw.map((scene, i) => {
    const goal = scene.goal.trim();
    return {
      number: i + 1,
      goal,
      visualDescription: scene.visualDescription.trim(),
      onScreenText: scene.onScreenText.trim(),
      voiceover: scene.voiceover.trim(),
      cta: scene.cta.trim() || undefined,
      durationSeconds: defaultDurationForGoal(goal),
    };
  });
}

function buildInstructions(request: StoryboardGenerationRequest): string {
  const { marketingIdentity: mi, feature, persona, objectiveLabel, packHook } = request;
  const lines = [
    'You are an ad storyboard writer creating a structured, scene-by-scene storyboard for a short mobile-app video advertisement.',
    'Produce 5 to 8 scenes forming ONE continuous narrative arc — typically Hook, Problem, Solution, Proof/Benefit, Differentiator/Benefit, Call to Action — though the exact count and labels may vary as long as the sequence reads as a coherent story.',
    'You may only rephrase, restructure, or re-emphasize the facts given below. Never invent a new claim, statistic, feature, screenshot, or testimonial not explicitly listed below. If nothing distinctive is listed for a section, keep that scene brief rather than adding invented substance.',
    'Do NOT describe or generate an actual image or video. `visualDescription` must describe WHAT the scene needs (e.g. "Device mockup of the shift clock-in screen", "Lifestyle photo of a nurse checking her phone", "Testimonial-style text card") — a human attaches the real screenshot afterward; you have no visual access to the actual images.',
    'Only the closing scene(s) should have a non-empty `cta`; leave `cta` as an empty string "" for every other scene.',
    `The FIRST scene must build directly on this exact, already-approved hook — do not replace it with a new opening line: "${packHook}"`,
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
  lines.push('', 'Return the scenes array now, in narrative order, as instructed.');
  return lines.filter((l): l is string => Boolean(l)).join('\n');
}
