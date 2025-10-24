import { contextBridge, ipcRenderer } from 'electron';

const api = {
  appVersion: () => ipcRenderer.invoke('app:version'),
  auth: {
    startDevice: () => ipcRenderer.invoke('auth:start-device'),
    completeDevice: () => ipcRenderer.invoke('auth:complete-device'),
    getAccount: () => ipcRenderer.invoke('auth:get-account'),
    logout: () => ipcRenderer.invoke('auth:logout')
  },
  versions: {
    list: () => ipcRenderer.invoke('versions:list')
  },
  instances: {
    list: () => ipcRenderer.invoke('instances:list'),
    upsert: (instance: unknown) => ipcRenderer.invoke('instances:upsert', instance)
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (data: unknown) => ipcRenderer.invoke('settings:update', data)
  },
  java: {
    detect: () => ipcRenderer.invoke('java:detect'),
    validate: (path: string) => ipcRenderer.invoke('java:validate', path)
  },
  launcher: {
    launch: (payload: unknown) => ipcRenderer.invoke('launcher:launch', payload),
    stop: () => ipcRenderer.invoke('launcher:stop'),
    onLog: (callback: (line: string) => void) => ipcRenderer.on('launcher:log', (_event, line) => callback(line)),
    onProgress: (callback: (payload: { taskId: string; downloaded: number; total?: number }) => void) =>
      ipcRenderer.on('launcher:progress', (_event, payload) => callback(payload)),
    onExit: (callback: (payload: { code: number | null }) => void) =>
      ipcRenderer.on('launcher:exit', (_event, payload) => callback(payload))
  }
};

contextBridge.exposeInMainWorld('cleanApi', api);

export type CleanApi = typeof api;
