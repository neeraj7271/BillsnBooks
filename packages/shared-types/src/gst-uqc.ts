export interface GstUqcUnit {
  code: string;
  name: string;
  category: 'COUNT' | 'WEIGHT' | 'VOLUME' | 'LENGTH' | 'AREA' | 'TIME' | 'OTHER';
}

export const GST_STATUTORY_UOM_LIST: GstUqcUnit[] = [
  { code: 'NOS', name: 'Numbers / Units', category: 'COUNT' },
  { code: 'PCS', name: 'Pieces', category: 'COUNT' },
  { code: 'BOX', name: 'Boxes', category: 'COUNT' },
  { code: 'SET', name: 'Sets', category: 'COUNT' },
  { code: 'PAC', name: 'Packs / Packets', category: 'COUNT' },
  { code: 'BAG', name: 'Bags', category: 'COUNT' },
  { code: 'BTL', name: 'Bottles', category: 'COUNT' },
  { code: 'CAN', name: 'Cans', category: 'COUNT' },
  { code: 'DOZ', name: 'Dozens', category: 'COUNT' },
  { code: 'ROL', name: 'Rolls', category: 'COUNT' },
  { code: 'KGS', name: 'Kilograms', category: 'WEIGHT' },
  { code: 'GMS', name: 'Grams', category: 'WEIGHT' },
  { code: 'QTL', name: 'Quintals', category: 'WEIGHT' },
  { code: 'TON', name: 'Tonnes (Metric)', category: 'WEIGHT' },
  { code: 'MTR', name: 'Meters', category: 'LENGTH' },
  { code: 'CMS', name: 'Centimeters', category: 'LENGTH' },
  { code: 'SQM', name: 'Square Meters', category: 'AREA' },
  { code: 'SQF', name: 'Square Feet', category: 'AREA' },
  { code: 'LTR', name: 'Litres', category: 'VOLUME' },
  { code: 'MLT', name: 'Millilitres', category: 'VOLUME' },
  { code: 'HRS', name: 'Hours', category: 'TIME' },
  { code: 'DAY', name: 'Days', category: 'TIME' },
  { code: 'MONTH', name: 'Months', category: 'TIME' },
  { code: 'OTH', name: 'Other', category: 'OTHER' },
];

export const GST_UQC_ALIASES: Record<string, string> = {
  HOURS: 'HRS',
  HOUR: 'HRS',
  HR: 'HRS',
  MONTHS: 'MONTH',
  MON: 'MONTH',
  DAYS: 'DAY',
  PIECES: 'PCS',
  PIECE: 'PCS',
  NUMBERS: 'NOS',
  NUMBER: 'NOS',
  UNIT: 'NOS',
  UNITS: 'NOS',
  METERS: 'MTR',
  METER: 'MTR',
  KILOGRAMS: 'KGS',
  KILOGRAM: 'KGS',
  KG: 'KGS',
  GRAMS: 'GMS',
  GRAM: 'GMS',
  BOXES: 'BOX',
  PACKS: 'PAC',
  PACKET: 'PAC',
  PACKETS: 'PAC',
};

export function normalizeGstUqc(uom?: string): string {
  if (!uom) return 'NOS';
  const clean = uom.trim().toUpperCase();
  return GST_UQC_ALIASES[clean] || clean;
}


