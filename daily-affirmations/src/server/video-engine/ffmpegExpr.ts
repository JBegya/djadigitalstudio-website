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
