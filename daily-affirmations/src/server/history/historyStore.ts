import fs from 'node:fs';
import type { BrandDefinition, BrandId, GenerationHistoryEntry } from '@/types/domain';
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

export const DUPLICATE_SIMILARITY_THRESHOLD = 0.55;
const TOPIC_LOOKBACK = 6; // don't reuse the same topic within this many most-recent affirmations for the brand

/**
 * Compares `text` against a set of previously-used affirmations and returns the closest match.
 * Pure function of its inputs — kept separate from HistoryStore's disk I/O so the similarity
 * logic itself is directly testable without touching the filesystem.
 */
export function findClosestMatch(
  text: string,
  previous: Array<{ text: string; normalized: string }>,
): { duplicate: boolean; closestSimilarity: number; matchedText?: string } {
  let closest = 0;
  let matchedText: string | undefined;
  const normalizedNew = normalizeForComparison(text);
  for (const record of previous) {
    if (record.normalized === normalizedNew) return { duplicate: true, closestSimilarity: 1, matchedText: record.text };
    const sim = jaccardSimilarity(text, record.text);
    if (sim > closest) {
      closest = sim;
      matchedText = record.text;
    }
  }
  return { duplicate: closest >= DUPLICATE_SIMILARITY_THRESHOLD, closestSimilarity: closest, matchedText };
}

/**
 * Picks `count` distinct topics as a *balanced mix of Content Modes* — the least-recently-used
 * mode goes first (a mode never used yet ranks as maximally overdue), rather than picking
 * topics uniformly at random across the whole pool. Without this, random selection tends to
 * cluster (e.g. three "Burnout" videos and zero "Leadership" ones in a week) purely by chance.
 * Within the chosen mode, prefers an angle not used in the last TOPIC_LOOKBACK affirmations so
 * repeat visits to the same mode still feel specific. Pure function of its inputs — kept
 * separate from HistoryStore's disk I/O so the rotation algorithm itself is directly testable.
 */
export function pickBalancedTopics(
  brandDef: BrandDefinition,
  recentTopicsMostRecentLast: string[],
  count: number,
  enabledModeKeys?: string[],
): string[] {
  const activeModes = enabledModeKeys?.length
    ? brandDef.contentModes.filter((m) => enabledModeKeys.includes(m.key))
    : brandDef.contentModes;
  const modes = activeModes.length > 0 ? activeModes : brandDef.contentModes; // never leave a brand with zero eligible modes

  const topicToMode = new Map(brandDef.topics.map((t) => [t.key, t.mode]));

  // How many affirmations ago each mode was last used, walking back from most recent.
  // A mode that's never appeared ranks as Infinity — maximally overdue, picked first.
  const modeAgo = new Map<string, number>(modes.map((m) => [m.key, Infinity]));
  for (let i = 0; i < recentTopicsMostRecentLast.length; i++) {
    const topicKey = recentTopicsMostRecentLast[recentTopicsMostRecentLast.length - 1 - i];
    const mode = topicKey && topicToMode.get(topicKey);
    if (mode && modeAgo.get(mode) === Infinity) modeAgo.set(mode, i);
  }

  const modeOrder = [...modes].sort((a, b) => (modeAgo.get(b.key) ?? 0) - (modeAgo.get(a.key) ?? 0));
  const chosenModes: string[] = [];
  for (let i = 0; i < count; i++) {
    chosenModes.push((modeOrder[i % modeOrder.length] ?? modeOrder[0])?.key ?? modes[0]?.key ?? '');
  }

  const recentTopicKeys = recentTopicsMostRecentLast.slice(-TOPIC_LOOKBACK);
  // Tracks angles already picked earlier in THIS call so a batch never repeats an angle purely
  // by chance — each slot prefers, in order: not-recent-and-not-yet-chosen, then
  // not-yet-chosen-even-if-recent, and only falls back to a same-batch repeat when a mode's own
  // angle pool is smaller than how many times that mode was chosen (unavoidable in that case).
  const chosenKeys = new Set<string>();
  return chosenModes.map((modeKey) => {
    const angles = brandDef.topics.filter((t) => t.mode === modeKey);
    const notYetChosen = angles.filter((t) => !chosenKeys.has(t.key));
    const fresh = notYetChosen.filter((t) => !recentTopicKeys.includes(t.key));
    const pool = fresh.length > 0 ? fresh : notYetChosen.length > 0 ? notYetChosen : angles;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const key = pick?.key ?? angles[0]?.key ?? modeKey;
    chosenKeys.add(key);
    return key;
  });
}

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
    if (!this.historyCache) {
      const raw = readJson<HistoryFile>(getHistoryFilePath(), { runs: [] });
      // Backfills fields added to VideoResult after some history.json rows were already written
      // (qualityScore, approved) so older runs don't crash the Preview screen on load.
      raw.runs = raw.runs.map((run) => ({
        ...run,
        videos: run.videos.map((video) => ({
          ...video,
          qualityScore: video.qualityScore ?? { emotionalImpact: 0, visualQuality: 0, captionReadability: 0, overall: 0 },
          approved: video.approved ?? false,
        })),
      }));
      this.historyCache = raw;
    }
    return this.historyCache;
  }

  /**
   * Checks the new affirmation against EVERY previously generated affirmation for this brand
   * (up to the most recent 2000, per the cap in recordAffirmation) — not just a short recent
   * window. This is the safety net behind the script writer's own live avoid-list (which only
   * sees the last 10): a near-duplicate of something generated weeks ago still gets caught here
   * and fails the quality engine's Duplicate Check, forcing a script regeneration.
   */
  isDuplicate(brand: BrandId, text: string): { duplicate: boolean; closestSimilarity: number; matchedText?: string } {
    const records = this.loadUsed().records.filter((r) => r.brand === brand);
    return findClosestMatch(text, records);
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

  /** Picks `count` distinct topics for the brand as a balanced mix of Content Modes — see `pickBalancedTopics`. */
  pickNextTopics(brand: BrandId, count: number, enabledModeKeys?: string[]): string[] {
    const brandDef = getBrand(brand);
    const recentTopics = this.loadUsed()
      .records.filter((r) => r.brand === brand)
      .map((r) => r.topic);
    return pickBalancedTopics(brandDef, recentTopics, count, enabledModeKeys);
  }

  recordRun(entry: GenerationHistoryEntry): void {
    const store = this.loadHistory();
    // Also match by date (not just runId): re-triggering a full daily generation for a date
    // that already has an entry mints a brand-new runId, which — without this — would leave the
    // old entry in place and unshift a second row for the same date instead of replacing it.
    const existingIndex = store.runs.findIndex((r) => r.runId === entry.runId || r.date === entry.date);
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

  /** Toggles the reviewed/greenlit flag on one video within a day's run. Returns the updated entry, or null if the date/brand/index doesn't match anything. */
  setVideoApproved(date: string, brand: BrandId, index: number, approved: boolean): GenerationHistoryEntry | null {
    const entry = this.getRunByDate(date);
    const video = entry?.videos.find((v) => v.brand === brand && v.index === index);
    if (!entry || !video) return null;
    video.approved = approved;
    this.recordRun(entry);
    return entry;
  }
}

export const historyStore = new HistoryStore();
