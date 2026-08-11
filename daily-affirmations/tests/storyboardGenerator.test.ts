import { describe, expect, it } from 'vitest';
import { buildMockScenes, defaultDurationForGoal, flagScenes, generateStoryboardScenes, type StoryboardGenerationRequest } from '@/server/ai-services/storyboardGenerator';
import { DEFAULT_FEATURE_MARKETING, DEFAULT_MARKETING_IDENTITY } from '@/types/domain';
import type { Settings, StoryboardScene } from '@/types/domain';

function sampleSettings(overrides: Partial<Settings> = {}): Settings {
  return { openaiApiKey: '', outputFolder: '/tmp/output', ...overrides };
}

function sampleRequest(overrides: Partial<StoryboardGenerationRequest> = {}): StoryboardGenerationRequest {
  return {
    packHook: 'You finished at 11pm. You are back at 7am.',
    marketingIdentity: DEFAULT_MARKETING_IDENTITY,
    feature: DEFAULT_FEATURE_MARKETING,
    ...overrides,
  };
}

describe('generateStoryboardScenes (Test Mode)', () => {
  it('returns exactly 6 numbered scenes with the "mock" source when no API key is configured', async () => {
    const result = await generateStoryboardScenes(sampleSettings(), sampleRequest());
    expect(result.source).toBe('mock');
    expect(result.scenes.map((s) => s.number)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('is deterministic — the same request produces the identical scene list twice', async () => {
    const request = sampleRequest({ feature: { ...DEFAULT_FEATURE_MARKETING, corePromise: 'Never lose a shift-change minute again.' } });
    const first = await generateStoryboardScenes(sampleSettings(), request);
    const second = await generateStoryboardScenes(sampleSettings(), request);
    expect(first).toEqual(second);
  });
});

describe('buildMockScenes', () => {
  it("the Hook scene's on-screen text and voiceover equal the pack's own hook verbatim", () => {
    const packHook = 'You finished at 11pm. You are back at 7am.';
    const scenes = buildMockScenes(sampleRequest({ packHook }));
    expect(scenes[0]?.goal).toBe('Hook');
    expect(scenes[0]?.onScreenText).toBe(packHook);
    expect(scenes[0]?.voiceover).toBe(packHook);
  });

  it("the Problem scene prefers the persona's top named problem over the feature's stored core problem", () => {
    const scenes = buildMockScenes(
      sampleRequest({
        feature: { ...DEFAULT_FEATURE_MARKETING, coreProblem: 'Generic payroll confusion.' },
        persona: {
          biggestProblems: ["I don't know if payroll paid me correctly."],
          biggestFears: [],
          desiredOutcomes: [],
          emotionalTriggers: [],
          preferredCommunicationStyle: '',
        },
      }),
    );
    expect(scenes[1]?.goal).toBe('Problem');
    expect(scenes[1]?.onScreenText).toBe("I don't know if payroll paid me correctly.");
  });

  it("scene 4's goal is 'Benefit', not 'Proof', when no supportingProof is stored", () => {
    const scenes = buildMockScenes(sampleRequest({ feature: { ...DEFAULT_FEATURE_MARKETING, supportingProof: '' } }));
    expect(scenes[3]?.goal).toBe('Benefit');
  });

  it("scene 4's goal is 'Proof' when supportingProof is stored", () => {
    const scenes = buildMockScenes(sampleRequest({ feature: { ...DEFAULT_FEATURE_MARKETING, supportingProof: 'Used by 10,000 nurses.' } }));
    expect(scenes[3]?.goal).toBe('Proof');
    expect(scenes[3]?.onScreenText).toBe('Used by 10,000 nurses.');
  });

  it("a scene's device defaults from the feature's own suggestedDevice", () => {
    const scenes = buildMockScenes(sampleRequest({ feature: { ...DEFAULT_FEATURE_MARKETING, suggestedDevice: 'watch' } }));
    expect(scenes[2]?.device).toBe('watch');
  });

  it('every scene gets a per-goal default duration', () => {
    const scenes = buildMockScenes(sampleRequest());
    expect(scenes.map((s) => s.durationSeconds)).toEqual([3, 4, 5, 4, 4, 3]);
  });
});

describe('defaultDurationForGoal', () => {
  it('matches each canonical goal to its documented default', () => {
    expect(defaultDurationForGoal('Hook')).toBe(3);
    expect(defaultDurationForGoal('Problem')).toBe(4);
    expect(defaultDurationForGoal('Solution')).toBe(5);
    expect(defaultDurationForGoal('Proof')).toBe(4);
    expect(defaultDurationForGoal('Benefit')).toBe(4);
    expect(defaultDurationForGoal('Differentiator')).toBe(4);
    expect(defaultDurationForGoal('Call to Action')).toBe(3);
  });

  it('matches case-insensitively and by keyword, not exact equality — real AI-generated goal labels vary', () => {
    expect(defaultDurationForGoal('the hook')).toBe(3);
    expect(defaultDurationForGoal('CTA')).toBe(3);
    expect(defaultDurationForGoal('Social Proof')).toBe(4);
  });

  it('falls back to a sensible default for an unrecognized goal label', () => {
    expect(defaultDurationForGoal('Something Unexpected')).toBe(4);
  });
});

describe('flagScenes', () => {
  function sampleScene(overrides: Partial<StoryboardScene> = {}): StoryboardScene {
    return { number: 1, goal: 'Hook', visualDescription: '', onScreenText: '', voiceover: '', ...overrides };
  }

  it('flags the correct scene number when a wordsWeAvoid phrase appears in any text field', () => {
    const scenes = [
      sampleScene({ number: 1, onScreenText: 'A clean, honest opening.' }),
      sampleScene({ number: 2, voiceover: 'This is the cheapest option out there.' }),
    ];
    expect(flagScenes(scenes, ['cheapest'])).toEqual([2]);
  });

  it('checks visualDescription, onScreenText, voiceover, and cta', () => {
    expect(flagScenes([sampleScene({ visualDescription: 'cheapest deal ever' })], ['cheapest'])).toEqual([1]);
    expect(flagScenes([sampleScene({ cta: 'Get the cheapest plan' })], ['cheapest'])).toEqual([1]);
  });

  it('returns an empty array when nothing trips the list', () => {
    const scenes = [sampleScene({ onScreenText: 'A clean, honest opening.' })];
    expect(flagScenes(scenes, ['cheapest'])).toEqual([]);
  });

  it('returns an empty array immediately when wordsToAvoid itself is empty', () => {
    expect(flagScenes([sampleScene({ onScreenText: 'anything at all' })], [])).toEqual([]);
  });

  it('never mutates or drops content — the scenes array is untouched by flagging', () => {
    const scenes = [sampleScene({ number: 1 }), sampleScene({ number: 2, onScreenText: 'the cheapest deal' }), sampleScene({ number: 3 })];
    const before = JSON.parse(JSON.stringify(scenes));
    flagScenes(scenes, ['cheapest']);
    expect(scenes).toEqual(before);
    expect(scenes).toHaveLength(3);
  });
});
