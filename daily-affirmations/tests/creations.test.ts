import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CreationsStore } from '@/server/config/creations';
import type { AdCreation } from '@/types/domain';

function sampleCreation(overrides: Partial<AdCreation> = {}): AdCreation {
  return {
    id: 'ad_test1',
    productId: 'sample',
    templateKey: 'apple-hero',
    contentTypeKey: 'instagram-post',
    headline: 'Never miss a shift change again.',
    caption: 'Real-time alerts the moment your roster updates.',
    cta: 'Download Free',
    hashtags: ['#shiftwork', '#payroll'],
    thumbnailPath: '/tmp/thumb.png',
    exportPaths: ['/tmp/export.png'],
    createdAt: '2026-08-06T00:00:00.000Z',
    updatedAt: '2026-08-06T00:00:00.000Z',
    favorite: false,
    canvasJson: { objects: [], background: '#0a0a0c' },
    canvasWidthPx: 1080,
    canvasHeightPx: 1080,
    ...overrides,
  };
}

describe('CreationsStore', () => {
  let filePath: string;

  beforeEach(() => {
    filePath = path.join(os.tmpdir(), `dja-creations-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  });

  afterEach(() => {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });

  it('starts empty when the file does not exist yet', () => {
    const store = new CreationsStore(filePath);
    expect(store.list()).toEqual([]);
  });

  it('round-trips a creation through upsert, list, and get', () => {
    const store = new CreationsStore(filePath);
    const creation = sampleCreation();
    store.upsert(creation);

    expect(store.list()).toEqual([creation]);
    expect(store.get('ad_test1')).toEqual(creation);

    // A second store instance reading the same file should see the persisted data too.
    const reloaded = new CreationsStore(filePath);
    expect(reloaded.get('ad_test1')).toEqual(creation);
  });

  it('upsert replaces an existing creation by id instead of duplicating it', () => {
    const store = new CreationsStore(filePath);
    store.upsert(sampleCreation());
    const updated = sampleCreation({ headline: 'A new headline.', updatedAt: '2026-08-06T01:00:00.000Z' });
    store.upsert(updated);

    expect(store.list()).toHaveLength(1);
    expect(store.get('ad_test1')?.headline).toBe('A new headline.');
  });

  it('remove deletes a creation by id', () => {
    const store = new CreationsStore(filePath);
    store.upsert(sampleCreation());
    store.remove('ad_test1');

    expect(store.list()).toEqual([]);
    expect(store.get('ad_test1')).toBeNull();
  });

  it('tolerates a corrupt file instead of throwing', () => {
    fs.writeFileSync(filePath, 'not valid json{{{', 'utf-8');
    const store = new CreationsStore(filePath);
    expect(store.list()).toEqual([]);
  });
});
