import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { ChildProcess, spawn } from 'node:child_process';
import path from 'node:path';

const DEV_URL = 'http://127.0.0.1:3131';
const PROD_PORT = process.env.DJA_PORT || '4317';
const isDev = process.env.ELECTRON_DEV === '1';

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;

function startProductionServer(): Promise<string> {
  return new Promise((resolve, reject) => {
    const serverEntry = path.join(process.resourcesPath, 'app', '.next', 'standalone', 'server.js');
    serverProcess = spawn(process.execPath, [serverEntry], {
      env: { ...process.env, PORT: PROD_PORT, NODE_ENV: 'production' },
      stdio: 'pipe',
    });

    const url = `http://127.0.0.1:${PROD_PORT}`;
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for the app server to start')), 20_000);

    serverProcess.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      if (text.includes('Ready') || text.includes('started server')) {
        clearTimeout(timeout);
        resolve(url);
      }
    });
    serverProcess.stderr?.on('data', (chunk: Buffer) => console.error(`[server] ${chunk.toString()}`));
    serverProcess.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: '#0a0a0c',
    title: 'DJ&A Daily Affirmations',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const url = isDev ? DEV_URL : await startProductionServer();
  await mainWindow.loadURL(url);

  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.handle('dialog:selectFolder', async (_event, currentPath?: string) => {
  const result = await dialog.showOpenDialog(mainWindow as BrowserWindow, {
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: currentPath,
  });
  return result.canceled ? null : (result.filePaths[0] ?? null);
});

ipcMain.handle('dialog:selectImageFile', async (_event, currentPath?: string) => {
  const result = await dialog.showOpenDialog(mainWindow as BrowserWindow, {
    properties: ['openFile'],
    defaultPath: currentPath,
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
  });
  return result.canceled ? null : (result.filePaths[0] ?? null);
});

ipcMain.handle('shell:openPath', async (_event, targetPath: string) => {
  const error = await shell.openPath(targetPath);
  return { ok: error === '', error: error || null };
});

ipcMain.handle('app:getVersion', () => app.getVersion());

app.on('window-all-closed', () => {
  serverProcess?.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});

app.whenReady().then(() => {
  void createWindow();
});

app.on('before-quit', () => {
  serverProcess?.kill();
});
