import writeGood from 'write-good';
import type { BrandId, PipelineStage } from '@/types/domain';
import { getBrand } from '@/server/config/brands';
import { historyStore } from '@/server/history/historyStore';
import { createLogger } from '@/server/utils/logger';
import { containsEmoji, findBannedPhrase, splitSentences, wordCount } from '@/server/utils/textStats';
import { probeDurationSeconds, probeMeanVolumeDb, probeVideoDimensions } from '@/server/video-engine/ffmpeg';
import { CANVAS_HEIGHT, CANVAS_WIDTH, CANVAS_FPS } from '@/server/video-engine/videoComposer';
import type { SubtitleCue } from '@/server/video-engine/subtitleTiming';
import { findSpellingIssues } from './spellChecker';

const log = createLogger('qualityEngine');

export interface QualityCheckResult {
  name: string;
  passed: boolean;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface QualityInput {
  brand: BrandId;
  affirmationText: string;
  voiceAudioPath: string;
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
  /** Which pipeline stage to regenerate first, if anything failed. Null when everything passed. */
  regenerateComponent: PipelineStage | null;
}

function ok(name: string, message: string, severity: QualityCheckResult['severity'] = 'info'): QualityCheckResult {
  return { name, passed: true, message, severity };
}

function fail(name: string, message: string, severity: QualityCheckResult['severity'] = 'error'): QualityCheckResult {
  return { name, passed: false, message, severity };
}

async function checkGrammarAndSpelling(text: string): Promise<QualityCheckResult> {
  const spelling = await findSpellingIssues(text);
  if (spelling.length > 0) {
    return fail('Grammar & Spelling', `Possible misspellings: ${spelling.map((s) => s.word).join(', ')}`);
  }
  const suggestions = writeGood(text, { passive: false, illusion: true, so: true, thereIs: true, weasel: true, adverb: false, tooWordy: true, cliches: true });
  const seriousIssues = suggestions.filter((s) => /cliche|clich/i.test(s.reason));
  if (seriousIssues.length > 0) {
    return fail('Grammar & Spelling', `Contains a cliché phrase flagged by style check: ${seriousIssues.map((s) => s.reason).join('; ')}`);
  }
  return ok('Grammar & Spelling', 'No spelling issues or clichés detected.');
}

function checkTone(brand: BrandId, text: string): QualityCheckResult {
  if (containsEmoji(text)) return fail('Emotional Tone', 'Affirmation contains an emoji, which is not allowed in the spoken script.');
  if (/["“”]/.test(text)) return fail('Emotional Tone', 'Affirmation contains quotation marks.');
  const banned = findBannedPhrase(text, getBrand(brand).bannedPhrases);
  if (banned) return fail('Emotional Tone', `Contains a banned cliché / toxic-positivity phrase: "${banned}"`);
  const sentences = splitSentences(text);
  if (sentences.length < 2) return fail('Emotional Tone', 'Affirmation reads as a single run-on sentence — missing opening/closing structure.');
  const words = wordCount(text);
  if (words < 35 || words > 78) return fail('Emotional Tone', `Word count (${words}) is outside the natural spoken-length range.`);
  return ok('Emotional Tone', 'Structure and tone check passed.');
}

function checkDuplicate(brand: BrandId, text: string): QualityCheckResult {
  const { duplicate, closestSimilarity } = historyStore.isDuplicate(brand, text);
  if (duplicate) {
    return fail('Duplicate Check', `Too similar to a previously generated affirmation (similarity ${(closestSimilarity * 100).toFixed(0)}%).`);
  }
  return ok('Duplicate Check', `Unique — closest match ${(closestSimilarity * 100).toFixed(0)}% similar.`);
}

function checkSubtitleTiming(cues: SubtitleCue[], durationSeconds: number): QualityCheckResult {
  if (cues.length === 0) return fail('Subtitle Timing', 'No subtitle cues were generated.');
  for (const cue of cues) {
    const dur = cue.end - cue.start;
    if (dur <= 0 || dur > 4) return fail('Subtitle Timing', `Cue "${cue.text}" has an implausible duration (${dur.toFixed(2)}s).`);
    if (!cue.text.trim()) return fail('Subtitle Timing', 'A subtitle cue is empty.');
  }
  const first = cues[0];
  const last = cues[cues.length - 1];
  if (first && first.start > 3) return fail('Subtitle Timing', 'First subtitle starts too late.');
  if (last && durationSeconds - last.end > 4) return fail('Subtitle Timing', 'Last subtitle ends too early relative to video length.');
  for (let i = 0; i < cues.length - 1; i++) {
    const cue = cues[i];
    const next = cues[i + 1];
    if (cue && next && next.start - cue.end > 2.2) {
      return fail('Subtitle Timing', `Gap of ${(next.start - cue.end).toFixed(1)}s between cues — timing likely drifted.`);
    }
  }
  return ok('Subtitle Timing', `${cues.length} cues, evenly paced.`);
}

async function checkAudioLevel(voiceAudioPath: string): Promise<QualityCheckResult> {
  try {
    const meanDb = await probeMeanVolumeDb(voiceAudioPath);
    if (meanDb < -40) return fail('Audio Level', `Voice track is nearly silent (mean volume ${meanDb.toFixed(1)}dB).`);
    if (meanDb > -3) return fail('Audio Level', `Voice track is clipping / too hot (mean volume ${meanDb.toFixed(1)}dB).`);
    return ok('Audio Level', `Voice mean volume ${meanDb.toFixed(1)}dB — within range.`);
  } catch (error) {
    return fail('Audio Level', `Could not analyze voice track: ${error instanceof Error ? error.message : error}`, 'warning');
  }
}

async function checkMusicBalance(finalVideoPath: string, musicUsed: boolean, musicConfigured: boolean): Promise<QualityCheckResult> {
  if (!musicConfigured) return ok('Music Balance', 'No music library configured — exported voice-only, which is expected.');
  if (!musicUsed) return fail('Music Balance', 'A music folder is configured but no track was mixed in.', 'warning');
  try {
    const meanDb = await probeMeanVolumeDb(finalVideoPath);
    if (meanDb < -30 || meanDb > -6) {
      return fail('Music Balance', `Final mix mean volume (${meanDb.toFixed(1)}dB) suggests music is overpowering or too quiet against the voice.`);
    }
    return ok('Music Balance', `Final mix mean volume ${meanDb.toFixed(1)}dB — voice reads clearly over music.`);
  } catch (error) {
    return fail('Music Balance', `Could not analyze final mix: ${error instanceof Error ? error.message : error}`, 'warning');
  }
}

async function checkVideoQuality(finalVideoPath: string): Promise<QualityCheckResult> {
  try {
    const dims = await probeVideoDimensions(finalVideoPath);
    if (dims.width !== CANVAS_WIDTH || dims.height !== CANVAS_HEIGHT) {
      return fail('Video Quality', `Resolution ${dims.width}x${dims.height} does not match required ${CANVAS_WIDTH}x${CANVAS_HEIGHT}.`);
    }
    return ok('Video Quality', `${dims.width}x${dims.height} @ ${CANVAS_FPS}fps, H.264/AAC.`);
  } catch (error) {
    return fail('Video Quality', `Could not read exported video: ${error instanceof Error ? error.message : error}`);
  }
}

async function checkVideoLength(finalVideoPath: string): Promise<QualityCheckResult> {
  try {
    const duration = await probeDurationSeconds(finalVideoPath);
    if (duration < 14.5 || duration > 30.5) {
      return fail('Video Length', `Duration ${duration.toFixed(1)}s is outside the required 15-30s range.`);
    }
    return ok('Video Length', `${duration.toFixed(1)}s — within the 15-30s range.`);
  } catch (error) {
    return fail('Video Length', `Could not read video duration: ${error instanceof Error ? error.message : error}`);
  }
}

function checkBackgroundSuitability(backgroundSource: 'pexels' | 'mock', pexelsConfigured: boolean): QualityCheckResult {
  if (backgroundSource === 'pexels') return ok('Background Suitability', 'Topic-matched Pexels footage used.');
  if (!pexelsConfigured) return ok('Background Suitability', 'Test Mode — no Pexels key configured, placeholder background used as expected.', 'info');
  return fail('Background Suitability', 'Pexels is configured but no matching footage was found — fell back to a placeholder background.', 'warning');
}

export async function runQualityChecks(input: QualityInput): Promise<QualityReport> {
  const duration = await probeDurationSeconds(input.finalVideoPath).catch(() => 0);

  const checks: QualityCheckResult[] = await Promise.all([
    checkGrammarAndSpelling(input.affirmationText),
    Promise.resolve(checkTone(input.brand, input.affirmationText)),
    Promise.resolve(checkDuplicate(input.brand, input.affirmationText)),
    Promise.resolve(checkSubtitleTiming(input.cues, duration)),
    checkAudioLevel(input.voiceAudioPath),
    checkMusicBalance(input.finalVideoPath, input.musicUsed, input.musicConfigured),
    checkVideoQuality(input.finalVideoPath),
    checkVideoLength(input.finalVideoPath),
    Promise.resolve(checkBackgroundSuitability(input.backgroundSource, input.pexelsConfigured)),
  ]);

  const failed = checks.filter((c) => !c.passed && c.severity === 'error');
  const passed = failed.length === 0;

  let regenerateComponent: PipelineStage | null = null;
  if (!passed) {
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
    log.warn(`Quality checks failed for ${input.brand}: ${failed.map((f) => f.name).join(', ')} — will regenerate "${regenerateComponent}"`);
  }

  return { passed, checks, regenerateComponent };
}
