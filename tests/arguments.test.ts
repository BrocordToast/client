import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest';
import type { VersionDetails } from '../src/main/mojang/manifest';
import { buildGameArguments, buildJvmArguments, type LaunchOptions } from '../src/main/launcher/arguments';

vi.mock('../src/main/utils/paths', () => ({
  getAssetsDir: () => '/tmp/assets',
  getLibrariesDir: () => '/tmp/libraries',
  getVersionsDir: () => '/tmp/versions'
}));

const sampleVersion: VersionDetails = {
  id: '1.20.2',
  type: 'release',
  mainClass: 'net.minecraft.client.main.Main',
  arguments: {
    game: ['--username', '${auth_player_name}', '--version', '${version_name}'],
    jvm: ['-Dos.name=${os}']
  },
  libraries: [
    {
      name: 'com.example:lib:1.0.0',
      downloads: {
        artifact: {
          path: 'com/example/lib/1.0.0/lib-1.0.0.jar',
          sha1: 'abc',
          size: 10,
          url: 'https://example.com/lib.jar'
        }
      }
    }
  ],
  assetIndex: {
    id: '1.20',
    sha1: 'def',
    size: 10,
    url: 'https://example.com/index.json',
    totalSize: 10
  },
  downloads: {
    client: {
      sha1: 'ghi',
      size: 1024,
      url: 'https://example.com/client.jar'
    }
  }
};

const options: LaunchOptions = {
  version: sampleVersion,
  account: {
    gamertag: 'Player',
    uuid: '00000000-0000-0000-0000-000000000000',
    accessToken: 'token',
    refreshToken: 'refresh',
    expiresAt: Date.now() + 60_000,
    profile: {
      id: '00000000-0000-0000-0000-000000000000',
      name: 'Player'
    }
  },
  instance: {
    id: 'instance-1',
    name: 'Standard',
    version: '1.20.2',
    javaPath: '/bin/java',
    minRam: 1024,
    maxRam: 2048,
    resolution: { width: 1280, height: 720, fullscreen: false },
    gameDir: '/tmp/game',
    modsDir: '/tmp/mods',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  classpathEntries: ['/tmp/libraries/com/example/lib/1.0.0/lib-1.0.0.jar', '/tmp/versions/1.20.2.jar'],
  javaPath: '/bin/java',
  nativeDirectory: '/tmp/native'
};

describe('launcher arguments', () => {
  beforeAll(() => {
    vi.stubGlobal('process', { ...process, platform: 'linux', arch: 'x64' });
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('replaces placeholders in game arguments', () => {
    const args = buildGameArguments(options);
    expect(args).toContain('--username');
    expect(args).toContain('Player');
    expect(args).toContain('1.20.2');
  });

  it('creates jvm arguments with memory limits and classpath', () => {
    const args = buildJvmArguments(options);
    expect(args).toContain('-Xms1024M');
    expect(args).toContain('-Xmx2048M');
    const classpathIndex = args.findIndex((value) => value === '-cp');
    expect(classpathIndex).toBeGreaterThan(-1);
    expect(args[classpathIndex + 1]).toContain('/tmp/libraries');
  });
});
