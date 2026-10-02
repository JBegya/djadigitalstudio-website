import { describe, expect, it } from 'vitest';
import { DEFAULT_SCENE_DURATION_SECONDS, sumSceneDurations } from '@/lib/storyboards/sceneDuration';

describe('sumSceneDurations', () => {
  it('sums explicit durations', () => {
    expect(sumSceneDurations([{ durationSeconds: 3 }, { durationSeconds: 4 }, { durationSeconds: 5 }])).toBe(12);
  });

  it('falls back to the default for a scene missing durationSeconds', () => {
    expect(sumSceneDurations([{ durationSeconds: 3 }, {}])).toBe(3 + DEFAULT_SCENE_DURATION_SECONDS);
  });

  it('returns 0 for an empty scene list', () => {
    expect(sumSceneDurations([])).toBe(0);
  });
});
