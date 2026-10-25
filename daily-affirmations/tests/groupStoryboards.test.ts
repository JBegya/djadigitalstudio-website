import { describe, expect, it } from 'vitest';
import { groupStoryboardsByProductFeature } from '@/lib/storyboards/groupStoryboards';
import { DEFAULT_FEATURE_MARKETING, DEFAULT_MARKETING_IDENTITY } from '@/types/domain';
import type { MarketingPack, ProductProfile, Storyboard } from '@/types/domain';

function sampleProduct(overrides: Partial<ProductProfile> = {}): ProductProfile {
  return {
    id: 'shiftearn-pro',
    name: 'ShiftEarn Pro',
    tagline: '',
    description: '',
    brandColors: { primary: '#7c9cff' },
    brandGuidelines: { cornerRadiusPx: 16, buttonStyle: 'rounded', preferredBackground: 'solid', logoClearSpacePx: 16, storeBadgeStyle: 'black' },
    marketingIdentity: DEFAULT_MARKETING_IDENTITY,
    status: 'draft',
    appStoreUrl: '',
    appStoreAvailability: 'not-planned',
    googlePlayUrl: '',
    googlePlayAvailability: 'not-planned',
    websiteUrl: '',
    privacyUrl: '',
    termsUrl: '',
    screenshots: [],
    features: [{ key: 'short-change-detection', label: 'Short Change Detection', description: '', marketing: DEFAULT_FEATURE_MARKETING }],
    personas: [],
    keywords: [],
    ...overrides,
  };
}

function samplePack(overrides: Partial<MarketingPack> = {}): MarketingPack {
  return {
    id: 'pack1',
    productId: 'shiftearn-pro',
    featureKey: 'short-change-detection',
    name: 'Payroll Mistake Story',
    version: 1,
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function sampleStoryboard(overrides: Partial<Storyboard> = {}): Storyboard {
  return {
    id: 'storyboard1',
    productId: 'shiftearn-pro',
    featureKey: 'short-change-detection',
    packId: 'pack1',
    scenes: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('groupStoryboardsByProductFeature', () => {
  it('nests a storyboard under its product, feature, and pack', () => {
    const groups = groupStoryboardsByProductFeature([sampleStoryboard()], [samplePack()], [sampleProduct()]);
    expect(groups[0]?.productName).toBe('ShiftEarn Pro');
    expect(groups[0]?.features[0]?.featureLabel).toBe('Short Change Detection');
    expect(groups[0]?.features[0]?.packGroups[0]?.packName).toBe('Payroll Mistake Story (V1)');
    expect(groups[0]?.features[0]?.packGroups[0]?.storyboards).toHaveLength(1);
  });

  it('falls back to the raw id when the product, feature, or pack no longer exists', () => {
    const groups = groupStoryboardsByProductFeature(
      [sampleStoryboard({ productId: 'deleted-product', featureKey: 'deleted-feature', packId: 'deleted-pack' })],
      [],
      [],
    );
    expect(groups[0]?.productName).toBe('deleted-product');
    expect(groups[0]?.features[0]?.featureLabel).toBe('deleted-feature');
    expect(groups[0]?.features[0]?.packGroups[0]?.packName).toBe('deleted-pack');
  });

  it('orders multiple storyboards for the same pack oldest first', () => {
    const older = sampleStoryboard({ id: 's1', createdAt: '2026-08-01T00:00:00.000Z' });
    const newer = sampleStoryboard({ id: 's2', createdAt: '2026-08-05T00:00:00.000Z' });
    // Deliberately pushed newest-first to prove createdAt order, not insertion order, wins.
    const groups = groupStoryboardsByProductFeature([newer, older], [samplePack()], [sampleProduct()]);
    expect(groups[0]?.features[0]?.packGroups[0]?.storyboards.map((s) => s.id)).toEqual(['s1', 's2']);
  });

  it('keeps two different packs for the same feature as independent pack groups', () => {
    const packA = samplePack({ id: 'pack1', name: 'Payroll Mistake Story' });
    const packB = samplePack({ id: 'pack2', name: 'Fast Payout Awareness' });
    const groups = groupStoryboardsByProductFeature(
      [sampleStoryboard({ id: 's1', packId: 'pack1' }), sampleStoryboard({ id: 's2', packId: 'pack2' })],
      [packA, packB],
      [sampleProduct()],
    );
    expect(groups[0]?.features[0]?.packGroups.map((pg) => pg.packId).sort()).toEqual(['pack1', 'pack2']);
  });

  it('returns an empty array for no storyboards', () => {
    expect(groupStoryboardsByProductFeature([], [samplePack()], [sampleProduct()])).toEqual([]);
  });
});
