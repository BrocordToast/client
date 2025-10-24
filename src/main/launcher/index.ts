import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { platform } from 'node:process';
import AdmZip from 'adm-zip';
import { Downloader, DownloadTask } from '../downloader';
import { fetchVersionDetails, VersionDetails } from '../mojang/manifest';
import type { InstanceConfig } from '../store/instances';
import type { AuthenticatedAccount } from '../auth';
import { buildGameArguments, buildJvmArguments, getDefaultDirectories, LaunchOptions } from './arguments';
import { getAssetsDir } from '../utils/paths';

export interface LaunchResult {
  process: ReturnType<typeof spawn>;
  command: string;
  args: string[];
}

export interface LaunchContext {
  instance: InstanceConfig;
  account: AuthenticatedAccount;
  javaPath: string;
  versionId: string;
  manifestUrl: string;
  onProgress?: (event: { taskId: string; downloaded: number; total?: number }) => void;
}

function evaluateLibraryRules(library: VersionDetails['libraries'][number]): boolean {
  if (!library.rules) return true;
  const currentOs = platform === 'win32' ? 'windows' : platform === 'darwin' ? 'osx' : 'linux';
  for (const rule of library.rules) {
    const action = rule.action as string;
    const osRule = rule.os as { name?: string } | undefined;
    if (osRule && osRule.name && osRule.name !== currentOs) {
      if (action === 'allow') return false;
      continue;
    }
    if (action === 'disallow') return false;
  }
  return true;
}

function resolveClassifierKey(): string {
  if (platform === 'win32') return 'natives-windows';
  if (platform === 'darwin') return 'natives-macos';
  return 'natives-linux';
}

async function ensureAssetIndex(version: VersionDetails) {
  const assetsDir = getAssetsDir();
  const indexesDir = join(assetsDir, 'indexes');
  await mkdir(indexesDir, { recursive: true });
  const indexPath = join(indexesDir, `${version.assetIndex.id}.json`);
  if (existsSync(indexPath)) {
    return JSON.parse(await readFile(indexPath, 'utf-8')) as {
      objects: Record<string, { hash: string; size: number }>;
    };
  }
  const response = await fetch(version.assetIndex.url);
  if (!response.ok) {
    throw new Error('Failed to download asset index');
  }
  const data = await response.json();
  await writeFile(indexPath, JSON.stringify(data, null, 2), 'utf-8');
  return data as { objects: Record<string, { hash: string; size: number }> };
}

function buildLibraryTasks(version: VersionDetails, librariesDir: string, nativesDir: string): DownloadTask[] {
  const tasks: DownloadTask[] = [];
  const classifierKey = resolveClassifierKey();
  for (const lib of version.libraries) {
    if (!evaluateLibraryRules(lib)) continue;
    if (lib.downloads.artifact) {
      const artifact = lib.downloads.artifact;
      const destination = join(librariesDir, artifact.path);
      tasks.push({
        id: artifact.path,
        url: artifact.url,
        destination,
        sha1: artifact.sha1,
        size: artifact.size
      });
    }
    const classifiers = lib.downloads.classifiers;
    if (classifiers && classifiers[classifierKey]) {
      const classifier = classifiers[classifierKey];
      const destination = join(nativesDir, classifier.path.split('/').pop() ?? classifier.path);
      tasks.push({
        id: classifier.path,
        url: classifier.url,
        destination,
        sha1: classifier.sha1,
        size: classifier.size
      });
    }
  }
  return tasks;
}

async function extractNatives(nativesDir: string) {
  const files = await readDirSafe(nativesDir);
  for (const file of files) {
    if (!file.endsWith('.jar')) continue;
    const jarPath = join(nativesDir, file);
    const zip = new AdmZip(jarPath);
    zip.extractAllTo(nativesDir, true);
  }
}

async function readDirSafe(path: string): Promise<string[]> {
  try {
    return await readdir(path);
  } catch {
    return [];
  }
}

async function buildAssetTasks(objects: Record<string, { hash: string; size: number }>): Promise<DownloadTask[]> {
  const assetsDir = getAssetsDir();
  const objectsDir = join(assetsDir, 'objects');
  const tasks: DownloadTask[] = [];
  for (const [, entry] of Object.entries(objects)) {
    const hash = entry.hash;
    const subDir = hash.slice(0, 2);
    const destination = join(objectsDir, subDir, hash);
    const url = `https://resources.download.minecraft.net/${subDir}/${hash}`;
    tasks.push({
      id: hash,
      url,
      destination,
      sha1: hash,
      size: entry.size
    });
  }
  return tasks;
}

async function prepareClasspath(version: VersionDetails, librariesDir: string, versionJarPath: string): Promise<string[]> {
  const entries: string[] = [];
  for (const lib of version.libraries) {
    if (!evaluateLibraryRules(lib)) continue;
    if (lib.downloads.artifact) {
      entries.push(join(librariesDir, lib.downloads.artifact.path));
    }
  }
  entries.push(versionJarPath);
  return entries;
}

async function ensureVersionAssets(version: VersionDetails, downloader: Downloader) {
  const assetIndex = await ensureAssetIndex(version);
  const tasks = await buildAssetTasks(assetIndex.objects);
  if (tasks.length === 0) return;
  await downloader.downloadAll(tasks);
}

export async function prepareLaunch(context: LaunchContext): Promise<LaunchResult> {
  const version = await fetchVersionDetails(context.versionId, context.manifestUrl);
  const { librariesDir, versionsDir, versionJarPath, nativeDirectory } = getDefaultDirectories(version);

  await mkdir(versionsDir, { recursive: true });
  await mkdir(nativeDirectory, { recursive: true });
  await mkdir(context.instance.gameDir, { recursive: true });
  await mkdir(context.instance.modsDir, { recursive: true });

  const downloader = new Downloader();
  if (context.onProgress) {
    downloader.on('progress', (event) =>
      context.onProgress?.({ taskId: event.taskId, downloaded: event.downloadedBytes, total: event.totalBytes })
    );
  }

  const tasks: DownloadTask[] = [];
  tasks.push({
    id: version.id,
    url: version.downloads.client.url,
    destination: versionJarPath,
    sha1: version.downloads.client.sha1,
    size: version.downloads.client.size
  });
  tasks.push(...buildLibraryTasks(version, librariesDir, nativeDirectory));

  await downloader.downloadAll(tasks);
  await ensureVersionAssets(version, downloader);
  await extractNatives(nativeDirectory);

  const classpathEntries = await prepareClasspath(version, librariesDir, versionJarPath);
  const launchOptions: LaunchOptions = {
    version,
    instance: context.instance,
    account: context.account,
    javaPath: context.javaPath,
    classpathEntries,
    nativeDirectory
  };

  const jvmArgs = buildJvmArguments(launchOptions);
  const gameArgs = buildGameArguments(launchOptions);
  const args = [...jvmArgs, ...gameArgs];

  const child = spawn(context.javaPath, args, {
    cwd: context.instance.gameDir,
    stdio: 'pipe'
  });

  return {
    process: child,
    command: context.javaPath,
    args
  };
}
