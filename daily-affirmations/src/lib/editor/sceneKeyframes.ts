import { Canvas } from 'fabric';
import type { ProductProfile, Storyboard, StoryboardScene, TemplateDefinition, TemplateSlot } from '@/types/domain';
import { buildCanvasFromTemplate, type SlotContent } from './templateToCanvas';
import { exportCanvasToDataUrl } from './exportCanvas';
import { mediaUrl } from '@/lib/api';
import { VIDEO_CANVAS_WIDTH_PX, VIDEO_CANVAS_HEIGHT_PX } from '@/lib/video/constants';

export function buildSceneTemplate(scene: StoryboardScene, product: ProductProfile): TemplateDefinition {
  const slots: TemplateSlot[] = [];
  if (scene.device) {
    slots.push({ key: 'screenshot', kind: 'screenshot', device: scene.device, rect: { xPct: 10, yPct: 8, wPct: 80, hPct: 62 } });
    slots.push({ key: 'onScreenText', kind: 'headline', rect: { xPct: 8, yPct: 74, wPct: 84, hPct: 14 }, style: { fontSize: 46, textAlign: 'center' } });
  } else {
    slots.push({ key: 'onScreenText', kind: 'headline', rect: { xPct: 10, yPct: 40, wPct: 80, hPct: 20 }, style: { fontSize: 58, textAlign: 'center' } });
  }
  // Only add the cta slot when scene.cta is actually set — createSlotObject's 'cta' case
  // unconditionally falls back to a "Learn More" placeholder when content.cta is empty, which
  // would be wrong on the majority of scenes that have no CTA at all (see StoryboardScene.cta's
  // own doc comment: "populated mainly on the closing scene(s); most scenes have none").
  if (scene.cta) {
    slots.push({ key: 'cta', kind: 'cta', rect: { xPct: 30, yPct: 90, wPct: 40, hPct: 6 }, style: { fontSize: 30, textAlign: 'center' } });
    if (product.logoPath) slots.push({ key: 'logo', kind: 'logo', rect: { xPct: 42, yPct: 2, wPct: 16, hPct: 8 } });
  }
  const primary = product.brandColors.primary;
  const secondary = product.brandColors.secondary ?? product.brandColors.accent ?? primary;
  return {
    key: 'video-scene',
    label: 'Video Scene',
    description: 'Internal — renders per-scene video keyframes only, never offered in the Advertisement Wizard.',
    background: { kind: 'gradient', colors: [primary, secondary] },
    slots,
  };
}

/**
 * Renders one keyframe PNG per storyboard scene — the "Generate assets" pipeline stage. Reuses
 * the existing ad-template Fabric pipeline unchanged (a scene is just a synthetic single-slide
 * TemplateDefinition), so a scene's real screenshot (never an AI-invented image) is what actually
 * ends up on screen. Sequential per scene, matching batchGenerate.ts's own "avoid many
 * simultaneous Fabric canvases competing for the same offscreen 2D context pool" rule. Runs
 * client-side only (Fabric needs a real, if detached, canvas) — the caller uploads the resulting
 * data URLs to the server, mirroring how /api/exports already receives an already-rendered
 * dataUrl rather than rendering server-side itself.
 */
export async function renderSceneKeyframes(storyboard: Storyboard, product: ProductProfile): Promise<Array<{ sceneNumber: number; dataUrl: string }>> {
  const results: Array<{ sceneNumber: number; dataUrl: string }> = [];
  for (const scene of storyboard.scenes) {
    const screenshot = scene.screenshotId ? product.screenshots.find((s) => s.id === scene.screenshotId) : undefined;
    const content: SlotContent = {
      headline: scene.onScreenText,
      cta: scene.cta,
      screenshotUrl: screenshot ? mediaUrl(screenshot.path) : undefined,
      logoUrl: scene.cta && product.logoPath ? mediaUrl(product.logoPath) : undefined,
      accentColor: product.brandColors.accent ?? product.brandColors.primary,
    };
    const canvas = new Canvas(document.createElement('canvas'), { width: VIDEO_CANVAS_WIDTH_PX, height: VIDEO_CANVAS_HEIGHT_PX });
    try {
      await buildCanvasFromTemplate(canvas, buildSceneTemplate(scene, product), content, product.fontFamily ?? 'Inter', scene.device);
      const dataUrl = await exportCanvasToDataUrl(canvas, { format: 'png', targetWidthPx: VIDEO_CANVAS_WIDTH_PX, targetHeightPx: VIDEO_CANVAS_HEIGHT_PX });
      results.push({ sceneNumber: scene.number, dataUrl });
    } finally {
      canvas.dispose();
    }
  }
  return results;
}
