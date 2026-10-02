import fs from 'node:fs';
import type { Storyboard } from '@/types/domain';
import { getStoryboardsFilePath } from './paths';

/** Reads/writes the list of Storyboards as one JSON file — same fs-backed-singleton shape as
 * MarketingPacksStore/CreationsStore/SettingsStore. Constructor-injectable with a file path so
 * tests never touch the real user-data directory. */
export class StoryboardsStore {
  private cached: Storyboard[] | null = null;

  constructor(private readonly filePath: string = getStoryboardsFilePath()) {}

  list(): Storyboard[] {
    return [...this.load()];
  }

  get(id: string): Storyboard | null {
    return this.load().find((s) => s.id === id) ?? null;
  }

  upsert(storyboard: Storyboard): Storyboard {
    const all = this.load();
    const index = all.findIndex((s) => s.id === storyboard.id);
    const next = index >= 0 ? [...all.slice(0, index), storyboard, ...all.slice(index + 1)] : [storyboard, ...all];
    this.cached = next;
    this.persist(next);
    return storyboard;
  }

  remove(id: string): void {
    const next = this.load().filter((s) => s.id !== id);
    this.cached = next;
    this.persist(next);
  }

  private load(): Storyboard[] {
    if (this.cached) return this.cached;
    if (!fs.existsSync(this.filePath)) {
      this.cached = [];
      return this.cached;
    }
    try {
      const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
      this.cached = Array.isArray(raw) ? raw : [];
    } catch {
      this.cached = [];
    }
    return this.cached;
  }

  private persist(all: Storyboard[]): void {
    fs.writeFileSync(this.filePath, JSON.stringify(all, null, 2), 'utf-8');
  }
}

export const storyboardsStore = new StoryboardsStore();
