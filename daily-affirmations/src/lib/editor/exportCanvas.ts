import type { Canvas } from 'fabric';

export interface ExportOptions {
  format: 'png' | 'jpg' | 'pdf';
  targetWidthPx: number;
  targetHeightPx: number;
  quality?: number;
}

/**
 * Renders the live editor canvas (shown on-screen at a comfortable working resolution — the
 * template's percentage-based rects make this resolution-independent) up to the target
 * platform's full pixel size. Fabric re-renders every retained object from its vector model at
 * export time via `multiplier`, so this is a real high-resolution render, not an upscale of a
 * low-res bitmap.
 */
export async function exportCanvasToDataUrl(canvas: Canvas, opts: ExportOptions): Promise<string> {
  const multiplier = opts.targetWidthPx / canvas.getWidth();
  const dataUrl = canvas.toDataURL({
    format: opts.format === 'jpg' ? 'jpeg' : 'png',
    multiplier,
    quality: opts.quality ?? 0.92,
  });
  if (opts.format !== 'pdf') return dataUrl;

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'px', format: [opts.targetWidthPx, opts.targetHeightPx] });
  doc.addImage(dataUrl, 'PNG', 0, 0, opts.targetWidthPx, opts.targetHeightPx);
  return doc.output('datauristring');
}
