import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { FileGetResult, FilePutResult, FileStorageDriver } from './storage-driver.interface';
import { LocalDiskDriver } from './local-disk.driver';
import { S3Driver } from './s3.driver';

@Injectable()
export class FileStorageService implements FileStorageDriver, OnModuleInit {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly driver: FileStorageDriver;

  constructor() {
    const hasS3Config = Boolean(
      process.env.S3_ENDPOINT ||
        (process.env.S3_BUCKET && process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY),
    );
    this.driver = hasS3Config ? new S3Driver() : new LocalDiskDriver();
  }

  get driverName(): 's3' | 'local' {
    return this.driver.driverName;
  }

  onModuleInit() {
    this.logger.log(
      `FileStorageService initialized with driver=${this.driver.driverName}` +
        (this.driver.driverName === 's3'
          ? ` (bucket=${process.env.S3_BUCKET || 'documents'}, endpoint=${process.env.S3_ENDPOINT || 'aws'})`
          : ` (dir=${process.env.LOCAL_STORAGE_DIR || './storage'})`),
    );
  }

  put(key: string, body: Buffer, contentType: string, meta?: Record<string, string>): Promise<FilePutResult> {
    return this.driver.put(key, body, contentType, meta);
  }

  get(key: string): Promise<FileGetResult> {
    return this.driver.get(key);
  }

  getSignedUrl(key: string, expiresInSec = 300): Promise<string> {
    return this.driver.getSignedUrl(key, expiresInSec);
  }

  delete(key: string): Promise<void> {
    return this.driver.delete(key);
  }

  move(fromKey: string, toKey: string): Promise<void> {
    return this.driver.move(fromKey, toKey);
  }

  exists(key: string): Promise<boolean> {
    return this.driver.exists(key);
  }
}
