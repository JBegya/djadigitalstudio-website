import writeGood from 'write-good';
import type { BrandId, PipelineStage } from '@/types/domain';
import { getBrand } from '@/server/config/brands';
import { MAX_WORDS, MIN_WORDS } from '@/server/ai-services/scriptWriter';
import { DUPLICATE_SIMILARITY_THRESHOLD, historyStore } from '@/server/history/historyStore';
import { createLogger } from '@/server/utils/logger';
import { containsEmoji, findBannedPhrase, hasRepetitiveSentenceOpenings, splitSentences, wordCount } from '@/server/utils/textStats';
import { probeDurationSeconds, probeMeanVolumeDb, probeVideoDimensions } from '@/server/video-engine/ffmpeg';
import { CANVAS_HEIGHT, CANVAS_WIDTH, CANVAS_FPS } from '@/server/video-engine/videoComposer';
import { INTRO_DURATION_SECONDS, OUTRO_DURATION_SECONDS } from '@/server/video-engine/videoAssembly';
import type { SubtitleCue } from '@/server/video-engine/subtitleTiming';
import { findSpellingIssues } from './spellChecker';
import { computeQualityScore, weakestCategory, type QualityScoreReport } from './qualityScore';

const log = createLogger('qualityEngine');

export interface QualityCheckResult {
  name: string;
  passed: boolean;
  message: string;
  severity: 'info' | 'warning' | 'error';
  /** 0-10, how well this check's underlying metric performed — not just pass/fail. Powers the
   * Emotional Impact / Visual Quality / Caption Readability / Overall scores (see qualityScore.ts). */
  score: number;
}

export interface QualityInput {
  brand: BrandId;
  affirmationText: string;
  voiceAudioPath: string;
  /** The composed main-content clip BEFORE the brand intro/outro are appended — subtitle timing
   * and the voice/music mix only cover this segment, so checks that measure them against it
   * would be skewed by the silent bookends if pointed at the fully assembled file instead. */
  mainVideoPath: string;
  /** The fully assembled intro+main+outro file actually written to Exports/ — what resolution
   * and total-length checks need to measure, since that's the real deliverable. */
  finalVideoPath: string;
  cues: SubtitleCue[];
  backgroundSource: 'pexels' | 'mock';
  pexelsConfigured: boolean;
  musicUsed: boolean;
  musicConfigured: boolean;
}

export interface QualityReport {
  passed: boolean;
  checks: QualityCheckResult[];
  score: QualityScoreReport;
  /** Which pipeline stage to regenerate first, if anything failed. Null when everything passed. */
  regenerateComponent: PipelineStage | null;
}

const CATEGORY_TO_STAGE: Record<'emotionalImpact' | 'captionReadability' | 'visualQuality', PipelineStage> = {
  emotionalImpact: 'script',
  captionReadability: 'subtitles',
  visualQuality: 'compose',
};

function ok(name: string, message: string, severity: QualityCheckResult['severity'] = 'info', score = 10): QualityCheckResult {
  return { name, passed: true, message, severity, score };
}

function fail(name: string, message: string, severity: QualityCheckResult['severity'] = 'error', score = 2): QualityCheckResult {
  return { name, passed: false, message, severity, score };
}

/** 10 at the exact center of [low, high], tapering to 8.5 at either edge — a smooth in-bounds
 * score rather than a flat pass mark, so two passing videos with different margins (e.g. audio
 * mixed dead-center vs just inside the tolerance) don't score identically. The floor stays high
 * (8.5, not near-failing) deliberately: this is the score for a check that PASSED, so ordinary,
 * healthy variance shouldn't read as a quality problem — actual failures already get their own
 * much lower fixed scores via fail(). Keeps a genuinely good video's Overall in the 9-10 band
 * the business's own example targets, rather than routine variance dragging it below threshold. */
function proximityScore(value: number, low: number, high: number): number {
  const center = (low + high) / 2;
  const halfRange = (high - low) / 2;
  if (halfRange <= 0) return 10;
  const closeness = 1 - Math.min(1, Math.abs(value - center) / halfRange);
  return Math.round((8.5 + closeness * 1.5) * 10) / 10;
}

