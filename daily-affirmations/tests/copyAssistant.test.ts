import { describe, expect, it } from 'vitest';
import { buildMockSuggestions, filterSuggestions, generateHookSuggestions, type HookSuggestionsRequest } from '@/server/ai-services/copyAssistant';
import { DEFAULT_FEATURE_MARKETING, DEFAULT_MARKETING_IDENTITY } from '@/types/domain';
import type { Settings } from '@/types/domain';

function sampleSettings(overrides: Partial<Settings> = {}): Settings {
  return { openaiApiKey: '', outputFolder: '/tmp/output', ...overrides };
}

function sampleRequest(overrides: Partial<HookSuggestionsRequest> = {}): HookSuggestionsRequest {
  return {
    currentHook: 'You finished at 11pm. You are back at 7am.',
    marketingIdentity: DEFAULT_MARKETING_IDENTITY,
    feature: DEFAULT_FEATURE_MARKETING,
    ...overrides,
  };
}

describe('generateHookSuggestions (Test Mode)', () => {
  it('returns mock suggestions and the "mock" source when no API key is configured', async () => {
    const result = await generateHookSuggestions(sampleSettings(), sampleRequest());
    expect(result.source).toBe('mock');
  });

  it('is deterministic — the same request produces the identical suggestion list twice', async () => {
    const request = sampleRequest({ feature: { ...DEFAULT_FEATURE_MARKETING, corePromise: 'Never lose a shift-change minute again.' } });
    const first = await generateHookSuggestions(sampleSettings(), request);
    const second = await generateHookSuggestions(sampleSettings(), request);
    expect(first).toEqual(second);
  });
});

describe('buildMockSuggestions', () => {
  it('never echoes the baseline hook back as one of its own suggestions', () => {
    const baseline = 'You finished at 11pm. You are back at 7am.';
    const suggestions = buildMockSuggestions(sampleRequest({ currentHook: baseline }));
    expect(suggestions).not.toContain(baseline);
  });

  it("foregrounds the feature's own stored core promise when one is set", () => {
    const suggestions = buildMockSuggestions(
      sampleRequest({ feature: { ...DEFAULT_FEATURE_MARKETING, corePromise: 'Every mistake caught before payday.' } }),
    );
    expect(suggestions).toContain('Every mistake caught before payday.');
  });

  it("quotes the targeted persona's top named problem back verbatim, since biggestProblems entries are stored as complete first-person sentences, not noun phrases", () => {
    const suggestions = buildMockSuggestions(
      sampleRequest({
        persona: {
          biggestProblems: ["I don't know if payroll paid me correctly."],
          biggestFears: [],
          desiredOutcomes: [],
          emotionalTriggers: [],
          preferredCommunicationStyle: '',
        },
      }),
    );
    expect(suggestions).toContain(`"I don't know if payroll paid me correctly" — not anymore.`);
  });

  it('produces nothing beyond the baseline reframe when no other grounding data is set', () => {
    const suggestions = buildMockSuggestions(sampleRequest());
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toContain('Sound familiar?');
  });
});

describe('filterSuggestions', () => {
  it('drops a candidate that normalizes identically to the baseline hook', () => {
    const kept = filterSuggestions(['You finished at 11pm. You are back at 7am.', 'A genuinely different headline.'], 'you finished at 11pm. you are back at 7am.', []);
    expect(kept).toEqual(['A genuinely different headline.']);
  });

  it('drops a candidate tripping a wordsWeAvoid entry', () => {
    const kept = filterSuggestions(['This is the cheapest option out there.', 'A clean, honest headline.'], 'baseline', ['cheapest']);
    expect(kept).toEqual(['A clean, honest headline.']);
  });

  it('drops exact duplicates against each other, keeping the first', () => {
    const kept = filterSuggestions(['Same headline.', 'same headline.', 'A different one.'], 'baseline', []);
    expect(kept).toEqual(['Same headline.', 'A different one.']);
  });

  it('drops blank/whitespace-only candidates', () => {
    const kept = filterSuggestions(['', '   ', 'A real headline.'], 'baseline', []);
    expect(kept).toEqual(['A real headline.']);
  });

  it('returns fewer than 3 (including zero) without padding when filtering removes some or all', () => {
    expect(filterSuggestions(['baseline'], 'baseline', [])).toEqual([]);
    expect(filterSuggestions(['baseline', 'One good one.'], 'baseline', [])).toEqual(['One good one.']);
  });
});
