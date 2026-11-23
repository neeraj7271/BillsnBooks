import { ValueTransformer } from 'typeorm';
import * as crypto from 'crypto';

export class EncryptionTransformer implements ValueTransformer {
  private readonly algorithm = 'aes-256-gcm';
  private cachedKey: Buffer | null = null;

  /**
   * Derives the AES key lazily from ENCRYPTION_KEY. There is deliberately no
   * hard-coded fallback: encrypting or decrypting data with a publicly-known
   * key would be worthless. The key is only required when encrypted columns are
   * actually read/written, so schema migrations (which touch no ciphertext)
   * continue to work without it.
   */
  private get key(): Buffer {
    if (this.cachedKey) return this.cachedKey;
    const rawKey = process.env.ENCRYPTION_KEY;
    if (!rawKey || rawKey.trim().length < 32) {
      throw new Error(
        'ENCRYPTION_KEY must be set to a strong value (>= 32 chars) to encrypt/decrypt sensitive fields.',
      );
    }
    this.cachedKey = crypto.createHash('sha256').update(rawKey).digest();
    return this.cachedKey;
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

