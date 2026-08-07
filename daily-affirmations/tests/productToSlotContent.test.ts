import { describe, expect, it } from 'vitest';
import { buildSlotContentFromProduct, resolveFeatureScreenshot } from '@/lib/editor/productToSlotContent';
import { DEFAULT_FEATURE_MARKETING, DEFAULT_MARKETING_IDENTITY } from '@/types/domain';
import type { CustomerPersona, ProductFeature, ProductProfile, ProductScreenshot } from '@/types/domain';

function sampleProfile(overrides: Partial<ProductProfile> = {}): ProductProfile {
  return {
    id: 'shiftearn-pro',
    name: 'ShiftEarn Pro',
    tagline: 'Never miss a shift change again.',
    description: 'Payroll accuracy for shift workers.',
    brandColors: { primary: '#7c9cff', secondary: '#1b1030', accent: '#f5a623' },
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
  return { key: 'callback-pay', label: 'Callback Pay', description: 'Automatically calculates callback pay.', marketing: DEFAULT_FEATURE_MARKETING, ...overrides };
}

function sampleScreenshot(overrides: Partial<ProductScreenshot> = {}): ProductScreenshot {
  return { id: 'shot1', path: '/tmp/shot1.png', label: 'Dashboard', device: 'iphone', ...overrides };
}

function samplePersona(overrides: Partial<CustomerPersona> = {}): CustomerPersona {
  return {
    id: 'registered-nurse',
    name: 'Registered Nurse',
    occupation: 'Registered Nurse',
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

  it('headline fallback chain: explicit headline > suggestedHook > persona story idea > label', () => {
    const featureWithHook = sampleFeature({ marketing: { ...DEFAULT_FEATURE_MARKETING, suggestedHook: 'Finished late. Back early.' } });
    expect(buildSlotContentFromProduct(sampleProfile(), featureWithHook, undefined, undefined).headline).toBe('Finished late. Back early.');

    const featureWithHeadlineAndHook = sampleFeature({
      headline: 'Explicit headline wins',
      marketing: { ...DEFAULT_FEATURE_MARKETING, suggestedHook: 'Should be ignored' },
    });
    expect(buildSlotContentFromProduct(sampleProfile(), featureWithHeadlineAndHook, undefined, undefined).headline).toBe('Explicit headline wins');

    const persona = samplePersona({ storyIdeas: ['Late finish. Early start. Confusing payslip.'] });
    expect(buildSlotContentFromProduct(sampleProfile(), sampleFeature(), undefined, undefined, persona).headline).toBe(
      'Late finish. Early start. Confusing payslip.',
    );

    // Feature's own suggestedHook still wins over a persona's story idea when both are present.
    expect(buildSlotContentFromProduct(sampleProfile(), featureWithHook, undefined, undefined, persona).headline).toBe('Finished late. Back early.');

    // Falls all the way through to the label when nothing else is set.
    expect(buildSlotContentFromProduct(sampleProfile(), sampleFeature(), undefined, undefined).headline).toBe('Callback Pay');
  });

  it('subheadline fallback chain: explicit subheadline > corePromise > description', () => {
    const featureWithPromise = sampleFeature({ marketing: { ...DEFAULT_FEATURE_MARKETING, corePromise: 'Know exactly what every shift is worth.' } });
    expect(buildSlotContentFromProduct(sampleProfile(), featureWithPromise, undefined, undefined).subheadline).toBe('Know exactly what every shift is worth.');

    const featureWithBoth = sampleFeature({
      subheadline: 'Explicit subheadline wins',
      marketing: { ...DEFAULT_FEATURE_MARKETING, corePromise: 'Should be ignored' },
    });
    expect(buildSlotContentFromProduct(sampleProfile(), featureWithBoth, undefined, undefined).subheadline).toBe('Explicit subheadline wins');

    expect(buildSlotContentFromProduct(sampleProfile(), sampleFeature(), undefined, undefined).subheadline).toBe('Automatically calculates callback pay.');
  });

  it('storeBadgeText: App Store text when that URL exists, Google Play as fallback, undefined when neither exists', () => {
    const withAppStore = sampleProfile({ appStoreUrl: 'https://apps.apple.com/app/shiftearn-pro' });
    expect(buildSlotContentFromProduct(withAppStore, sampleFeature(), undefined, undefined).storeBadgeText).toBe('Download on the App Store');

    const withGooglePlayOnly = sampleProfile({ googlePlayUrl: 'https://play.google.com/store/apps/details?id=com.shiftearnpro.app' });
    expect(buildSlotContentFromProduct(withGooglePlayOnly, sampleFeature(), undefined, undefined).storeBadgeText).toBe('Get it on Google Play');

    const withNeither = sampleProfile({ appStoreUrl: '', googlePlayUrl: '' });
    expect(buildSlotContentFromProduct(withNeither, sampleFeature(), undefined, undefined).storeBadgeText).toBeUndefined();
  });
});
