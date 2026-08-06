import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProductStore } from '@/server/config/products';
import type { ProductProfile } from '@/types/domain';

function sampleProfile(overrides: Partial<ProductProfile> = {}): ProductProfile {
  return {
    id: 'shiftearn-pro',
    name: 'ShiftEarn Pro',
    tagline: 'Never miss a shift change again.',
    description: 'Payroll accuracy for shift workers.',
    brandColors: { primary: '#7c9cff', secondary: '#1b1030', accent: '#f5a623' },
    brandGuidelines: { cornerRadiusPx: 16, buttonStyle: 'rounded', preferredBackground: 'solid', logoClearSpacePx: 16, storeBadgeStyle: 'black' },
    status: 'released',
    appStoreUrl: '',
    appStoreAvailability: 'available',
    googlePlayUrl: '',
    googlePlayAvailability: 'available',
    websiteUrl: '',
    privacyUrl: '',
    termsUrl: '',
    screenshots: [],
    features: [],
    targetAudience: [],
    keywords: [],
    ...overrides,
  };
}

describe('ProductStore', () => {
  let bundledDir: string;
  let overlayDir: string;

  beforeEach(() => {
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    bundledDir = path.join(os.tmpdir(), `dja-products-bundled-${stamp}`);
    overlayDir = path.join(os.tmpdir(), `dja-products-overlay-${stamp}`);
    fs.mkdirSync(bundledDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(bundledDir, { recursive: true, force: true });
    fs.rmSync(overlayDir, { recursive: true, force: true });
  });

  function writeBundled(profile: ProductProfile) {
    fs.writeFileSync(path.join(bundledDir, `${profile.id}.json`), JSON.stringify(profile), 'utf-8');
  }

  it('reads a bundled product with no overlay', () => {
    writeBundled(sampleProfile());
    const store = new ProductStore(bundledDir, overlayDir);
    expect(store.get('shiftearn-pro')?.name).toBe('ShiftEarn Pro');
    expect(store.list()).toHaveLength(1);
  });

  it('returns null for an unknown id', () => {
    const store = new ProductStore(bundledDir, overlayDir);
    expect(store.get('nope')).toBeNull();
  });

  it('update() writes a complete overlay that preserves untouched fields', () => {
    writeBundled(sampleProfile());
    const store = new ProductStore(bundledDir, overlayDir);
    store.update('shiftearn-pro', { tagline: 'A new tagline.' });

    const updated = store.get('shiftearn-pro');
    expect(updated?.tagline).toBe('A new tagline.');
    expect(updated?.name).toBe('ShiftEarn Pro');
    expect(updated?.brandColors).toEqual({ primary: '#7c9cff', secondary: '#1b1030', accent: '#f5a623' });

    // A second store instance reading the same overlay dir sees the persisted merge too.
    const reloaded = new ProductStore(bundledDir, overlayDir);
    expect(reloaded.get('shiftearn-pro')?.tagline).toBe('A new tagline.');
  });

  it('update() merges brandColors one level deep instead of replacing the whole object', () => {
    writeBundled(sampleProfile());
    const store = new ProductStore(bundledDir, overlayDir);
    store.update('shiftearn-pro', { brandColors: { primary: '#ffffff' } });

    const updated = store.get('shiftearn-pro');
    expect(updated?.brandColors.primary).toBe('#ffffff');
    expect(updated?.brandColors.secondary).toBe('#1b1030');
    expect(updated?.brandColors.accent).toBe('#f5a623');
  });

  it('update() merges brandGuidelines one level deep instead of replacing the whole object', () => {
    writeBundled(sampleProfile());
    const store = new ProductStore(bundledDir, overlayDir);
    store.update('shiftearn-pro', { brandGuidelines: { cornerRadiusPx: 24 } as ProductProfile['brandGuidelines'] });

    const updated = store.get('shiftearn-pro');
    expect(updated?.brandGuidelines.cornerRadiusPx).toBe(24);
    expect(updated?.brandGuidelines.buttonStyle).toBe('rounded');
    expect(updated?.brandGuidelines.storeBadgeStyle).toBe('black');
  });

  it('update() throws for a product that does not exist', () => {
    const store = new ProductStore(bundledDir, overlayDir);
    expect(() => store.update('nope', { tagline: 'x' })).toThrow(/not found/);
  });

  it('create() adds a brand-new product not present in the bundled seed', () => {
    const store = new ProductStore(bundledDir, overlayDir);
    store.create(sampleProfile({ id: 'new-app', name: 'New App' }));
    expect(store.get('new-app')?.name).toBe('New App');
    expect(store.list()).toHaveLength(1);
  });

  it('create() refuses to overwrite an existing product', () => {
    writeBundled(sampleProfile());
    const store = new ProductStore(bundledDir, overlayDir);
    expect(() => store.create(sampleProfile())).toThrow(/already exists/);
  });

  it('remove() on a bundled product reverts it to bundled defaults rather than deleting it', () => {
    writeBundled(sampleProfile());
    const store = new ProductStore(bundledDir, overlayDir);
    store.update('shiftearn-pro', { tagline: 'Customized.' });
    store.remove('shiftearn-pro');

    expect(store.get('shiftearn-pro')?.tagline).toBe('Never miss a shift change again.');
    expect(store.list()).toHaveLength(1);
  });

  it('remove() on an overlay-only product removes it entirely', () => {
    const store = new ProductStore(bundledDir, overlayDir);
    store.create(sampleProfile({ id: 'new-app', name: 'New App' }));
    store.remove('new-app');

    expect(store.get('new-app')).toBeNull();
    expect(store.list()).toHaveLength(0);
  });

  it('addScreenshot() and removeScreenshot() manage the screenshots array without disturbing other fields', () => {
    writeBundled(sampleProfile());
    const store = new ProductStore(bundledDir, overlayDir);
    store.addScreenshot('shiftearn-pro', { id: 'shot1', path: '/tmp/shot1.png', label: 'Dashboard', device: 'iphone' });
    store.addScreenshot('shiftearn-pro', { id: 'shot2', path: '/tmp/shot2.png', label: 'Timesheet', device: 'iphone' });

    let updated = store.get('shiftearn-pro');
    expect(updated?.screenshots).toHaveLength(2);
    expect(updated?.name).toBe('ShiftEarn Pro');

    store.removeScreenshot('shiftearn-pro', 'shot1');
    updated = store.get('shiftearn-pro');
    expect(updated?.screenshots).toEqual([{ id: 'shot2', path: '/tmp/shot2.png', label: 'Timesheet', device: 'iphone' }]);
  });

  it('tolerates a corrupt overlay file by falling back to the bundled profile', () => {
    writeBundled(sampleProfile());
    fs.mkdirSync(overlayDir, { recursive: true });
    fs.writeFileSync(path.join(overlayDir, 'shiftearn-pro.json'), 'not valid json{{{', 'utf-8');

    const store = new ProductStore(bundledDir, overlayDir);
    expect(store.get('shiftearn-pro')?.name).toBe('ShiftEarn Pro');
  });

  it('backfills brandGuidelines/status/platform-availability on a profile written before those fields existed', () => {
    const legacyProfile = sampleProfile();
    // @ts-expect-error simulating a real profile written to disk before this schema change
    delete legacyProfile.brandGuidelines;
    // @ts-expect-error same — status/availability didn't exist either
    delete legacyProfile.status;
    // @ts-expect-error same
    delete legacyProfile.appStoreAvailability;
    // @ts-expect-error same
    delete legacyProfile.googlePlayAvailability;
    writeBundled(legacyProfile);

    const store = new ProductStore(bundledDir, overlayDir);
    const loaded = store.get('shiftearn-pro');
    expect(loaded?.brandGuidelines).toEqual({
      cornerRadiusPx: 16,
      buttonStyle: 'rounded',
      preferredBackground: 'solid',
      logoClearSpacePx: 16,
      storeBadgeStyle: 'black',
    });
    expect(loaded?.status).toBe('draft');
    expect(loaded?.appStoreAvailability).toBe('not-planned');
    expect(loaded?.googlePlayAvailability).toBe('not-planned');
  });

  it('lists products sorted by name, de-duplicating ids present in both bundled and overlay', () => {
    writeBundled(sampleProfile({ id: 'shifthydrate', name: 'ShiftHydrate' }));
    writeBundled(sampleProfile({ id: 'shiftearn-pro', name: 'ShiftEarn Pro' }));
    const store = new ProductStore(bundledDir, overlayDir);
    store.update('shiftearn-pro', { tagline: 'Customized.' });

    const names = store.list().map((p) => p.name);
    expect(names).toEqual(['ShiftEarn Pro', 'ShiftHydrate']);
  });
});
