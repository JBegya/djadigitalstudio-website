import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const APP_DIR_NAME = 'dja-daily-affirmations';

/**
 * Root of the app install — where `assets/` (bundled fonts, logo, music, dictionary) actually
 * lives on disk. `process.cwd()` works for this in `next dev` and `next start`, but NOT once
 * packaged: Next's generated `.next/standalone/server.js` runs `process.chdir(__dirname)` as
 * its very first line (standard, non-configurable standalone-mode behavior), which silently
 * repoints `process.cwd()` at `.next/standalone/` itself. Electron's main process spawns that
 * server with `DJA_APP_ROOT` set explicitly (see electron/main.ts) specifically to survive
 * that chdir; anything launched without it (dev, `next start`) falls back to `process.cwd()`,
 * which is already correct in both of those cases.
 */
export function getAppRoot(): string {
  return process.env.DJA_APP_ROOT || process.cwd();
}

/**
 * Per-OS application-support directory, mirroring Electron's `app.getPath('userData')`
 * convention without depending on the `electron` module — this file runs identically
 * whether the Next.js server is hosted inside Electron's main process or standalone.
 */
export function getUserDataDir(): string {
  const platform = process.platform;
  let base: string;
  if (platform === 'darwin') {
    base = path.join(os.homedir(), 'Library', 'Application Support', APP_DIR_NAME);
  } else if (platform === 'win32') {
    base = path.join(process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming'), APP_DIR_NAME);
  } else {
    base = path.join(process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), '.config'), APP_DIR_NAME);
  }
  ensureDir(base);
  return base;
}

export function getSettingsFilePath(): string {
  return path.join(getUserDataDir(), 'settings.json');
}

export function getHistoryFilePath(): string {
  return path.join(getUserDataDir(), 'history.json');
}

export function getUsedAffirmationsFilePath(): string {
  return path.join(getUserDataDir(), 'used-affirmations.json');
}

export function getUsedBackgroundsFilePath(): string {
  return path.join(getUserDataDir(), 'used-backgrounds.json');
}

const USER_CONTENT_DIR_NAME = 'DJA Daily Affirmations';

/**
 * A stable, user-owned, writable location for generated content and the user's own music
 * library. Deliberately NOT under `getAppRoot()` — in a packaged Electron build that resolves
 * inside the (read-only, and on update or reinstall, wiped) app bundle, which is the wrong
 * place to default-write exported videos or ask someone to permanently keep their licensed
 * music files. `~/Documents` is stable across dev and every packaged-app scenario alike.
 */
export function getUserContentDir(): string {
  return path.join(os.homedir(), 'Documents', USER_CONTENT_DIR_NAME);
}

export function getDefaultOutputFolder(): string {
  return path.join(getUserContentDir(), 'Exports');
}

export function getDefaultMusicFolder(): string {
  return path.join(getUserContentDir(), 'Music');
}

/** The bundled default logo/watermark — a read-only app resource, correctly scoped to the install. */
export function getDefaultLogoPath(): string {
  return path.join(getAppRoot(), 'assets', 'logo', 'dja-logo.png');
}

export function getBundledMusicDir(): string {
  return path.join(getAppRoot(), 'assets', 'music');
}

/**
 * First-run convenience: if the user's Music folder doesn't exist yet, seed it with the
 * bundled placeholder tracks so Test Mode has something to mix immediately, instead of
 * starting from an empty, silent-background folder. Never overwrites — once the folder
 * exists, it's the user's, even if they've since deleted everything in it.
 */
export function seedMusicFolderOnFirstRun(musicFolder: string): void {
  if (fs.existsSync(musicFolder)) return;
  const bundled = getBundledMusicDir();
  ensureDir(musicFolder);
  try {
    for (const file of fs.readdirSync(bundled)) {
      if (!file.toLowerCase().endsWith('.mp3')) continue;
      fs.copyFileSync(path.join(bundled, file), path.join(musicFolder, file));
    }
  } catch {
    // Best-effort — an empty Music folder just means voice-only exports until the user adds
    // tracks, which is still a valid, postable video.
  }
}

export function getCacheDir(): string {
  const dir = path.join(getUserDataDir(), 'cache');
  ensureDir(dir);
  return dir;
}

export function getBackgroundCacheDir(): string {
  const dir = path.join(getCacheDir(), 'backgrounds');
  ensureDir(dir);
  return dir;
}

/** Cached, pre-rendered brand intro/outro clips — identical per brand, so they're rendered once and reused rather than re-encoded for every video. */
export function getBrandFramesCacheDir(): string {
  const dir = path.join(getCacheDir(), 'brand-frames');
  ensureDir(dir);
  return dir;
}

export function getRenderWorkDir(runId: string, jobId: string): string {
  const dir = path.join(getCacheDir(), 'render', runId, jobId);
  ensureDir(dir);
  return dir;
}

export function getFontsDir(): string {
  return path.join(getAppRoot(), 'assets', 'fonts');
}

export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export function dateStamp(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getExportDayDir(outputFolder: string, date: string): string {
  const dir = path.join(outputFolder, date);
  ensureDir(dir);
  return dir;
}

export function getExportBrandDir(outputFolder: string, date: string, brandFolderName: string): string {
  const dir = path.join(getExportDayDir(outputFolder, date), brandFolderName);
  ensureDir(dir);
  return dir;
}
