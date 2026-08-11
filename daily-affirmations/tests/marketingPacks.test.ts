import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MarketingPacksStore } from '@/server/config/marketingPacks';
import type { MarketingPack } from '@/types/domain';

function samplePack(overrides: Partial<MarketingPack> = {}): MarketingPack {
  return {
    id: 'pack_test1',
    productId: 'shiftearn-pro',
    featureKey: 'short-change-detection',
    name: 'Payroll Mistake Story',
    version: 1,
    createdAt: '2026-08-06T00:00:00.000Z',
    status: 'draft',
    updatedAt: '2026-08-06T00:00:00.000Z',
    ...overrides,
  };
}

describe('MarketingPacksStore', () => {
  let filePath: string;

  beforeEach(() => {
    filePath = path.join(os.tmpdir(), `dja-marketing-packs-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  });

  afterEach(() => {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });

  it('starts empty when the file does not exist yet', () => {
    const store = new MarketingPacksStore(filePath);
    expect(store.list()).toEqual([]);
  });

  it('round-trips a pack through upsert, list, and get', () => {
    const store = new MarketingPacksStore(filePath);
    const pack = samplePack();
    store.upsert(pack);

    expect(store.list()).toEqual([pack]);
    expect(store.get('pack_test1')).toEqual(pack);

    const reloaded = new MarketingPacksStore(filePath);
    expect(reloaded.get('pack_test1')).toEqual(pack);
  });

  it('remove deletes a pack by id', () => {
    const store = new MarketingPacksStore(filePath);
    store.upsert(samplePack());
    store.remove('pack_test1');

    expect(store.list()).toEqual([]);
    expect(store.get('pack_test1')).toBeNull();
  });

  it('tolerates a corrupt file instead of throwing', () => {
    fs.writeFileSync(filePath, 'not valid json{{{', 'utf-8');
    const store = new MarketingPacksStore(filePath);
    expect(store.list()).toEqual([]);
  });

  describe('nextVersion', () => {
    it('starts a brand new feature at version 1', () => {
      const store = new MarketingPacksStore(filePath);
      expect(store.nextVersion('shiftearn-pro', 'short-change-detection', 'Payroll Mistake Story')).toBe(1);
    });

    it('increments when regenerating the same named concept', () => {
      const store = new MarketingPacksStore(filePath);
      store.upsert(samplePack({ id: 'p1', version: 1 }));
      expect(store.nextVersion('shiftearn-pro', 'short-change-detection', 'Payroll Mistake Story')).toBe(2);
    });

    it('a different creative concept for the same feature starts at version 1 independently', () => {
      const store = new MarketingPacksStore(filePath);
      store.upsert(samplePack({ id: 'p1', name: 'Payroll Mistake Story', version: 1 }));
      store.upsert(samplePack({ id: 'p2', name: 'Payroll Mistake Story', version: 2 }));
      // A new, differently-named concept for the SAME feature must not continue that numbering.
      expect(store.nextVersion('shiftearn-pro', 'short-change-detection', 'Late Finish Early Start')).toBe(1);
    });

    it('computes from the highest surviving version, not a persistent counter', () => {
      const store = new MarketingPacksStore(filePath);
      store.upsert(samplePack({ id: 'p1', version: 1 }));
      store.upsert(samplePack({ id: 'p2', version: 2 }));
      store.remove('p2');
      expect(store.nextVersion('shiftearn-pro', 'short-change-detection', 'Payroll Mistake Story')).toBe(2);
    });
  });
});
