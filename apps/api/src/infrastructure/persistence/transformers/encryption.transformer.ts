import { ValueTransformer } from 'typeorm';
import * as crypto from 'crypto';

export class EncryptionTransformer implements ValueTransformer {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor() {
    // 32-byte key derived from env or dev fallback
    const rawKey = process.env.ENCRYPTION_KEY || 'accounting-dev-master-encryption-key-32b';
    this.key = crypto.createHash('sha256').update(rawKey).digest();
  }

  to(value?: string | null): string | null {
    if (!value) return null;

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');
    // Format: iv:authTag:ciphertext
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  from(value?: string | null): string | null {
    if (!value) return null;

    try {
      const parts = value.split(':');
      if (parts.length !== 3) return value; // Return as-is if not encrypted

      const [ivHex, authTagHex, encryptedText] = parts;
      const iv = Buffer.from(ivHex!, 'hex');
      const authTag = Buffer.from(authTagHex!, 'hex');

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedText!, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch {
      return value;
    }
  }
}

