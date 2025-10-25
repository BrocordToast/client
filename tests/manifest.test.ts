import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { VersionManifest } from '../src/main/mojang/manifest';

function loadManifestFixture(): VersionManifest {
  const file = readFileSync(join(__dirname, 'fixtures', 'manifest.json'), 'utf-8');
  return JSON.parse(file) as VersionManifest;
}

describe('version manifest fixture', () => {
  it('contains latest release and snapshot', () => {
    const manifest = loadManifestFixture();
    expect(manifest.latest.release).toBe('1.20.2');
    expect(manifest.versions).toHaveLength(2);
    const release = manifest.versions.find((version) => version.type === 'release');
    expect(release?.url).toContain('1.20.2');
  });
});
