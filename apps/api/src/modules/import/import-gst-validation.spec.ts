import { ImportValidationService } from './import-validation.service';
import { RiskApprovalState } from '@platform/shared-types';

describe('ImportValidationService - Comprehensive GST Checks', () => {
  let service: ImportValidationService;

  beforeEach(() => {
    service = new ImportValidationService();
  });

  const validCompanyGstin = '27AABCT2727Q1ZW'; // Maharashtra (27)
  const defaultMapping = {
    voucherNumber: 'Invoice No',
    date: 'Date',
    partyName: 'Customer Name',
    partyGstin: 'Customer GSTIN',
    placeOfSupply: 'Place of Supply',
    hsnCode: 'HSN',
    taxableAmount: 'Taxable Value',
    cgstAmount: 'CGST',
    sgstAmount: 'SGST',
    igstAmount: 'IGST',
    totalAmount: 'Total Amount',
  };

  it('should accept 100% compliant Intra-State B2B invoice with valid GSTIN and 50:50 CGST/SGST', () => {
    const rawRow = {
      'Invoice No': 'INV-001',
      Date: '15/10/2026',
      'Customer Name': 'Reliance Retail Ventures',
      'Customer GSTIN': '27AAPFU0939F1ZV', // Valid MH GSTIN
      'Place of Supply': '27',
      HSN: '8517',
      'Taxable Value': '100000',
      CGST: '9000',
      SGST: '9000',
      IGST: '0',
      'Total Amount': '118000',
    };

    const result = service.validateRow(
      1,
      rawRow,
      defaultMapping,
      validCompanyGstin,
      [{ id: 'led-1', name: 'Reliance Retail Ventures' }],
    );

    expect(result.validationState).toBe(RiskApprovalState.GREEN);
    expect(result.errorReasons.length).toBe(0);
    expect(result.parsedData.partyGstin).toBe('27AAPFU0939F1ZV');
    expect(result.parsedData.placeOfSupply).toBe('27');
  });

  it('should flag error on invalid GSTIN checksum', () => {
    const rawRow = {
      'Invoice No': 'INV-002',
      Date: '15/10/2026',
      'Customer Name': 'Bad GSTIN Customer',
      'Customer GSTIN': '27AABCR4444N1Z9', // Corrupted checksum digit (should be R)
      'Place of Supply': '27',
      'Taxable Value': '10000',
      CGST: '900',
      SGST: '900',
      'Total Amount': '11800',
    };

    const result = service.validateRow(1, rawRow, defaultMapping, validCompanyGstin);
    expect(result.validationState).toBe(RiskApprovalState.RED);
    expect(result.errorReasons.some((r) => r.includes('checksum'))).toBe(true);
  });

  it('should flag TAX_TYPE_MISMATCH if IGST is charged on Intra-State supply', () => {
    const rawRow = {
      'Invoice No': 'INV-003',
      Date: '15/10/2026',
      'Customer Name': 'Local Customer',
      'Place of Supply': '27', // Same as company state 27
      'Taxable Value': '50000',
      CGST: '0',
      SGST: '0',
      IGST: '9000', // Invalid: Should be CGST 4500 + SGST 4500
      'Total Amount': '59000',
    };

    const result = service.validateRow(1, rawRow, defaultMapping, validCompanyGstin);
    expect(result.validationState).toBe(RiskApprovalState.RED);
    expect(result.errorReasons.some((r) => r.includes('Intra-state supply'))).toBe(true);
  });

  it('should auto-fix GST tax split from IGST to CGST+SGST for intra-state supply', () => {
    const parsedData = {
      voucherNumber: 'INV-003',
      placeOfSupply: '27',
      taxableAmount: 50000,
      igstAmount: 9000,
      cgstAmount: 0,
      sgstAmount: 0,
      totalAmount: 59000,
    };

    const fixResult = service.autoFixGstTaxSplit(parsedData, '27');
    expect(fixResult.fixed).toBe(true);
    expect(fixResult.updatedData.cgstAmount).toBe(4500);
    expect(fixResult.updatedData.sgstAmount).toBe(4500);
    expect(fixResult.updatedData.igstAmount).toBe(0);
    expect(fixResult.updatedData.totalAmount).toBe(59000);
  });

  it('should auto-fix GST tax split from CGST+SGST to IGST for inter-state supply', () => {
    const parsedData = {
      voucherNumber: 'INV-004',
      placeOfSupply: '29', // Karnataka (different from company state 27 MH)
      taxableAmount: 100000,
      cgstAmount: 9000,
      sgstAmount: 9000,
      igstAmount: 0,
      totalAmount: 118000,
    };

    const fixResult = service.autoFixGstTaxSplit(parsedData, '27');
    expect(fixResult.fixed).toBe(true);
    expect(fixResult.updatedData.igstAmount).toBe(18000);
    expect(fixResult.updatedData.cgstAmount).toBe(0);
    expect(fixResult.updatedData.sgstAmount).toBe(0);
    expect(fixResult.updatedData.totalAmount).toBe(118000);
  });

  it('should validate HSN / SAC code length and formatting', () => {
    const rawRowValidGoods = {
      'Invoice No': 'INV-005',
      Date: '15/10/2026',
      'Customer Name': 'Test Corp',
      'Place of Supply': '27',
      HSN: '8471', // 4 digits valid
      'Taxable Value': '10000',
      'Total Amount': '10000',
    };
    const res1 = service.validateRow(1, rawRowValidGoods, defaultMapping, validCompanyGstin);
    expect(res1.errorReasons.some((r) => r.includes('HSN'))).toBe(false);

    const rawRowInvalidHsn = {
      'Invoice No': 'INV-006',
      Date: '15/10/2026',
      'Customer Name': 'Test Corp',
      'Place of Supply': '27',
      HSN: '123', // 3 digits invalid
      'Taxable Value': '10000',
      'Total Amount': '10000',
    };
    const res2 = service.validateRow(1, rawRowInvalidHsn, defaultMapping, validCompanyGstin);
    expect(res2.errorReasons.some((r) => r.includes('HSN/SAC'))).toBe(true);
  });
});
