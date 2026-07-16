import type { QualityScoreReport } from '@/types/domain';
import type { QualityCheckResult } from './qualityChecks';

export type { QualityScoreReport };

// Which named checks feed each headline score — see qualityChecks.ts for what each one measures.
const EMOTIONAL_IMPACT_CHECKS = ['Grammar & Spelling', 'Emotional Tone', 'Duplicate Check'];
const CAPTION_READABILITY_CHECKS = ['Subtitle Timing'];
const VISUAL_QUALITY_CHECKS = ['Audio Level', 'Music Balance', 'Video Quality', 'Video Length', 'Background Suitability'];

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function average(scores: number[]): number {
  if (scores.length === 0) return 10;
  return round1(scores.reduce((sum, s) => sum + s, 0) / scores.length);
}

/**
 * Rolls the individual pass/fail checks up into the three headline scores plus an overall —
 * "Emotional Impact 9.4/10", "Visual Quality 9.7/10", "Caption Readability 10/10" — shown per
 * video and used to decide whether a component needs regenerating (see qualityChecks.ts's
 * runQualityChecks, which applies the configured threshold to `overall`).
 */
export function computeQualityScore(checks: QualityCheckResult[]): QualityScoreReport {
  const byName = new Map(checks.map((c) => [c.name, c]));
  const scoreFor = (names: string[]) => average(names.map((name) => byName.get(name)?.score ?? 10));

  const emotionalImpact = scoreFor(EMOTIONAL_IMPACT_CHECKS);
  const visualQuality = scoreFor(VISUAL_QUALITY_CHECKS);
  const captionReadability = scoreFor(CAPTION_READABILITY_CHECKS);
  const overall = average([emotionalImpact, visualQuality, captionReadability]);

  return { emotionalImpact, visualQuality, captionReadability, overall };
}

export type QualityCategory = 'emotionalImpact' | 'visualQuality' | 'captionReadability';

/** The lowest-scoring category, for deciding what to regenerate when nothing hard-failed but the overall is still below threshold. */
export function weakestCategory(score: QualityScoreReport): QualityCategory {
  const entries: Array<[QualityCategory, number]> = [
    ['emotionalImpact', score.emotionalImpact],
    ['captionReadability', score.captionReadability],
    ['visualQuality', score.visualQuality],
  ];
  entries.sort((a, b) => a[1] - b[1]);
  return (entries[0] as [QualityCategory, number])[0];
}
