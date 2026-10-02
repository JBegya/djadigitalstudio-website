import fs from 'node:fs';
import type { VideoJob } from '@/types/domain';
import { getVideoJobsFilePath } from './paths';

/** Reads/writes the list of VideoJobs as one JSON file. Unlike StoryboardsStore/MarketingPacksStore
 * (which cache in memory forever after the first load), this store never caches — it re-reads the
 * file on every call. It doubles as the live progress store: the orchestrator's background job
 * upserts this record after every stage transition while separate GET/SSE routes poll it, and
 * Next.js compiles those as independent module instances that would otherwise never see each
 * other's in-memory state. Reading from disk every time is the only way polling actually observes
 * the orchestrator's progress. Constructor-injectable with a file path so tests never touch the
 * real user-data directory. */
export class VideoJobsStore {
  constructor(private readonly filePath: string = getVideoJobsFilePath()) {}

  list(): VideoJob[] {
    return this.load();
  }

  get(id: string): VideoJob | null {
    return this.load().find((j) => j.id === id) ?? null;
  }

  upsert(job: VideoJob): VideoJob {
    const all = this.load();
    const index = all.findIndex((j) => j.id === job.id);
    const next = index >= 0 ? [...all.slice(0, index), job, ...all.slice(index + 1)] : [job, ...all];
    this.persist(next);
    return job;
  }

  remove(id: string): void {
    const next = this.load().filter((j) => j.id !== id);
    this.persist(next);
  }

  private load(): VideoJob[] {
    if (!fs.existsSync(this.filePath)) return [];
    try {
      const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  private persist(all: VideoJob[]): void {
    fs.writeFileSync(this.filePath, JSON.stringify(all, null, 2), 'utf-8');
  }
}

export const videoJobsStore = new VideoJobsStore();
