# Branding Storage Migration Plan: Base64 to S3 / MinIO

**Document ID:** OPS-MIG-001  
**Target Module:** Invoice Customizer, Settings (`setting_values` table)  
**Priority:** P1 Architectural Improvement  

---

## 1. Background & Architectural Audit

In the original schema, company logo assets, header watermarks, and authorized signatory signatures were encoded as raw Base64 strings directly inside the `setting_values` JSON/TEXT column in PostgreSQL.

### Issues with Base64 in Database Columns:
1. **Database Bloat:** Base64 increases binary size by ~33%. Loading settings records fetches multi-megabyte payloads on every request.
2. **Buffer Allocation Overhead:** Node.js memory pressure spikes when serializing large base64 strings into JSON response envelopes.
3. **Cache Invalidation:** Browsers cannot leverage native HTTP caching headers (`ETag`, `Cache-Control`, `304 Not Modified`) for base64 embedded in JSON.

---

## 2. Target Architecture

```
                    ┌────────────────────────────┐
                    │ Client / Browser           │
                    └─────────────┬──────────────┘
                                  │
                                  ▼
                    ┌────────────────────────────┐
                    │ Caddy (TLS Reverse Proxy)  │
                    └──────┬──────────────┬──────┘
                           │              │
           /v1/assets/*    │              │  /v1/*
                           ▼              ▼
                    ┌────────────┐ ┌─────────────┐
                    │ MinIO / S3 │ │ NestJS API  │
                    │ Bucket     │ │ (App User)  │
                    └────────────┘ └──────┬──────┘
                                          │ Metadata (Key)
                                          ▼
                                   ┌─────────────┐
                                   │ PostgreSQL  │
                                   └─────────────┘
```

---

## 3. Configuration & Environment Variables

Add to `.env.production` and secrets manager:
```bash
S3_ENDPOINT=http://minio:9000       # Or https://s3.ap-south-1.amazonaws.com
S3_BUCKET=accounting-assets
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=secure_long_secret_key
S3_REGION=ap-south-1
STORAGE_DRIVER=s3                  # Options: 's3' | 'base64'
```

---

## 4. Swappable Storage Service Pattern

```typescript
export interface IStorageDriver {
  uploadFile(key: string, buffer: Buffer, mimeType: string): Promise<string>;
  getFileUrl(key: string): Promise<string>;
  deleteFile(key: string): Promise<void>;
}

@Injectable()
export class FileStorageService {
  private driver: IStorageDriver;

  constructor(private configService: ConfigService) {
    const driverType = this.configService.get('STORAGE_DRIVER', 'base64');
    if (driverType === 's3' && this.configService.get('S3_BUCKET')) {
      this.driver = new S3StorageDriver(this.configService);
    } else {
      this.driver = new Base64FallbackDriver();
    }
  }

  async storeLogo(tenantId: string, companyId: string, file: Buffer, mime: string): Promise<string> {
    try {
      const key = `tenants/${tenantId}/companies/${companyId}/branding/logo_${Date.now()}`;
      return await this.driver.uploadFile(key, file, mime);
    } catch (err) {
      console.warn('S3 upload degraded; falling back to Base64 in DB', err);
      return `data:${mime};base64,${file.toString('base64')}`;
    }
  }
}
```

---

## 5. One-Time Data Migration Script

To migrate existing Base64 strings to S3:

```javascript
// scripts/ops/migrate-base64-to-s3.mjs
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  forcePathStyle: true,
});

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT id, tenant_id, company_id, key, value 
      FROM setting_values 
      WHERE value LIKE 'data:image/%'
    `);

    console.log(`Found ${res.rows.length} base64 assets to migrate.`);

    for (const row of res.rows) {
      const matches = row.value.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches) continue;

      const mimeType = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      const s3Key = `tenants/${row.tenant_id}/branding/${row.key}_${row.id}`;

      await s3.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: s3Key,
        Body: buffer,
        ContentType: mimeType,
      }));

      const assetUrl = `${process.env.STORAGE_PUBLIC_URL || 'https://storage.yourdomain.com'}/${s3Key}`;
      await client.query(
        'UPDATE setting_values SET value = $1 WHERE id = $2',
        [assetUrl, row.id]
      );
      console.log(`Migrated ${row.key} (${row.id}) -> ${assetUrl}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
```

---

## 6. Zero-Downtime Rollout Strategy

1. Deploy S3 driver with read-fallback:
   - If string begins with `data:image/` -> render inline base64.
   - If string begins with `http://` or `https://` -> render as image URL.
2. Run migration script in background.
3. Verify all logo URLs respond with HTTP 200 via Caddy.
4. Switch upload handler default to S3.
