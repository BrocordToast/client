import { promises as fs } from 'node:fs';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';

const VERSION_MANIFEST_URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';

export interface VersionManifest {
  latest: {
    release: string;
    snapshot: string;
  };
  versions: Array<{
    id: string;
    type: 'release' | 'snapshot' | string;
    url: string;
    time: string;
    releaseTime: string;
  }>;
}

export interface VersionDetails {
  id: string;
  type: string;
  mainClass: string;
  arguments: {
    game: Array<string | Record<string, unknown>>;
    jvm: Array<string | Record<string, unknown>>;
  };
  libraries: Array<{
    name: string;
    downloads: {
      artifact?: {
        path: string;
        sha1: string;
        size: number;
        url: string;
      };
      classifiers?: Record<string, { path: string; sha1: string; size: number; url: string }>;
    };
    rules?: Array<Record<string, unknown>>;
  }>;
  logging?: Record<string, unknown>;
  assetIndex: {
    id: string;
    sha1: string;
    size: number;
    url: string;
    totalSize: number;
  };
  downloads: {
    client: {
      sha1: string;
      size: number;
      url: string;
    };
    client_mappings?: {
      sha1: string;
      size: number;
      url: string;
    };
  };
  javaVersion?: {
    component: string;
    majorVersion: number;
  };
}

function getCacheDir() {
  return join(app.getPath('userData'), 'versions');
}

export async function fetchVersionManifest(force = false): Promise<VersionManifest> {
  const cacheDir = getCacheDir();
  const manifestFile = join(cacheDir, 'version_manifest_v2.json');

  if (!force && existsSync(manifestFile)) {
    const cached = await fs.readFile(manifestFile, 'utf-8');
    return JSON.parse(cached) as VersionManifest;
  }

  const response = await fetch(VERSION_MANIFEST_URL);
  if (!response.ok) {
    throw new Error('Failed to fetch version manifest');
  }
  const manifest = (await response.json()) as VersionManifest;
  await fs.mkdir(cacheDir, { recursive: true });
  await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2));
  return manifest;
}

export async function fetchVersionDetails(versionId: string, url: string): Promise<VersionDetails> {
  const cacheDir = getCacheDir();
  const filePath = join(cacheDir, `${versionId}.json`);
  if (existsSync(filePath)) {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as VersionDetails;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch version details for ${versionId}`);
  }
  const details = (await response.json()) as VersionDetails;
  await fs.mkdir(cacheDir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(details, null, 2));
  return details;
}
