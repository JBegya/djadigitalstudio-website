import { describe, expect, it } from 'vitest';
import { computeDashboardSummary, ATTENTION_WORKLIST_LIMIT, RECENT_PACKS_LIMIT } from '@/lib/dashboard/computeDashboard';
import { computeAllCoverage } from '@/lib/coverage/computeCoverage';
import { DEFAULT_FEATURE_MARKETING, DEFAULT_MARKETING_IDENTITY } from '@/types/domain';
import type { AdCreation, MarketingPack, ProductFeature, ProductProfile } from '@/types/domain';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const NOW_MS = new Date('2026-08-07T00:00:00.000Z').getTime();

function sampleFeature(overrides: Partial<ProductFeature> = {}): ProductFeature {
  return { key: 'short-change-detection', label: 'Short Change Detection', description: '', marketing: DEFAULT_FEATURE_MARKETING, ...overrides };
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

function samplePack(overrides: Partial<MarketingPack> = {}): MarketingPack {
  return {
    id: 'pack1',
    productId: 'shiftearn-pro',
    featureKey: 'short-change-detection',
    name: 'Payroll Mistake Story',
    version: 1,
    createdAt: '2026-08-01T00:00:00.000Z',
    status: 'draft',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function sampleAsset(overrides: Partial<AdCreation> = {}): AdCreation {
  return {
    id: 'ad1',
    productId: 'shiftearn-pro',
    packId: 'pack1',
    contentTypeKey: 'facebook-feed',
    templateKey: 'apple-hero',
    headline: '',
    caption: '',
    cta: '',
    hashtags: [],
    thumbnailPath: 'data:image/jpeg;base64,abc',
    exportPaths: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    favorite: false,
    status: 'ready',
    canvasJson: {},
    canvasWidthPx: 1080,
    canvasHeightPx: 1080,
    ...overrides,
  };
}

describe('computeDashboardSummary — production', () => {
  it('reports an all-zero, no-crash baseline for an empty app', () => {
    const summary = computeDashboardSummary([], [], [], {}, 30, 183, NOW_MS);
    expect(summary.production).toMatchObject({
      totalProducts: 0,
      totalPacks: 0,
      totalCreations: 0,
      creationsByStatus: { draft: 0, ready: 0, published: 0, archived: 0 },
      recentPacks: [],
    });
  });

  it('defaults an unset creation status to draft when tallying', () => {
    const creations = [sampleAsset({ id: 'a1', status: undefined }), sampleAsset({ id: 'a2', status: 'published' })];
    const summary = computeDashboardSummary([sampleProduct()], [], creations, {}, 30, 183, NOW_MS);
    expect(summary.production.creationsByStatus).toEqual({ draft: 1, ready: 0, published: 1, archived: 0 });
  });

  it('sorts recentPacks by updatedAt (falling back to createdAt) descending and truncates at the limit', () => {
    const packs = Array.from({ length: RECENT_PACKS_LIMIT + 2 }, (_, i) =>
      samplePack({ id: `p${i}`, name: `Pack ${i}`, createdAt: new Date(NOW_MS - (i + 1) * MS_PER_DAY).toISOString(), updatedAt: undefined }),
    );
    // p0 is newest by createdAt; give the oldest pack a strictly more recent updatedAt so it sorts first instead.
    packs[packs.length - 1] = { ...packs[packs.length - 1]!, updatedAt: new Date(NOW_MS).toISOString() };

    const summary = computeDashboardSummary([sampleProduct()], packs, [], {}, 30, 183, NOW_MS);
    expect(summary.production.recentPacks).toHaveLength(RECENT_PACKS_LIMIT);
    expect(summary.production.recentPacks[0]?.packId).toBe(packs[packs.length - 1]!.id);
  });

  it('falls back to the raw productId when the pack references a product not in the fetched list', () => {
    const packs = [samplePack({ productId: 'ghost-product' })];
    const summary = computeDashboardSummary([sampleProduct()], packs, [], {}, 30, 183, NOW_MS);
    expect(summary.production.recentPacks[0]?.productName).toBe('ghost-product');
  });
});

describe('computeDashboardSummary — publishing', () => {
  it('reports an all-zero baseline with no packs', () => {
    const summary = computeDashboardSummary([sampleProduct()], [], [], {}, 30, 183, NOW_MS);
    expect(summary.publishing).toEqual({
      readyToPublishCount: 0,
      packsNeedingAttentionCount: 0,
      attentionCountsBySeverity: { 'action-required': 0, 'needs-review': 0, suggestion: 0 },
      worklist: [],
    });
  });

  it('excludes a pack that is asset-complete but not itself marked Ready', () => {
    const pack = samplePack({ status: 'published' });
    const assets = [sampleAsset({ status: 'ready' })];
    const summary = computeDashboardSummary([sampleProduct()], [pack], assets, {}, 30, 183, NOW_MS);
    expect(summary.publishing.readyToPublishCount).toBe(0);
  });

  it('counts a ready pack with complete assets toward readyToPublishCount', () => {
    const pack = samplePack({ status: 'ready' });
    const assets = [sampleAsset({ status: 'ready' })];
    const summary = computeDashboardSummary([sampleProduct()], [pack], assets, {}, 30, 183, NOW_MS);
    expect(summary.publishing.readyToPublishCount).toBe(1);
  });

  it('counts a pack with multiple flags of different severities once, under its highestSeverity', () => {
    const pack = samplePack({ status: 'draft', createdAt: new Date(NOW_MS - 40 * MS_PER_DAY).toISOString() }); // needs-review: stale draft
    const assets = [sampleAsset({ status: 'ready', thumbnailPath: '' })]; // action-required: missing thumbnail
    const summary = computeDashboardSummary([sampleProduct()], [pack], assets, {}, 30, 183, NOW_MS);
    expect(summary.publishing.attentionCountsBySeverity['action-required']).toBe(1);
    expect(summary.publishing.attentionCountsBySeverity['needs-review']).toBe(0);
    expect(summary.publishing.packsNeedingAttentionCount).toBe(1);
    expect(summary.publishing.worklist).toHaveLength(1);
    expect(summary.publishing.worklist[0]?.messages.length).toBeGreaterThan(1);
  });

  it('surfaces status-independent flags for an archived pack but never its status-specific ones', () => {
    const archivedPack = samplePack({
      status: 'archived',
      createdAt: new Date(NOW_MS - 400 * MS_PER_DAY).toISOString(),
      publishedAt: new Date(NOW_MS - 400 * MS_PER_DAY).toISOString(),
    });
    const assets = [sampleAsset({ status: 'draft' })]; // would trigger "Ready but contains Draft" if pack were Ready — it isn't
    const summary = computeDashboardSummary([sampleProduct()], [archivedPack], assets, {}, 30, 183, NOW_MS);
    const entry = summary.publishing.worklist.find((w) => w.packId === archivedPack.id);
    expect(entry).toBeDefined();
    expect(entry?.messages.some((m) => m.includes('consider refreshing'))).toBe(true);
    expect(entry?.messages.some((m) => m.includes('Draft for'))).toBe(false);
    expect(entry?.messages.some((m) => m.includes('Marked Ready'))).toBe(false);
  });

  it('caps the worklist at ATTENTION_WORKLIST_LIMIT while packsNeedingAttentionCount stays the true total', () => {
    const packCount = ATTENTION_WORKLIST_LIMIT + 3;
    const packs = Array.from({ length: packCount }, (_, i) => samplePack({ id: `p${i}`, status: 'ready' }));
    // Every pack has zero assets and a required platform configured -> guaranteed action-required.
    const summary = computeDashboardSummary([sampleProduct()], packs, [], { 'shiftearn-pro': ['facebook-feed'] }, 30, 183, NOW_MS);
    expect(summary.publishing.packsNeedingAttentionCount).toBe(packCount);
    expect(summary.publishing.worklist).toHaveLength(ATTENTION_WORKLIST_LIMIT);
  });

  it('flags a pack with zero assets and a configured required platform as action-required, not a crash', () => {
    const pack = samplePack({ status: 'ready' });
    const summary = computeDashboardSummary([sampleProduct()], [pack], [], { 'shiftearn-pro': ['facebook-feed'] }, 30, 183, NOW_MS);
    expect(summary.publishing.attentionCountsBySeverity['action-required']).toBe(1);
  });

  it('resolves required platforms independently per product', () => {
    const productA = sampleProduct({ id: 'product-a', name: 'Product A' });
    const productB = sampleProduct({ id: 'product-b', name: 'Product B' });
    const packA = samplePack({ id: 'pack-a', productId: 'product-a', status: 'ready' });
    const packB = samplePack({ id: 'pack-b', productId: 'product-b', status: 'ready' });
    const assets = [sampleAsset({ id: 'asset-a', productId: 'product-a', packId: 'pack-a', contentTypeKey: 'facebook-feed', status: 'ready' })];

    const summary = computeDashboardSummary(
      [productA, productB],
      [packA, packB],
      assets,
      { 'product-a': ['facebook-feed'] }, // product-a satisfied; product-b unconfigured (no requirement)
      30,
      183,
      NOW_MS,
    );

    expect(summary.publishing.readyToPublishCount).toBe(1); // packA ready; packB has zero assets so not ready
    const packBEntry = summary.publishing.worklist.find((w) => w.packId === 'pack-b');
    expect(packBEntry).toBeUndefined(); // no required platform configured for product-b, so no action-required flag
  });
});

describe('computeDashboardSummary — coverage', () => {
  it('reports an empty coverage summary for zero products', () => {
    const summary = computeDashboardSummary([], [], [], {}, 30, 183, NOW_MS);
    expect(summary.coverage).toEqual({ perProduct: [], lowestCoverageProduct: undefined });
  });

  it('excludes a product with zero features from lowest-coverage eligibility even though its percent is 0', () => {
    const product = sampleProduct({ features: [] });
    const summary = computeDashboardSummary([product], [], [], {}, 30, 183, NOW_MS);
    expect(summary.coverage.lowestCoverageProduct).toBeUndefined();
  });

  it('picks the lowest featureCoveragePercent among eligible products, and the first on a tie', () => {
    const productA = sampleProduct({ id: 'product-a', name: 'Product A', features: [sampleFeature({ key: 'f1' }), sampleFeature({ key: 'f2' })] });
    const productB = sampleProduct({ id: 'product-b', name: 'Product B', features: [sampleFeature({ key: 'f1' }), sampleFeature({ key: 'f2' })] });
    // Both products: 0/2 features covered -> tied at 0%. product-a appears first in the input array.
    const summary = computeDashboardSummary([productA, productB], [], [], {}, 30, 183, NOW_MS);
    expect(summary.coverage.lowestCoverageProduct).toMatchObject({ productId: 'product-a', featureCoveragePercent: 0 });
  });

  it('correctly identifies the true minimum among distinct percentages', () => {
    const productA = sampleProduct({ id: 'product-a', name: 'Product A', features: [sampleFeature({ key: 'f1' })] });
    const productB = sampleProduct({ id: 'product-b', name: 'Product B', features: [sampleFeature({ key: 'f1' }), sampleFeature({ key: 'f2' })] });
    const packs = [samplePack({ productId: 'product-a', featureKey: 'f1' })]; // product-a: 1/1 = 100%; product-b: 0/2 = 0%
    const summary = computeDashboardSummary([productA, productB], packs, [], {}, 30, 183, NOW_MS);
    expect(summary.coverage.lowestCoverageProduct).toMatchObject({ productId: 'product-b', featureCoveragePercent: 0 });
  });

  it('passes perProduct through faithfully, matching computeAllCoverage directly', () => {
    const products = [sampleProduct({ features: [sampleFeature()] })];
    const packs = [samplePack()];
    const summary = computeDashboardSummary(products, packs, [], {}, 30, 183, NOW_MS);
    const direct = computeAllCoverage(products, packs, [], {});
    expect(summary.coverage.perProduct).toEqual(direct);
  });
});
