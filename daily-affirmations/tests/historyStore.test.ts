import { describe, expect, it } from 'vitest';
import { findClosestMatch, pickBalancedTopics } from '@/server/history/historyStore';
import { normalizeForComparison } from '@/server/utils/textStats';
import { BRANDS, getBrand } from '@/server/config/brands';
import type { BrandTopic } from '@/types/domain';

function rec(text: string) {
  return { text, normalized: normalizeForComparison(text) };
}

function modeOf(brandId: 'nurse' | 'autism', topicKey: string): string | undefined {
  return getBrand(brandId).topics.find((t) => t.key === topicKey)?.mode;
}

describe('pickBalancedTopics', () => {
  it('with no history, picks distinct Content Modes (never clusters on one mode by chance)', () => {
    const picks = pickBalancedTopics(BRANDS.nurse, [], 3);
    expect(picks).toHaveLength(3);
    const modes = picks.map((key) => modeOf('nurse', key));
    expect(new Set(modes).size).toBe(3); // all 3 distinct modes, none repeated
  });

  it('prioritizes a Content Mode that has never appeared over ones used recently', () => {
    // Simulate 5 of the 6 nurse modes having each been used once recently, leaving "gratitude" untouched.
    const recentTopics: string[] = [];
    for (const mode of BRANDS.nurse.contentModes) {
      if (mode.key === 'gratitude') continue;
      const topic = BRANDS.nurse.topics.find((t) => t.mode === mode.key) as BrandTopic;
      recentTopics.push(topic.key);
    }
    const picks = pickBalancedTopics(BRANDS.nurse, recentTopics, 1);
    expect(modeOf('nurse', picks[0] as string)).toBe('gratitude');
  });

  it('respects an enabledModeKeys filter, never picking a disabled mode', () => {
    const enabled = ['burnout', 'gratitude'];
    const picks = pickBalancedTopics(BRANDS.nurse, [], 4, enabled);
    for (const key of picks) {
      expect(enabled).toContain(modeOf('nurse', key));
    }
  });

  it('falls back to all modes if every requested mode key is invalid/unknown (never leaves zero eligible modes)', () => {
    const picks = pickBalancedTopics(BRANDS.nurse, [], 2, ['not-a-real-mode']);
    expect(picks).toHaveLength(2);
    for (const key of picks) {
      expect(modeOf('nurse', key)).toBeDefined();
    }
  });

  it('avoids repeating the exact same angle as the most recent affirmations within a mode', () => {
    // Force every pick toward the "burnout" mode (only mode enabled) so we can check angle variety
    // — nurse burnout has 3 angles: running-empty, quiet-exhaustion, coming-back.
    const recentTopics = ['running-empty', 'quiet-exhaustion']; // two of the three angles just used
    for (let i = 0; i < 15; i++) {
      const [pick] = pickBalancedTopics(BRANDS.nurse, recentTopics, 1, ['burnout']);
      expect(pick).toBe('coming-back'); // the only angle not in the lookback window
    }
  });

  it('over many simulated rounds, distributes roughly evenly across all 6 modes (no starvation)', () => {
    let recentTopics: string[] = [];
    const modeCounts = new Map<string, number>();
    const ROUNDS = 60; // 60 rounds * 3 picks/round = 180 picks across 6 modes → ~30 each if balanced
    for (let round = 0; round < ROUNDS; round++) {
      const picks = pickBalancedTopics(BRANDS.nurse, recentTopics, 3);
      for (const key of picks) {
        const mode = modeOf('nurse', key) as string;
        modeCounts.set(mode, (modeCounts.get(mode) ?? 0) + 1);
      }
      recentTopics = [...recentTopics, ...picks].slice(-50);
    }
    expect(modeCounts.size).toBe(6); // every mode got picked at least once
    const counts = [...modeCounts.values()];
    expect(Math.min(...counts)).toBeGreaterThan(20); // no mode starved relative to the ~30 expected average
    expect(Math.max(...counts)).toBeLessThan(40); // no mode dominated either
  });

  it('backfills with repeated modes only when count exceeds the number of active modes', () => {
    const picks = pickBalancedTopics(BRANDS.nurse, [], 8, ['burnout', 'gratitude']);
    expect(picks).toHaveLength(8);
    for (const key of picks) {
      expect(['burnout', 'gratitude']).toContain(modeOf('nurse', key));
    }
  });

  it('never repeats an angle within a single batch when only one mode is enabled (unless the pool is smaller than the batch)', () => {
    // Nurse "burnout" has exactly 3 angles — a 3-video batch limited to one mode should use
    // all 3 distinct angles, not land on the same angle twice by chance.
    for (let i = 0; i < 20; i++) {
      const picks = pickBalancedTopics(BRANDS.nurse, [], 3, ['burnout']);
      expect(new Set(picks).size).toBe(3);
    }
  });

  it('only repeats an angle within a batch when the mode truly has fewer angles than requested', () => {
    // Nurse "gratitude" has exactly 2 angles — asking for 3 from it alone forces one repeat,
    // but the repeat should still cover both angles at least once rather than picking one 3x.
    for (let i = 0; i < 20; i++) {
      const picks = pickBalancedTopics(BRANDS.nurse, [], 3, ['gratitude']);
      expect(picks).toHaveLength(3);
      expect(new Set(picks).size).toBe(2);
    }
  });
});

