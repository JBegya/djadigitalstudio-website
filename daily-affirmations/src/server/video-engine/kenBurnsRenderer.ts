import { runFfmpeg } from './ffmpeg';
import { VIDEO_CANVAS_WIDTH_PX, VIDEO_CANVAS_HEIGHT_PX, VIDEO_FPS } from '@/lib/video/constants';

const MAX_ZOOM = 1.16;
// How much of the zoom-created "slack" (the crop room that opens up as the frame zooms in) the
// pan uses — kept well under 1.0 so the pan always stays inside the zoomed frame at every point
// in the clip, including the very first frame where zoom (and therefore slack) is near zero.
const PAN_FRACTION = 0.35;

export type KenBurnsStyle = 'zoom-only' | 'pan-horizontal' | 'pan-vertical';

/**
 * Deterministic (seeded, not Math.random()) Ken Burns treatment — Test Mode must stay
 * reproducible, matching storyboardGenerator.ts's own "no Math.random/Date.now" rule. The old
 * app picked randomly since daily variety across many videos was the point; here the same scene
 * should render the same way every time it's regenerated.
 */
export function pickKenBurnsStyle(seed: number): { style: KenBurnsStyle; direction: 1 | -1 } {
  const styles: KenBurnsStyle[] = ['zoom-only', 'pan-horizontal', 'pan-vertical'];
  return { style: styles[Math.abs(seed) % styles.length]!, direction: seed % 2 === 0 ? 1 : -1 };
}

/**
 * Builds the zoompan filter's z/x/y expressions for a smooth, centered Ken Burns zoom, with an
 * optional gentle pan layered on top. Frame-count-based (not the incremental `zoom+step`
 * self-reference form) so the zoom curve is exact and reproducible rather than drifting from
 * accumulated per-frame rounding. The pan offset is expressed as a fraction of the CURRENT
 * frame's own zoom-dependent slack (`iw-iw/zoom`), which is what keeps it mathematically safe at
 * every zoom level — a fixed pixel offset would overflow the frame near the start of the clip,
 * where zoom is still ~1 and there is essentially no slack to pan into.
 */
export function buildKenBurnsExpr(
  kenBurns: { style: KenBurnsStyle; direction: 1 | -1 },
  totalFrames: number,
  maxZoom = MAX_ZOOM,
): { zoomExpr: string; xExpr: string; yExpr: string } {
  const rate = (maxZoom - 1) / totalFrames;
  const zoomExpr = `min(1+${rate.toFixed(8)}*on,${maxZoom})`;
  const centeredX = `(iw-iw/zoom)/2`;
  const centeredY = `(ih-ih/zoom)/2`;
  const panOffset = (slackExpr: string) => `${slackExpr}*${PAN_FRACTION}*(on/${totalFrames}-0.5)*${kenBurns.direction}`;

  return {
    zoomExpr,
    xExpr: kenBurns.style === 'pan-horizontal' ? `${centeredX}+${panOffset('(iw-iw/zoom)')}` : centeredX,
    yExpr: kenBurns.style === 'pan-vertical' ? `${centeredY}+${panOffset('(ih-ih/zoom)')}` : centeredY,
  };
}

/** A simple deterministic hash of a string into an integer seed, for picking a Ken Burns style
 * from a file path without needing an explicit numeric seed threaded through every call site. */
export function hashToSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return hash;
}

export interface KenBurnsClipParams {
  imagePath: string;
  durationSeconds: number;
  outputPath: string;
  seed: number;
}

/** Renders a single Ken Burns pan/zoom clip from a static keyframe image — the Test Mode / no-
 * video-provider-configured animation of a storyboard scene. Video-only, no audio track (the
 * full voiceover is composed separately across the whole video, not per clip). */
export async function renderKenBurnsClip(params: KenBurnsClipParams): Promise<void> {
  const totalFrames = Math.max(1, Math.round(params.durationSeconds * VIDEO_FPS));
  const { zoomExpr, xExpr, yExpr } = buildKenBurnsExpr(pickKenBurnsStyle(params.seed), totalFrames);

  await runFfmpeg(
    [
      '-loop',
      '1',
      '-i',
      params.imagePath,
      '-filter_complex',
      `[0:v]scale=${VIDEO_CANVAS_WIDTH_PX}:${VIDEO_CANVAS_HEIGHT_PX}:force_original_aspect_ratio=increase,crop=${VIDEO_CANVAS_WIDTH_PX}:${VIDEO_CANVAS_HEIGHT_PX},zoompan=z='${zoomExpr}':x='${xExpr}':y='${yExpr}':d=1:s=${VIDEO_CANVAS_WIDTH_PX}x${VIDEO_CANVAS_HEIGHT_PX}:fps=${VIDEO_FPS}[vout]`,
      '-map',
      '[vout]',
      '-t',
      params.durationSeconds.toFixed(2),
      '-r',
      String(VIDEO_FPS),
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '18',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      params.outputPath,
    ],
    `Ken Burns clip (seed ${params.seed})`,
  );
}
