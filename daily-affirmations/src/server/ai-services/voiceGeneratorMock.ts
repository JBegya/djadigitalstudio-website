import { wordCount } from '@/server/utils/textStats';
import { runFfmpeg } from '@/server/video-engine/ffmpeg';

// 2.0 words/sec = 120 wpm — the midpoint of the app's 110-130 wpm gentle-delivery target (see
// voiceGenerator.ts's buildVoiceInstructions), so Test Mode's estimated duration lines up with
// what the real slowed-down narration actually takes, not the old, faster narrator-style pace.
const AVERAGE_WORDS_PER_SECOND = 2.0;

export function estimateSpeechDuration(text: string): number {
  return Math.max(12, Math.min(48, wordCount(text) / AVERAGE_WORDS_PER_SECOND));
}

/**
 * Test Mode voiceover — a clearly-synthetic tone bed timed to match how long the script would
 * take to speak, so the rest of the pipeline (subtitle sync, audio mixing, export length,
 * quality engine's audio-level check) can run end-to-end without an OpenAI key. Never mistaken
 * for real speech.
 *
 * `sine`'s default amplitude already sits around -21dBFS mean (not 0dBFS full-scale), so
 * `-3dB` here lands the tone around -24dB mean / -21dB peak — comfortably inside a realistic
 * speech loudness range instead of near-silent, which is what a naive linear `volume=0.05`
 * multiplier produced (measured around -47dB mean, well below the quality engine's audio-level
 * floor, causing every Test Mode video to fail that check and burn through regeneration cycles).
 */
export async function generateMockVoice(text: string, outputPath: string): Promise<{ durationSeconds: number }> {
  const durationSeconds = estimateSpeechDuration(text);
  await runFfmpeg(
    [
      '-f',
      'lavfi',
      '-i',
      `sine=frequency=220:duration=${durationSeconds.toFixed(2)}:sample_rate=44100`,
      '-af',
      'volume=-3dB,afade=t=in:d=0.3,afade=t=out:st=' + Math.max(0, durationSeconds - 0.3).toFixed(2) + ':d=0.3',
      '-ac',
      '1',
      outputPath,
    ],
    'mock voice synthesis',
  );
  return { durationSeconds };
}
