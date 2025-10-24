import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'node:path';
import { format } from 'node:url';
import { initializeIpcHandlers } from './ipc/handlers';
import { settingsStore } from './store/settings';
import { initializeLogging } from './utils/logging';
import { instanceStore } from './store/instances';

let mainWindow: BrowserWindow | null = null;

const isSingleInstance = app.requestSingleInstanceLock();

if (!isSingleInstance) {
  app.quit();
}

async function createWindow() {
  await Promise.all([settingsStore.initialize(), instanceStore.initialize()]);
  initializeLogging();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#111827',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: process.env.NODE_ENV !== 'production'
    }
  });

  initializeIpcHandlers(mainWindow);

  if (process.env.ELECTRON_RENDERER_URL) {
    await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await mainWindow.loadURL(
      format({
        pathname: join(__dirname, '../renderer/index.html'),
        protocol: 'file',
        slashes: true
      })
    );
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});

ipcMain.handle('app:version', () => app.getVersion());
