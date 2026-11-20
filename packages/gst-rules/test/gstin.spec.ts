import { validateGstin } from '../src/gstin-validator';

describe('GSTIN Validator', () => {
  it('should validate a valid GSTIN with correct checksum', () => {
    // 27AAPFU0939F1ZV is a real valid format Maharashtra GSTIN
    const result = validateGstin('27AAPFU0939F1ZV');
    expect(result.isValid).toBe(true);
    expect(result.stateCode).toBe('27');
    expect(result.pan).toBe('AAPFU0939F');
  });

  it('should reject GSTIN with invalid length', () => {
    const result = validateGstin('27AAPFU0939F1Z');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('must be exactly 15 characters');
  });

  it('should reject GSTIN with invalid regex characters', () => {
    // 15 characters, but non-alphanumeric or wrong format
    const result = validateGstin('27AAPFU0939F$$$');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('does not match standard 15-character statutory format');
  });

  it('should reject GSTIN with invalid state code', () => {
    const result = validateGstin('99AAPFU0939F1ZV');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Invalid state code');
  });

  it('should reject GSTIN with tampered checksum', () => {
    // Change last char 'V' to 'A'
    const result = validateGstin('27AAPFU0939F1ZA');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('checksum verification failed');
  });
});
