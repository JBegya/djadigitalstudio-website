import { Canvas } from 'fabric';
import type { ContentTypeSpec, CustomerPersona, ProductFeature, ProductProfile, TemplateDefinition } from '@/types/domain';
import { buildCanvasFromTemplate } from './templateToCanvas';
import { buildSlotContentFromProduct } from './productToSlotContent';
import { exportCanvasToDataUrl } from './exportCanvas';
import type { MockupDevice } from './deviceMockup';

const THUMBNAIL_WIDTH_PX = 400;

export interface GenerateAdForPlatformParams {
  product: ProductProfile;
  feature: ProductFeature;
  persona: CustomerPersona | null;
  contentType: ContentTypeSpec;
  template: TemplateDefinition;
  screenshotUrl?: string;
  logoUrl?: string;
  fontFamily: string;
  device: MockupDevice;
}

export interface GeneratedAd {
  canvasJson: Record<string, unknown>;
  thumbnailDataUrl: string;
  widthPx: number;
  heightPx: number;
  /** The same headline/subheadline/cta fallback chain that was actually rendered onto the canvas
   * (via buildSlotContentFromProduct) — callers save these verbatim instead of recomputing the
   * fallback chain themselves, which would risk silently drifting out of sync with what render. */
  headline: string;
  subheadline: string;
  cta: string;
}

/**
 * Renders one platform's advertisement without ever attaching a <canvas> to the DOM — Fabric
 * doesn't require it. This is what makes "generate N platform variants in one click" possible
 * without mounting N visible editors: build, render, export, dispose, repeat.
 */
export async function generateAdForPlatform(params: GenerateAdForPlatformParams): Promise<GeneratedAd> {
  const { product, feature, persona, contentType, template, screenshotUrl, logoUrl, fontFamily, device } = params;
  const content = buildSlotContentFromProduct(product, feature, screenshotUrl, logoUrl, persona ?? undefined);

  const canvas = new Canvas(document.createElement('canvas'), { width: contentType.widthPx, height: contentType.heightPx });
  try {
    await buildCanvasFromTemplate(canvas, template, content, fontFamily, device);
    // No requestRenderAll() here — it defers to the next animation frame, which can fire after
    // canvas.dispose() below and crash trying to clear a torn-down context. toDataURL() (inside
    // exportCanvasToDataUrl) already does its own synchronous render, so it's not needed anyway.
    const thumbnailDataUrl = await exportCanvasToDataUrl(canvas, {
      format: 'jpg',
      targetWidthPx: THUMBNAIL_WIDTH_PX,
      targetHeightPx: Math.round((THUMBNAIL_WIDTH_PX * contentType.heightPx) / contentType.widthPx),
      quality: 0.7,
    });
    return {
      canvasJson: canvas.toJSON(),
      thumbnailDataUrl,
      widthPx: contentType.widthPx,
      heightPx: contentType.heightPx,
      headline: content.headline ?? '',
      subheadline: content.subheadline ?? '',
      cta: content.cta ?? '',
    };
  } finally {
    canvas.dispose();
  }
}

/**
 * Generates one advertisement per selected platform, sequentially — sequential avoids many
 * simultaneous Fabric canvases competing for the same offscreen 2D context pool. Each platform
 * uses the first template registered for it (auto-assembly, same "user only adjusts if they
 * want to" philosophy as the single-ad wizard).
 */
export async function generateAdsForPlatforms(
  contentTypes: Array<{ contentType: ContentTypeSpec; template: TemplateDefinition }>,
  base: Omit<GenerateAdForPlatformParams, 'contentType' | 'template'>,
): Promise<Array<GeneratedAd & { contentType: ContentTypeSpec; template: TemplateDefinition }>> {
  const results: Array<GeneratedAd & { contentType: ContentTypeSpec; template: TemplateDefinition }> = [];
  for (const { contentType, template } of contentTypes) {
    const generated = await generateAdForPlatform({ ...base, contentType, template });
    results.push({ ...generated, contentType, template });
  }
  return results;
}
