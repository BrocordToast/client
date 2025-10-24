import { app } from 'electron';
import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Writable } from 'node:stream';

let logStream: Writable | null = null;

export function getLogDir(): string {
  const dir = join(app.getPath('userData'), 'logs');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function initializeLogging() {
  const dir = getLogDir();
  const filePath = join(dir, `clean-launcher-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
  logStream = createWriteStream(filePath, { flags: 'a' });

  const write = (level: string) =>
    (message: unknown, ...optionalParams: unknown[]) => {
      const line = `[${new Date().toISOString()}][${level}] ${String(message)} ${
        optionalParams.length ? optionalParams.map((entry) => JSON.stringify(entry)).join(' ') : ''
      }\n`;
      if (logStream) {
        logStream.write(line);
      }
      const consoleMethod = level === 'ERROR' ? console.error : console.log;
      consoleMethod(line);
    };

  console.log = write('INFO');
  console.error = write('ERROR');
}
