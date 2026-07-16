/**
 * Escapes a filesystem path for safe use as an ffmpeg filtergraph option value (e.g.
 * `ass=filename=...`, `drawtext=fontfile=...`). Filtergraph syntax treats `:`, `\`, `'`
 * as structural, so Windows paths (`C:\Users\...`) need both backslashes and the drive
 * colon escaped, or ffmpeg will misparse the option list.
 */
export function escapeFilterPath(rawPath: string): string {
  return rawPath.replace(/\\/g, '\\\\').replace(/:/g, '\\:');
}

/** Escapes literal text for drawtext's `text=` option (colons, quotes, backslashes, percent). */
export function escapeDrawtext(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "’").replace(/%/g, '\\%');
}

/**
 * A subtle, professional colour grade (no filter brackets) shared by every clip in a brand's
 * output — a small contrast/saturation lift plus a gentle colour-balance tint so footage reads
 * as intentionally graded rather than raw stock footage, while staying natural enough that any
 * Pexels source clip still looks believable. `cooler` leans toward the calm, clinical dusty-blue
 * of Nurse Affirmations; the warmer default leans toward the golden, homey tone of Autism Parent
 * Affirmations — the same subtle-grade technique underpins both series' distinct but related look.
 */
export function buildColorGradeFilter(temperature: 'cooler' | 'warmer'): string {
  const balance =
    temperature === 'cooler'
      ? 'colorbalance=rs=-0.03:gs=0.00:bs=0.05:rm=-0.02:gm=0.00:bm=0.04:rh=-0.02:gh=0.00:bh=0.03'
      : 'colorbalance=rs=0.04:gs=0.02:bs=-0.03:rm=0.03:gm=0.02:bm=-0.02:rh=0.02:gh=0.01:bh=-0.02';
  return `${balance},eq=contrast=1.07:saturation=1.06:brightness=-0.01`;
}
