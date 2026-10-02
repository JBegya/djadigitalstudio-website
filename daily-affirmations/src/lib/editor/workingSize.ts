/** Scales a target export size down to fit within a max on-screen panel size, preserving aspect
 * ratio, without ever scaling up past 1:1. Template rects are percentage-based, so the editor
 * canvas can be built at this smaller working size and exported back up to the full target size. */
export function computeWorkingSize(targetWidthPx: number, targetHeightPx: number, maxWidthPx: number, maxHeightPx: number): { width: number; height: number } {
  const scale = Math.min(1, maxWidthPx / targetWidthPx, maxHeightPx / targetHeightPx);
  return { width: Math.round(targetWidthPx * scale), height: Math.round(targetHeightPx * scale) };
}
