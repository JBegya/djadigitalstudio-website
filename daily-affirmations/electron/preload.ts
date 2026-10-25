import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  isElectron: true,
  platform: process.platform,
  selectFolder: (currentPath?: string): Promise<string | null> => ipcRenderer.invoke('dialog:selectFolder', currentPath),
  selectImageFile: (currentPath?: string): Promise<string | null> => ipcRenderer.invoke('dialog:selectImageFile', currentPath),
  openPath: (targetPath: string): Promise<{ ok: boolean; error: string | null }> => ipcRenderer.invoke('shell:openPath', targetPath),
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
