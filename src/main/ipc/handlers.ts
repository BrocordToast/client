import type { BrowserWindow, IpcMainEvent } from 'electron';
import { ipcMain } from 'electron';
import { startDeviceAuth, completeDeviceAuth, getStoredAccount, logout, DeviceAuthSession } from '../auth';
import { fetchVersionManifest } from '../mojang/manifest';
import { detectJava, validateJavaPath } from '../java';
import { instanceStore, InstanceConfig } from '../store/instances';
import { prepareLaunch, LaunchContext, LaunchResult } from '../launcher';
import { settingsStore } from '../store/settings';

let currentSession: DeviceAuthSession | null = null;
let activeProcess: LaunchResult | null = null;

export function initializeIpcHandlers(window: BrowserWindow) {
  ipcMain.handle('auth:start-device', async () => {
    currentSession = await startDeviceAuth();
    return {
      verificationUri: currentSession.verificationUri,
      userCode: currentSession.userCode,
      message: currentSession.message,
      expiresAt: currentSession.expiresAt,
      interval: currentSession.interval
    };
  });

  ipcMain.handle('auth:complete-device', async () => {
    if (!currentSession) throw new Error('No pending session');
    const account = await completeDeviceAuth(currentSession);
    currentSession = null;
    return {
      gamertag: account.gamertag,
      uuid: account.uuid,
      profile: account.profile
    };
  });

  ipcMain.handle('auth:get-account', async () => {
    const account = await getStoredAccount();
    if (!account) return null;
    return {
      gamertag: account.gamertag,
      uuid: account.uuid,
      profile: account.profile
    };
  });

  ipcMain.handle('auth:logout', async () => {
    await logout();
  });

  ipcMain.handle('versions:list', async () => {
    const manifest = await fetchVersionManifest();
    return manifest;
  });

  ipcMain.handle('instances:list', async () => instanceStore.list());

  ipcMain.handle('instances:upsert', async (_event: IpcMainEvent, instance: InstanceConfig) => {
    await instanceStore.upsert(instance);
    return instanceStore.list();
  });

  ipcMain.handle('settings:get', async () => settingsStore.get());
  ipcMain.handle('settings:update', async (_event: IpcMainEvent, data: Partial<ReturnType<typeof settingsStore.get>>) => {
    await settingsStore.save(data);
    return settingsStore.get();
  });

  ipcMain.handle('java:detect', async () => detectJava());
  ipcMain.handle('java:validate', async (_event: IpcMainEvent, path: string) => validateJavaPath(path));

  ipcMain.handle('launcher:launch', async (_event: IpcMainEvent, payload: Omit<LaunchContext, 'account' | 'onProgress'>) => {
    if (activeProcess) {
      throw new Error('A launch is already running');
    }
    const account = await getStoredAccount();
    if (!account) {
      throw new Error('Kein Konto angemeldet');
    }
    const launch = await prepareLaunch({ ...payload, account, onProgress: (progress) => {
      window.webContents.send('launcher:progress', progress);
    }});
    activeProcess = launch;
    launch.process.stdout?.on('data', (chunk) => {
      window.webContents.send('launcher:log', chunk.toString());
    });
    launch.process.stderr?.on('data', (chunk) => {
      window.webContents.send('launcher:log', chunk.toString());
    });
    launch.process.on('close', (code) => {
      window.webContents.send('launcher:exit', { code });
      activeProcess = null;
    });
    return { command: launch.command, args: launch.args };
  });

  ipcMain.handle('launcher:stop', async () => {
    if (!activeProcess) return;
    activeProcess.process.kill('SIGTERM');
  });
}
