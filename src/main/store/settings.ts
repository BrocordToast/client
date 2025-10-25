import { app } from 'electron';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

const settingsSchema = z.object({
  theme: z.enum(['light', 'dark']).default('dark'),
  downloadThreads: z.number().int().min(1).max(16).default(4),
  onboardingComplete: z.boolean().default(false),
  proxy: z.string().url().optional(),
});

export type Settings = z.infer<typeof settingsSchema>;

class SettingsStore {
  private settingsPath: string | null = null;
  private data: Settings = settingsSchema.parse({});

  async initialize() {
    const dir = app.getPath('userData');
    const file = join(dir, 'settings.json');
    this.settingsPath = file;
    if (!existsSync(file)) {
      await mkdir(dir, { recursive: true });
      await this.save(settingsSchema.parse({}));
      return;
    }

    try {
      const raw = await readFile(file, 'utf-8');
      this.data = settingsSchema.parse(JSON.parse(raw));
    } catch (error) {
      console.error('Failed to read settings, using defaults', error);
      this.data = settingsSchema.parse({});
      await this.save(this.data);
    }
  }

  get(): Settings {
    return this.data;
  }

  async save(newSettings: Partial<Settings>) {
    this.data = settingsSchema.parse({ ...this.data, ...newSettings });
    if (!this.settingsPath) throw new Error('Settings store not initialized');
    await writeFile(this.settingsPath, JSON.stringify(this.data, null, 2), 'utf-8');
  }
}

export const settingsStore = new SettingsStore();
