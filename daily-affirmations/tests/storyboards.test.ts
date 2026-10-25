import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StoryboardsStore } from '@/server/config/storyboards';
import type { Storyboard } from '@/types/domain';

function sampleStoryboard(overrides: Partial<Storyboard> = {}): Storyboard {
  return {
    id: 'storyboard_test1',
    productId: 'shiftearn-pro',
    featureKey: 'short-change-detection',
    packId: 'pack_test1',
    scenes: [{ number: 1, goal: 'Hook', visualDescription: '', onScreenText: 'Hi', voiceover: 'Hi' }],
    createdAt: '2026-08-06T00:00:00.000Z',
    updatedAt: '2026-08-06T00:00:00.000Z',
    ...overrides,
  };
}

describe('StoryboardsStore', () => {
  let filePath: string;

  beforeEach(() => {
    filePath = path.join(os.tmpdir(), `dja-storyboards-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  });

  afterEach(() => {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });

  it('starts empty when the file does not exist yet', () => {
    const store = new StoryboardsStore(filePath);
    expect(store.list()).toEqual([]);
  });

  it('round-trips a storyboard through upsert, list, and get', () => {
    const store = new StoryboardsStore(filePath);
    const storyboard = sampleStoryboard();
    store.upsert(storyboard);

    expect(store.list()).toEqual([storyboard]);
    expect(store.get('storyboard_test1')).toEqual(storyboard);

    const reloaded = new StoryboardsStore(filePath);
    expect(reloaded.get('storyboard_test1')).toEqual(storyboard);
  });

  it('upsert replaces an existing storyboard with the same id rather than duplicating it', () => {
    const store = new StoryboardsStore(filePath);
    store.upsert(sampleStoryboard());
    const updated = sampleStoryboard({ scenes: [{ number: 1, goal: 'Hook', visualDescription: '', onScreenText: 'Edited', voiceover: 'Edited' }] });
    store.upsert(updated);

    expect(store.list()).toHaveLength(1);
    expect(store.get('storyboard_test1')?.scenes[0]?.onScreenText).toBe('Edited');
  });

  it('remove deletes a storyboard by id', () => {
    const store = new StoryboardsStore(filePath);
    store.upsert(sampleStoryboard());
    store.remove('storyboard_test1');

    expect(store.list()).toEqual([]);
    expect(store.get('storyboard_test1')).toBeNull();
  });

  it('tolerates a corrupt file instead of throwing', () => {
    fs.writeFileSync(filePath, 'not valid json{{{', 'utf-8');
    const store = new StoryboardsStore(filePath);
    expect(store.list()).toEqual([]);
  });
});
