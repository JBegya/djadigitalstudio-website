import fs from 'node:fs';
import type { MarketingPack } from '@/types/domain';
import { getMarketingPacksFilePath } from './paths';

/** Reads/writes the list of Marketing Packs as one JSON file — same fs-backed-singleton shape as
 * CreationsStore/SettingsStore. Constructor-injectable with a file path so tests never touch the
 * real user-data directory. */
export class MarketingPacksStore {
  private cached: MarketingPack[] | null = null;

  constructor(private readonly filePath: string = getMarketingPacksFilePath()) {}

  list(): MarketingPack[] {
    return [...this.load()];
  }

  get(id: string): MarketingPack | null {
    return this.load().find((p) => p.id === id) ?? null;
  }

  /** 1-based, sequential per product+feature — the next pack for a feature is always one more
   * than the highest version seen so far, so a deleted pack never gets its version number reused. */
  nextVersion(productId: string, featureKey: string): number {
    const versions = this.load()
      .filter((p) => p.productId === productId && p.featureKey === featureKey)
      .map((p) => p.version);
    return versions.length > 0 ? Math.max(...versions) + 1 : 1;
  }

  upsert(pack: MarketingPack): MarketingPack {
    const all = this.load();
    const index = all.findIndex((p) => p.id === pack.id);
    const next = index >= 0 ? [...all.slice(0, index), pack, ...all.slice(index + 1)] : [pack, ...all];
    this.cached = next;
    this.persist(next);
    return pack;
  }

  remove(id: string): void {
    const next = this.load().filter((p) => p.id !== id);
    this.cached = next;
    this.persist(next);
  }

  private load(): MarketingPack[] {
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

  private persist(all: MarketingPack[]): void {
    fs.writeFileSync(this.filePath, JSON.stringify(all, null, 2), 'utf-8');
  }
}

export const marketingPacksStore = new MarketingPacksStore();
