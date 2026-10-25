import fs from 'node:fs';
import { createLogger } from '@/server/utils/logger';
import { retryWithBackoff } from '@/server/utils/retry';
import { VIDEO_CANVAS_HEIGHT_PX, VIDEO_CANVAS_WIDTH_PX, VIDEO_FPS } from '@/lib/video/constants';
import { runFfmpeg } from './ffmpeg';
import type { AnimateImageParams, VideoProvider, VideoProviderStatus } from './videoProvider';

const log = createLogger('runwayVideoProvider');

const API_BASE = 'https://api.runwayml.com/v1';
// Pinned to a specific, documented-stable Runway API version — their API is versioned via this
// header specifically so a pinned integration keeps working even as newer versions ship.
const API_VERSION = '2024-11-06';
// Gen-3 Alpha Turbo: fast, cost-effective image-to-video, matches the one third-party-mirrored
// model name confirmed reachable at integration time. If Runway has renamed/retired this by the
// time this runs for real, their API returns a clear 4xx naming the invalid model — update here.
const MODEL = 'gen3a_turbo';
// gen3a_turbo only accepts fixed clip lengths, never an arbitrary duration.
const SUPPORTED_DURATIONS_SECONDS = [5, 10] as const;
// Closest gen3a_turbo portrait ratio to this app's 1080x1920 canvas — the output gets scaled/
// cropped to the exact canvas size during normalization below regardless.
const RATIO = '768:1280';

type RunwayTaskState = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'THROTTLED';

interface RunwayCreateTaskResponse {
  id: string;
}

interface RunwayTaskStatusResponse {
  id: string;
  status: RunwayTaskState;
  output?: string[];
  failure?: string;
  failureCode?: string;
}

function extToMime(ext: string): string {
  return ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
}

function imageToDataUri(imagePath: string): string {
  const buffer = fs.readFileSync(imagePath);
  const ext = imagePath.slice(imagePath.lastIndexOf('.')).toLowerCase();
  return `data:${extToMime(ext)};base64,${buffer.toString('base64')}`;
}

function pickSupportedDuration(requestedSeconds: number): (typeof SUPPORTED_DURATIONS_SECONDS)[number] {
  const maxSupported = SUPPORTED_DURATIONS_SECONDS[SUPPORTED_DURATIONS_SECONDS.length - 1]!;
  if (requestedSeconds > maxSupported) {
    throw new Error(
      `Scene duration ${requestedSeconds}s exceeds Runway's longest supported clip (${maxSupported}s) — shorten this scene's durationSeconds in the storyboard before generating with Runway.`,
    );
  }
  return SUPPORTED_DURATIONS_SECONDS.find((d) => d >= requestedSeconds) ?? maxSupported;
}

class RunwayApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

/**
 * Real image-to-video generation via Runway's API — the first non-Ken-Burns VideoProvider
 * implementation. Runway's task is inherently asynchronous (creation returns a pending task,
 * typically taking tens of seconds to a few minutes to finish), unlike the Ken Burns renderer
 * which blocks until done — videoOrchestrator.ts's animate stage polls checkStatus() in a loop
 * rather than expecting completion on the first call.
 *
 * checkStatus() only receives the provider's own jobId (Runway's task id), not the original
 * outputPath/durationSeconds from animateImage() — this instance is constructed once per video job
 * and reused across every scene in it (see videoProviderFactory.ts), so a short-lived in-memory map
 * from task id -> {outputPath, durationSeconds} bridges the two calls safely for that lifetime.
 */
export class RunwayVideoProvider implements VideoProvider {
  readonly name = 'runway';
  private readonly pendingByTaskId = new Map<string, { outputPath: string; durationSeconds: number }>();

