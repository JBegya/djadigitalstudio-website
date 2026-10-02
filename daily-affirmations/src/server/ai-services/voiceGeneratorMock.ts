import { runFfmpeg } from '@/server/video-engine/ffmpeg';

/**
 * Test Mode voiceover — a clearly-synthetic tone bed, synthesized at EXACTLY the storyboard's
 * own authoritative target duration (sum of scene.durationSeconds) rather than estimated from
 * word count, so Test Mode never needs the atempo conform step real TTS audio does (see
 * voiceConform.ts) — zero duration drift by construction. Never mistaken for real speech.
 *
 * `sine`'s default amplitude already sits around -21dBFS mean (not 0dBFS full-scale), so `-3dB`
 * here lands the tone around -24dB mean / -21dB peak — comfortably inside a realistic speech
 * loudness range instead of near-silent.
 */
export async function generateMockVoice(outputPath: string, targetDurationSeconds: number): Promise<{ durationSeconds: number }> {
  const durationSeconds = Math.max(0.5, targetDurationSeconds);
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
