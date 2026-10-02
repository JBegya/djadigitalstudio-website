import { describe, expect, it } from 'vitest';
import { nextPublishedAt } from '@/server/utils/publishing';

const NOW = '2026-08-07T00:00:00.000Z';

describe('nextPublishedAt', () => {
  it('stamps the current time on first transition to published', () => {
    expect(nextPublishedAt(undefined, 'published', NOW)).toBe(NOW);
  });

  it('never overwrites an existing publishedAt on a later status change', () => {
    const original = '2026-01-01T00:00:00.000Z';
    expect(nextPublishedAt(original, 'published', NOW)).toBe(original);
    expect(nextPublishedAt(original, 'archived', NOW)).toBe(original);
    expect(nextPublishedAt(original, 'ready', NOW)).toBe(original);
  });

  it('leaves publishedAt undefined for any non-published status when unset', () => {
    expect(nextPublishedAt(undefined, 'draft', NOW)).toBeUndefined();
    expect(nextPublishedAt(undefined, 'ready', NOW)).toBeUndefined();
    expect(nextPublishedAt(undefined, 'archived', NOW)).toBeUndefined();
    expect(nextPublishedAt(undefined, undefined, NOW)).toBeUndefined();
  });
});
