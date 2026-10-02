import type { AssetStatus } from '@/types/domain';

/**
 * The first time something is marked published, stamp it; every later status change — including
 * moving away from and back to 'published' — leaves an already-set date untouched. `publishedAt`
 * always means "first published," never "most recently published."
 */
export function nextPublishedAt(existingPublishedAt: string | undefined, patchStatus: AssetStatus | undefined, now: string): string | undefined {
  if (patchStatus === 'published' && !existingPublishedAt) return now;
  return existingPublishedAt;
}
