import fs from 'node:fs';
import path from 'node:path';
import { createLogger } from '@/server/utils/logger';
import { escapeDrawtext, escapeFilterPath } from './ffmpegExpr';
import { runFfmpeg, probeDurationSeconds } from './ffmpeg';
import { buildLogoFilterChain } from './logoOverlay';

const log = createLogger('videoComposer');

export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1920;
export const CANVAS_FPS = 30;
const MAX_ZOOM = 1.16;
const LOGO_WIDTH_PX = 132;
const LOGO_MARGIN_PX = 44;

export interface ComposeRequest {
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
  const zoomIncrement = (MAX_ZOOM - 1) / totalFrames;

  const assFile = escapeFilterPath(assSubtitlePath);
  const fontsDirEsc = escapeFilterPath(fontsDir);

  const steps = [
    `scale=${CANVAS_WIDTH}:${CANVAS_HEIGHT}:force_original_aspect_ratio=increase`,
    `crop=${CANVAS_WIDTH}:${CANVAS_HEIGHT}`,
    `zoompan=z='min(zoom+${zoomIncrement.toFixed(8)},${MAX_ZOOM})':d=1:s=${CANVAS_WIDTH}x${CANVAS_HEIGHT}:fps=${CANVAS_FPS}`,
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
  const voiceNormalized = `[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[voiceN]`;

  if (!hasMusic) {
    return `${voiceNormalized};[voiceN]loudnorm=I=-16:TP=-1.5:LRA=11[aout]`;
  }

  return [
    voiceNormalized,
    `[voiceN]asplit=2[voice1][voice2]`,
    `[${musicInputIndex}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,aloop=loop=-1:size=2000000000,atrim=0:${durationSeconds.toFixed(2)},asetpts=N/SR/TB,volume=0.22[musicbed]`,
    `[musicbed][voice1]sidechaincompress=threshold=0.045:ratio=9:attack=6:release=320:makeup=1[ducked]`,
    `[voice2][ducked]amix=inputs=2:duration=first:weights='1 1',loudnorm=I=-16:TP=-1.5:LRA=11[aout]`,
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
