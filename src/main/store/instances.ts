import { app } from 'electron';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

const resolutionSchema = z.object({
  width: z.number().int().min(640).default(1280),
  height: z.number().int().min(480).default(720),
  fullscreen: z.boolean().default(false)
});

const instanceSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  javaPath: z.string().optional(),
  minRam: z.number().int().min(512).default(1024),
  maxRam: z.number().int().min(1024).default(4096),
  resolution: resolutionSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  gameDir: z.string(),
  modsDir: z.string()
});

export type InstanceConfig = z.infer<typeof instanceSchema>;

const instancesFileSchema = z.object({
  instances: z.array(instanceSchema)
});

export type InstancesFile = z.infer<typeof instancesFileSchema>;

class InstanceStore {
  private filePath: string | null = null;
  private data: InstancesFile = { instances: [] };

  async initialize() {
    const dir = join(app.getPath('userData'), 'instances');
    const file = join(dir, 'instances.json');
    this.filePath = file;

    if (!existsSync(file)) {
      await mkdir(dir, { recursive: true });
      await this.save({ instances: [] });
      return;
    }

    try {
      const raw = await readFile(file, 'utf-8');
      this.data = instancesFileSchema.parse(JSON.parse(raw));
    } catch (error) {
      console.error('Failed to read instances, using empty list', error);
      this.data = { instances: [] };
      await this.save(this.data);
    }
  }

  list(): InstanceConfig[] {
    return this.data.instances;
  }

  async upsert(instance: InstanceConfig) {
    const now = new Date().toISOString();
    const baseDir = join(app.getPath('userData'), 'instances', instance.name.replace(/\s+/g, '_'));
    const normalized: InstanceConfig = {
      ...instance,
      gameDir: instance.gameDir || baseDir,
      modsDir: instance.modsDir || join(baseDir, 'mods'),
      updatedAt: now,
      createdAt: instance.createdAt ?? now
    };
    const existingIndex = this.data.instances.findIndex((item) => item.id === instance.id);
    if (existingIndex >= 0) {
      this.data.instances[existingIndex] = normalized;
    } else {
      this.data.instances.push(normalized);
    }
    await this.persist();
  }

  async delete(id: string) {
    this.data.instances = this.data.instances.filter((instance) => instance.id !== id);
    await this.persist();
  }

  private async save(payload: InstancesFile) {
    if (!this.filePath) throw new Error('Instance store not initialized');
    await writeFile(this.filePath, JSON.stringify(payload, null, 2), 'utf-8');
    this.data = payload;
  }

  private async persist() {
    await this.save(this.data);
  }
}

export const instanceStore = new InstanceStore();
