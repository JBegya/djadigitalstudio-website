import { describe, expect, it } from 'vitest';
import { computeAttentionFlags, computePackReadiness, resolveReadinessContentTypes } from '@/lib/library/packReadiness';
import type { AdCreation, ContentTypeSpec, MarketingPack } from '@/types/domain';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const NOW_MS = new Date('2026-08-07T00:00:00.000Z').getTime();

function sampleAsset(overrides: Partial<AdCreation> = {}): AdCreation {
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
    status: 'ready',
    canvasJson: {},
    canvasWidthPx: 1080,
    canvasHeightPx: 1080,
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

const FACEBOOK: ContentTypeSpec = { key: 'facebook-feed', label: 'Facebook Feed', widthPx: 1080, heightPx: 1080, exportFormats: ['png', 'jpg'] };
const LINKEDIN: ContentTypeSpec = { key: 'linkedin-post', label: 'LinkedIn Post', widthPx: 1200, heightPx: 1200, exportFormats: ['png', 'jpg'] };

describe('computePackReadiness', () => {
  it('is ready to publish when every asset is ready/published and all required platforms are present', () => {
    const assets = [sampleAsset({ id: 'a1', status: 'ready', contentTypeKey: 'facebook-feed' }), sampleAsset({ id: 'a2', status: 'published', contentTypeKey: 'linkedin-post' })];
    const readiness = computePackReadiness(assets, [FACEBOOK, LINKEDIN]);
    expect(readiness).toMatchObject({ readyCount: 2, totalCount: 2, completionPercent: 100, readyToPublish: true, missingRequiredPlatformLabels: [] });
  });

  it('is not ready when a draft asset remains, with correct counts and percentage', () => {
    const assets = Array.from({ length: 5 }, (_, i) => sampleAsset({ id: `a${i}`, status: i < 2 ? 'ready' : 'draft' }));
    const readiness = computePackReadiness(assets, []);
    expect(readiness.readyCount).toBe(2);
    expect(readiness.totalCount).toBe(5);
    expect(readiness.completionPercent).toBe(40);
    expect(readiness.readyToPublish).toBe(false);
  });

  it('blocks readiness when a required platform is missing even if every generated asset is ready', () => {
    const assets = [sampleAsset({ id: 'a1', status: 'ready', contentTypeKey: 'facebook-feed' })];
    const readiness = computePackReadiness(assets, [FACEBOOK, LINKEDIN]);
    expect(readiness.readyToPublish).toBe(false);
    expect(readiness.missingRequiredPlatformLabels).toEqual(['LinkedIn Post']);
  });

  it('never reports a missing platform when no required platforms are configured', () => {
    const assets = [sampleAsset({ id: 'a1', status: 'ready', contentTypeKey: 'facebook-feed' })];
    const readiness = computePackReadiness(assets, []);
    expect(readiness.missingRequiredPlatformLabels).toEqual([]);
    expect(readiness.readyToPublish).toBe(true);
  });

  it('reports 0% completion, not NaN, when the pack has no assets', () => {
    const readiness = computePackReadiness([], []);
    expect(readiness.completionPercent).toBe(0);
    expect(readiness.readyToPublish).toBe(false);
  });
});

describe('resolveReadinessContentTypes', () => {
  it('returns no required platforms when the product has none configured', () => {
    expect(resolveReadinessContentTypes('shiftearn-pro', {})).toEqual([]);
  });

  it('returns only the configured subset of registered content types', () => {
    const resolved = resolveReadinessContentTypes('shiftearn-pro', { 'shiftearn-pro': ['facebook-feed'] });
    expect(resolved.map((ct) => ct.key)).toEqual(['facebook-feed']);
  });

  it('ignores an unknown configured key rather than crashing', () => {
    const resolved = resolveReadinessContentTypes('shiftearn-pro', { 'shiftearn-pro': ['not-a-real-platform'] });
    expect(resolved).toEqual([]);
  });

  it('resolves each product independently', () => {
    const keys = { 'shiftearn-pro': ['facebook-feed'], shifthydrate: ['linkedin-post'] };
    expect(resolveReadinessContentTypes('shiftearn-pro', keys).map((ct) => ct.key)).toEqual(['facebook-feed']);
    expect(resolveReadinessContentTypes('shifthydrate', keys).map((ct) => ct.key)).toEqual(['linkedin-post']);
  });
});

describe('computeAttentionFlags', () => {
  it('flags action-required for a missing required platform and for a missing thumbnail', () => {
    const pack = samplePack({ status: 'ready' });
    const assets = [sampleAsset({ status: 'ready', thumbnailPath: '' })];
    const readiness = computePackReadiness(assets, [FACEBOOK, LINKEDIN]);
    const attention = computeAttentionFlags(pack, assets, readiness, NOW_MS, 30, 183);
    const messages = attention.flags.filter((f) => f.severity === 'action-required').map((f) => f.message);
    expect(messages.some((m) => m.includes('LinkedIn Post'))).toBe(true);
    expect(messages.some((m) => m.includes('thumbnail'))).toBe(true);
  });

  it('flags needs-review for a draft pack past the reminder threshold, not for a fresh one', () => {
    const oldPack = samplePack({ status: 'draft', createdAt: new Date(NOW_MS - 40 * MS_PER_DAY).toISOString() });
    const freshPack = samplePack({ status: 'draft', createdAt: new Date(NOW_MS - 5 * MS_PER_DAY).toISOString() });
    const assets = [sampleAsset({ status: 'ready' })];
    const readiness = computePackReadiness(assets, []);

    const oldAttention = computeAttentionFlags(oldPack, assets, readiness, NOW_MS, 30, 183);
    expect(oldAttention.flags.some((f) => f.severity === 'needs-review')).toBe(true);

    const freshAttention = computeAttentionFlags(freshPack, assets, readiness, NOW_MS, 30, 183);
    expect(freshAttention.flags.some((f) => f.severity === 'needs-review')).toBe(false);
  });

  it('flags needs-review when a Ready pack still contains a Draft asset', () => {
    const pack = samplePack({ status: 'ready' });
    const assets = [sampleAsset({ id: 'a1', status: 'ready' }), sampleAsset({ id: 'a2', status: 'draft' })];
    const readiness = computePackReadiness(assets, []);
    const attention = computeAttentionFlags(pack, assets, readiness, NOW_MS, 30, 183);
    expect(attention.flags.some((f) => f.severity === 'needs-review' && f.message.includes('Draft'))).toBe(true);
  });

  it('flags suggestion when published past the refresh threshold', () => {
    const pack = samplePack({ status: 'published', publishedAt: new Date(NOW_MS - 200 * MS_PER_DAY).toISOString() });
    const assets = [sampleAsset({ status: 'published' })];
    const readiness = computePackReadiness(assets, []);
    const attention = computeAttentionFlags(pack, assets, readiness, NOW_MS, 30, 183);
    expect(attention.flags.some((f) => f.severity === 'suggestion')).toBe(true);
  });

  it('reports no attention needed for a fully clean, fully-covered, all-ready, recently-published pack', () => {
    const pack = samplePack({ status: 'published', createdAt: new Date(NOW_MS - 2 * MS_PER_DAY).toISOString(), publishedAt: new Date(NOW_MS - 1 * MS_PER_DAY).toISOString() });
    const assets = [sampleAsset({ status: 'published', contentTypeKey: 'facebook-feed', thumbnailPath: 'data:image/jpeg;base64,abc' })];
    const readiness = computePackReadiness(assets, [FACEBOOK]);
    const attention = computeAttentionFlags(pack, assets, readiness, NOW_MS, 30, 183);
    expect(attention).toEqual({ flags: [], needsAttention: false, highestSeverity: undefined });
  });

  it('highestSeverity prioritizes action-required over needs-review over suggestion', () => {
    const pack = samplePack({ status: 'ready', createdAt: new Date(NOW_MS - 40 * MS_PER_DAY).toISOString(), publishedAt: new Date(NOW_MS - 200 * MS_PER_DAY).toISOString() });
    const assets = [sampleAsset({ id: 'a1', status: 'draft', thumbnailPath: '' })];
    const readiness = computePackReadiness(assets, [FACEBOOK]);
    const attention = computeAttentionFlags(pack, assets, readiness, NOW_MS, 30, 183);
    expect(attention.highestSeverity).toBe('action-required');
  });
});
