import { describe, expect, it } from 'vitest';
import { buildSlotContentFromProduct, resolveFeatureScreenshot } from '@/lib/editor/productToSlotContent';
import type { ProductFeature, ProductProfile, ProductScreenshot } from '@/types/domain';

function sampleProfile(overrides: Partial<ProductProfile> = {}): ProductProfile {
  return {
    id: 'shiftearn-pro',
    name: 'ShiftEarn Pro',
    tagline: 'Never miss a shift change again.',
    description: 'Payroll accuracy for shift workers.',
    brandColors: { primary: '#7c9cff', secondary: '#1b1030', accent: '#f5a623' },
    brandGuidelines: { cornerRadiusPx: 16, buttonStyle: 'rounded', preferredBackground: 'solid', logoClearSpacePx: 16, storeBadgeStyle: 'black' },
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
    targetAudience: [],
    keywords: [],
    ...overrides,
  };
}

function sampleFeature(overrides: Partial<ProductFeature> = {}): ProductFeature {
  return { key: 'callback-pay', label: 'Callback Pay', description: 'Automatically calculates callback pay.', ...overrides };
}

function sampleScreenshot(overrides: Partial<ProductScreenshot> = {}): ProductScreenshot {
  return { id: 'shot1', path: '/tmp/shot1.png', label: 'Dashboard', device: 'iphone', ...overrides };
}

describe('resolveFeatureScreenshot', () => {
  it('returns undefined when the product has no screenshots', () => {
    const product = sampleProfile({ screenshots: [] });
    expect(resolveFeatureScreenshot(product, sampleFeature())).toBeUndefined();
  });

  it('falls back to the first screenshot when the feature has no suggestion', () => {
    const shot1 = sampleScreenshot({ id: 'shot1' });
    const shot2 = sampleScreenshot({ id: 'shot2' });
    const product = sampleProfile({ screenshots: [shot1, shot2] });
    expect(resolveFeatureScreenshot(product, sampleFeature())).toBe(shot1);
  });

  it('prefers the suggested screenshot when it exists on the product', () => {
    const shot1 = sampleScreenshot({ id: 'shot1' });
    const shot2 = sampleScreenshot({ id: 'shot2', label: 'Timesheet' });
    const product = sampleProfile({ screenshots: [shot1, shot2] });
    expect(resolveFeatureScreenshot(product, sampleFeature({ suggestedScreenshotId: 'shot2' }))).toBe(shot2);
  });

  it('falls back to the first screenshot when the suggested id is dangling', () => {
    const shot1 = sampleScreenshot({ id: 'shot1' });
    const product = sampleProfile({ screenshots: [shot1] });
    expect(resolveFeatureScreenshot(product, sampleFeature({ suggestedScreenshotId: 'deleted-shot' }))).toBe(shot1);
  });
});

describe('buildSlotContentFromProduct', () => {
  it('uses the feature label/description when headline/subheadline are unset', () => {
    const content = buildSlotContentFromProduct(sampleProfile(), sampleFeature(), undefined, undefined);
    expect(content.headline).toBe('Callback Pay');
    expect(content.subheadline).toBe('Automatically calculates callback pay.');
  });

  it('prefers explicit feature headline/subheadline/cta when set', () => {
    const feature = sampleFeature({ headline: 'Were you paid correctly?', subheadline: 'Automatic short-change detection.', cta: 'Learn More' });
    const content = buildSlotContentFromProduct(sampleProfile(), feature, undefined, undefined);
    expect(content.headline).toBe('Were you paid correctly?');
    expect(content.subheadline).toBe('Automatic short-change detection.');
    expect(content.cta).toBe('Learn More');
  });

  it('leaves cta, featureBullets, and storeBadgeUrl unset when the feature has no cta', () => {
    const content = buildSlotContentFromProduct(sampleProfile(), sampleFeature(), undefined, undefined);
    expect(content.cta).toBeUndefined();
    expect(content.featureBullets).toBeUndefined();
    expect(content.storeBadgeUrl).toBeUndefined();
  });

  it('carries screenshot and logo URLs through verbatim', () => {
    const content = buildSlotContentFromProduct(sampleProfile(), sampleFeature(), '/api/media?path=shot.png', '/api/media?path=logo.png');
    expect(content.screenshotUrl).toBe('/api/media?path=shot.png');
    expect(content.logoUrl).toBe('/api/media?path=logo.png');
  });

  it('accentColor fallback chain: feature accent > brand accent > brand primary', () => {
    const product = sampleProfile({ brandColors: { primary: '#111111', secondary: '#222222', accent: '#333333' } });

    expect(buildSlotContentFromProduct(product, sampleFeature({ accentColor: '#ff0000' }), undefined, undefined).accentColor).toBe('#ff0000');
    expect(buildSlotContentFromProduct(product, sampleFeature(), undefined, undefined).accentColor).toBe('#333333');

    const productNoAccent = sampleProfile({ brandColors: { primary: '#111111', secondary: '#222222' } });
    expect(buildSlotContentFromProduct(productNoAccent, sampleFeature(), undefined, undefined).accentColor).toBe('#111111');
  });
});
