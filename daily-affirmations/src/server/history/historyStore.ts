import fs from 'node:fs';
import type { BrandId, GenerationHistoryEntry } from '@/types/domain';
import { getBrand } from '@/server/config/brands';
import { getHistoryFilePath, getUsedAffirmationsFilePath } from '@/server/config/paths';
import { jaccardSimilarity, normalizeForComparison } from '@/server/utils/textStats';

interface UsedAffirmationRecord {
  brand: BrandId;
  topic: string;
  text: string;
  normalized: string;
  date: string;
  createdAt: string;
}

interface UsedAffirmationsFile {
  records: UsedAffirmationRecord[];
}

interface HistoryFile {
  runs: GenerationHistoryEntry[];
}

const DUPLICATE_SIMILARITY_THRESHOLD = 0.55;
const TOPIC_LOOKBACK = 6; // don't reuse the same topic within this many most-recent affirmations for the brand

function readJson<T>(file: string, fallback: T): T {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown): void {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

class HistoryStore {
  private usedCache: UsedAffirmationsFile | null = null;
  private historyCache: HistoryFile | null = null;

  private loadUsed(): UsedAffirmationsFile {
    if (!this.usedCache) this.usedCache = readJson(getUsedAffirmationsFilePath(), { records: [] });
    return this.usedCache;
  }

  private loadHistory(): HistoryFile {
    if (!this.historyCache) this.historyCache = readJson(getHistoryFilePath(), { runs: [] });
    return this.historyCache;
  }

  /** Checks the new affirmation against everything previously generated for this brand. */
  isDuplicate(brand: BrandId, text: string): { duplicate: boolean; closestSimilarity: number; matchedText?: string } {
    const records = this.loadUsed().records.filter((r) => r.brand === brand);
    let closest = 0;
    let matchedText: string | undefined;
    const normalizedNew = normalizeForComparison(text);
    for (const record of records) {
      if (record.normalized === normalizedNew) return { duplicate: true, closestSimilarity: 1, matchedText: record.text };
      const sim = jaccardSimilarity(text, record.text);
      if (sim > closest) {
        closest = sim;
        matchedText = record.text;
      }
    }
    return { duplicate: closest >= DUPLICATE_SIMILARITY_THRESHOLD, closestSimilarity: closest, matchedText };
  }

  /** Most recent affirmation texts for the brand, used to steer the script writer away from repeats. */
  getRecentTexts(brand: BrandId, limit = 8): string[] {
    return this.loadUsed()
      .records.filter((r) => r.brand === brand)
      .slice(-limit)
      .map((r) => r.text);
  }

  recordAffirmation(brand: BrandId, topic: string, text: string, date: string): void {
    const store = this.loadUsed();
    store.records.push({
      brand,
      topic,
      text,
      normalized: normalizeForComparison(text),
      date,
      createdAt: new Date().toISOString(),
    });
    // Cap growth — keep the most recent 2000 per brand, plenty for dedup + rotation.
    const perBrand: Record<string, UsedAffirmationRecord[]> = {};
    for (const rec of store.records) {
      (perBrand[rec.brand] ??= []).push(rec);
    }
    store.records = Object.values(perBrand).flatMap((list) => list.slice(-2000));
    writeJson(getUsedAffirmationsFilePath(), store);
  }

  /** Picks `count` distinct topics for the brand, preferring ones not used in the last TOPIC_LOOKBACK affirmations. */
  pickNextTopics(brand: BrandId, count: number): string[] {
    const brandDef = getBrand(brand);
    const allTopicKeys = brandDef.topics.map((t) => t.key);
    const recent = this.loadUsed()
      .records.filter((r) => r.brand === brand)
      .slice(-TOPIC_LOOKBACK)
      .map((r) => r.topic);

    const fresh = allTopicKeys.filter((k) => !recent.includes(k));
    const pool = fresh.length >= count ? fresh : [...fresh, ...allTopicKeys];

    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const chosen: string[] = [];
    for (const topic of shuffled) {
      if (!chosen.includes(topic)) chosen.push(topic);
      if (chosen.length === count) break;
    }
    // Backfill with random topics (allowing repeats) if the brand has fewer distinct topics than requested.
    while (chosen.length < count) {
      chosen.push(allTopicKeys[Math.floor(Math.random() * allTopicKeys.length)] ?? 'gratitude');
    }
    return chosen;
  }

  recordRun(entry: GenerationHistoryEntry): void {
    const store = this.loadHistory();
    const existingIndex = store.runs.findIndex((r) => r.runId === entry.runId);
    if (existingIndex >= 0) store.runs[existingIndex] = entry;
    else store.runs.unshift(entry);
    store.runs = store.runs.slice(0, 365);
    writeJson(getHistoryFilePath(), store);
  }

  listRuns(limit = 60): GenerationHistoryEntry[] {
    return this.loadHistory().runs.slice(0, limit);
  }

  getRunByDate(date: string): GenerationHistoryEntry | undefined {
    return this.loadHistory().runs.find((r) => r.date === date);
  }

  getRunById(runId: string): GenerationHistoryEntry | undefined {
    return this.loadHistory().runs.find((r) => r.runId === runId);
  }
}

export const historyStore = new HistoryStore();
