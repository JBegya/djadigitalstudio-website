import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  ffmpegCalls: [] as string[][],
}));

vi.mock('@/server/video-engine/ffmpeg', () => ({
  runFfmpeg: async (args: string[]) => {
    state.ffmpegCalls.push(args);
    // Simulate ffmpeg actually producing the output file the real binary would write.
    const outputPath = args[args.length - 1]!;
    fs.writeFileSync(outputPath, 'fake-normalized-clip');
    return { stdout: '', stderr: '' };
  },
}));

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body, text: async () => JSON.stringify(body) } as unknown as Response;
}

let workDir: string;
let imagePath: string;
let outputPath: string;

beforeEach(() => {
  workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dja-runway-test-'));
  imagePath = path.join(workDir, 'scene-1.png');
  outputPath = path.join(workDir, 'scene-1-clip.mp4');
  fs.writeFileSync(imagePath, 'fake-png-bytes');
  state.ffmpegCalls = [];
  vi.restoreAllMocks();
});

afterEach(() => {
  fs.rmSync(workDir, { recursive: true, force: true });
});

describe('RunwayVideoProvider', () => {
  it('animateImage POSTs image_to_video with a data-URI image and the nearest supported duration tier', async () => {
    const { RunwayVideoProvider } = await import('@/server/video-engine/runwayVideoProvider');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 'task_abc' }));
    vi.stubGlobal('fetch', fetchMock);

    const provider = new RunwayVideoProvider('rw-key');
    const { jobId } = await provider.animateImage({ imagePath, motionPrompt: 'slow push in', durationSeconds: 4, outputPath });

    expect(jobId).toBe('task_abc');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.runwayml.com/v1/image_to_video');
    expect(init.headers.Authorization).toBe('Bearer rw-key');
    expect(init.headers['X-Runway-Version']).toBeTruthy();
    const body = JSON.parse(init.body);
    expect(body.promptImage).toMatch(/^data:image\/png;base64,/);
    expect(body.promptText).toBe('slow push in');
    expect(body.duration).toBe(5); // nearest supported tier at/above a 4s scene
  });

  it('rejects a scene duration longer than the longest supported clip before making any network call', async () => {
    const { RunwayVideoProvider } = await import('@/server/video-engine/runwayVideoProvider');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const provider = new RunwayVideoProvider('rw-key');
    await expect(provider.animateImage({ imagePath, motionPrompt: '', durationSeconds: 15, outputPath })).rejects.toThrow(
      /exceeds Runway's longest supported clip/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('checkStatus reports pending while Runway reports PENDING/RUNNING', async () => {
    const { RunwayVideoProvider } = await import('@/server/video-engine/runwayVideoProvider');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 'task_abc', status: 'RUNNING' }));
    vi.stubGlobal('fetch', fetchMock);

    const provider = new RunwayVideoProvider('rw-key');
    const status = await provider.checkStatus({ jobId: 'task_abc' });
    expect(status).toEqual({ status: 'pending' });
  });

  it("checkStatus reports failed with Runway's own failure message", async () => {
    const { RunwayVideoProvider } = await import('@/server/video-engine/runwayVideoProvider');
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ id: 'task_abc', status: 'FAILED', failure: 'content moderation rejected the input', failureCode: 'MODERATION' }));
    vi.stubGlobal('fetch', fetchMock);

    const provider = new RunwayVideoProvider('rw-key');
    const status = await provider.checkStatus({ jobId: 'task_abc' });
    expect(status).toEqual({ status: 'failed', error: 'content moderation rejected the input' });
  });

  it("on SUCCEEDED, downloads the output and normalizes it to the scene's exact original duration (not Runway's rounded tier)", async () => {
    const { RunwayVideoProvider } = await import('@/server/video-engine/runwayVideoProvider');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const provider = new RunwayVideoProvider('rw-key');
    // animateImage with a 3s scene (rounds up to Runway's 5s tier internally)
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 'task_abc' }));
    await provider.animateImage({ imagePath, motionPrompt: '', durationSeconds: 3, outputPath });

    // checkStatus: succeeded, then the raw video download
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 'task_abc', status: 'SUCCEEDED', output: ['https://cdn.runwayml.com/out/clip.mp4'] }));
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer } as unknown as Response);

    const status = await provider.checkStatus({ jobId: 'task_abc' });

    expect(status).toEqual({ status: 'complete', videoPath: outputPath });
    expect(fs.existsSync(`${outputPath}.raw.mp4`)).toBe(false); // cleaned up after normalization
    expect(state.ffmpegCalls).toHaveLength(1);
    const ffmpegArgs = state.ffmpegCalls[0]!;
    expect(ffmpegArgs[ffmpegArgs.indexOf('-t') + 1]).toBe('3.00'); // the ORIGINAL 3s request, not the 5s Runway tier
    expect(ffmpegArgs).toContain('-an');
    expect(ffmpegArgs.join(' ')).toMatch(/scale=1080:1920/);
  });

  it('checkStatus fails cleanly when Runway reports success but no output URL', async () => {
    const { RunwayVideoProvider } = await import('@/server/video-engine/runwayVideoProvider');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 'task_abc', status: 'SUCCEEDED', output: [] }));
    vi.stubGlobal('fetch', fetchMock);

    const provider = new RunwayVideoProvider('rw-key');
    const status = await provider.checkStatus({ jobId: 'task_abc' });
    expect(status.status).toBe('failed');
  });

  it('exposes a stable provider name', async () => {
    const { RunwayVideoProvider } = await import('@/server/video-engine/runwayVideoProvider');
    expect(new RunwayVideoProvider('rw-key').name).toBe('runway');
  });
});
