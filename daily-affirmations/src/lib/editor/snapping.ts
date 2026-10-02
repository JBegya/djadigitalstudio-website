import type { RectPx } from './templateToCanvas';

export interface SnapGuide {
  orientation: 'vertical' | 'horizontal';
  position: number;
}

export interface SnapResult {
  left?: number;
  top?: number;
  guides: SnapGuide[];
}

const THRESHOLD_PX = 6;

/** Nearest candidate within THRESHOLD_PX, or null if nothing is close enough. */
function nearest(value: number, candidates: number[]): number | null {
  let best: number | null = null;
  let bestDistance = THRESHOLD_PX + 1;
  for (const candidate of candidates) {
    const distance = Math.abs(value - candidate);
    if (distance <= THRESHOLD_PX && distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * Pure — compares a moving object's edges/center against the canvas center and every other
 * object's corresponding edges, snapping when within THRESHOLD_PX. No Fabric dependency, so this
 * is fully unit-testable without a real canvas; the caller (EditorCanvas's `object:moving`
 * handler) applies the returned left/top back onto the live Fabric object.
 */
export function computeSnap(moving: RectPx, canvasWidthPx: number, canvasHeightPx: number, others: RectPx[]): SnapResult {
  const guides: SnapGuide[] = [];

  const movingCenterX = moving.left + moving.width / 2;
  const movingRight = moving.left + moving.width;
  const xCandidates = [canvasWidthPx / 2, ...others.flatMap((o) => [o.left, o.left + o.width / 2, o.left + o.width])];

  let left: number | undefined;
  const centerSnapX = nearest(movingCenterX, xCandidates);
  if (centerSnapX !== null) {
    left = centerSnapX - moving.width / 2;
    guides.push({ orientation: 'vertical', position: centerSnapX });
  } else {
    const leftSnapX = nearest(moving.left, xCandidates);
    if (leftSnapX !== null) {
      left = leftSnapX;
      guides.push({ orientation: 'vertical', position: leftSnapX });
    } else {
      const rightSnapX = nearest(movingRight, xCandidates);
      if (rightSnapX !== null) {
        left = rightSnapX - moving.width;
        guides.push({ orientation: 'vertical', position: rightSnapX });
      }
    }
  }

  const movingCenterY = moving.top + moving.height / 2;
  const movingBottom = moving.top + moving.height;
  const yCandidates = [canvasHeightPx / 2, ...others.flatMap((o) => [o.top, o.top + o.height / 2, o.top + o.height])];

  let top: number | undefined;
  const centerSnapY = nearest(movingCenterY, yCandidates);
  if (centerSnapY !== null) {
    top = centerSnapY - moving.height / 2;
    guides.push({ orientation: 'horizontal', position: centerSnapY });
  } else {
    const topSnapY = nearest(moving.top, yCandidates);
    if (topSnapY !== null) {
      top = topSnapY;
      guides.push({ orientation: 'horizontal', position: topSnapY });
    } else {
      const bottomSnapY = nearest(movingBottom, yCandidates);
      if (bottomSnapY !== null) {
        top = bottomSnapY - moving.height;
        guides.push({ orientation: 'horizontal', position: bottomSnapY });
      }
    }
  }

  return { left, top, guides };
}
