import { describe, expect, it } from 'vitest';
import { computeAllCoverage, computeProductCoverage } from '@/lib/coverage/computeCoverage';
import { DEFAULT_FEATURE_MARKETING, DEFAULT_MARKETING_IDENTITY } from '@/types/domain';
import type { AdCreation, ContentTypeSpec, CustomerPersona, MarketingPack, ProductFeature, ProductProfile } from '@/types/domain';

function sampleFeature(overrides: Partial<ProductFeature> = {}): ProductFeature {
  return { key: 'short-change-detection', label: 'Short Change Detection', description: '', marketing: DEFAULT_FEATURE_MARKETING, ...overrides };
}

function samplePersona(overrides: Partial<CustomerPersona> = {}): CustomerPersona {
  return {
    id: 'registered-nurse',
    name: 'Registered Nurse',
    occupation: '',
    environment: '',
    biggestProblems: [],
    biggestFears: [],
    biggestFrustrations: [],
    desiredOutcomes: [],
    emotionalTriggers: [],
    storyIdeas: [],
    preferredCommunicationStyle: '',
    ...overrides,
  };
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

function sampleCreation(overrides: Partial<AdCreation> = {}): AdCreation {
  return {
    id: 'ad1',
    productId: 'shiftearn-pro',
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
    canvasJson: {},
    canvasWidthPx: 1080,
    canvasHeightPx: 1080,
    ...overrides,
  };
}

const FACEBOOK: ContentTypeSpec = { key: 'facebook-feed', label: 'Facebook Feed', widthPx: 1080, heightPx: 1080, exportFormats: ['png', 'jpg'] };
const LINKEDIN: ContentTypeSpec = { key: 'linkedin-post', label: 'LinkedIn Post', widthPx: 1200, heightPx: 1200, exportFormats: ['png', 'jpg'] };

describe('computeProductCoverage', () => {
  it('counts a feature as covered by a pack and reports the right percentage', () => {
    const product = sampleProduct({ features: [sampleFeature(), sampleFeature({ key: 'fifo', label: 'FIFO' })] });
    const packs = [samplePack({ featureKey: 'short-change-detection' })];
    const coverage = computeProductCoverage(product, packs, [], []);

    expect(coverage.features).toHaveLength(2);
    expect(coverage.features.find((f) => f.featureKey === 'short-change-detection')).toMatchObject({ packCount: 1, standaloneAssetCount: 0, covered: true });
    expect(coverage.features.find((f) => f.featureKey === 'fifo')).toMatchObject({ packCount: 0, standaloneAssetCount: 0, covered: false });
    expect(coverage.featureCoveragePercent).toBe(50);
  });

  it('counts a feature covered by a standalone asset even with no packs at all', () => {
    const product = sampleProduct({ features: [sampleFeature()] });
    const creations = [sampleCreation({ featureKey: 'short-change-detection', packId: undefined })];
    const coverage = computeProductCoverage(product, [], creations, []);

    expect(coverage.features[0]).toMatchObject({ packCount: 0, standaloneAssetCount: 1, covered: true });
    expect(coverage.featureCoveragePercent).toBe(100);
  });

  it('reports 0%, not NaN, when a product has no features', () => {
    const product = sampleProduct({ features: [] });
    const coverage = computeProductCoverage(product, [], [], []);
    expect(coverage.featureCoveragePercent).toBe(0);
    expect(coverage.features).toEqual([]);
  });

  it('separates the no-persona bucket from real personas without affecting the denominator', () => {
    const product = sampleProduct({ personas: [samplePersona(), samplePersona({ id: 'fifo-worker', name: 'FIFO Worker' })] });
    const packs = [
      samplePack({ id: 'p1', personaId: 'registered-nurse' }),
      samplePack({ id: 'p2', personaId: 'registered-nurse' }),
      samplePack({ id: 'p3', personaId: undefined }),
    ];
    const coverage = computeProductCoverage(product, packs, [], []);

    expect(coverage.personas.find((p) => p.personaId === 'registered-nurse')).toMatchObject({ packCount: 2, covered: true });
    expect(coverage.personas.find((p) => p.personaId === 'fifo-worker')).toMatchObject({ packCount: 0, covered: false });
    expect(coverage.personaCoveragePercent).toBe(50);
    expect(coverage.packsWithNoPersonaCount).toBe(1);
  });

  it('does not count a standalone asset toward persona coverage (packs only)', () => {
    const product = sampleProduct({ personas: [samplePersona()] });
    const creations = [sampleCreation({ packId: undefined })];
    const coverage = computeProductCoverage(product, [], creations, []);
    expect(coverage.personas[0]?.covered).toBe(false);
    expect(coverage.personaCoveragePercent).toBe(0);
  });

  it('checks platform coverage against the given required content types, from pack assets and standalone assets alike', () => {
    const product = sampleProduct();
    const creations = [
      sampleCreation({ id: 'a1', contentTypeKey: 'facebook-feed', packId: 'pack1' }),
      sampleCreation({ id: 'a2', contentTypeKey: 'instagram-post', packId: undefined }),
    ];
    const coverage = computeProductCoverage(product, [], creations, [FACEBOOK, LINKEDIN]);

    expect(coverage.platforms).toEqual([
      { contentTypeKey: 'facebook-feed', label: 'Facebook Feed', covered: true },
      { contentTypeKey: 'linkedin-post', label: 'LinkedIn Post', covered: false },
    ]);
    expect(coverage.platformCoveragePercent).toBe(50);
  });
});

describe('computeAllCoverage', () => {
  it('produces one entry per product, including a product with zero packs/creations', () => {
    const products = [sampleProduct({ id: 'shiftearn-pro', name: 'ShiftEarn Pro' }), sampleProduct({ id: 'shifthydrate', name: 'ShiftHydrate', features: [] })];
    const result = computeAllCoverage(products, [], [], {});

    expect(result).toHaveLength(2);
    expect(result.find((c) => c.productId === 'shifthydrate')).toMatchObject({ featureCoveragePercent: 0, features: [] });
  });

  it('falls back to every registered content type when a product has no required platforms configured', () => {
    const product = sampleProduct();
    const creations = [sampleCreation({ contentTypeKey: 'facebook-feed' })];
    const result = computeAllCoverage([product], [], creations, {});
    const coverage = result[0];
    if (!coverage) throw new Error('expected a coverage entry');
    // No explicit assertion on the exact registered list (that's templates.ts's concern) — just
    // confirm it didn't fall back to an empty list, which would make every platform trivially "covered: false".
    expect(coverage.platforms.length).toBeGreaterThan(0);
  });

  it('respects a configured required-platform list for a specific product', () => {
    const product = sampleProduct({ id: 'shiftearn-pro' });
    const creations = [sampleCreation({ contentTypeKey: 'facebook-feed' })];
    const result = computeAllCoverage([product], [], creations, { 'shiftearn-pro': ['facebook-feed', 'linkedin-post'] });
    const coverage = result[0];
    if (!coverage) throw new Error('expected a coverage entry');

    expect(coverage.platforms.map((p) => p.contentTypeKey).sort()).toEqual(['facebook-feed', 'linkedin-post']);
    expect(coverage.platforms.find((p) => p.contentTypeKey === 'facebook-feed')?.covered).toBe(true);
    expect(coverage.platforms.find((p) => p.contentTypeKey === 'linkedin-post')?.covered).toBe(false);
  });
});
