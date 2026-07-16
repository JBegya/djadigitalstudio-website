import fs from 'node:fs';
import path from 'node:path';
import type { BrandId, Settings } from '@/types/domain';
import { getBrand } from '@/server/config/brands';
import { getUsedBackgroundsFilePath } from '@/server/config/paths';
import { createLogger } from '@/server/utils/logger';
import { probeDurationSeconds } from '@/server/video-engine/ffmpeg';
import { downloadVideo, findBackgroundCandidates } from './pexelsClient';
import { generateMockBackground } from './backgroundMediaMock';

const log = createLogger('backgroundMediaService');
const MAX_TRACKED_IDS = 200;

export interface BackgroundResult {
  videoPath: string;
  source: 'pexels' | 'mock';
  pexelsId?: number;
  keyword?: string;
}

export interface BackgroundRequest {
  brand: BrandId;
  topicKey: string;
  durationSeconds: number;
  settings: Settings;
  outputPath: string;
}

interface UsedBackgroundsFile {
  ids: number[];
}

function readUsedIds(): Set<number> {
  const file = getUsedBackgroundsFilePath();
  if (!fs.existsSync(file)) return new Set();
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8')) as UsedBackgroundsFile;
    return new Set(data.ids ?? []);
  } catch {
    return new Set();
  }
}

function recordUsedId(id: number): void {
  const ids = Array.from(readUsedIds());
  ids.push(id);
  const trimmed = ids.slice(-MAX_TRACKED_IDS);
  fs.writeFileSync(getUsedBackgroundsFilePath(), JSON.stringify({ ids: trimmed }, null, 2), 'utf-8');
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export async function fetchBackgroundVideo(request: BackgroundRequest): Promise<BackgroundResult> {
  const { brand, topicKey, settings, outputPath } = request;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  if (!settings.pexelsApiKey) {
    log.info('Test Mode: generating placeholder gradient background');
    await generateMockBackground(brand, request.durationSeconds, outputPath);
    return { videoPath: outputPath, source: 'mock' };
  }

  const brandDef = getBrand(brand);
  const topic = brandDef.topics.find((t) => t.key === topicKey);
  // Exhaust the angle's own emotion-matched keywords first (e.g. burnout's "empty beach
  // overcast sky", "quiet empty road fog") before falling back to the brand's generic mood
  // pool — a specific emotional match should always be preferred over a merely-on-brand one.
  const keywordPool = [...shuffle(topic?.keywords ?? []), ...shuffle(brandDef.backgroundKeywordHints)];
  const excludeIds = readUsedIds();

  for (const keyword of keywordPool) {
    try {
      const candidates = await findBackgroundCandidates(keyword, settings.pexelsApiKey, excludeIds);
      if (candidates.length === 0) continue;
      const pick = candidates[Math.floor(Math.random() * Math.min(3, candidates.length))];
      if (!pick) continue;
      await downloadVideo(pick.downloadUrl, outputPath);

      // A "successful" download can still be a truncated or corrupt file (interrupted
      // connection, disk-full mid-write) — confirm ffmpeg can actually read it before
      // committing to this pick, rather than letting the composer fail on it later with a
      // much less obvious error.
      try {
        await probeDurationSeconds(outputPath);
      } catch (probeError) {
        log.warn(`Downloaded background for "${keyword}" (Pexels #${pick.id}) is unreadable, trying another: ${probeError instanceof Error ? probeError.message : probeError}`);
        fs.rmSync(outputPath, { force: true });
        continue;
      }

      recordUsedId(pick.id);
      return { videoPath: outputPath, source: 'pexels', pexelsId: pick.id, keyword };
    } catch (error) {
      log.warn(`Pexels search failed for keyword "${keyword}": ${error instanceof Error ? error.message : error}`);
    }
  }

  log.warn(`No matching Pexels footage found for ${brand}/${topicKey} after trying ${keywordPool.length} keywords — using placeholder background`);
  await generateMockBackground(brand, request.durationSeconds, outputPath);
  return { videoPath: outputPath, source: 'mock' };
}
