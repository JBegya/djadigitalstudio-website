/**
 * Client-side screenshot thumbnailing — draws the source file onto an offscreen canvas and
 * exports a downscaled JPEG, avoiding a server-side image-processing dependency (the same line
 * held since M1 removed ffmpeg and M2 chose jsPDF over a native PDF lib).
 *
 * SVGs are already resolution-independent and are their own thumbnail, so this returns `null`
 * for them — callers should skip the `thumbnail` form field in that case.
 */
export async function generateThumbnail(file: File, maxEdgePx: number): Promise<Blob | null> {
  if (file.type === 'image/svg+xml') return null;

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxEdgePx / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, height);

    return await new Promise<Blob | null>((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85));
  } finally {
    bitmap.close();
  }
}
