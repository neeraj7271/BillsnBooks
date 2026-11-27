import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner';
import { FileGetResult, FilePutResult, FileStorageDriver } from './storage-driver.interface';

@Injectable()
export class S3Driver implements FileStorageDriver {
  readonly driverName = 's3' as const;
  private readonly logger = new Logger(S3Driver.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private bucketChecked = false;

  constructor() {
    this.bucket = process.env.S3_BUCKET || 'documents';
    const endpoint = process.env.S3_ENDPOINT;
    this.client = new S3Client({
      region: process.env.S3_REGION || 'ap-south-1',
      endpoint: endpoint || undefined,
      forcePathStyle: Boolean(endpoint),
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || '',
        secretAccessKey: process.env.S3_SECRET_KEY || '',
      },
    });
  }

  private async ensureBucket(): Promise<void> {
    if (this.bucketChecked) return;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.bucketChecked = true;
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.bucketChecked = true;
        this.logger.log(`Created S3/MinIO bucket "${this.bucket}"`);
      } catch (err: any) {
        this.logger.warn(`Could not auto-create bucket "${this.bucket}": ${err?.message}`);
      }
    }
  }

  async put(
    key: string,
    body: Buffer,
    contentType: string,
    meta?: Record<string, string>,
  ): Promise<FilePutResult> {
    await this.ensureBucket();
    const res = await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ACL: 'private',
        ServerSideEncryption: process.env.S3_SSE === 'false' ? undefined : 'AES256',
        Metadata: meta,
      }),
    );
    return {
      key,
      size: body.length,
      etag: (res.ETag || '').replace(/"/g, ''),
    };
  }

  async get(key: string): Promise<FileGetResult> {
    try {
      const res = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      if (!res.Body) {
        throw new NotFoundException(`Empty object body for key: ${key}`);
      }
      const chunks: Uint8Array[] = [];
      for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      return {
        body: Buffer.concat(chunks),
        contentType: res.ContentType || 'application/octet-stream',
      };
    } catch (err: any) {
      if (err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) {
        throw new NotFoundException(`Stored object not found: ${key}`);
      }
      throw err;
    }
  }

  async getSignedUrl(key: string, expiresInSec: number): Promise<string> {
    const cmd = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return await awsGetSignedUrl(this.client, cmd, { expiresIn: expiresInSec });
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async move(fromKey: string, toKey: string): Promise<void> {
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${encodeURIComponent(fromKey)}`,
        Key: toKey,
        ACL: 'private',
      }),
    );
    await this.delete(fromKey);
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }
}
