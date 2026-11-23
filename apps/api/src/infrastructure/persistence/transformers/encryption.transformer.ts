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

  /**
   * Keys used before secrets were enforced: the old transformer derived its key
   * at import time (before .env was loaded) so rows were written with the
   * built-in dev key. Used ONLY to decrypt legacy rows; never to encrypt.
   */
  private get legacyKey(): Buffer {
    return crypto
      .createHash('sha256')
      .update('accounting-dev-master-encryption-key-32b')
      .digest();
  }

  private decryptWith(key: Buffer, ivHex: string, tagHex: string, data: string): string {
    const decipher = crypto.createDecipheriv(this.algorithm, key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return decipher.update(data, 'hex', 'utf8') + decipher.final('utf8');
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

    const parts = value.split(':');
    if (parts.length !== 3 || !/^[0-9a-f]{24}$/i.test(parts[0]!)) return value; // plaintext
    const [ivHex, tagHex, data] = parts as [string, string, string];

    for (const getKey of [() => this.key, () => this.legacyKey]) {
      try {
        return this.decryptWith(getKey(), ivHex, tagHex, data);
      } catch {
        /* try next key */
      }
    }
    // Never leak ciphertext to callers/UI.
    return null;
  }
}
