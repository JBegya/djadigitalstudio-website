import type { Settings } from '@/types/domain';

export type RedactedSettings = Settings & { hasOpenAiKey: boolean };

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
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

export async function updateSettings(patch: Partial<Settings>): Promise<RedactedSettings> {
  return json(
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }),
  );
}

export function mediaUrl(filePath: string): string {
  return `/api/media?path=${encodeURIComponent(filePath)}`;
}

export async function openFolder(targetPath: string): Promise<{ ok: boolean; error: string | null }> {
  return json(
    await fetch('/api/system/open-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: targetPath }),
    }),
  );
}

/** Opens the daily log folder — server-resolved, so this works identically in Electron or a plain browser tab. */
export async function openLogsFolder(): Promise<{ ok: boolean; error: string | null }> {
  return json(await fetch('/api/system/open-logs', { method: 'POST' }));
}
