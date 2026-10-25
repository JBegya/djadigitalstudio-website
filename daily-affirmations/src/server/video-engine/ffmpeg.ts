import { execFile } from 'node:child_process';
import fs from 'node:fs';
import { createLogger } from '@/server/utils/logger';
import { retryWithBackoff } from '@/server/utils/retry';

/** Thrown by execBinary when the process was killed for exceeding FFMPEG_TIMEOUT_MS. A timeout
 * means the input made the decoder/filter graph hang — retrying feeds it the exact same input and
 * will hang again, so this is never worth retrying (unlike a transient exec failure). */
class FfmpegTimeoutError extends Error {}

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

// A malformed/corrupt input image can make ffmpeg's decoder spin forever inside a filter graph
// (e.g. `-loop 1` on an image that never yields a decodable frame) without ever exiting on its
// own — Node's execFile has no default timeout, so that hang would otherwise block the job
// forever instead of failing it. Generous relative to real per-scene render times (a few seconds
// each, confirmed in Test Mode) but still bounded.
const FFMPEG_TIMEOUT_MS = 120_000;

function execBinary(bin: string, args: string[], label: string, timeoutMs: number): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { maxBuffer: 1024 * 1024 * 64, timeout: timeoutMs, killSignal: 'SIGKILL' }, (error, stdout, stderr) => {
      if (error) {
        const timedOut = error.signal === 'SIGKILL' || error.killed;
        if (timedOut) {
          reject(new FfmpegTimeoutError(`${label} timed out after ${timeoutMs}ms\n${stderr.slice(-4000)}`));
          return;
        }
        reject(new Error(`${label} failed: ${error.message}\n${stderr.slice(-4000)}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function shouldRetryExec(error: unknown): boolean {
  return !(error instanceof FfmpegTimeoutError);
}

export async function runFfmpeg(args: string[], label = 'ffmpeg'): Promise<ExecResult> {
  return retryWithBackoff(
    () => execBinary(getFfmpegPath(), ['-y', '-hide_banner', '-loglevel', 'error', ...args], label, FFMPEG_TIMEOUT_MS),
    { label, retries: 2, minDelayMs: 500, shouldRetry: shouldRetryExec },
  );
}

export async function runFfprobe(args: string[], label = 'ffprobe'): Promise<ExecResult> {
  return retryWithBackoff(() => execBinary(getFfprobePath(), args, label, FFMPEG_TIMEOUT_MS), {
    label,
    retries: 2,
    minDelayMs: 300,
    shouldRetry: shouldRetryExec,
  });
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

log.debug(`Using ffmpeg at ${getFfmpegPath()}`);
