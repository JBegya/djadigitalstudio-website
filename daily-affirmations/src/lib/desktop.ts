'use client';

import { openFolder } from './api';

/**
 * Unified desktop-integration helpers. When running inside the Electron shell, native
 * dialogs/openPath go through the preload bridge. When running as a plain browser tab
 * (e.g. `npm run dev` without Electron), folder picking falls back to manual text entry
 * and "open folder" is handled server-side by the Next.js API route — the Next server is
 * a full Node process either way, so it can always reach the filesystem.
 */
export function isElectron(): boolean {
  return typeof window !== 'undefined' && Boolean(window.electronAPI);
}

export async function pickFolder(currentPath?: string): Promise<string | null> {
  if (isElectron()) return window.electronAPI!.selectFolder(currentPath);
  return null;
}

export async function pickImageFile(currentPath?: string): Promise<string | null> {
  if (isElectron()) return window.electronAPI!.selectImageFile(currentPath);
  return null;
}

export async function openFolderPath(targetPath: string): Promise<{ ok: boolean; error: string | null }> {
  if (isElectron()) return window.electronAPI!.openPath(targetPath);
  return openFolder(targetPath);
}
