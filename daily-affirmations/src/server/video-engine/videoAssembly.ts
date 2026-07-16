import fs from 'node:fs';
import path from 'node:path';
import type { BrandId } from '@/types/domain';
import { getBrandFramesCacheDir } from '@/server/config/paths';
import { createLogger } from '@/server/utils/logger';
import { escapeDrawtext, escapeFilterPath } from './ffmpegExpr';
import { runFfmpeg, probeDurationSeconds } from './ffmpeg';
import { buildLogoFilterChain } from './logoOverlay';
import { CANVAS_WIDTH, CANVAS_HEIGHT, CANVAS_FPS } from './videoComposer';

const log = createLogger('videoAssembly');

// Deep Charcoal — the shared DJ&A brand background for both bookends, on both series.
const BRAND_BG_COLOR = '0x121212';
const MUTED_GOLD = '0xC9A227';
export const INTRO_DURATION_SECONDS = 1.5;
export const OUTRO_DURATION_SECONDS = 2.5;

// Bumping this invalidates every cached brand-frame clip on next run — use it whenever the
// intro/outro's visual design changes, since the cache otherwise has no way to know the design
// (as opposed to just the logo file) is stale.
const BRAND_FRAME_VERSION = 'v1';

const ENCODE_ARGS = [
  '-r',
  String(CANVAS_FPS),
  '-c:v',
  'libx264',
  '-preset',
  'fast',
  '-crf',
  '18',
  '-pix_fmt',
  'yuv420p',
  '-c:a',
  'aac',
  '-b:a',
  '192k',
  '-ar',
  '44100',
  '-ac',
  '2',
  '-movflags',
  '+faststart',
];

// anullsrc is an infinite generator with no natural EOF — relies on the output-level `-t` flag
// (added below, same pattern videoComposer.ts already uses for its own infinitely-looped
// background input) to cap the encoded duration, rather than an input-side `-t`/`-ss`, which
// must precede its `-i` to reliably apply to that specific input.
function silentAudioInput(): string[] {
  return ['-f', 'lavfi', '-i', `anullsrc=channel_layout=stereo:sample_rate=44100`];
}

function colorSourceInput(durationSeconds: number): string[] {
  return ['-f', 'lavfi', '-i', `color=c=${BRAND_BG_COLOR}:s=${CANVAS_WIDTH}x${CANVAS_HEIGHT}:d=${durationSeconds.toFixed(2)}:r=${CANVAS_FPS}`];
}

/**
 * Renders the 1-2s intro (a smooth fade-in and subtle centered logo reveal on the brand's
 * charcoal background) — deliberately understated per the brand spec ("elegant, not flashy").
 */
async function renderIntro(logoPath: string | null, outputPath: string): Promise<void> {
  const duration = INTRO_DURATION_SECONDS;
  const hasLogo = Boolean(logoPath && fs.existsSync(logoPath));

  const inputs = [...colorSourceInput(duration), ...silentAudioInput()];
  let videoOut: string;
  let filterComplex: string;

  if (hasLogo) {
    // -loop 1 turns the still logo image into a continuous stream with one frame per output
    // timestamp — without it, ffmpeg decodes it as a single frame at t=0 and freezes there, so
    // the fade below (a time-based filter) has no timeline to animate across and just renders
    // that one pre-fade-in (fully transparent) frame for the whole clip.
    inputs.push('-loop', '1', '-i', logoPath as string);
    const logoChain = `${buildLogoFilterChain(logoPath as string, 340, 1.0)},fade=t=in:st=0.1:d=0.6:alpha=1`;
    filterComplex = [
      `[2:v]${logoChain}[logo]`,
      `[0:v][logo]overlay=(W-w)/2:(H-h)/2:format=auto[composited]`,
      `[composited]fade=t=in:d=0.2:alpha=0,fade=t=out:st=${(duration - 0.4).toFixed(2)}:d=0.4:alpha=0[vout]`,
    ].join(';');
    videoOut = '[vout]';
  } else {
    filterComplex = `[0:v]fade=t=in:d=0.2:alpha=0,fade=t=out:st=${(duration - 0.4).toFixed(2)}:d=0.4:alpha=0[vout]`;
    videoOut = '[vout]';
  }

  const args = [...inputs, '-filter_complex', filterComplex, '-map', videoOut, '-map', '1:a', '-t', duration.toFixed(2), ...ENCODE_ARGS, outputPath];
  await runFfmpeg(args, 'render brand intro');
}

/**
 * Renders the 2-3s outro — brand name, studio credit, and a soft follow CTA over the same
 * charcoal background, fading in and out together as one calm closing beat.
 */
