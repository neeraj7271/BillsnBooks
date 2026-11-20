/**
 * GSTIN & PAN Test Data Generator Utility
 * Generates mathematically valid and deliberately invalid GSTINs and PANs
 * based on statutory Mod-36 checksum verification.
 */

const CHECKSUM_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function computeGstinCheckDigit(first14Chars: string): string {
  const clean = first14Chars.trim().toUpperCase();
  if (clean.length !== 14) {
    throw new Error(`First 14 characters required, received length ${clean.length}: '${clean}'`);
  }

  let factor = 1;
  let sum = 0;
  const checkCodeLength = CHECKSUM_CHARS.length;

  for (let i = 0; i < 14; i++) {
    const codePoint = CHECKSUM_CHARS.indexOf(clean[i]!);
    if (codePoint === -1) {
      throw new Error(`Invalid character '${clean[i]}' at index ${i}`);
    }
    let digit = codePoint * factor;
    factor = factor === 2 ? 1 : 2;
    digit = Math.floor(digit / checkCodeLength) + (digit % checkCodeLength);
    sum += digit;
  }

  const remainder = sum % checkCodeLength;
  const checkDigitIndex = (checkCodeLength - remainder) % checkCodeLength;
  return CHECKSUM_CHARS[checkDigitIndex]!;
}

export function generateValidGstin(stateCode: string, pan: string, entityNumber: string = '1'): string {
  const base = `${stateCode.padStart(2, '0')}${pan.toUpperCase()}${entityNumber}Z`;
  const checkDigit = computeGstinCheckDigit(base);
  return `${base}${checkDigit}`;
}

export function generateTestIdentities() {
  const samplePans = [
    { label: 'CO-PAN-01', pan: 'AABCA1234F', entityType: 'Company (C)' },
    { label: 'CO-PAN-02', pan: 'AAPFU0939F', entityType: 'Firm (F)' },
    { label: 'CUST-PAN-01', pan: 'AAECR4512D', entityType: 'Company (C)' },
    { label: 'CUST-PAN-02', pan: 'BBNPS9823K', entityType: 'Individual (P)' },
    { label: 'VEND-PAN-01', pan: 'AACCS6677G', entityType: 'Company (C)' },
    { label: 'VEND-PAN-02', pan: 'DEEPA7712M', entityType: 'Individual (P)' },
    { label: 'SEZ-PAN-01', pan: 'AAGCS9911H', entityType: 'Company (C)' },
    { label: 'COMP-PAN-01', pan: 'AAHCP1122J', entityType: 'Proprietorship (P)' },
  ];

  const results: Array<{
    label: string;
    description: string;
    stateCode: string;
    stateName: string;
    pan: string;
    gstin: string;
    status: 'VALID' | 'INVALID';
    invalidReason?: string;
  }> = [];

  // Valid Test GSTINs
  results.push({
    label: 'GST-MH-01',
    description: 'Maharashtra Regular Entity 1 (Primary Demo Co)',
    stateCode: '27',
    stateName: 'Maharashtra',
    pan: 'AAPFU0939F',
    gstin: generateValidGstin('27', 'AAPFU0939F', '1'),
    status: 'VALID',
  });

  results.push({
    label: 'GST-MH-02',
    description: 'Maharashtra Regular Customer (B2B Client)',
    stateCode: '27',
    stateName: 'Maharashtra',
    pan: 'AAECR4512D',
    gstin: generateValidGstin('27', 'AAECR4512D', '1'),
    status: 'VALID',
  });

  results.push({
    label: 'GST-KA-01',
    description: 'Karnataka Inter-State Customer (Bengaluru Software)',
    stateCode: '29',
    stateName: 'Karnataka',
    pan: 'AABCA1234F',
    gstin: generateValidGstin('29', 'AABCA1234F', '1'),
    status: 'VALID',
  });

  results.push({
    label: 'GST-DL-01',
    description: 'Delhi Inter-State Vendor (Cloud Services Supplier)',
    stateCode: '07',
    stateName: 'Delhi',
    pan: 'AACCS6677G',
    gstin: generateValidGstin('07', 'AACCS6677G', '1'),
    status: 'VALID',
  });

  results.push({
    label: 'GST-GJ-SEZ',
    description: 'Gujarat GIFT City SEZ Unit Customer',
    stateCode: '24',
    stateName: 'Gujarat',
    pan: 'AAGCS9911H',
    gstin: generateValidGstin('24', 'AAGCS9911H', '1'),
    status: 'VALID',
  });

  results.push({
    label: 'GST-RJ-COMP',
    description: 'Rajasthan Composition Dealer Customer',
    stateCode: '08',
    stateName: 'Rajasthan',
    pan: 'AAHCP1122J',
    gstin: generateValidGstin('08', 'AAHCP1122J', '1'),
    status: 'VALID',
  });

  // Deliberately Invalid Test GSTINs
  const validMhBase = generateValidGstin('27', 'AAPFU0939F', '1');
  const wrongChecksumChar = validMhBase[14] === 'Z' ? 'A' : 'Z';

  results.push({
    label: 'GST-INV-BAD-CHECKSUM',
    description: 'Mismatched Mod-36 Checksum (Last character tampered)',
    stateCode: '27',
    stateName: 'Maharashtra',
    pan: 'AAPFU0939F',
    gstin: `${validMhBase.substring(0, 14)}${wrongChecksumChar}`,
    status: 'INVALID',
    invalidReason: 'Mod-36 statutory checksum verification failed.',
  });

  results.push({
    label: 'GST-INV-STATE-MISMATCH',
    description: 'State Code mismatch: GSTIN starts with 27 (MH) but address is RJ (08)',
    stateCode: '08',
    stateName: 'Rajasthan',
    pan: 'AAPFU0939F',
    gstin: validMhBase, // 27 prefix in 08 state
    status: 'INVALID',
    invalidReason: "GSTIN state code prefix '27' mismatches operating address state '08'.",
  });

  results.push({
    label: 'GST-INV-WRONG-LENGTH',
    description: 'Truncated GSTIN (14 chars instead of 15)',
    stateCode: '27',
    stateName: 'Maharashtra',
    pan: 'AAPFU0939F',
    gstin: validMhBase.substring(0, 14),
    status: 'INVALID',
    invalidReason: 'Length is 14; statutory format requires exactly 15 alphanumeric characters.',
  });

  results.push({
    label: 'GST-INV-INVALID-STATE',
    description: 'Invalid State Code prefix (99 is Centre Jurisdiction / not valid for state business)',
    stateCode: '99',
    stateName: 'Invalid Territory',
    pan: 'AAPFU0939F',
    gstin: `99AAPFU0939F1Z${computeGstinCheckDigit('99AAPFU0939F1Z')}`,
    status: 'INVALID',
    invalidReason: "State code '99' is not an operating state registration code.",
  });

  return results;
}

if (require.main === module) {
  const list = generateTestIdentities();
  console.log(JSON.stringify(list, null, 2));
}

