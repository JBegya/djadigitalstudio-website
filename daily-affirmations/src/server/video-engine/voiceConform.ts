import path from 'node:path';
import { runFfmpeg } from './ffmpeg';

const MIN_ATEMPO = 0.5;
const MAX_ATEMPO = 2.0;

/**
 * sum(scene.durationSeconds) drives every clip length and must never drift — but real TTS audio
 * will almost never land on that duration naturally. stretchFactor = originalDuration /
 * targetDuration; applying ffmpeg's atempo=stretchFactor makes the conformed track exactly
 * targetDuration long. Clamped to atempo's single-filter range — an authored duration wildly
 * mismatched from the natural speaking length (>2x or <0.5x) degrades gracefully to a
 * pad/trim-shaped result instead of a grotesque pitch-preserving time-stretch.
 */
export function computeVoiceConformFactor(voiceDurationSeconds: number, targetDurationSeconds: number): number {
  if (targetDurationSeconds <= 0) return 1;
  const raw = voiceDurationSeconds / targetDurationSeconds;
  return Math.min(MAX_ATEMPO, Math.max(MIN_ATEMPO, raw));
}

/** Rescales word timestamps taken from the ORIGINAL (pre-conform) audio onto the conformed
 * track's timeline, so subtitles generated from a Whisper transcription of the pre-conform file
 * still line up after the audio itself has been time-stretched. */
export function rescaleWordTimings<T extends { start: number; end: number }>(timings: T[], stretchFactor: number): T[] {
  if (stretchFactor === 1) return timings;
  return timings.map((t) => ({ ...t, start: t.start / stretchFactor, end: t.end / stretchFactor }));
}

const AUDIO_SAMPLE_RATE = 44100;

/**
 * Applies atempo, then pads/trims with silence to guarantee the output is exactly
 * targetDurationSeconds — atempo alone can leave a small rounding-error gap given it operates on
 * whole samples, and a duration mismatch would desync the final concat-filter compose step.
 */
export async function conformVoiceToDuration(inputPath: string, targetDurationSeconds: number, stretchFactor: number, outputPath: string): Promise<void> {
  const wholeLenSamples = Math.round(targetDurationSeconds * AUDIO_SAMPLE_RATE);
  const d = targetDurationSeconds.toFixed(2);
  await runFfmpeg(
    [
      '-i',
      inputPath,
      '-af',
      `atempo=${stretchFactor.toFixed(4)},aformat=sample_fmts=fltp:sample_rates=${AUDIO_SAMPLE_RATE}:channel_layouts=mono,apad=whole_len=${wholeLenSamples},atrim=0:${d}`,
      '-ar',
      String(AUDIO_SAMPLE_RATE),
      outputPath,
    ],
    `conform voice track (${path.basename(inputPath)})`,
  );
}