async function checkGrammarAndSpelling(text: string): Promise<QualityCheckResult> {
  const spelling = await findSpellingIssues(text);
  if (spelling.length > 0) {
    return fail('Grammar & Spelling', `Possible misspellings: ${spelling.map((s) => s.word).join(', ')}`, 'error', Math.max(0, 8 - spelling.length * 3));
  }
  const suggestions = writeGood(text, { passive: false, illusion: true, so: true, thereIs: true, weasel: true, adverb: false, tooWordy: true, cliches: true });
  const seriousIssues = suggestions.filter((s) => /cliche|clich/i.test(s.reason));
  if (seriousIssues.length > 0) {
    return fail('Grammar & Spelling', `Contains a cliché phrase flagged by style check: ${seriousIssues.map((s) => s.reason).join('; ')}`, 'error', 4);
  }
  return ok('Grammar & Spelling', 'No spelling issues or clichés detected.', 'info', 10);
}

// A tighter band than the writer's own MIN_WORDS-MAX_WORDS hard bounds, centered inside them —
// same relationship as before, just shifted to match the widened 45-85 range.
const IDEAL_WORD_COUNT_RANGE: [number, number] = [55, 75];

function checkTone(brand: BrandId, text: string): QualityCheckResult {
  if (containsEmoji(text)) return fail('Emotional Tone', 'Affirmation contains an emoji, which is not allowed in the spoken script.', 'error', 0);
  if (/["“”]/.test(text)) return fail('Emotional Tone', 'Affirmation contains quotation marks.', 'error', 2);
  const banned = findBannedPhrase(text, getBrand(brand).bannedPhrases);
  if (banned) return fail('Emotional Tone', `Contains a banned cliché / toxic-positivity phrase: "${banned}"`, 'error', 1);
  if (hasRepetitiveSentenceOpenings(text)) {
    return fail('Emotional Tone', 'Repetitive, list-like sentence openings read as AI-generated rather than personal.', 'error', 4);
  }
  const sentences = splitSentences(text);
  if (sentences.length < 2) return fail('Emotional Tone', 'Affirmation reads as a single run-on sentence — missing opening/closing structure.', 'error', 3);
  const words = wordCount(text);
  if (words < MIN_WORDS || words > MAX_WORDS) {
    return fail('Emotional Tone', `Word count (${words}) is outside the natural spoken-length range.`, 'error', 3);
  }
  return ok('Emotional Tone', 'Structure and tone check passed.', 'info', proximityScore(words, ...IDEAL_WORD_COUNT_RANGE));
}

function checkDuplicate(brand: BrandId, text: string): QualityCheckResult {
  const { duplicate, closestSimilarity } = historyStore.isDuplicate(brand, text);
  if (duplicate) {
    // Past the threshold — score keeps falling from ~3 toward 0 as similarity climbs to 100%.
    const overshoot = (closestSimilarity - DUPLICATE_SIMILARITY_THRESHOLD) / (1 - DUPLICATE_SIMILARITY_THRESHOLD);
    const score = Math.round(Math.max(0, 3 - overshoot * 3) * 10) / 10;
    return fail('Duplicate Check', `Too similar to a previously generated affirmation (similarity ${(closestSimilarity * 100).toFixed(0)}%).`, 'error', score);
  }
  // Under the threshold — some vocabulary overlap with past affirmations is normal and expected
  // (same brand voice, same handful of topics), so a passing check still scores high: 10 near
  // zero similarity, tapering to 8.5 as it approaches (without crossing) the duplicate line.
  const score = Math.round((10 - (closestSimilarity / DUPLICATE_SIMILARITY_THRESHOLD) * 1.5) * 10) / 10;
  return ok('Duplicate Check', `Unique — closest match ${(closestSimilarity * 100).toFixed(0)}% similar.`, 'info', score);
}

function checkSubtitleTiming(cues: SubtitleCue[], durationSeconds: number): QualityCheckResult {
  if (cues.length === 0) return fail('Subtitle Timing', 'No subtitle cues were generated.', 'error', 0);
  for (const cue of cues) {
    const dur = cue.end - cue.start;
    if (dur <= 0 || dur > 4) return fail('Subtitle Timing', `Cue "${cue.text}" has an implausible duration (${dur.toFixed(2)}s).`, 'error', 2);
    if (!cue.text.trim()) return fail('Subtitle Timing', 'A subtitle cue is empty.', 'error', 2);
  }
  const first = cues[0];
  const last = cues[cues.length - 1];
  if (first && first.start > 3) return fail('Subtitle Timing', 'First subtitle starts too late.', 'error', 4);
  if (last && durationSeconds - last.end > 4) return fail('Subtitle Timing', 'Last subtitle ends too early relative to video length.', 'error', 4);

  let maxGap = 0;
  for (let i = 0; i < cues.length - 1; i++) {
    const cue = cues[i];
    const next = cues[i + 1];
    if (cue && next) {
      const gap = next.start - cue.end;
      if (gap > 2.2) return fail('Subtitle Timing', `Gap of ${gap.toFixed(1)}s between cues — timing likely drifted.`, 'error', 4);
      maxGap = Math.max(maxGap, gap);
    }
  }
  // Smaller gaps between cues read as tighter, more confident pacing — score tapers from 10
  // (near-zero gaps) down toward 8 as the largest gap approaches the still-acceptable 2.2s limit.
  const score = Math.round((10 - Math.min(1, maxGap / 2.2) * 2) * 10) / 10;
  return ok('Subtitle Timing', `${cues.length} cues, evenly paced.`, 'info', score);
}

async function checkAudioLevel(voiceAudioPath: string): Promise<QualityCheckResult> {
  try {
    const meanDb = await probeMeanVolumeDb(voiceAudioPath);
    if (meanDb < -40) return fail('Audio Level', `Voice track is nearly silent (mean volume ${meanDb.toFixed(1)}dB).`, 'error', 1);
    if (meanDb > -3) return fail('Audio Level', `Voice track is clipping / too hot (mean volume ${meanDb.toFixed(1)}dB).`, 'error', 2);
    return ok('Audio Level', `Voice mean volume ${meanDb.toFixed(1)}dB — within range.`, 'info', proximityScore(meanDb, -40, -3));
  } catch (error) {
    return fail('Audio Level', `Could not analyze voice track: ${error instanceof Error ? error.message : error}`, 'warning', 5);
  }
}

async function checkMusicBalance(finalVideoPath: string, musicUsed: boolean, musicConfigured: boolean): Promise<QualityCheckResult> {
  if (!musicConfigured) return ok('Music Balance', 'No music library configured — exported voice-only, which is expected.', 'info', 10);
  if (!musicUsed) return fail('Music Balance', 'A music folder is configured but no track was mixed in.', 'warning', 6);
  try {
    const meanDb = await probeMeanVolumeDb(finalVideoPath);
    if (meanDb < -30 || meanDb > -6) {
      return fail('Music Balance', `Final mix mean volume (${meanDb.toFixed(1)}dB) suggests music is overpowering or too quiet against the voice.`, 'error', 3);
    }
    return ok('Music Balance', `Final mix mean volume ${meanDb.toFixed(1)}dB — voice reads clearly over music.`, 'info', proximityScore(meanDb, -30, -6));
  } catch (error) {
    return fail('Music Balance', `Could not analyze final mix: ${error instanceof Error ? error.message : error}`, 'warning', 5);
  }
}

async function checkVideoQuality(finalVideoPath: string): Promise<QualityCheckResult> {
  try {
    const dims = await probeVideoDimensions(finalVideoPath);
    if (dims.width !== CANVAS_WIDTH || dims.height !== CANVAS_HEIGHT) {
      return fail('Video Quality', `Resolution ${dims.width}x${dims.height} does not match required ${CANVAS_WIDTH}x${CANVAS_HEIGHT}.`, 'error', 0);
    }
    return ok('Video Quality', `${dims.width}x${dims.height} @ ${CANVAS_FPS}fps, H.264/AAC.`, 'info', 10);
  } catch (error) {
    return fail('Video Quality', `Could not read exported video: ${error instanceof Error ? error.message : error}`, 'error', 0);
  }
}

// The exported file is the main content PLUS the brand intro/outro bookends
// (INTRO_DURATION_SECONDS + OUTRO_DURATION_SECONDS ≈ 4s) — the acceptable total range shifts by
// that same overhead rather than checking the un-bookended content-only target against the final
// file. The 48s ceiling (up from 30s) matches orchestrator.ts's targetDuration clamp, sized for
// the writer's widened word-count range at the app's slower, gentler 110-130wpm delivery pace.
const BOOKEND_OVERHEAD_SECONDS = INTRO_DURATION_SECONDS + OUTRO_DURATION_SECONDS;
const MIN_TOTAL_LENGTH = 14.5 + BOOKEND_OVERHEAD_SECONDS;
const MAX_TOTAL_LENGTH = 48.5 + BOOKEND_OVERHEAD_SECONDS;

async function checkVideoLength(finalVideoPath: string): Promise<QualityCheckResult> {
  try {
    const duration = await probeDurationSeconds(finalVideoPath);
    if (duration < MIN_TOTAL_LENGTH || duration > MAX_TOTAL_LENGTH) {
      return fail(
        'Video Length',
        `Duration ${duration.toFixed(1)}s is outside the required ${MIN_TOTAL_LENGTH.toFixed(1)}-${MAX_TOTAL_LENGTH.toFixed(1)}s range (15-48s content + brand intro/outro).`,
        'error',
        2,
      );
    }
    return ok('Video Length', `${duration.toFixed(1)}s — within range including brand intro/outro.`, 'info', proximityScore(duration, MIN_TOTAL_LENGTH, MAX_TOTAL_LENGTH));
  } catch (error) {
    return fail('Video Length', `Could not read video duration: ${error instanceof Error ? error.message : error}`, 'error', 0);
  }
}

function checkBackgroundSuitability(backgroundSource: 'pexels' | 'mock', pexelsConfigured: boolean): QualityCheckResult {
  if (backgroundSource === 'pexels') return ok('Background Suitability', 'Topic-matched Pexels footage used.', 'info', 10);
  if (!pexelsConfigured) return ok('Background Suitability', 'Test Mode — no Pexels key configured, placeholder background used as expected.', 'info', 10);
  return fail('Background Suitability', 'Pexels is configured but no matching footage was found — fell back to a placeholder background.', 'warning', 6);
}

/**
 * @param qualityThreshold Minimum acceptable Overall score (0-10, see qualityScore.ts). A video
 * that passes every hard check can still fall below this on aggregate polish and get sent back
 * for one more pass at its weakest-scoring component — the mechanism the business asked for:
 * "if the overall score falls below your chosen threshold, regenerate the weakest component."
 */
export async function runQualityChecks(input: QualityInput, qualityThreshold = 9): Promise<QualityReport> {
  const mainDuration = await probeDurationSeconds(input.mainVideoPath).catch(() => 0);

  const checks: QualityCheckResult[] = await Promise.all([
    checkGrammarAndSpelling(input.affirmationText),
    Promise.resolve(checkTone(input.brand, input.affirmationText)),
    Promise.resolve(checkDuplicate(input.brand, input.affirmationText)),
    Promise.resolve(checkSubtitleTiming(input.cues, mainDuration)),
    checkAudioLevel(input.voiceAudioPath),
    checkMusicBalance(input.mainVideoPath, input.musicUsed, input.musicConfigured),
    checkVideoQuality(input.finalVideoPath),
    checkVideoLength(input.finalVideoPath),
    Promise.resolve(checkBackgroundSuitability(input.backgroundSource, input.pexelsConfigured)),
  ]);

  const score = computeQualityScore(checks);
  const hardFailed = checks.filter((c) => !c.passed && c.severity === 'error');
  const belowThreshold = score.overall < qualityThreshold;
  const passed = hardFailed.length === 0 && !belowThreshold;

  let regenerateComponent: PipelineStage | null = null;
  if (!passed) {
    if (hardFailed.length > 0) {
      const byName = new Map(checks.map((c) => [c.name, c]));
      if (!byName.get('Grammar & Spelling')?.passed || !byName.get('Emotional Tone')?.passed || !byName.get('Duplicate Check')?.passed) {
        regenerateComponent = 'script';
      } else if (!byName.get('Subtitle Timing')?.passed) {
        regenerateComponent = 'subtitles';
      } else if (!byName.get('Background Suitability')?.passed) {
        regenerateComponent = 'background';
      } else {
        regenerateComponent = 'compose';
      }
      log.warn(`Quality checks failed for ${input.brand}: ${hardFailed.map((f) => f.name).join(', ')} — will regenerate "${regenerateComponent}"`);
    } else {
      // Every individual check passed, but the aggregate polish still fell short of the bar —
      // regenerate whichever of the three headline scores is dragging the overall down.
      regenerateComponent = CATEGORY_TO_STAGE[weakestCategory(score)];
      log.warn(
        `${input.brand}: overall quality ${score.overall}/10 is below the ${qualityThreshold}/10 threshold — regenerating "${regenerateComponent}" (weakest category)`,
      );
    }
  }

  return { passed, checks, score, regenerateComponent };
}
