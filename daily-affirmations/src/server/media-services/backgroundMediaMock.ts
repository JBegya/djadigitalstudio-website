import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { BrandId } from '@/types/domain';
import { runFfmpeg } from '@/server/video-engine/ffmpeg';

// Calm gradient used only when there's no Pexels key configured, so the video composer (Ken
// Burns zoom, subtitles, mixing) can still be exercised end-to-end without stock footage.
const BRAND_GRADIENTS: Record<BrandId, { top: [number, number, number]; bottom: [number, number, number] }> = {
  nurse: { top: [12, 24, 38], bottom: [10, 90, 110] },
  autism: { top: [30, 16, 42], bottom: [120, 70, 150] },
};

function channelExpr(top: number, bottom: number): string {
  return `clip(${top}+(${bottom}-${top})*(Y/H),0,255)`;
}

export async function generateMockBackground(brand: BrandId, durationSeconds: number, outputPath: string): Promise<void> {
  const { top, bottom } = BRAND_GRADIENTS[brand];
  const geq = `geq=r='${channelExpr(top[0], bottom[0])}':g='${channelExpr(top[1], bottom[1])}':b='${channelExpr(top[2], bottom[2])}'`;

  // `geq` is a per-pixel expression interpreter — evaluating it for every frame of a
  // 20-30s/30fps clip (600-900 frames) is minutes-slow. Render the gradient ONCE as a still
  // image instead, then loop that single frame into the target-length video; the composer's
  // own Ken Burns zoom is what actually gives the placeholder background its motion anyway.
  const stillPath = path.join(os.tmpdir(), `dja-bg-still-${process.pid}-${Date.now()}.png`);
  try {
    await runFfmpeg(
      ['-f', 'lavfi', '-i', 'color=c=black:s=1080x1920:d=1', '-vf', geq, '-frames:v', '1', stillPath],
      'mock background gradient still',
    );
    await runFfmpeg(
      [
        '-loop',
        '1',
        '-i',
        stillPath,
        '-t',
        durationSeconds.toFixed(2),
        '-r',
        '30',
        '-pix_fmt',
        'yuv420p',
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        outputPath,
      ],
      'mock background loop',
    );
  } finally {
    fs.rmSync(stillPath, { force: true });
  }
}
