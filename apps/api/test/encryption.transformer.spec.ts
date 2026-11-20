import { EncryptionTransformer } from '../src/infrastructure/persistence/transformers/encryption.transformer';

describe('EncryptionTransformer (AES-256-GCM)', () => {
  let transformer: EncryptionTransformer;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = 'test-secret-key-32-characters-len!';
    transformer = new EncryptionTransformer();
  });

  it('should encrypt sensitive string to iv:authTag:ciphertext format', () => {
    const plainText = 'ABCDE1234F'; // Sample PAN
    const encrypted = transformer.to(plainText);

    expect(encrypted).not.toBeNull();
    expect(encrypted).not.toEqual(plainText);

    const parts = encrypted!.split(':');
    expect(parts.length).toBe(3);
    expect(parts[0]).toHaveLength(24); // 12-byte IV in hex
    expect(parts[1]).toHaveLength(32); // 16-byte authTag in hex
  });

  it('should decrypt back to identical plaintext', () => {
    const plainText = '1234567890123456'; // Sample Bank Account Number
    const encrypted = transformer.to(plainText);
    const decrypted = transformer.from(encrypted);

    expect(decrypted).toEqual(plainText);
  });

  it('should gracefully handle null and undefined', () => {
    expect(transformer.to(null)).toBeNull();
    expect(transformer.to(undefined)).toBeNull();
    expect(transformer.from(null)).toBeNull();
    expect(transformer.from(undefined)).toBeNull();
  });
});

