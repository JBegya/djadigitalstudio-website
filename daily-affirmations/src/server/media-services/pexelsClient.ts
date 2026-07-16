import fs from 'node:fs';
import { createLogger } from '@/server/utils/logger';
import { retryWithBackoff } from '@/server/utils/retry';

const log = createLogger('pexelsClient');

interface PexelsVideoFile {
  id: number;
  quality: string;
  file_type: string;
  width: number;
  height: number;
  link: string;
}

interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  video_files: PexelsVideoFile[];
}

interface PexelsSearchResponse {
  videos: PexelsVideo[];
}

export interface PexelsPick {
  id: number;
  downloadUrl: string;
  width: number;
  height: number;
  durationSeconds: number;
}

class PexelsApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'PexelsApiError';
    this.status = status;
  }
}

async function searchVideos(query: string, apiKey: string, perPage = 12): Promise<PexelsVideo[]> {
  const url = new URL('https://api.pexels.com/videos/search');
  url.searchParams.set('query', query);
  url.searchParams.set('orientation', 'portrait');
  url.searchParams.set('size', 'medium');
  url.searchParams.set('per_page', String(perPage));

  return retryWithBackoff(
    async () => {
      const res = await fetch(url, { headers: { Authorization: apiKey } });
      if (!res.ok) throw new PexelsApiError(`Pexels search failed (${res.status}) for "${query}"`, res.status);
      const data = (await res.json()) as PexelsSearchResponse;
      return data.videos ?? [];
    },
    { label: `Pexels search: ${query}`, retries: 3 },
  );
}

function bestPortraitFile(video: PexelsVideo): PexelsVideoFile | null {
  const mp4Files = video.video_files.filter((f) => f.file_type === 'video/mp4' && f.height > f.width);
  if (mp4Files.length === 0) return null;
  // Prefer the file closest to, but not wildly above, our 1080x1920 target — big saves bandwidth
  // without sacrificing quality after we scale/crop to the final canvas.
  const target = 1920;
  return mp4Files.sort((a, b) => Math.abs(a.height - target) - Math.abs(b.height - target))[0] ?? null;
}

/**
 * Searches Pexels for a keyword and returns the best-matching portrait video candidates,
 * ranked by relevance (Pexels' own ordering), excluding any video IDs already used recently
 * so the same footage doesn't repeat across videos.
 */
export async function findBackgroundCandidates(query: string, apiKey: string, excludeIds: Set<number>): Promise<PexelsPick[]> {
  const videos = await searchVideos(query, apiKey);
  const picks: PexelsPick[] = [];
  for (const video of videos) {
    if (excludeIds.has(video.id)) continue;
    const file = bestPortraitFile(video);
    if (!file) continue;
    picks.push({ id: video.id, downloadUrl: file.link, width: file.width, height: file.height, durationSeconds: video.duration });
  }
  return picks;
}

export async function downloadVideo(url: string, destinationPath: string): Promise<void> {
  await retryWithBackoff(
    async () => {
      const res = await fetch(url);
      if (!res.ok) throw new PexelsApiError(`Pexels download failed (${res.status})`, res.status);
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(destinationPath, buffer);
    },
    { label: `Pexels download: ${url}`, retries: 3 },
  );
  log.info(`Downloaded background video to ${destinationPath}`);
}
