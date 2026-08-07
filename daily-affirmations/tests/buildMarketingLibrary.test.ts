import { describe, expect, it } from 'vitest';
import { buildMarketingLibrary, type ProductLibraryGroup } from '@/lib/library/buildMarketingLibrary';
import { DEFAULT_FEATURE_MARKETING, DEFAULT_MARKETING_IDENTITY } from '@/types/domain';
import type { AdCreation, MarketingPack, ProductFeature, ProductProfile } from '@/types/domain';

function firstGroup(groups: ProductLibraryGroup[]): ProductLibraryGroup {
  const group = groups[0];
  if (!group) throw new Error('expected at least one group');
  return group;
}

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
    features: [],
    personas: [],
    keywords: [],
    ...overrides,
  };
}

function sampleFeature(overrides: Partial<ProductFeature> = {}): ProductFeature {
  return { key: 'short-change-detection', label: 'Short Change Detection', description: '', marketing: DEFAULT_FEATURE_MARKETING, ...overrides };
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

function sampleCreation(overrides: Partial<AdCreation> = {}): AdCreation {
  return {
    id: 'ad1',
    productId: 'shiftearn-pro',
    featureKey: 'short-change-detection',
    templateKey: 'apple-hero',
    contentTypeKey: 'facebook-feed',
    headline: '',
    caption: '',
    cta: '',
    hashtags: [],
    thumbnailPath: '',
    exportPaths: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    favorite: false,
    status: 'draft',
    canvasJson: {},
    canvasWidthPx: 1080,
    canvasHeightPx: 1080,
    ...overrides,
  };
}

describe('buildMarketingLibrary', () => {
  it('nests a pack under its feature and lists its assets', () => {
    const product = sampleProduct({ features: [sampleFeature()] });
    const pack = samplePack();
    const asset = sampleCreation({ packId: pack.id });
    const group = firstGroup(buildMarketingLibrary([pack], [asset], [product]));

    expect(group.productName).toBe('ShiftEarn Pro');
    const [featureGroup] = group.features;
    expect(featureGroup?.featureLabel).toBe('Short Change Detection');
    expect(featureGroup?.packs).toHaveLength(1);
    expect(featureGroup?.packs[0]?.pack.version).toBe(1);
    expect(featureGroup?.packs[0]?.assets.map((a) => a.creation.id)).toEqual(['ad1']);
    expect(featureGroup?.standaloneAssets).toEqual([]);
  });

  it('orders multiple packs for the same feature by version, oldest first', () => {
    const product = sampleProduct({ features: [sampleFeature()] });
    const v2 = samplePack({ id: 'pack2', version: 2 });
    const v1 = samplePack({ id: 'pack1', version: 1 });
    // Deliberately pushed newest-first to prove version order, not insertion order, wins.
    const group = firstGroup(buildMarketingLibrary([v2, v1], [], [product]));
    expect(group.features[0]?.packs.map((p) => p.pack.version)).toEqual([1, 2]);
  });

  it('keeps creations with no packId as standalone assets instead of dropping them', () => {
    const product = sampleProduct({ features: [sampleFeature()] });
    const standalone = sampleCreation({ packId: undefined });
    const group = firstGroup(buildMarketingLibrary([], [standalone], [product]));
    expect(group.features[0]?.packs).toEqual([]);
    expect(group.features[0]?.standaloneAssets.map((a) => a.creation.id)).toEqual(['ad1']);
  });

  it('routes standalone creations with no featureKey into an Ungrouped bucket', () => {
    const product = sampleProduct();
    const creation = sampleCreation({ packId: undefined, featureKey: undefined });
    const group = firstGroup(buildMarketingLibrary([], [creation], [product]));
    expect(group.features[0]?.featureLabel).toBe('Ungrouped');
  });

  it('falls back to the raw productId/featureKey when the product or feature no longer exists', () => {
    const pack = samplePack({ productId: 'deleted-product', featureKey: 'deleted-feature' });
    const group = firstGroup(buildMarketingLibrary([pack], [], []));
    expect(group.productName).toBe('deleted-product');
    expect(group.features[0]?.featureLabel).toBe('deleted-feature');
  });

  it('an empty pack (generation failed before any asset saved) still appears with no assets', () => {
    const product = sampleProduct({ features: [sampleFeature()] });
    const pack = samplePack();
    const group = firstGroup(buildMarketingLibrary([pack], [], [product]));
    expect(group.features[0]?.packs[0]?.assets).toEqual([]);
  });
});
