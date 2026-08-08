import { createCreation, createMarketingPack, mediaUrl } from '@/lib/api';
import { generateAdsForPlatforms } from './batchGenerate';
import { resolveFeatureScreenshot } from './productToSlotContent';
import { CONTENT_TYPES } from '@/server/config/contentTypes';
import { getDefaultTemplateForContentType } from '@/server/config/defaultTemplates';
import type {
  AdCreation,
  ContentTypeSpec,
  CustomerPersona,
  MarketingPack,
  MarketingPackObjective,
  ProductFeature,
  ProductProfile,
  TemplateDefinition,
} from '@/types/domain';

export interface GenerateMarketingPackVersionParams {
  product: ProductProfile;
  feature: ProductFeature;
  persona: CustomerPersona | null;
  contentTypeKeys: string[];
  packName: string;
  hook: string;
  objective?: MarketingPackObjective;
  fontFamily: string;
}

export interface GenerateMarketingPackVersionResult {
  pack: MarketingPack;
  creations: AdCreation[];
  /** Requested platforms with no template configured yet — skipped rather than blocking the rest. */
  skippedPlatformCount: number;
}

/**
 * The full "create a Marketing Pack, render every selected platform with Fabric, save each as an
 * AdCreation" pipeline — used by both the Advertisement Wizard's batch-production step and the
 * Marketing Library's "New Version" shortcut, so the two entry points can never drift apart on
 * what generating a Marketing Pack actually does. Deliberately free of UI concerns: no toasts, no
 * navigation — callers decide their own success/error presentation and what happens next. Throws
 * on invalid input or a failed generation/save step rather than swallowing errors. Device is
 * always 'iphone', matching the existing hardcode this was extracted from.
 */
export async function generateMarketingPackVersion(params: GenerateMarketingPackVersionParams): Promise<GenerateMarketingPackVersionResult> {
  const { product, feature, persona, contentTypeKeys, packName, hook, objective, fontFamily } = params;
  if (contentTypeKeys.length === 0 || !packName.trim() || !hook.trim()) {
    throw new Error('Select at least one platform, and provide a campaign name and hook.');
  }

  const pairs = contentTypeKeys
    .map((key) => {
      const type = CONTENT_TYPES.find((c) => c.key === key);
      const defaultTemplate = getDefaultTemplateForContentType(key);
      return type && defaultTemplate ? { contentType: type, template: defaultTemplate } : null;
    })
    .filter((p): p is { contentType: ContentTypeSpec; template: TemplateDefinition } => p !== null);

  if (pairs.length === 0) {
    throw new Error('None of the selected platforms have a template configured yet.');
  }

  const { pack } = await createMarketingPack({ productId: product.id, featureKey: feature.key, name: packName.trim(), objective, personaId: persona?.id });
  const screenshot = resolveFeatureScreenshot(product, feature);
  const generated = await generateAdsForPlatforms(pairs, {
    product,
    feature,
    persona,
    screenshotUrl: screenshot ? mediaUrl(screenshot.path) : undefined,
    logoUrl: product.logoPath ? mediaUrl(product.logoPath) : undefined,
    fontFamily,
    device: 'iphone',
    headlineOverride: hook.trim(),
  });
  const creations = await Promise.all(
    generated.map((ad) =>
      createCreation({
        productId: product.id,
        featureKey: feature.key,
        packId: pack.id,
        templateKey: ad.template.key,
        contentTypeKey: ad.contentType.key,
        headline: ad.headline,
        caption: ad.subheadline,
        cta: ad.cta,
        hashtags: [],
        thumbnailPath: ad.thumbnailDataUrl,
        exportPaths: [],
        favorite: false,
        status: 'draft',
        canvasJson: ad.canvasJson,
        canvasWidthPx: ad.widthPx,
        canvasHeightPx: ad.heightPx,
      }).then((r) => r.creation),
    ),
  );

  return { pack, creations, skippedPlatformCount: contentTypeKeys.length - pairs.length };
}
