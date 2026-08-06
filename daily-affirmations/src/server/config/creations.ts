import fs from 'node:fs';
import type { AdCreation } from '@/types/domain';
import { getCreationsFilePath } from './paths';

/** Reads/writes the list of saved advertisements as one JSON file — mirrors SettingsStore's
 * fs-backed-singleton shape. Constructor-injectable with a file path so tests never touch the
 * real user-data directory. */
export class CreationsStore {
  private cached: AdCreation[] | null = null;

  constructor(private readonly filePath: string = getCreationsFilePath()) {}

  list(): AdCreation[] {
    return [...this.load()];
  }

  get(id: string): AdCreation | null {
    return this.load().find((c) => c.id === id) ?? null;
  }

  upsert(creation: AdCreation): AdCreation {
    const all = this.load();
    const index = all.findIndex((c) => c.id === creation.id);
    const next = index >= 0 ? [...all.slice(0, index), creation, ...all.slice(index + 1)] : [creation, ...all];
    this.cached = next;
    this.persist(next);
    return creation;
  }

  remove(id: string): void {
    const next = this.load().filter((c) => c.id !== id);
    this.cached = next;
    this.persist(next);
  }

  private load(): AdCreation[] {
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

  private persist(all: AdCreation[]): void {
    fs.writeFileSync(this.filePath, JSON.stringify(all, null, 2), 'utf-8');
  }
}

export const creationsStore = new CreationsStore();
