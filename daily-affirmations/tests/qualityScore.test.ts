import { describe, expect, it } from 'vitest';
import { computeQualityScore, weakestCategory } from '@/server/quality-engine/qualityScore';
import type { QualityCheckResult } from '@/server/quality-engine/qualityChecks';

function check(name: string, score: number, passed = true): QualityCheckResult {
  return { name, passed, message: '', severity: passed ? 'info' : 'error', score };
}

const ALL_PASS_CHECKS: QualityCheckResult[] = [
  check('Grammar & Spelling', 10),
  check('Emotional Tone', 9.6),
  check('Duplicate Check', 10),
  check('Subtitle Timing', 10),
  check('Audio Level', 9.8),
  check('Music Balance', 10),
  check('Video Quality', 10),
  check('Video Length', 9.6),
  check('Background Suitability', 10),
];

describe('computeQualityScore', () => {
  it('averages each category from its own named checks', () => {
    const score = computeQualityScore(ALL_PASS_CHECKS);
    expect(score.emotionalImpact).toBeCloseTo((10 + 9.6 + 10) / 3, 1);
    expect(score.captionReadability).toBe(10);
    expect(score.visualQuality).toBeCloseTo((9.8 + 10 + 10 + 9.6 + 10) / 5, 1);
  });

  it('overall is the average of the three category scores, not all checks flattened together', () => {
    const score = computeQualityScore(ALL_PASS_CHECKS);
    const expectedOverall = Math.round(((score.emotionalImpact + score.visualQuality + score.captionReadability) / 3) * 10) / 10;
    expect(score.overall).toBe(expectedOverall);
  });

  it('a genuinely good, all-passing video scores in the high 9s, matching the target band', () => {
    const score = computeQualityScore(ALL_PASS_CHECKS);
    expect(score.overall).toBeGreaterThanOrEqual(9);
  });

  it('missing checks for a category default to a neutral 10 rather than crashing or zeroing out', () => {
    const score = computeQualityScore([check('Grammar & Spelling', 8)]);
    expect(score.captionReadability).toBe(10);
    expect(score.visualQuality).toBe(10);
  });

  it('a hard failure in one check visibly drags its category down', () => {
    const withFailure = [...ALL_PASS_CHECKS.filter((c) => c.name !== 'Duplicate Check'), check('Duplicate Check', 1, false)];
    const score = computeQualityScore(withFailure);
    expect(score.emotionalImpact).toBeLessThan(computeQualityScore(ALL_PASS_CHECKS).emotionalImpact);
    expect(score.emotionalImpact).toBeLessThan(8);
  });
});

describe('weakestCategory', () => {
  it('picks the lowest-scoring of the three categories', () => {
    expect(weakestCategory({ emotionalImpact: 9.5, visualQuality: 7.2, captionReadability: 9.9, overall: 8.9 })).toBe('visualQuality');
    expect(weakestCategory({ emotionalImpact: 6.1, visualQuality: 9.5, captionReadability: 9.9, overall: 8.5 })).toBe('emotionalImpact');
    expect(weakestCategory({ emotionalImpact: 9.5, visualQuality: 9.9, captionReadability: 5.0, overall: 8.1 })).toBe('captionReadability');
  });
});
