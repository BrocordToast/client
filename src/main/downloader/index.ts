import { createWriteStream, createReadStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { TransformStream } from 'node:stream/web';
import { createHash } from 'node:crypto';
import EventEmitter from 'node:events';

export interface DownloadTask {
  id: string;
  url: string;
  destination: string;
  sha1?: string;
  size?: number;
}

export interface DownloadProgressEvent {
  taskId: string;
  downloadedBytes: number;
  totalBytes?: number;
}

export interface DownloadCompletedEvent {
  taskId: string;
  destination: string;
}

export type DownloadEvents = {
  progress: DownloadProgressEvent;
  complete: DownloadCompletedEvent;
  error: { taskId: string; error: Error };
};

export class Downloader extends EventEmitter {
  private concurrency: number;

  constructor(concurrency = 4) {
    super();
    this.concurrency = concurrency;
  }

  async downloadAll(tasks: DownloadTask[]) {
    const queue = tasks.slice();
    const workers: Promise<void>[] = [];
    for (let i = 0; i < this.concurrency; i += 1) {
      workers.push(
        (async () => {
          while (queue.length > 0) {
            const task = queue.shift();
            if (!task) break;
            try {
              await this.download(task);
              this.emit('complete', { taskId: task.id, destination: task.destination } satisfies DownloadCompletedEvent);
            } catch (error) {
              this.emit('error', { taskId: task.id, error: error as Error });
              throw error;
            }
          }
        })()
      );
    }
    await Promise.all(workers);
  }

  async download(task: DownloadTask) {
    if (await this.isFileValid(task)) {
      return;
    }
    const response = await fetch(task.url);
    if (!response.ok || !response.body) {
      throw new Error(`Failed to download ${task.url}`);
    }

    await mkdir(dirname(task.destination), { recursive: true });
    const fileStream = createWriteStream(task.destination);
    const hasher = createHash('sha1');
    let downloaded = 0;
    const total = Number(response.headers.get('content-length')) || task.size;

    const transform = new TransformStream({
      transform: (chunk, controller) => {
        const buffer = Buffer.from(chunk as ArrayBuffer);
        hasher.update(buffer);
        downloaded += buffer.length;
        this.emit('progress', { taskId: task.id, downloadedBytes: downloaded, totalBytes: total } satisfies DownloadProgressEvent);
        controller.enqueue(chunk);
      }
    });

    await pipeline(response.body.pipeThrough(transform), fileStream);

    if (task.sha1) {
      const digest = hasher.digest('hex');
      if (digest !== task.sha1) {
        throw new Error(`Hash mismatch for ${task.id}`);
      }
    }
  }

  private async isFileValid(task: DownloadTask) {
    try {
      const stats = await stat(task.destination);
      if (task.size && stats.size !== task.size) {
        return false;
      }
      if (!task.sha1) {
        return true;
      }
      const stream = createReadStream(task.destination);
      const hasher = createHash('sha1');
      for await (const chunk of stream) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        hasher.update(buffer);
      }
      const digest = hasher.digest('hex');
      return digest === task.sha1;
    } catch {
      return false;
    }
  }
}
