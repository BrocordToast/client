import { app } from 'electron';
import { join } from 'node:path';

export function getLauncherRoot() {
  return app.getPath('userData');
}

export function getVersionsDir() {
  return join(getLauncherRoot(), 'versions');
}

export function getLibrariesDir() {
  return join(getLauncherRoot(), 'libraries');
}

export function getAssetsDir() {
  return join(getLauncherRoot(), 'assets');
}

export function getRuntimeDir() {
  return join(getLauncherRoot(), 'runtime');
}

export function getLogsDir() {
  return join(getLauncherRoot(), 'logs');
}
