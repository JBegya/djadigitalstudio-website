import type { GenerationHistoryEntry, GenerationRunProgress, Settings } from '@/types/domain';

export type RedactedSettings = Settings & { hasOpenAiKey: boolean; hasPexelsKey: boolean };

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function getSettings(): Promise<RedactedSettings> {
  return json(await fetch('/api/settings', { cache: 'no-store' }));
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
