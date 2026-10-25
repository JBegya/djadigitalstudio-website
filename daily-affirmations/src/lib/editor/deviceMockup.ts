import { FabricImage, FabricObject, Group, Rect } from 'fabric';

export type MockupDevice = 'iphone' | 'watch' | 'ipad' | 'mac';

export interface DeviceMockupConfig {
  /** Outer frame's width / height. */
  aspectRatio: number;
  /** Corner radius and bezel width at a 1000px-tall reference frame — scaled proportionally to
   * whatever size the mockup actually renders at, so a small preview and a large export both
   * look like the same device. */
  cornerRadiusPx: number;
  bezelWidthPx: number;
  bezelColor: string;
  accent: 'dynamicIsland' | 'crown' | 'none';
}

const REFERENCE_HEIGHT_PX = 1000;

export const DEVICE_MOCKUPS: Record<MockupDevice, DeviceMockupConfig> = {
  iphone: { aspectRatio: 9 / 19.5, cornerRadiusPx: 55, bezelWidthPx: 14, bezelColor: '#0a0a0c', accent: 'dynamicIsland' },
  watch: { aspectRatio: 0.84, cornerRadiusPx: 60, bezelWidthPx: 34, bezelColor: '#0a0a0c', accent: 'crown' },
  ipad: { aspectRatio: 3 / 4, cornerRadiusPx: 34, bezelWidthPx: 18, bezelColor: '#0a0a0c', accent: 'none' },
  mac: { aspectRatio: 16 / 10, cornerRadiusPx: 20, bezelWidthPx: 22, bezelColor: '#0a0a0c', accent: 'none' },
};

/** Fits a box of the given aspect ratio inside the available space, centered, without exceeding it. */
function containFit(aspectRatio: number, availableW: number, availableH: number): { width: number; height: number; left: number; top: number } {
  const availableRatio = availableW / availableH;
  const width = availableRatio > aspectRatio ? availableH * aspectRatio : availableW;
  const height = availableRatio > aspectRatio ? availableH : availableW / aspectRatio;
  return { width, height, left: (availableW - width) / 2, top: (availableH - height) / 2 };
}

function buildAccentShapes(accent: DeviceMockupConfig['accent'], outerW: number, outerH: number, bezel: number): FabricObject[] {
  if (accent === 'dynamicIsland') {
    const w = outerW * 0.28;
    const h = bezel * 1.6;
    return [new Rect({ left: (outerW - w) / 2, top: bezel * 1.2, width: w, height: h, rx: h / 2, ry: h / 2, fill: '#000000' })];
  }
  if (accent === 'crown') {
    const w = bezel * 1.4;
    const h = outerH * 0.14;
    return [new Rect({ left: outerW - bezel * 0.3, top: (outerH - h) / 2, width: w, height: h, rx: w / 2, ry: w / 2, fill: '#0a0a0c' })];
  }
  return [];
}

/** Computes the placement to scale the screenshot uniformly to fully cover the given box (may
 * overflow), centered — the overflow is hidden by the caller's clipPath, never by
 * cropping/re-encoding the source image. */
function coverFitPlacement(image: FabricImage, boxW: number, boxH: number): { left: number; top: number; scale: number } {
  const scale = Math.max(boxW / (image.width || 1), boxH / (image.height || 1));
  return {
    left: (boxW - (image.width || 0) * scale) / 2,
    top: (boxH - (image.height || 0) * scale) / 2,
    scale,
  };
}

export async function buildDeviceMockupGroup(opts: {
  device: MockupDevice;
  boxWidthPx: number;
  boxHeightPx: number;
  screenshotUrl?: string;
}): Promise<Group> {
  const cfg = DEVICE_MOCKUPS[opts.device];
  const outer = containFit(cfg.aspectRatio, opts.boxWidthPx, opts.boxHeightPx);
  const scaleFactor = outer.height / REFERENCE_HEIGHT_PX;
  const cornerRadius = cfg.cornerRadiusPx * scaleFactor;
  const bezel = cfg.bezelWidthPx * scaleFactor;

  const bezelRect = new Rect({ left: 0, top: 0, width: outer.width, height: outer.height, rx: cornerRadius, ry: cornerRadius, fill: cfg.bezelColor });

  const screenW = outer.width - 2 * bezel;
  const screenH = outer.height - 2 * bezel;

  const groupChildren: FabricObject[] = [bezelRect];

  if (opts.screenshotUrl) {
    const image = await FabricImage.fromURL(opts.screenshotUrl, { crossOrigin: 'anonymous' });
    const placement = coverFitPlacement(image, screenW, screenH);
    // Fabric's Group constructor recomputes each child's position relative to the group's own
    // bounding box once it's built (its default 'fit-content' layout) — an `absolutePositioned`
    // clipPath sized/positioned against the pre-normalization coordinates would silently drift
    // out of alignment once that renormalization runs (this was the actual bug: the screenshot
    // rendered fully invisible because its clip ended up looking at empty canvas space).
    // A non-absolute clipPath sidesteps this entirely — it's centered on the IMAGE's own local
    // center and expressed in the image's pre-scale pixel units, so it rides along with the
    // image through any later repositioning. Dividing by `placement.scale` converts the desired
    // screenW×screenH canvas-pixel window into those same pre-scale units; since coverFitPlacement
    // already centers the (possibly overflowing) image within that window, the image's own
    // center coincides exactly with the window's center, which is what a centered, non-absolute
    // clip assumes.
    image.set({
      left: bezel + placement.left,
      top: bezel + placement.top,
      scaleX: placement.scale,
      scaleY: placement.scale,
      clipPath: new Rect({
        width: screenW / placement.scale,
        height: screenH / placement.scale,
        rx: (cornerRadius * 0.7) / placement.scale,
        ry: (cornerRadius * 0.7) / placement.scale,
        originX: 'center',
        originY: 'center',
      }),
    });
    groupChildren.push(image);
  } else {
    groupChildren.push(new Rect({ left: bezel, top: bezel, width: screenW, height: screenH, rx: cornerRadius * 0.7, ry: cornerRadius * 0.7, fill: '#e4e4e8' }));
  }

  groupChildren.push(...buildAccentShapes(cfg.accent, outer.width, outer.height, bezel));

  return new Group(groupChildren, { left: outer.left, top: outer.top });
}
