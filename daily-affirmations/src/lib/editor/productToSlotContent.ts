import type { CustomerPersona, ProductFeature, ProductProfile, ProductScreenshot } from '@/types/domain';
import type { SlotContent } from './templateToCanvas';

/** Prefers the feature's suggested screenshot if it still exists on the product (guards against a
 * dangling reference to a screenshot that was since deleted in Brand Manager), else the product's
 * first screenshot, else `undefined` — a first-class "no screenshot yet" state, matching the
 * `ProductScreenshot[]` type's own doc comment that `[]` is expected, not an error. */
export function resolveFeatureScreenshot(product: ProductProfile, feature: ProductFeature): ProductScreenshot | undefined {
  if (feature.suggestedScreenshotId) {
    const suggested = product.screenshots.find((s) => s.id === feature.suggestedScreenshotId);
    if (suggested) return suggested;
  }
  return product.screenshots[0];
}

/**
 * Pure — resolves a product's selected feature plus already-resolved asset URLs into the flat
 * SlotContent shape templateToCanvas.ts understands. Fields with no honest source left unset
 * (featureBullets) fall through to templateToCanvas.ts's own generic placeholders rather than
 * being fabricated here from unrelated data.
 *
 * Headline/subheadline prefer an explicit manual override first (already editable in Brand
 * Manager), then the M5 Marketing Intelligence for this feature (suggestedHook/corePromise —
 * this is the "Advertisement Intelligence Engine" auto-assembly: use what's already stored
 * instead of a generic fallback), then a persona's own story idea if one was selected and the
 * feature itself has nothing more specific, then the generic label/description as a last resort.
 */
export function buildSlotContentFromProduct(
  product: ProductProfile,
  feature: ProductFeature,
  screenshotUrl: string | undefined,
  logoUrl: string | undefined,
  persona?: CustomerPersona,
): SlotContent {
  // marketing.suggestedHook/corePromise are required fields that default to '' when unset —
  // treat empty string as "not provided" (?? alone wouldn't, since '' is neither null nor undefined).
  const suggestedHook = feature.marketing.suggestedHook || undefined;
  const corePromise = feature.marketing.corePromise || undefined;

  return {
    headline: feature.headline ?? suggestedHook ?? persona?.storyIdeas[0] ?? feature.label,
    subheadline: feature.subheadline ?? corePromise ?? feature.description,
    cta: feature.cta,
    screenshotUrl,
    logoUrl,
    // A store badge button only when a real store URL exists to send someone to — never a link to
    // nowhere. Text, not a real Apple/Google badge image, since this project doesn't bundle (and
    // won't fabricate) trademarked badge artwork.
    storeBadgeText: product.appStoreUrl ? 'Download on the App Store' : product.googlePlayUrl ? 'Get it on Google Play' : undefined,
    accentColor: feature.accentColor ?? product.brandColors.accent ?? product.brandColors.primary,
  };
}
