import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const APP_DIR_NAME = 'dja-daily-affirmations';

/** Project root of the daily-affirmations app (works both in `next dev` and a packaged build). */
export function getAppRoot(): string {
  return process.cwd();
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

export function getDefaultOutputFolder(): string {
  return path.join(getAppRoot(), 'Exports');
}

export function getDefaultMusicFolder(): string {
  return path.join(getAppRoot(), 'assets', 'music');
}

export function getDefaultLogoPath(): string {
  return path.join(getAppRoot(), 'assets', 'logo', 'dja-logo.png');
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