async function renderOutro(logoPath: string | null, fontsDir: string, outputPath: string): Promise<void> {
  const duration = OUTRO_DURATION_SECONDS;
  const hasLogo = Boolean(logoPath && fs.existsSync(logoPath));

  const titleFont = escapeFilterPath(path.join(fontsDir, 'Inter-Bold.otf'));
  const subtitleFont = escapeFilterPath(path.join(fontsDir, 'Inter-Regular.otf'));
  const ctaFont = escapeFilterPath(path.join(fontsDir, 'Inter-Medium.otf'));

  const titleSize = Math.round(CANVAS_HEIGHT * 0.038);
  const subtitleSize = Math.round(CANVAS_HEIGHT * 0.024);
  const ctaSize = Math.round(CANVAS_HEIGHT * 0.022);

  const titleY = Math.round(CANVAS_HEIGHT * 0.42);
  const subtitleY = titleY + Math.round(titleSize * 1.5);
  const ctaY = subtitleY + Math.round(subtitleSize * 2.0);

  const title = escapeDrawtext('DJ&A Daily Affirmations');
  const subtitle = escapeDrawtext('A project by DJ&A Digital Studio');
  const cta = escapeDrawtext('Follow for daily encouragement.');

  const textSteps = [
    `drawtext=fontfile=${titleFont}:text='${title}':fontsize=${titleSize}:fontcolor=white:x=(w-text_w)/2:y=${titleY}`,
    `drawtext=fontfile=${subtitleFont}:text='${subtitle}':fontsize=${subtitleSize}:fontcolor=white@0.7:x=(w-text_w)/2:y=${subtitleY}`,
    `drawtext=fontfile=${ctaFont}:text='${cta}':fontsize=${ctaSize}:fontcolor=${MUTED_GOLD}@0.9:x=(w-text_w)/2:y=${ctaY}`,
  ];

  const inputs = [...colorSourceInput(duration), ...silentAudioInput()];
  let filterComplex: string;
  let videoOut: string;

  if (hasLogo) {
    inputs.push('-loop', '1', '-i', logoPath as string);
    const logoY = Math.round(CANVAS_HEIGHT * 0.22);
    const logoChain = buildLogoFilterChain(logoPath as string, 110, 0.85);
    filterComplex = [
      `[0:v]${textSteps.join(',')}[textlayer]`,
      `[2:v]${logoChain}[logo]`,
      `[textlayer][logo]overlay=(W-w)/2:${logoY}:format=auto[composited]`,
      `[composited]fade=t=in:d=0.5:alpha=0,fade=t=out:st=${(duration - 0.4).toFixed(2)}:d=0.4:alpha=0[vout]`,
    ].join(';');
  } else {
    filterComplex = `[0:v]${textSteps.join(',')},fade=t=in:d=0.5:alpha=0,fade=t=out:st=${(duration - 0.4).toFixed(2)}:d=0.4:alpha=0[vout]`;
  }
  videoOut = '[vout]';

  const args = [...inputs, '-filter_complex', filterComplex, '-map', videoOut, '-map', '1:a', '-t', duration.toFixed(2), ...ENCODE_ARGS, outputPath];
  await runFfmpeg(args, 'render brand outro');
}

export interface BrandFrames {
  introPath: string;
  outroPath: string;
}

/**
 * Returns cached intro/outro clips for the brand, rendering them once and reusing on every
 * subsequent video — the bookends are identical every time (same logo, same text), so
 * re-encoding them per video would just be wasted render time across 6 videos a day.
 * Invalidated if the logo file changes (mtime check) or BRAND_FRAME_VERSION is bumped.
 */
export async function getOrCreateBrandFrames(brand: BrandId, logoPath: string | null, fontsDir: string): Promise<BrandFrames> {
  const cacheDir = getBrandFramesCacheDir();
  const introPath = path.join(cacheDir, `${brand}-intro-${BRAND_FRAME_VERSION}.mp4`);
  const outroPath = path.join(cacheDir, `${brand}-outro-${BRAND_FRAME_VERSION}.mp4`);

  const logoMtime = logoPath && fs.existsSync(logoPath) ? fs.statSync(logoPath).mtimeMs : 0;
  const isFresh = (cachedPath: string) => {
    if (!fs.existsSync(cachedPath)) return false;
    if (!logoMtime) return true;
    return fs.statSync(cachedPath).mtimeMs >= logoMtime;
  };

  if (!isFresh(introPath)) {
    log.info(`Rendering ${brand} intro clip (cache miss or stale logo)`);
    await renderIntro(logoPath, introPath);
  }
  if (!isFresh(outroPath)) {
    log.info(`Rendering ${brand} outro clip (cache miss or stale logo)`);
    await renderOutro(logoPath, fontsDir, outroPath);
  }

  return { introPath, outroPath };
}

export interface AssembleRequest {
  introPath: string;
  mainVideoPath: string;
  outroPath: string;
  outputPath: string;
}

export interface AssembleResult {
  outputPath: string;
  durationSeconds: number;
}

/**
 * Concatenates intro + main content + outro into the final exported file, using ffmpeg's
 * `concat` FILTER (decode-and-re-encode) rather than the concat DEMUXER's stream-copy mode.
 * Stream copy looks appealing since all three segments share the same codec/format/framerate,
 * but it splices compressed bitstreams directly — AAC's encoder priming samples and each
 * segment's independently-zeroed timestamps make that splice produce non-monotonic audio DTS in
 * practice, which ffmpeg "fixes" by silently compressing the audio timeline, leaving the
 * container's audio track badly out of sync with (and a different duration than) the video.
 * The concat filter re-decodes every frame instead, so timing is computed correctly rather than
 * spliced — slower, but this pipeline runs once a day per video, and a broken final export is
 * far more costly than a few extra encode-seconds. Each segment already fades to/from black at
 * its own edges (see renderIntro/renderOutro and videoComposer's own fade), so the seams still
 * read as clean, intentional cuts rather than an abrupt jump.
 */
export async function assembleFinalVideo(request: AssembleRequest): Promise<AssembleResult> {
  const { introPath, mainVideoPath, outroPath, outputPath } = request;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const filterComplex = `[0:v][0:a][1:v][1:a][2:v][2:a]concat=n=3:v=1:a=1[vout][aout]`;
  const args = [
    '-i',
    introPath,
    '-i',
    mainVideoPath,
    '-i',
    outroPath,
    '-filter_complex',
    filterComplex,
    '-map',
    '[vout]',
    '-map',
    '[aout]',
    ...ENCODE_ARGS,
    outputPath,
  ];
  await runFfmpeg(args, 'assemble final video (concat intro/main/outro)');

  const durationSeconds = await probeDurationSeconds(outputPath);
  return { outputPath, durationSeconds };
}
