export interface FilePutResult {
  key: string;
  size: number;
  etag: string;
}

export interface FileGetResult {
  body: Buffer;
  contentType: string;
}

export interface FileStorageDriver {
  readonly driverName: 's3' | 'local';
  put(
    key: string,
    body: Buffer,
    contentType: string,
    meta?: Record<string, string>,
  ): Promise<FilePutResult>;
  get(key: string): Promise<FileGetResult>;
  getSignedUrl(key: string, expiresInSec: number): Promise<string>;
  delete(key: string): Promise<void>;
  move(fromKey: string, toKey: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
