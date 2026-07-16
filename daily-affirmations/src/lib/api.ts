import type { BrandId, ContentMode, GenerationHistoryEntry, GenerationRunProgress, Settings } from '@/types/domain';

export type RedactedSettings = Settings & { hasOpenAiKey: boolean; hasPexelsKey: boolean };

export interface BrandSummary {
  id: BrandId;
  name: string;
  contentModes: ContentMode[];
  accentColor: string;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    // Routes that validate input (e.g. /api/regenerate) respond with { error: "..." } — surface
    // that message directly instead of the raw JSON blob if that's what came back.
    const parsedError = (() => {
      try {
        const parsed = JSON.parse(text) as { error?: unknown };
        return typeof parsed.error === 'string' ? parsed.error : null;
      } catch {
        return null;
      }
    })();
    throw new Error(parsedError || text || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function getSettings(): Promise<RedactedSettings> {
  return json(await fetch('/api/settings', { cache: 'no-store' }));
}

export async function getBrands(): Promise<{ brands: BrandSummary[] }> {
  return json(await fetch('/api/brands', { cache: 'no-store' }));
}

export async function updateSettings(patch: Partial<Settings>): Promise<RedactedSettings> {
  return json(
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }),
  );
}

export async function startGeneration(): Promise<{ runId: string; date: string; alreadyRunning: boolean }> {
  return json(await fetch('/api/generate', { method: 'POST' }));
}

export async function getLatestRun(): Promise<{ run: GenerationRunProgress | null }> {
  return json(await fetch('/api/generate', { cache: 'no-store' }));
}

export function subscribeToRun(runId: string, onUpdate: (run: GenerationRunProgress) => void, onDone?: () => void): () => void {
  const source = new EventSource(`/api/generate/stream?runId=${encodeURIComponent(runId)}`);
  source.onmessage = (event) => {
    const run = JSON.parse(event.data) as GenerationRunProgress;
    onUpdate(run);
    if (run.status !== 'running') {
      source.close();
      onDone?.();
    }
  };
  source.onerror = () => {
    source.close();
    onDone?.();
  };
  return () => source.close();
}

export async function regenerateVideo(date: string, brand: BrandId, index: number): Promise<{ runId: string; jobId: string; date: string; brand: BrandId; index: number }> {
  return json(
    await fetch('/api/regenerate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, brand, index }),
    }),
  );
}

export async function setVideoApproved(date: string, brand: BrandId, index: number, approved: boolean): Promise<{ entry: GenerationHistoryEntry }> {
  return json(
    await fetch('/api/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, brand, index, approved }),
    }),
  );
}

export async function listHistory(limit = 60): Promise<{ runs: GenerationHistoryEntry[] }> {
  return json(await fetch(`/api/history?limit=${limit}`, { cache: 'no-store' }));
}

export async function getHistoryForDate(date: string): Promise<{ entry: GenerationHistoryEntry | null }> {
  return json(await fetch(`/api/history?date=${encodeURIComponent(date)}`, { cache: 'no-store' }));
}

export function mediaUrl(path: string): string {
  return `/api/media?path=${encodeURIComponent(path)}`;
}

export async function openFolder(path: string): Promise<{ ok: boolean; error: string | null }> {
  return json(
    await fetch('/api/system/open-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    }),
  );
}

/** Opens the daily log folder — server-resolved, so this works identically in Electron or a plain browser tab. */
export async function openLogsFolder(): Promise<{ ok: boolean; error: string | null }> {
  return json(await fetch('/api/system/open-logs', { method: 'POST' }));
}
