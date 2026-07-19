import fs from 'node:fs';
import path from 'node:path';
import { createLogger } from '@/server/utils/logger';

const log = createLogger('musicService');
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg']);

export interface MusicPick {
  path: string;
  fileName: string;
}

function listTracks(musicFolder: string): string[] {
  if (!fs.existsSync(musicFolder)) return [];
  return fs
    .readdirSync(musicFolder)
    .filter((f) => AUDIO_EXTENSIONS.has(path.extname(f).toLowerCase()))
    .map((f) => path.join(musicFolder, f));
}

/**
 * Picks a royalty-free track from the configured music folder. Avoids repeating the same
 * track within the current run (each of the 6 videos gets a different bed where possible).
 * Returns null when the folder is empty — the composer then exports voice-only, which is
 * still a valid, postable video rather than a hard failure.
 */
export function pickMusicTrack(musicFolder: string, excludePaths: string[] = []): MusicPick | null {
  const tracks = listTracks(musicFolder);
  if (tracks.length === 0) {
    log.warn(`No music files found in ${musicFolder} — exporting voice-only audio`);
    return null;
  }
  const fresh = tracks.filter((t) => !excludePaths.includes(t));
  const pool = fresh.length > 0 ? fresh : tracks;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  if (!chosen) return null;
  return { path: chosen, fileName: path.basename(chosen) };
}