describe('findClosestMatch (duplicate detection)', () => {
  it('flags an exact repeat as a duplicate with 100% similarity', () => {
    const text = 'You held the whole unit together tonight, and no one will ever know what that cost you.';
    const result = findClosestMatch(text, [rec(text)]);
    expect(result.duplicate).toBe(true);
    expect(result.closestSimilarity).toBe(1);
  });

  it('flags an exact repeat even with different casing/punctuation/whitespace (normalized match)', () => {
    const original = 'You held the whole unit together tonight, and no one will ever know what that cost you.';
    const reworded = '  YOU HELD the whole unit together tonight and no one will ever know what that cost you  ';
    const result = findClosestMatch(reworded, [rec(original)]);
    expect(result.duplicate).toBe(true);
  });

  it('flags a heavily reworded near-duplicate (same ideas, mostly the same words) as similar', () => {
    const original =
      'You held the whole unit together tonight, carrying every hard call so your patients never had to carry it alone.';
    const reworded =
      'You held the whole unit together tonight, carrying every hard call so your patients never had to feel it alone.';
    const result = findClosestMatch(reworded, [rec(original)]);
    expect(result.duplicate).toBe(true);
    expect(result.closestSimilarity).toBeGreaterThan(0.55);
  });

  it('does not flag two genuinely different affirmations as duplicates', () => {
    const a = 'The waiting room clock moved so slowly tonight, and you sat with her anyway, present for every minute.';
    const b = 'The coffee went cold on your desk again, but you still showed up steady for a family that needed you.';
    const result = findClosestMatch(b, [rec(a)]);
    expect(result.duplicate).toBe(false);
  });

  it('returns not-duplicate with zero similarity when there is no prior history at all', () => {
    const result = findClosestMatch('Anything at all.', []);
    expect(result.duplicate).toBe(false);
    expect(result.closestSimilarity).toBe(0);
    expect(result.matchedText).toBeUndefined();
  });

  it('reports the single closest match out of several candidates, not just the first/last', () => {
    const target = 'You carried the weight of a twelve hour shift and still had something gentle left for the last patient.';
    const farOff = 'The garden was quiet this morning and the coffee tasted like the first good thing all week.';
    const close = 'You carried the weight of a twelve hour shift and still had something soft left for the last patient.';
    const result = findClosestMatch(target, [rec(farOff), rec(close)]);
    expect(result.matchedText).toBe(close);
  });
});
