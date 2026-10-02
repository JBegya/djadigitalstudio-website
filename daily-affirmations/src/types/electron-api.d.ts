// Mirrors electron/preload.ts's exposeInMainWorld shape. Kept as a hand-written ambient
// declaration since the renderer (src/) and the Electron main process (electron/) compile
// under separate tsconfigs and can't share a type import directly.
export interface ElectronBridge {
  isElectron: true;
  platform: string;
  selectFolder(currentPath?: string): Promise<string | null>;
  selectImageFile(currentPath?: string): Promise<string | null>;
  openPath(targetPath: string): Promise<{ ok: boolean; error: string | null }>;
  getVersion(): Promise<string>;
}

declare global {
  interface Window {
    electronAPI?: ElectronBridge;
  }
}
