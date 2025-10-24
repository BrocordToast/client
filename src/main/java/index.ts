import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { platform, env } from 'node:process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface JavaRuntime {
  path: string;
  version: string;
}

async function resolveJavaFromEnv(): Promise<string | null> {
  if (env.JAVA_HOME) {
    const bin = platform === 'win32' ? 'java.exe' : 'java';
    const candidate = join(env.JAVA_HOME, 'bin', bin);
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      return null;
    }
  }
  return null;
}

async function resolveJavaFromPath(): Promise<string | null> {
  const command = platform === 'win32' ? 'where' : 'which';
  try {
    const { stdout } = await execFileAsync(command, ['java']);
    const path = stdout.split(/\r?\n/)[0]?.trim();
    if (path) return path;
  } catch {
    return null;
  }
  return null;
}

export async function detectJava(): Promise<JavaRuntime | null> {
  const javaPath = (await resolveJavaFromEnv()) ?? (await resolveJavaFromPath());
  if (!javaPath) {
    return null;
  }
  const version = await queryJavaVersion(javaPath);
  return { path: javaPath, version };
}

export async function queryJavaVersion(javaExecutable: string): Promise<string> {
  try {
    const { stderr, stdout } = await execFileAsync(javaExecutable, ['-version']);
    const combined = `${stdout}\n${stderr}`;
    const match = combined.match(/version \"([^\"]+)\"/);
    return match?.[1] ?? 'unknown';
  } catch (error) {
    throw new Error(`Failed to read Java version: ${(error as Error).message}`);
  }
}

export async function validateJavaPath(javaExecutable: string): Promise<boolean> {
  try {
    await access(javaExecutable, constants.X_OK);
    await queryJavaVersion(javaExecutable);
    return true;
  } catch {
    return false;
  }
}
