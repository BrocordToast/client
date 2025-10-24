import { platform } from 'node:process';
import { join } from 'node:path';
import type { VersionDetails } from '../mojang/manifest';
import type { InstanceConfig } from '../store/instances';
import type { AuthenticatedAccount } from '../auth';
import { getAssetsDir, getLibrariesDir, getVersionsDir } from '../utils/paths';

export interface LaunchOptions {
  version: VersionDetails;
  instance: InstanceConfig;
  account: AuthenticatedAccount;
  javaPath: string;
  classpathEntries: string[];
  nativeDirectory: string;
}

function matchesOs(ruleOs?: Record<string, string>) {
  if (!ruleOs) return true;
  const current = platform === 'win32' ? 'windows' : platform === 'darwin' ? 'osx' : 'linux';
  if (ruleOs.name && ruleOs.name !== current) return false;
  if (ruleOs.arch && !process.arch.includes(ruleOs.arch)) return false;
  return true;
}

function evaluateRules(rules?: Array<Record<string, any>>): boolean {
  if (!rules || rules.length === 0) return true;
  let allowed = false;
  for (const rule of rules) {
    const osRule = rule.os as Record<string, string> | undefined;
    const applies = matchesOs(osRule);
    if (rule.action === 'allow' && applies) {
      allowed = true;
    }
    if (rule.action === 'disallow' && applies) {
      return false;
    }
  }
  return allowed;
}

function substitute(value: string, options: LaunchOptions, assetsRoot: string): string {
  const { account, instance, version } = options;
  return value
    .replace(/\$\{auth_player_name}/g, account.profile.name)
    .replace(/\$\{auth_uuid}/g, account.uuid)
    .replace(/\$\{auth_access_token}/g, account.accessToken)
    .replace(/\$\{user_type}/g, 'msa')
    .replace(/\$\{version_name}/g, version.id)
    .replace(/\$\{game_directory}/g, instance.gameDir)
    .replace(/\$\{assets_root}/g, assetsRoot)
    .replace(/\$\{assets_index_name}/g, version.assetIndex.id)
    .replace(/\$\{clientid}/g, account.uuid)
    .replace(/\$\{resolution_width}/g, String(instance.resolution.width))
    .replace(/\$\{resolution_height}/g, String(instance.resolution.height))
    .replace(/\$\{auth_xuid}/g, account.uuid)
    .replace(/\$\{launcher_name}/g, 'CleanLauncher')
    .replace(/\$\{launcher_version}/g, '0.1.0');
}

export function buildJvmArguments(options: LaunchOptions): string[] {
  const { version, instance, classpathEntries, nativeDirectory } = options;
  const args: string[] = [
    `-Xms${instance.minRam}M`,
    `-Xmx${instance.maxRam}M`,
    '-XX:+UnlockExperimentalVMOptions',
    '-XX:+UseG1GC',
    '-XX:G1NewSizePercent=20',
    '-XX:G1ReservePercent=20',
    '-XX:MaxGCPauseMillis=50',
    '-XX:G1HeapRegionSize=32M'
  ];

  for (const entry of version.arguments.jvm) {
    if (typeof entry === 'string') {
      args.push(entry);
    } else if (evaluateRules(entry.rules as Array<Record<string, any>> | undefined)) {
      const value = entry.value as string | string[];
      if (Array.isArray(value)) {
        args.push(...value);
      } else {
        args.push(value);
      }
    }
  }

  args.push('-Djava.library.path=' + nativeDirectory);
  args.push('-Dminecraft.launcher.brand=cleanlauncher');
  args.push('-Dminecraft.launcher.version=0.1.0');
  args.push('-cp', classpathEntries.join(platform === 'win32' ? ';' : ':'));
  args.push(version.mainClass);

  return args;
}

export function buildGameArguments(options: LaunchOptions): string[] {
  const { version } = options;
  const assetsRoot = join(getAssetsDir(), 'virtual', 'legacy');
  const resolved: string[] = [];
  for (const entry of version.arguments.game) {
    if (typeof entry === 'string') {
      resolved.push(substitute(entry, options, assetsRoot));
    } else if (evaluateRules(entry.rules as Array<Record<string, any>> | undefined)) {
      const value = entry.value as string | string[];
      if (Array.isArray(value)) {
        resolved.push(...value.map((v) => substitute(v, options, assetsRoot)));
      } else {
        resolved.push(substitute(value, options, assetsRoot));
      }
    }
  }

  if (options.instance.resolution.fullscreen) {
    resolved.push('--fullscreen', 'true');
  }

  return resolved;
}

export function getDefaultDirectories(version: VersionDetails) {
  const librariesDir = getLibrariesDir();
  const versionsDir = getVersionsDir();
  const assetsDir = getAssetsDir();
  const versionJarPath = join(versionsDir, version.id, `${version.id}.jar`);
  const nativeDirectory = join(versionsDir, version.id, 'natives');
  return { librariesDir, versionsDir, assetsDir, versionJarPath, nativeDirectory };
}
