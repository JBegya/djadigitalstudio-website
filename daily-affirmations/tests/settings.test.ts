import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SettingsStore } from '@/server/config/settings';

describe('SettingsStore', () => {
  let filePath: string;

  beforeEach(() => {
    filePath = path.join(os.tmpdir(), `dja-settings-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  });

  afterEach(() => {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });

  it('defaults draftReminderDays to 30 and refreshReminderDays to 183 when unset', () => {
    const store = new SettingsStore(filePath);
    const settings = store.load();
    expect(settings.draftReminderDays).toBe(30);
    expect(settings.refreshReminderDays).toBe(183);
    expect(settings.requiredPublishingPlatformKeysByProduct).toEqual({});
  });

  it('round-trips requiredPublishingPlatformKeysByProduct through update/load', () => {
    const store = new SettingsStore(filePath);
    store.update({ requiredPublishingPlatformKeysByProduct: { 'shiftearn-pro': ['facebook-feed', 'instagram-post'] } });

    const reloaded = new SettingsStore(filePath);
    expect(reloaded.load().requiredPublishingPlatformKeysByProduct).toEqual({ 'shiftearn-pro': ['facebook-feed', 'instagram-post'] });
  });

  it('round-trips custom reminder-day values', () => {
    const store = new SettingsStore(filePath);
    store.update({ draftReminderDays: 14, refreshReminderDays: 90 });
    expect(store.load().draftReminderDays).toBe(14);
    expect(store.load().refreshReminderDays).toBe(90);
  });

  it('clamps an out-of-range draftReminderDays into [1, 3650] instead of storing the raw value', () => {
    const store = new SettingsStore(filePath);
    store.update({ draftReminderDays: 0 });
    expect(store.load().draftReminderDays).toBe(1);

    store.update({ draftReminderDays: 999999 });
    expect(store.load().draftReminderDays).toBe(3650);

    store.update({ draftReminderDays: -20 });
    expect(store.load().draftReminderDays).toBe(1);
  });

  it('clamps an out-of-range refreshReminderDays the same way', () => {
    const store = new SettingsStore(filePath);
    store.update({ refreshReminderDays: 0 });
    expect(store.load().refreshReminderDays).toBe(1);

    store.update({ refreshReminderDays: 999999 });
    expect(store.load().refreshReminderDays).toBe(3650);
  });
});
