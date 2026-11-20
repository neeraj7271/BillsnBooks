import { RiskApprovalState } from './enums.js';

export enum ImportBatchStatus {
  UPLOADED = 'UPLOADED',
  MAPPING = 'MAPPING',
  VALIDATING = 'VALIDATING',
  READY_FOR_APPROVAL = 'READY_FOR_APPROVAL',
  APPROVED = 'APPROVED',
  POSTING = 'POSTING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum ImportType {
  SALES_REGISTER = 'SALES_REGISTER',
  PURCHASE_REGISTER = 'PURCHASE_REGISTER',
  BANK_STATEMENT = 'BANK_STATEMENT',
  JOURNAL_ENTRIES = 'JOURNAL_ENTRIES',
}

export interface CanonicalImportField {
  key: string;
  label: string;
  required: boolean;
  type: 'string' | 'number' | 'date';
  description: string;
  aliases: string[];
}

export const CANONICAL_IMPORT_FIELDS: CanonicalImportField[] = [
  {
    key: 'voucherNumber',
    label: 'Invoice / Voucher Number',
    required: true,
    type: 'string',
    description: 'Invoice number, bill number, or reference identifier',
    aliases: ['invoice no', 'invoice number', 'inv no', 'bill no', 'voucher no', 'doc no'],
  },
  {
    key: 'date',
    label: 'Voucher Date',
    required: true,
    type: 'date',
    description: 'Transaction or invoice issuance date (DD/MM/YYYY or YYYY-MM-DD)',
    aliases: ['date', 'invoice date', 'bill date', 'inv date', 'voucher date', 'txn date'],
  },
  {
    key: 'partyName',
    label: 'Party / Customer / Vendor Name',
    required: true,
    type: 'string',
    description: 'Name of the buyer, supplier, customer, or vendor',
    aliases: ['party', 'party name', 'customer', 'customer name', 'buyer', 'vendor', 'supplier', 'account'],
  },
  {
    key: 'partyGstin',
    label: 'Party GSTIN',
    required: false,
    type: 'string',
    description: '15-character Goods & Services Tax Identification Number',
    aliases: ['gstin', 'party gstin', 'customer gstin', 'buyer gstin', 'gst no', 'gstin/uin'],
  },
  {
    key: 'placeOfSupply',
    label: 'Place of Supply (POS State)',
    required: false,
    type: 'string',
    description: '2-digit state code or state name where goods/services are supplied',
    aliases: ['pos', 'place of supply', 'state code', 'supply state', 'destination'],
  },
  {
    key: 'hsnCode',
    label: 'HSN / SAC Code',
    required: false,
    type: 'string',
    description: 'Harmonized System of Nomenclature code',
    aliases: ['hsn', 'hsn code', 'sac', 'sac code', 'hsn/sac'],
  },
  {
    key: 'taxableAmount',
    label: 'Taxable Amount (₹)',
    required: true,
    type: 'number',
    description: 'Total assessable taxable value before GST',
    aliases: ['taxable', 'taxable value', 'taxable amount', 'base amount', 'assessable value', 'subtotal'],
  },
  {
    key: 'cgstAmount',
    label: 'CGST Amount (₹)',
    required: false,
    type: 'number',
    description: 'Central GST amount',
    aliases: ['cgst', 'cgst amount', 'central tax', 'cgst val'],
  },
  {
    key: 'sgstAmount',
    label: 'SGST / UTGST Amount (₹)',
    required: false,
    type: 'number',
    description: 'State / Union Territory GST amount',
    aliases: ['sgst', 'sgst amount', 'utgst', 'state tax', 'sgst/utgst'],
  },
  {
    key: 'igstAmount',
    label: 'IGST Amount (₹)',
    required: false,
    type: 'number',
    description: 'Integrated GST amount',
    aliases: ['igst', 'igst amount', 'integrated tax', 'igst val'],
  },
  {
    key: 'totalAmount',
    label: 'Total Invoice Value (₹)',
    required: true,
    type: 'number',
    description: 'Gross invoice total inclusive of all taxes',
    aliases: ['total', 'total amount', 'invoice value', 'grand total', 'net amount', 'invoice total'],
  },
  {
    key: 'narration',
    label: 'Narration / Remarks',
    required: false,
    type: 'string',
    description: 'Description or notes for the voucher',
    aliases: ['narration', 'remarks', 'description', 'notes', 'memo'],
  },
];

export interface ColumnMappingConfig {
  [canonicalKey: string]: string; // Maps canonicalKey -> source file header name
}

export interface ParsedRowData {
  voucherNumber?: string;
  date?: string;
  partyName?: string;
  partyGstin?: string;
  placeOfSupply?: string;
  hsnCode?: string;
  taxableAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  totalAmount?: number;
  narration?: string;
  [customField: string]: any;
}

export interface ImportRowDTO {
  id: string;
  batchId: string;
  rowIndex: number;
  rawData: Record<string, any>;
  parsedData: ParsedRowData;
  validationState: RiskApprovalState;
  errorReasons: string[];
  matchedLedgerId?: string | null;
  matchedLedgerName?: string | null;
  generatedVoucherId?: string | null;
  createdAt: string;
}

export interface ImportBatchDTO {
  id: string;
  tenantId: string;
  companyId: string;
  branchId?: string | null;
  fileName: string;
  fileHashSha256: string;
  fileSizeBytes: number;
  importType: ImportType;
  columnMapping: ColumnMappingConfig;
  status: ImportBatchStatus;
  totalRows: number;
  validRows: number;
  blockedRows: number;
  clarificationRows: number;
  detectedHeaders?: string[];
  sampleRows?: Record<string, any>[];
  createdBy: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BulkFixRowsRequest {
  rowIds?: string[]; // If omitted or empty, applies to all matching rows in batch
  targetField: 'partyName' | 'partyGstin' | 'placeOfSupply' | 'hsnCode' | 'matchedLedgerId' | 'recomputeTax';
  fixValue?: string;
}

