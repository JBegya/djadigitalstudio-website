/**
 * Escapes a filesystem path for safe use as an ffmpeg filtergraph option value (e.g.
 * `ass=filename=...`). Filtergraph syntax treats `:`, `\`, `'` as structural, so Windows paths
 * (`C:\Users\...`) need both backslashes and the drive colon escaped, or ffmpeg will misparse
 * the option list.
 */
export function escapeFilterPath(rawPath: string): string {
  return rawPath.replace(/\\/g, '\\\\').replace(/:/g, '\\:');
}
