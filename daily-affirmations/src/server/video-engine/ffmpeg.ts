import { execFile } from 'node:child_process';
import fs from 'node:fs';
import { createLogger } from '@/server/utils/logger';
import { retryWithBackoff } from '@/server/utils/retry';

const log = createLogger('ffmpeg');

// Literal `require()` calls (rather than a `require(pkg)` helper parameterized by string) so
// webpack can statically analyze and bundle these — a dynamic require produces a "Critical
// dependency: the request of a dependency is an expression" warning under Next's server build.
function resolveFfmpegInstallerPath(): string | null {
  try {
    const installer = require('@ffmpeg-installer/ffmpeg') as { path: string };
    return installer?.path && fs.existsSync(installer.path) ? installer.path : null;
  } catch {
    return null; // package not installed for this platform/arch — fall through to PATH lookup
  }
}

function resolveFfprobeInstallerPath(): string | null {
  try {
    const installer = require('@ffprobe-installer/ffprobe') as { path: string };
    return installer?.path && fs.existsSync(installer.path) ? installer.path : null;
  } catch {
    return null;
  }
}

let ffmpegPath: string | null = null;
let ffprobePath: string | null = null;

export function getFfmpegPath(): string {
  if (!ffmpegPath) ffmpegPath = resolveFfmpegInstallerPath() ?? 'ffmpeg';
  return ffmpegPath;
}

export function getFfprobePath(): string {
  if (!ffprobePath) ffprobePath = resolveFfprobeInstallerPath() ?? 'ffprobe';
  return ffprobePath;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
}

function execBinary(bin: string, args: string[], label: string): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { maxBuffer: 1024 * 1024 * 64 }, (error, stdout, stderr) => {
      if (error) {
        const err = new Error(`${label} failed: ${error.message}\n${stderr.slice(-4000)}`);
        reject(err);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

export async function runFfmpeg(args: string[], label = 'ffmpeg'): Promise<ExecResult> {
  return retryWithBackoff(() => execBinary(getFfmpegPath(), ['-y', '-hide_banner', '-loglevel', 'error', ...args], label), {
    label,
    retries: 2,
    minDelayMs: 500,
  });
}

export async function runFfprobe(args: string[], label = 'ffprobe'): Promise<ExecResult> {
  return retryWithBackoff(() => execBinary(getFfprobePath(), args, label), { label, retries: 2, minDelayMs: 300 });
}

export async function probeDurationSeconds(filePath: string): Promise<number> {
  const { stdout } = await runFfprobe(
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath],
    `probe duration (${filePath})`,
  );
  const seconds = parseFloat(stdout.trim());
  if (!Number.isFinite(seconds)) throw new Error(`Could not determine duration of ${filePath}`);
  return seconds;
}

export interface VideoDimensions {
  width: number;
  height: number;
}

export async function probeVideoDimensions(filePath: string): Promise<VideoDimensions> {
  const { stdout } = await runFfprobe(
    ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=s=x:p=0', filePath],
    `probe dimensions (${filePath})`,
  );
  const [width, height] = stdout.trim().split('x').map(Number);
  if (!width || !height) throw new Error(`Could not determine dimensions of ${filePath}`);
  return { width, height };
}

/** Mean volume in dBFS, via ffmpeg's volumedetect filter. Used by the quality engine to check audio level. */
export async function probeMeanVolumeDb(filePath: string): Promise<number> {
  // volumedetect prints its stats to stderr regardless of exit code, so we read stderr directly
  // instead of going through runFfmpeg's success/failure branching.
  const { stderr } = await new Promise<ExecResult>((resolve) => {
    execFile(
      getFfmpegPath(),
      ['-y', '-i', filePath, '-af', 'volumedetect', '-f', 'null', '-'],
      { maxBuffer: 1024 * 1024 * 64 },
      (_error, stdout, stderr) => resolve({ stdout, stderr }),
    );
  });
  const match = stderr.match(/mean_volume:\s*(-?\d+(\.\d+)?)\s*dB/);
  if (!match || !match[1]) throw new Error(`Could not read mean volume for ${filePath}`);
  return parseFloat(match[1]);
}

log.debug(`Using ffmpeg at ${getFfmpegPath()}`);
