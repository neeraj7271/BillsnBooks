import { isValidStateCode } from './state-codes.js';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const CHECKSUM_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export interface GstinValidationResult {
  isValid: boolean;
  stateCode?: string;
  pan?: string;
  error?: string;
}

export function validateGstin(gstin: string): GstinValidationResult {
  const cleanGstin = gstin.trim().toUpperCase();

  if (cleanGstin.length !== 15) {
    return {
      isValid: false,
      error: `GSTIN must be exactly 15 characters. Received length: ${cleanGstin.length}`,
    };
  }

  if (!GSTIN_REGEX.test(cleanGstin)) {
    return {
      isValid: false,
      error: 'GSTIN does not match standard 15-character statutory format',
    };
  }

  const stateCode = cleanGstin.substring(0, 2);
  if (!isValidStateCode(stateCode)) {
    return {
      isValid: false,
      error: `Invalid state code '${stateCode}' in GSTIN`,
    };
  }

  // Mod 36 checksum calculation for 15th character
  const isChecksumValid = verifyGstinChecksum(cleanGstin);
  if (!isChecksumValid) {
    return {
      isValid: false,
      error: 'GSTIN checksum verification failed',
    };
  }

  return {
    isValid: true,
    stateCode,
    pan: cleanGstin.substring(2, 12),
  };
}

function verifyGstinChecksum(gstin: string): boolean {
  let factor = 1;
  let sum = 0;
  const checkCodeLength = CHECKSUM_CHARS.length;

  for (let i = 0; i < 14; i++) {
    const codePoint = CHECKSUM_CHARS.indexOf(gstin[i]!);
    let digit = codePoint * factor;
    factor = factor === 2 ? 1 : 2;
    digit = Math.floor(digit / checkCodeLength) + (digit % checkCodeLength);
    sum += digit;
  }

  const remainder = sum % checkCodeLength;
  const checkDigitIndex = (checkCodeLength - remainder) % checkCodeLength;
  const calculatedChar = CHECKSUM_CHARS[checkDigitIndex];

  return calculatedChar === gstin[14];
}

