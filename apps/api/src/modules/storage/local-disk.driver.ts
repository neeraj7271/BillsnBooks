import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { FileGetResult, FilePutResult, FileStorageDriver } from './storage-driver.interface';

@Injectable()
export class LocalDiskDriver implements FileStorageDriver {
  readonly driverName = 'local' as const;
  private readonly logger = new Logger(LocalDiskDriver.name);
  private readonly rootDir: string;

  constructor(rootDir?: string) {
    this.rootDir = path.resolve(rootDir || process.env.LOCAL_STORAGE_DIR || path.join(process.cwd(), 'storage'));
  }

  private resolveSafePath(key: string): string {
    const cleanKey = key.replace(/^\/+/, '');
    const resolved = path.resolve(this.rootDir, cleanKey);
    if (!resolved.startsWith(this.rootDir + path.sep) && resolved !== this.rootDir) {
      throw new Error(`Invalid storage key path traversal attempt: ${key}`);
    }
    return resolved;
  }

  private metaPath(filePath: string): string {
    return `${filePath}.meta.json`;
  }

  async put(
    key: string,
    body: Buffer,
    contentType: string,
    meta?: Record<string, string>,
  ): Promise<FilePutResult> {
    const filePath = this.resolveSafePath(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, body);
    const etag = crypto.createHash('md5').update(body).digest('hex');
    await fs.writeFile(
      this.metaPath(filePath),
      JSON.stringify({ contentType, size: body.length, etag, meta: meta || {}, createdAt: new Date().toISOString() }),
      'utf8',
    );
    return { key, size: body.length, etag };
  }

  async get(key: string): Promise<FileGetResult> {
    const filePath = this.resolveSafePath(key);
    try {
      const body = await fs.readFile(filePath);
      let contentType = 'application/octet-stream';
      try {
        const metaRaw = await fs.readFile(this.metaPath(filePath), 'utf8');
        const parsed = JSON.parse(metaRaw);
        if (parsed.contentType) contentType = parsed.contentType;
      } catch {
        // Ignore missing sidecar metadata
      }
      return { body, contentType };
    } catch (err: any) {
      if (err?.code === 'ENOENT') {
        throw new NotFoundException(`Stored object not found: ${key}`);
      }
      throw err;
    }
  }

  async getSignedUrl(key: string, _expiresInSec: number): Promise<string> {
    return `/v1/practice/storage/object?key=${encodeURIComponent(key)}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolveSafePath(key);
    await fs.rm(filePath, { force: true });
    await fs.rm(this.metaPath(filePath), { force: true });
  }

  async move(fromKey: string, toKey: string): Promise<void> {
    const src = this.resolveSafePath(fromKey);
    const dest = this.resolveSafePath(toKey);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    try {
      await fs.rename(src, dest);
    } catch (err: any) {
      if (err?.code === 'ENOENT') {
        this.logger.warn(`Source file missing during move: ${fromKey}`);
        return;
      }
      throw err;
    }
    try {
      await fs.rename(this.metaPath(src), this.metaPath(dest));
    } catch {
      // Sidecar optional
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.resolveSafePath(key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
