import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { downloadVideo, findBackgroundCandidates } from '@/server/media-services/pexelsClient';

function jsonResponse(body: unknown, init: { status?: number; headers?: HeadersInit } = {}) {
  return new Response(JSON.stringify(body), { status: init.status ?? 200, headers: init.headers });
}

function searchResult(videos: Array<{ id: number; height: number; width: number; duration?: number }>) {
  return {
    videos: videos.map((v) => ({
      id: v.id,
      width: v.width,
      height: v.height,
      duration: v.duration ?? 20,
      video_files: [
        { id: v.id * 10, quality: 'hd', file_type: 'video/mp4', width: v.width, height: v.height, link: `https://pexels.test/${v.id}.mp4` },
      ],
    })),
  };
}

describe('findBackgroundCandidates', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns portrait candidates, excluding already-used video IDs', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        searchResult([
          { id: 1, width: 1080, height: 1920 },
          { id: 2, width: 1080, height: 1920 },
          { id: 3, width: 1920, height: 1080 }, // landscape — bestPortraitFile should exclude this one
        ]),
      ),
    );
    const picks = await findBackgroundCandidates('hope', 'test-key', new Set([2]));
    expect(picks.map((p) => p.id)).toEqual([1]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(String(url)).toContain('api.pexels.com/videos/search');
    expect((init.headers as Record<string, string>).Authorization).toBe('test-key');
  });

  it('recovers from a 429 using the synthetic X-Ratelimit-Reset → Retry-After translation', async () => {
    const resetAt = Math.floor(Date.now() / 1000) + 1; // 1 second from now — keep the test fast
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, { status: 429, headers: { 'x-ratelimit-reset': String(resetAt) } }))
      .mockResolvedValueOnce(jsonResponse(searchResult([{ id: 5, width: 1080, height: 1920 }])));
    const picks = await findBackgroundCandidates('calm', 'test-key', new Set());
    expect(picks.map((p) => p.id)).toEqual([5]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  }, 10_000);

  it('fails fast on a 401 (invalid API key) without retrying', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'unauthorized' }, { status: 401 }));
    await expect(findBackgroundCandidates('hope', 'bad-key', new Set())).rejects.toThrow(/401/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('exhausts retries and throws on a persistent 500', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, { status: 500 }));
    await expect(findBackgroundCandidates('hope', 'test-key', new Set())).rejects.toThrow(/500/);
    expect(fetchMock).toHaveBeenCalledTimes(4); // initial attempt + 3 retries
  }, 30_000);

  it('translates a low-level AbortError (what a real timed-out request throws) into a clear message', async () => {
    // Simulates what `fetch` rejects with once fetchWithTimeout's internal AbortController fires
    // on a real request that exceeds SEARCH_TIMEOUT_MS — without needing to actually wait 20s.
    fetchMock.mockImplementation(() => {
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      return Promise.reject(err);
    });
    await expect(findBackgroundCandidates('hope', 'test-key', new Set())).rejects.toThrow(/timed out/);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(0);
  }, 30_000);
});

describe('downloadVideo', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let destinationPath: string;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    destinationPath = path.join(os.tmpdir(), `dja-pexels-download-test-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fs.rmSync(destinationPath, { force: true });
  });

  it('writes the downloaded bytes to disk on success', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    fetchMock.mockResolvedValueOnce(new Response(bytes, { status: 200 }));
    await downloadVideo('https://pexels.test/video.mp4', destinationPath);
    expect(fs.readFileSync(destinationPath)).toEqual(Buffer.from(bytes));
  });

  it('fails fast on a 404 without retrying, and does not write a file', async () => {
    fetchMock.mockResolvedValue(new Response('not found', { status: 404 }));
    await expect(downloadVideo('https://pexels.test/missing.mp4', destinationPath)).rejects.toThrow(/404/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(destinationPath)).toBe(false);
  });
});
