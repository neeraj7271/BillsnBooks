const CHECKSUM_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function computeGstinCheckDigit(first14Chars) {
  const clean = first14Chars.trim().toUpperCase();
  let factor = 1;
  let sum = 0;
  const checkCodeLength = CHECKSUM_CHARS.length;

  for (let i = 0; i < 14; i++) {
    const codePoint = CHECKSUM_CHARS.indexOf(clean[i]);
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
  return CHECKSUM_CHARS[checkDigitIndex];
}

function generateValidGstin(stateCode, pan, entityNumber = '1') {
  const base = `${stateCode.padStart(2, '0')}${pan.toUpperCase()}${entityNumber}Z`;
  const checkDigit = computeGstinCheckDigit(base);
  return `${base}${checkDigit}`;
}

const list = [
  {
    label: 'CO-MH-01',
    description: 'Kothari & Associates LLP / Acme Global Technologies (Maharashtra)',
    stateCode: '27',
    stateName: 'Maharashtra',
    pan: 'AAPFU0939F',
    gstin: generateValidGstin('27', 'AAPFU0939F', '1'),
    status: 'VALID',
  },
  {
    label: 'CUST-REG-01',
    description: 'Apex Infotech Solutions Pvt Ltd (B2B Client Maharashtra - Intra-state)',
    stateCode: '27',
    stateName: 'Maharashtra',
    pan: 'AAECR4512D',
    gstin: generateValidGstin('27', 'AAECR4512D', '1'),
    status: 'VALID',
  },
  {
    label: 'CUST-REG-02',
    description: 'Bengaluru Cloudworks Pvt Ltd (B2B Client Karnataka - Inter-state)',
    stateCode: '29',
    stateName: 'Karnataka',
    pan: 'AABCA1234F',
    gstin: generateValidGstin('29', 'AABCA1234F', '1'),
    status: 'VALID',
  },
  {
    label: 'VEND-REG-01',
    description: 'Capital Network Equipment Pvt Ltd (Delhi Supplier - Inter-state)',
    stateCode: '07',
    stateName: 'Delhi',
    pan: 'AACCS6677G',
    gstin: generateValidGstin('07', 'AACCS6677G', '1'),
    status: 'VALID',
  },
  {
    label: 'CUST-SEZ-01',
    description: 'GIFT Global FinTech SEZ Unit (GIFT City Gujarat - Inter-state deemed)',
    stateCode: '24',
    stateName: 'Gujarat',
    pan: 'AAGCS9911H',
    gstin: generateValidGstin('24', 'AAGCS9911H', '1'),
    status: 'VALID',
  },
  {
    label: 'CUST-COMP-01',
    description: 'Jaipur Handicrafts & Textiles (Rajasthan Composition Dealer)',
    stateCode: '08',
    stateName: 'Rajasthan',
    pan: 'AAHCP1122J',
    gstin: generateValidGstin('08', 'AAHCP1122J', '1'),
    status: 'VALID',
  },
  {
    label: 'CUST-UNREG-01',
    description: 'Pannalal and Sons / Individual Retail Consumer (No GSTIN)',
    stateCode: '08',
    stateName: 'Rajasthan',
    pan: 'OVQPS2080P',
    gstin: null,
    status: 'VALID_UNREGISTERED',
  },
  {
    label: 'CUST-OVS-01',
    description: 'Pacific Cloud Strategies LLC (San Francisco, USA - Cross-Border)',
    stateCode: '96',
    stateName: 'Foreign Country',
    pan: null,
    gstin: null,
    status: 'VALID_OVERSEAS',
  },
  // Invalid Test Vectors
  {
    label: 'INV-GST-CHECKSUM',
    description: 'GSTIN with tampered 15th character (Mod-36 checksum violation)',
    stateCode: '27',
    stateName: 'Maharashtra',
    pan: 'AAPFU0939F',
    gstin: '27AAPFU0939F1ZA', // Checksum char is V, but tampered to A
    status: 'INVALID',
    invalidReason: 'Checksum mismatch (expected V, got A)',
  },
  {
    label: 'INV-GST-STATE-MISMATCH',
    description: 'GSTIN state prefix (27) does not match counterparty state (08 Rajasthan)',
    stateCode: '08',
    stateName: 'Rajasthan',
    pan: 'AAPFU0939F',
    gstin: '27AAPFU0939F1ZV',
    status: 'INVALID',
    invalidReason: "GSTIN starts with '27' but state is '08'",
  },
  {
    label: 'INV-GST-TRUNCATED',
    description: 'GSTIN has only 14 characters instead of statutory 15',
    stateCode: '27',
    stateName: 'Maharashtra',
    pan: 'AAPFU0939F',
    gstin: '27AAPFU0939F1Z',
    status: 'INVALID',
    invalidReason: 'Length is 14 instead of 15',
  },
  {
    label: 'INV-PAN-MALFORMED',
    description: 'PAN has invalid format (letter O instead of digit 0)',
    stateCode: '27',
    stateName: 'Maharashtra',
    pan: 'AAPFUO939F', // Letter O in digit position
    gstin: null,
    status: 'INVALID',
    invalidReason: 'Letter O placed in numeric 4-digit segment',
  },
];

console.log(JSON.stringify(list, null, 2));

module.exports = { computeGstinCheckDigit, generateValidGstin, list };

