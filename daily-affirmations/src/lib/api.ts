import type { AdCreation, DeviceKind, MarketingPack, MarketingPackObjective, ProductProfile, Settings, Storyboard, VideoJob } from '@/types/domain';

export type RedactedSettings = Settings & { hasOpenAiKey: boolean; hasVideoProviderKey: boolean };

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

export async function listCreations(): Promise<{ creations: AdCreation[] }> {
  return json(await fetch('/api/creations', { cache: 'no-store' }));
}

export async function getCreation(id: string): Promise<{ creation: AdCreation }> {
  return json(await fetch(`/api/creations/${encodeURIComponent(id)}`, { cache: 'no-store' }));
}

export async function createCreation(creation: Omit<AdCreation, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ creation: AdCreation }> {
  return json(
    await fetch('/api/creations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creation),
    }),
  );
}

export async function updateCreation(id: string, patch: Partial<AdCreation>): Promise<{ creation: AdCreation }> {
  return json(
    await fetch(`/api/creations/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }),
  );
}

export async function deleteCreation(id: string): Promise<{ ok: boolean }> {
  return json(await fetch(`/api/creations/${encodeURIComponent(id)}`, { method: 'DELETE' }));
}

export async function exportAd(payload: { format: 'png' | 'jpg' | 'pdf'; dataUrl: string; productFolderName?: string; fileName?: string }): Promise<{ path: string }> {
  return json(
    await fetch('/api/exports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  );
}

export async function listMarketingPacks(): Promise<{ packs: MarketingPack[] }> {
  return json(await fetch('/api/marketing-packs', { cache: 'no-store' }));
}

export async function createMarketingPack(
  pack: Pick<MarketingPack, 'productId' | 'featureKey' | 'name'> & Partial<Pick<MarketingPack, 'objective' | 'personaId'>>,
): Promise<{ pack: MarketingPack }> {
  return json(
    await fetch('/api/marketing-packs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pack),
    }),
  );
}

export async function updateMarketingPack(id: string, patch: Partial<MarketingPack>): Promise<{ pack: MarketingPack }> {
  return json(
    await fetch(`/api/marketing-packs/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }),
  );
}

export async function deleteMarketingPack(id: string): Promise<{ ok: boolean }> {
  return json(await fetch(`/api/marketing-packs/${encodeURIComponent(id)}`, { method: 'DELETE' }));
}

export async function listProducts(): Promise<{ products: ProductProfile[] }> {
  return json(await fetch('/api/products', { cache: 'no-store' }));
}

export async function getProduct(id: string): Promise<{ product: ProductProfile }> {
  return json(await fetch(`/api/products/${encodeURIComponent(id)}`, { cache: 'no-store' }));
}

export async function createProduct(profile: Pick<ProductProfile, 'id' | 'name'> & Partial<ProductProfile>): Promise<{ product: ProductProfile }> {
  return json(
    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    }),
  );
}

export async function updateProduct(id: string, patch: Partial<ProductProfile>): Promise<{ product: ProductProfile }> {
  return json(
    await fetch(`/api/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }),
  );
}

export async function deleteProduct(id: string): Promise<{ ok: boolean }> {
  return json(await fetch(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE' }));
}

export async function uploadProductLogo(id: string, file: File): Promise<{ product: ProductProfile }> {
  const form = new FormData();
  form.set('kind', 'logo');
  form.set('file', file);
  return json(await fetch(`/api/products/${encodeURIComponent(id)}/assets`, { method: 'POST', body: form }));
}

export async function uploadProductIcon(id: string, file: File): Promise<{ product: ProductProfile }> {
  const form = new FormData();
  form.set('kind', 'icon');
  form.set('file', file);
  return json(await fetch(`/api/products/${encodeURIComponent(id)}/assets`, { method: 'POST', body: form }));
}

export async function uploadProductScreenshot(
  id: string,
  file: File,
  opts: { thumbnail?: Blob; label?: string; device?: DeviceKind } = {},
): Promise<{ product: ProductProfile }> {
  const form = new FormData();
  form.set('kind', 'screenshot');
  form.set('file', file);
  if (opts.thumbnail) form.set('thumbnail', opts.thumbnail, 'thumbnail.jpg');
  if (opts.label) form.set('label', opts.label);
  if (opts.device) form.set('device', opts.device);
  return json(await fetch(`/api/products/${encodeURIComponent(id)}/assets`, { method: 'POST', body: form }));
}

export async function deleteProductLogo(id: string): Promise<{ product: ProductProfile }> {
  return json(await fetch(`/api/products/${encodeURIComponent(id)}/assets?kind=logo`, { method: 'DELETE' }));
}

export async function deleteProductIcon(id: string): Promise<{ product: ProductProfile }> {
  return json(await fetch(`/api/products/${encodeURIComponent(id)}/assets?kind=icon`, { method: 'DELETE' }));
}

export async function deleteProductScreenshot(id: string, screenshotId: string): Promise<{ product: ProductProfile }> {
  return json(
    await fetch(`/api/products/${encodeURIComponent(id)}/assets?kind=screenshot&assetId=${encodeURIComponent(screenshotId)}`, { method: 'DELETE' }),
  );
}

export async function listStoryboards(): Promise<{ storyboards: Storyboard[] }> {
  return json(await fetch('/api/storyboards', { cache: 'no-store' }));
}

export async function generateStoryboard(payload: { packId: string }): Promise<{ storyboard: Storyboard; source: 'openai' | 'mock'; flaggedSceneNumbers: number[] }> {
  return json(
    await fetch('/api/storyboards/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  );
}

export async function updateStoryboard(id: string, patch: Partial<Storyboard>): Promise<{ storyboard: Storyboard }> {
  return json(
    await fetch(`/api/storyboards/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }),
  );
}

export async function deleteStoryboard(id: string): Promise<{ ok: boolean }> {
  return json(await fetch(`/api/storyboards/${encodeURIComponent(id)}`, { method: 'DELETE' }));
}

export async function generateVideo(payload: { storyboardId: string; sceneKeyframes: Array<{ sceneNumber: number; dataUrl: string }> }): Promise<{ jobId: string }> {
  return json(
    await fetch('/api/videos/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  );
}

export async function listVideoJobs(): Promise<{ jobs: VideoJob[] }> {
  return json(await fetch('/api/videos', { cache: 'no-store' }));
}

export async function getVideoJob(id: string): Promise<{ job: VideoJob }> {
  return json(await fetch(`/api/videos/${encodeURIComponent(id)}`, { cache: 'no-store' }));
}

export async function deleteVideoJob(id: string): Promise<{ ok: boolean }> {
  return json(await fetch(`/api/videos/${encodeURIComponent(id)}`, { method: 'DELETE' }));
}

/** Subscribes to a video job's live progress via Server-Sent Events. Returns an unsubscribe
 * function; automatically closes once the job reaches a non-'running' status. */
export function subscribeToVideoJob(id: string, onUpdate: (job: VideoJob) => void, onDone?: () => void): () => void {
  const source = new EventSource(`/api/videos/${encodeURIComponent(id)}/stream`);
  source.onmessage = (event) => {
    const job = JSON.parse(event.data) as VideoJob;
    onUpdate(job);
    if (job.status !== 'running') {
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

export async function getHookSuggestions(payload: {
  productId: string;
  featureKey: string;
  personaId?: string;
  currentHook: string;
  objective?: MarketingPackObjective;
}): Promise<{ suggestions: string[]; source: 'openai' | 'mock' }> {
  return json(
    await fetch('/api/copy-assistant/hook-suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  );
}
