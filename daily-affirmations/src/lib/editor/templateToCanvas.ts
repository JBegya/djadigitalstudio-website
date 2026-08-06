import { Canvas, FabricImage, FabricObject, Gradient, Textbox } from 'fabric';
import type { TemplateDefinition, TemplateSlot } from '@/types/domain';
import { buildDeviceMockupGroup, type MockupDevice } from './deviceMockup';

/** Custom property tagged onto every slot's Fabric object so a reloaded canvas can still
 * identify "this object is the headline slot" without re-running the layout math — needed both
 * for editing (the properties panel) and, later, for pushing AI-regenerated copy in place. */
export const SLOT_KEY_PROP = 'djaSlotKey';
FabricObject.customProperties = [...(FabricObject.customProperties ?? []), SLOT_KEY_PROP];

export interface SlotContent {
  headline?: string;
  subheadline?: string;
  cta?: string;
  featureBullets?: string[];
  screenshotUrl?: string;
  logoUrl?: string;
  storeBadgeUrl?: string;
  accentColor: string;
}

export interface RectPx {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Every template's `style.fontSize` is authored assuming a canvas this wide (matching a
 * standard 1080px-wide platform export). The editor often builds the canvas smaller for
 * on-screen work (see computeWorkingSize) or larger for other content types — fontSize must
 * scale with the actual canvas width or a 64px headline authored for 1080px would occupy nearly
 * a sixth of a 420px-wide working canvas and overflow its slot. Rect positions/sizes don't need
 * this treatment since they're already percentage-based (resolveSlotRect). */
const REFERENCE_CANVAS_WIDTH_PX = 1080;

/** Pure — percentage rect + canvas pixel size → pixel rect. Unit-testable without Fabric. */
export function resolveSlotRect(rect: TemplateSlot['rect'], canvasWidthPx: number, canvasHeightPx: number): RectPx {
  return {
    left: (rect.xPct / 100) * canvasWidthPx,
    top: (rect.yPct / 100) * canvasHeightPx,
    width: (rect.wPct / 100) * canvasWidthPx,
    height: (rect.hPct / 100) * canvasHeightPx,
  };
}

function applyBackground(canvas: Canvas, background: TemplateDefinition['background']): void {
  if (background.kind === 'solid') {
    canvas.backgroundColor = background.colors[0] ?? '#0a0a0c';
    return;
  }
  const colors = background.colors.length > 0 ? background.colors : ['#0a0a0c', '#161620'];
  canvas.backgroundColor = new Gradient({
    type: 'linear',
    coords: { x1: 0, y1: 0, x2: 0, y2: canvas.getHeight() },
    colorStops: colors.map((color, i) => ({ offset: colors.length === 1 ? 0 : i / (colors.length - 1), color })),
  });
}

function makeTextbox(text: string, rect: RectPx, style: TemplateSlot['style'], fontFamily: string, defaultFill: string, fontScale: number): Textbox {
  return new Textbox(text, {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    fontFamily,
    fontSize: Number(style?.fontSize ?? 28) * fontScale,
    fontWeight: String(style?.fontWeight ?? '400'),
    fill: String(style?.fill ?? defaultFill),
    backgroundColor: style?.backgroundColor ? String(style.backgroundColor) : undefined,
    textAlign: (style?.textAlign as Textbox['textAlign']) ?? 'left',
    lineHeight: 1.2,
  });
}

async function makeContainFitImage(url: string | undefined, rect: RectPx): Promise<FabricImage | null> {
  if (!url) return null;
  const img = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' });
  const scale = Math.min(rect.width / (img.width || 1), rect.height / (img.height || 1));
  img.set({
    left: rect.left + (rect.width - (img.width || 0) * scale) / 2,
    top: rect.top + (rect.height - (img.height || 0) * scale) / 2,
    scaleX: scale,
    scaleY: scale,
  });
  return img;
}

async function createSlotObject(
  slot: TemplateSlot,
  rect: RectPx,
  content: SlotContent,
  fontFamily: string,
  fontScale: number,
  deviceOverride?: MockupDevice,
): Promise<FabricObject | null> {
  switch (slot.kind) {
    case 'headline':
      return makeTextbox(content.headline ?? 'Your headline here', rect, slot.style, fontFamily, '#f5f5f7', fontScale);
    case 'subheadline':
      return makeTextbox(content.subheadline ?? 'A short supporting line goes here.', rect, slot.style, fontFamily, '#c9c9d1', fontScale);
    case 'cta':
      return makeTextbox(content.cta ?? 'Learn More', rect, { backgroundColor: content.accentColor, ...slot.style }, fontFamily, '#0a0a0c', fontScale);
    case 'featureBullets':
      return makeTextbox(
        (content.featureBullets ?? ['Feature one', 'Feature two', 'Feature three']).map((b) => `•  ${b}`).join('\n'),
        rect,
        slot.style,
        fontFamily,
        '#c9c9d1',
        fontScale,
      );
    case 'logo':
      return makeContainFitImage(content.logoUrl, rect);
    case 'storeBadge':
      return makeContainFitImage(content.storeBadgeUrl, rect);
    case 'screenshot': {
      const group = await buildDeviceMockupGroup({
        device: deviceOverride ?? slot.device ?? 'iphone',
        boxWidthPx: rect.width,
        boxHeightPx: rect.height,
        screenshotUrl: content.screenshotUrl,
      });
      group.set({ left: rect.left, top: rect.top });
      return group;
    }
    default:
      return null;
  }
}

export async function buildCanvasFromTemplate(
  canvas: Canvas,
  template: TemplateDefinition,
  content: SlotContent,
  fontFamily: string,
  deviceOverride?: MockupDevice,
): Promise<void> {
  canvas.clear();
  applyBackground(canvas, template.background);
  const fontScale = canvas.getWidth() / REFERENCE_CANVAS_WIDTH_PX;
  for (const slot of template.slots) {
    const rect = resolveSlotRect(slot.rect, canvas.getWidth(), canvas.getHeight());
    const obj = await createSlotObject(slot, rect, content, fontFamily, fontScale, deviceOverride);
    if (!obj) continue;
    (obj as FabricObject & Record<string, unknown>)[SLOT_KEY_PROP] = slot.key;
    canvas.add(obj);
  }
  canvas.requestRenderAll();
}

/** Reads the current text of a tagged slot object back out of a live canvas — used at Save time
 * to keep AdCreation's convenience fields (headline/caption/cta) in sync with whatever the user
 * actually typed, without needing to parse canvasJson to display a title in the Library later. */
export function extractSlotText(canvas: Canvas, slotKey: string): string {
  const match = canvas.getObjects().find((o) => (o as FabricObject & Record<string, unknown>)[SLOT_KEY_PROP] === slotKey);
  return match instanceof Textbox ? match.text : '';
}
