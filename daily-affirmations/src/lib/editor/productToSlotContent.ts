import type { ProductFeature, ProductProfile, ProductScreenshot } from '@/types/domain';
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
 * SlotContent shape templateToCanvas.ts understands. Fields left unset (featureBullets,
 * storeBadgeUrl) fall through to templateToCanvas.ts's own honest generic placeholders rather
 * than being fabricated here from unrelated data.
 */
export function buildSlotContentFromProduct(
  product: ProductProfile,
  feature: ProductFeature,
  screenshotUrl: string | undefined,
  logoUrl: string | undefined,
): SlotContent {
  return {
    headline: feature.headline ?? feature.label,
    subheadline: feature.subheadline ?? feature.description,
    cta: feature.cta,
    screenshotUrl,
    logoUrl,
    accentColor: feature.accentColor ?? product.brandColors.accent ?? product.brandColors.primary,
  };
}
