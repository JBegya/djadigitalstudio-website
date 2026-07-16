import fs from 'node:fs';
import path from 'node:path';
import type { BrandId } from '@/types/domain';
import { createLogger } from '@/server/utils/logger';
import { buildColorGradeFilter, escapeDrawtext, escapeFilterPath } from './ffmpegExpr';
import { runFfmpeg, probeDurationSeconds } from './ffmpeg';
import { buildLogoFilterChain } from './logoOverlay';

const log = createLogger('videoComposer');

export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1920;
export const CANVAS_FPS = 30;
const MAX_ZOOM = 1.16;
const LOGO_WIDTH_PX = 132;
const LOGO_MARGIN_PX = 44;

// Nurse Affirmations reads cooler (dusty-blue, clinical calm); Autism Parent Affirmations reads
// warmer (golden, homey) — the same shared DJ&A grade technique, tuned per series so each is
// instantly recognisable while both still feel like one brand. See ffmpegExpr.buildColorGradeFilter.
function gradeTemperatureFor(brand: BrandId): 'cooler' | 'warmer' {
  return brand === 'nurse' ? 'cooler' : 'warmer';
}

export type KenBurnsStyle = 'zoom-only' | 'pan-horizontal' | 'pan-vertical';

/** Picks a random but bounded Ken Burns treatment — not every video pans, which itself reads more natural than a uniform effect on every single clip. */
export function pickKenBurnsStyle(): { style: KenBurnsStyle; direction: 1 | -1 } {
  const styles: KenBurnsStyle[] = ['zoom-only', 'pan-horizontal', 'pan-vertical'];
  const style = styles[Math.floor(Math.random() * styles.length)] as KenBurnsStyle;
  const direction: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
  return { style, direction };
}

// How much of the zoom-created "slack" (the crop room that opens up as the frame zooms in) the
// pan uses — kept well under 1.0 so the pan always stays inside the zoomed frame at every point
// in the clip, including the very first frame where zoom (and therefore slack) is near zero.
const PAN_FRACTION = 0.35;

