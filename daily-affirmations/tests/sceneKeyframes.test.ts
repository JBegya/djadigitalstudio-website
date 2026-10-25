import { describe, expect, it } from 'vitest';
import { buildSceneTemplate } from '@/lib/editor/sceneKeyframes';
import { DEFAULT_MARKETING_IDENTITY } from '@/types/domain';
import type { ProductProfile, StoryboardScene } from '@/types/domain';

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

function sampleScene(overrides: Partial<StoryboardScene> = {}): StoryboardScene {
  return { number: 1, goal: 'Hook', visualDescription: '', onScreenText: 'Hello', voiceover: 'Hello', ...overrides };
}

describe('buildSceneTemplate', () => {
  it('never includes a cta slot for a scene with no cta set', () => {
    const template = buildSceneTemplate(sampleScene({ cta: undefined }), sampleProduct());
    expect(template.slots.some((s) => s.kind === 'cta')).toBe(false);
  });

  it('includes a cta slot only when the scene has a cta', () => {
    const template = buildSceneTemplate(sampleScene({ cta: 'Download now' }), sampleProduct());
    expect(template.slots.some((s) => s.kind === 'cta')).toBe(true);
  });

  it('includes a logo slot alongside cta only when the product has a logo', () => {
    const withLogo = buildSceneTemplate(sampleScene({ cta: 'Download now' }), sampleProduct({ logoPath: '/path/logo.png' }));
    expect(withLogo.slots.some((s) => s.kind === 'logo')).toBe(true);

    const withoutLogo = buildSceneTemplate(sampleScene({ cta: 'Download now' }), sampleProduct({ logoPath: undefined }));
    expect(withoutLogo.slots.some((s) => s.kind === 'logo')).toBe(false);
  });

  it('never includes a logo slot when there is no cta, even if the product has a logo', () => {
    const template = buildSceneTemplate(sampleScene({ cta: undefined }), sampleProduct({ logoPath: '/path/logo.png' }));
    expect(template.slots.some((s) => s.kind === 'logo')).toBe(false);
  });

  it('includes a screenshot slot only when the scene has a device set', () => {
    const withDevice = buildSceneTemplate(sampleScene({ device: 'iphone' }), sampleProduct());
    expect(withDevice.slots.some((s) => s.kind === 'screenshot')).toBe(true);

    const withoutDevice = buildSceneTemplate(sampleScene({ device: undefined }), sampleProduct());
    expect(withoutDevice.slots.some((s) => s.kind === 'screenshot')).toBe(false);
  });

  it('always includes exactly one headline (onScreenText) slot', () => {
    const template = buildSceneTemplate(sampleScene(), sampleProduct());
    expect(template.slots.filter((s) => s.kind === 'headline')).toHaveLength(1);
  });
});