  constructor(private readonly apiKey: string) {}

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'X-Runway-Version': API_VERSION,
      'Content-Type': 'application/json',
    };
  }

  async animateImage(params: AnimateImageParams): Promise<{ jobId: string }> {
    const promptImage = imageToDataUri(params.imagePath);
    const duration = pickSupportedDuration(params.durationSeconds);

    const task = await retryWithBackoff(
      async () => {
        const res = await fetch(`${API_BASE}/image_to_video`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({
            model: MODEL,
            promptImage,
            promptText: params.motionPrompt || undefined,
            duration,
            ratio: RATIO,
          }),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new RunwayApiError(`Runway image_to_video create failed (HTTP ${res.status}): ${text.slice(0, 500)}`, res.status);
        }
        return (await res.json()) as RunwayCreateTaskResponse;
      },
      { label: 'Runway image_to_video create' },
    );

    this.pendingByTaskId.set(task.id, { outputPath: params.outputPath, durationSeconds: params.durationSeconds });
    return { jobId: task.id };
  }

  async checkStatus(handle: { jobId: string }): Promise<VideoProviderStatus> {
    const status = await retryWithBackoff(
      async () => {
        const res = await fetch(`${API_BASE}/tasks/${handle.jobId}`, { method: 'GET', headers: this.headers() });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new RunwayApiError(`Runway task status check failed (HTTP ${res.status}): ${text.slice(0, 500)}`, res.status);
        }
        return (await res.json()) as RunwayTaskStatusResponse;
      },
      { label: 'Runway task status', retries: 2 },
    );

    if (status.status === 'PENDING' || status.status === 'RUNNING') return { status: 'pending' };
    if (status.status === 'FAILED' || status.status === 'THROTTLED') {
      return { status: 'failed', error: status.failure ?? `Runway task ${status.status.toLowerCase()}${status.failureCode ? ` (${status.failureCode})` : ''}` };
    }

    const sourceUrl = status.output?.[0];
    if (!sourceUrl) return { status: 'failed', error: 'Runway reported the task as succeeded but returned no output video URL' };

    const pending = this.pendingByTaskId.get(handle.jobId);
    if (!pending) return { status: 'failed', error: `No local output path recorded for Runway task ${handle.jobId}` };

    await this.downloadAndNormalize(sourceUrl, pending.outputPath, pending.durationSeconds);
    return { status: 'complete', videoPath: pending.outputPath };
  }

  /** Downloads Runway's hosted clip and re-encodes it to exactly match this pipeline's
   * contract for every provider's output: the app's fixed 1080x1920/30fps canvas, trimmed to the
   * scene's exact requested duration (Runway's fixed 5s/10s tiers otherwise wouldn't match), muted
   * (the pipeline supplies its own single continuous voiceover track later, in the compose stage)
   * and re-encoded consistently so ffmpeg's concat filter can safely stitch it with every other
   * scene's clip regardless of what resolution/codec Runway itself returned. */
  private async downloadAndNormalize(sourceUrl: string, outputPath: string, durationSeconds: number): Promise<void> {
    const rawPath = `${outputPath}.raw.mp4`;
    await retryWithBackoff(
      async () => {
        const res = await fetch(sourceUrl);
        if (!res.ok) throw new Error(`Downloading Runway output failed (HTTP ${res.status})`);
        const buffer = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(rawPath, buffer);
      },
      { label: 'Runway output download' },
    );

    try {
      await runFfmpeg(
        [
          '-i',
          rawPath,
          '-t',
          durationSeconds.toFixed(2),
          '-vf',
          `scale=${VIDEO_CANVAS_WIDTH_PX}:${VIDEO_CANVAS_HEIGHT_PX}:force_original_aspect_ratio=increase,crop=${VIDEO_CANVAS_WIDTH_PX}:${VIDEO_CANVAS_HEIGHT_PX}`,
          '-r',
          String(VIDEO_FPS),
          '-an',
          '-c:v',
          'libx264',
          '-preset',
          'fast',
          '-crf',
          '18',
          '-pix_fmt',
          'yuv420p',
          outputPath,
        ],
        'normalize Runway clip',
      );
    } finally {
      fs.rmSync(rawPath, { force: true });
    }
    log.debug(`Normalized Runway clip to ${outputPath}`);
  }
}
