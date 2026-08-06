import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const APP_DIR_NAME = 'dja-ad-studio';

/**
 * Root of the app install — where `assets/` (bundled fonts, logo, mockups) actually lives on
 * disk. `process.cwd()` works for this in `next dev` and `next start`, but NOT once packaged:
 * Next's generated `.next/standalone/server.js` runs `process.chdir(__dirname)` as its very
 * first line (standard, non-configurable standalone-mode behavior), which silently repoints
 * `process.cwd()` at `.next/standalone/` itself. Electron's main process spawns that server with
 * `DJA_APP_ROOT` set explicitly (see electron/main.ts) specifically to survive that chdir;
 * anything launched without it (dev, `next start`) falls back to `process.cwd()`, which is
 * already correct in both of those cases.
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

export function getCreationsFilePath(): string {
  return path.join(getUserDataDir(), 'creations.json');
}

/** Bundled seed Product Profile JSON — shipped like today's `assets/`, read-only. */
export function getProductsDir(): string {
  return path.join(getAppRoot(), 'data', 'products');
}

/** Optional per-product overlay: a file here with the same `id` fully replaces the bundled profile. */
export function getUserProductsOverlayDir(): string {
  const dir = path.join(getUserDataDir(), 'products');
  ensureDir(dir);
  return dir;
}

export function getTemplatesFilePath(): string {
  return path.join(getAppRoot(), 'data', 'templates.json');
}

export function getContentTypesFilePath(): string {
  return path.join(getAppRoot(), 'data', 'content-types.json');
}

const USER_CONTENT_DIR_NAME = 'DJA Ad Studio';

/**
 * A stable, user-owned, writable location for the asset library and exported ads. Deliberately
 * NOT under `getAppRoot()` — in a packaged Electron build that resolves inside the (read-only,
 * and on update or reinstall, wiped) app bundle, which is the wrong place to default-write
 * exported ads or a product's uploaded screenshots. `~/Documents` is stable across dev and every
 * packaged-app scenario alike.
 */
export function getUserContentDir(): string {
  return path.join(os.homedir(), 'Documents', USER_CONTENT_DIR_NAME);
}

export function getDefaultOutputFolder(): string {
  return path.join(getUserContentDir(), 'Exports');
}

export function getAssetLibraryDir(productFolderName: string): string {
  const dir = path.join(getUserContentDir(), 'Assets', productFolderName);
  ensureDir(dir);
  return dir;
}

const ASSET_CATEGORY_DIRS = { logo: 'Logos', icon: 'Icons', screenshot: 'Screenshots' } as const;

export function getAssetCategoryDir(productFolderName: string, category: keyof typeof ASSET_CATEGORY_DIRS): string {
  const dir = path.join(getAssetLibraryDir(productFolderName), ASSET_CATEGORY_DIRS[category]);
  ensureDir(dir);
  return dir;
}

/** The bundled default logo/placeholder-icon — a read-only app resource, correctly scoped to the install. */
export function getPlaceholderLogoPath(): string {
  return path.join(getAppRoot(), 'assets', 'logo', 'dja-logo.png');
}

export function getPlaceholderAppIconPath(): string {
  return path.join(getAppRoot(), 'assets', 'logo', 'placeholder-app-icon.png');
}

export function getMockupsDir(): string {
  return path.join(getAppRoot(), 'assets', 'mockups');
}

export function getFontsDir(): string {
  return path.join(getAppRoot(), 'assets', 'fonts');
}

export function getExportProductDir(outputFolder: string, productFolderName: string): string {
  const dir = path.join(outputFolder, productFolderName);
  ensureDir(dir);
  return dir;
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