/**
 * Builds the zoompan filter's z/x/y expressions for a smooth, centered Ken Burns zoom, with an
 * optional gentle pan layered on top. Frame-count-based (not the incremental `zoom+step`
 * self-reference form) so the zoom curve is exact and reproducible rather than drifting from
 * accumulated per-frame rounding. The pan offset is expressed as a fraction of the CURRENT
 * frame's own zoom-dependent slack (`iw-iw/zoom`), which is what keeps it mathematically safe
 * at every zoom level — a fixed pixel offset would overflow the frame near the start of the
 * clip, where zoom is still ~1 and there is essentially no slack to pan into.
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
  const panOffset = (slackExpr: string) =>
    `${slackExpr}*${PAN_FRACTION}*(on/${totalFrames}-0.5)*${kenBurns.direction}`;

  return {
    zoomExpr,
    xExpr: kenBurns.style === 'pan-horizontal' ? `${centeredX}+${panOffset('(iw-iw/zoom)')}` : centeredX,
    yExpr: kenBurns.style === 'pan-vertical' ? `${centeredY}+${panOffset('(ih-ih/zoom)')}` : centeredY,
  };
}

export interface ComposeRequest {
  brand: BrandId;
  backgroundVideoPath: string;
  voiceAudioPath: string;
  musicAudioPath?: string | null;
  assSubtitlePath: string;
  logoPath?: string | null;
  fontsDir: string;
  durationSeconds: number;
  outputPath: string;
  testModeWatermark?: boolean;
}

export interface ComposeResult {
  outputPath: string;
  durationSeconds: number;
}

function buildVideoChain(request: ComposeRequest, hasLogo: boolean, logoInputIndex: number): string {
  const { durationSeconds, assSubtitlePath, fontsDir } = request;
  const totalFrames = Math.max(1, Math.round(durationSeconds * CANVAS_FPS));
  const kenBurns = pickKenBurnsStyle();
  const { zoomExpr, xExpr, yExpr } = buildKenBurnsExpr(kenBurns, totalFrames);

  const assFile = escapeFilterPath(assSubtitlePath);
  const fontsDirEsc = escapeFilterPath(fontsDir);

  const steps = [
    `scale=${CANVAS_WIDTH}:${CANVAS_HEIGHT}:force_original_aspect_ratio=increase`,
    `crop=${CANVAS_WIDTH}:${CANVAS_HEIGHT}`,
    `zoompan=z='${zoomExpr}':x='${xExpr}':y='${yExpr}':d=1:s=${CANVAS_WIDTH}x${CANVAS_HEIGHT}:fps=${CANVAS_FPS}`,
    buildColorGradeFilter(gradeTemperatureFor(request.brand)),
    `ass=filename=${assFile}:fontsdir=${fontsDirEsc}`,
  ];

  if (request.testModeWatermark) {
    const fontFile = escapeFilterPath(path.join(request.fontsDir, 'Inter-Medium.otf'));
    const label = escapeDrawtext('TEST MODE — placeholder content, not for posting');
    steps.push(
      `drawtext=fontfile=${fontFile}:text='${label}':fontsize=26:fontcolor=white@0.65:box=1:boxcolor=black@0.35:boxborderw=14:x=(w-text_w)/2:y=64`,
    );
  }

  let chain = `[0:v]${steps.join(',')}[bgv]`;

  let composited: string;
  if (hasLogo) {
    const logoChain = buildLogoFilterChain(request.logoPath as string, LOGO_WIDTH_PX);
    chain += `;[${logoInputIndex}:v]${logoChain}[wm];[bgv][wm]overlay=W-w-${LOGO_MARGIN_PX}:H-h-${LOGO_MARGIN_PX}:format=auto[composited]`;
    composited = '[composited]';
  } else {
    composited = '[bgv]';
  }

  // Fade applied last so the whole frame — background, subtitles, logo — dissolves to black
  // together at the very start and end, instead of subtitles popping over a faded background.
  const fadeOutStart = Math.max(0, durationSeconds - 0.5).toFixed(2);
  chain += `;${composited}fade=t=in:d=0.5:alpha=0,fade=t=out:st=${fadeOutStart}:d=0.5:alpha=0[vout]`;

  return chain;
}

function buildAudioChain(request: ComposeRequest, hasMusic: boolean, musicInputIndex: number): string {
  const { durationSeconds } = request;
  const d = durationSeconds.toFixed(2);
  // The voice track is naturally shorter than the target duration (targetDuration = voice
  // length + 1.2s breathing room, see orchestrator.ts) — apad+atrim pads it with trailing
  // silence out to the exact target instead of leaving the audio stream short. Without this,
  // the exported file's audio track ends before its video track: invisible in a lenient
  // player, but a real mismatch that corrupts duration metadata once this clip is
  // concatenated with the brand intro/outro (see videoAssembly.ts). The bundled ffmpeg build
  // only has apad's older `whole_len` (a sample COUNT, not `whole_dur`/duration string added in
  // later ffmpeg releases), hence the explicit sample-rate multiplication.
  const AUDIO_SAMPLE_RATE = 44100;
  const wholeLenSamples = Math.round(durationSeconds * AUDIO_SAMPLE_RATE);
  const voiceNormalized = `[1:a]aformat=sample_fmts=fltp:sample_rates=${AUDIO_SAMPLE_RATE}:channel_layouts=stereo,apad=whole_len=${wholeLenSamples},atrim=0:${d}[voiceN]`;

  if (!hasMusic) {
    return `${voiceNormalized};[voiceN]loudnorm=I=-16:TP=-1.5:LRA=11[aout]`;
  }

  return [
    voiceNormalized,
    `[voiceN]asplit=2[voice1][voice2]`,
    `[${musicInputIndex}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,aloop=loop=-1:size=2000000000,atrim=0:${d},asetpts=N/SR/TB,volume=0.22[musicbed]`,
    `[musicbed][voice1]sidechaincompress=threshold=0.045:ratio=9:attack=6:release=320:makeup=1[ducked]`,
    // duration=longest (not the previous 'first') so the mix runs the full target length even
    // after the voice's own padded track and the music bed agree on that length — 'first'
    // silently truncated to whichever input's filter chain happened to settle first.
    `[voice2][ducked]amix=inputs=2:duration=longest:weights='1 1',loudnorm=I=-16:TP=-1.5:LRA=11,atrim=0:${d}[aout]`,
  ].join(';');
}

export async function composeVideo(request: ComposeRequest): Promise<ComposeResult> {
  const { backgroundVideoPath, voiceAudioPath, musicAudioPath, outputPath, durationSeconds } = request;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const hasMusic = Boolean(musicAudioPath && fs.existsSync(musicAudioPath));
  const hasLogo = Boolean(request.logoPath && fs.existsSync(request.logoPath));

  // Input 0 = background, 1 = voice, then music/logo are appended only if present so the
  // filtergraph references the exact index each one actually landed at.
  const inputs = ['-stream_loop', '-1', '-i', backgroundVideoPath, '-i', voiceAudioPath];
  let nextInputIndex = 2;
  const musicInputIndex = nextInputIndex;
  if (hasMusic) {
    inputs.push('-i', musicAudioPath as string);
    nextInputIndex += 1;
  }
  const logoInputIndex = nextInputIndex;
  if (hasLogo) {
    inputs.push('-i', request.logoPath as string);
    nextInputIndex += 1;
  }

  const videoChain = buildVideoChain(request, hasLogo, logoInputIndex);
  const audioChain = buildAudioChain(request, hasMusic, musicInputIndex);
  const filterComplex = `${videoChain};${audioChain}`;

  const args = [
    ...inputs,
    '-filter_complex',
    filterComplex,
    '-map',
    '[vout]',
    '-map',
    '[aout]',
    '-t',
    durationSeconds.toFixed(2),
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
    '-ac',
    '2',
    '-movflags',
    '+faststart',
    outputPath,
  ];

  log.info(`Composing ${path.basename(outputPath)} (${durationSeconds.toFixed(1)}s, music=${hasMusic}, logo=${hasLogo})`);
  await runFfmpeg(args, `compose video (${path.basename(outputPath)})`);

  const finalDuration = await probeDurationSeconds(outputPath);
  return { outputPath, durationSeconds: finalDuration };
}
