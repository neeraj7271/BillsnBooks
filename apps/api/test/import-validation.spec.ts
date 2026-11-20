import { ImportValidationService } from '../src/modules/import/import-validation.service';
import { RiskApprovalState } from '@platform/shared-types';

describe('ImportValidationService', () => {
  let service: ImportValidationService;

  beforeEach(() => {
    service = new ImportValidationService();
  });

  const knownLedgers = [
    { id: 'led-1', name: 'Tata Motors Commercial Ltd' },
    { id: 'led-2', name: 'Reliance Retail' },
  ];

  it('marks completely valid intra-state row as GREEN', () => {
    const rawRow = {
      'Inv No': 'INV-100',
      'Date': '15/10/2024',
      'Customer': 'Tata Motors Commercial Ltd',
      'GSTIN': '27AAPFU0939F1ZV', // Valid Maharashtra GSTIN with verified checksum
      'POS': '27',
      'Taxable': '10000',
      'CGST': '900',
      'SGST': '900',
      'Total': '11800',
    };

    const mapping = {
      voucherNumber: 'Inv No',
      date: 'Date',
      partyName: 'Customer',
      partyGstin: 'GSTIN',
      placeOfSupply: 'POS',
      taxableAmount: 'Taxable',
      cgstAmount: 'CGST',
      sgstAmount: 'SGST',
      totalAmount: 'Total',
    };

    const res = service.validateRow(1, rawRow, mapping, '27AABCA1234F1Z5', knownLedgers);

    expect(res.validationState).toBe(RiskApprovalState.GREEN);
    expect(res.errorReasons).toHaveLength(0);
    expect(res.matchedLedgerId).toBe('led-1');
    expect(res.parsedData.voucherNumber).toBe('INV-100');
    expect(res.parsedData.totalAmount).toBe(11800);
  });

  it('marks row as YELLOW when party ledger is missing', () => {
    const rawRow = {
      'Inv No': 'INV-101',
      'Date': '2024-10-15',
      'Customer': 'Unknown Corp Pvt Ltd',
      'Taxable': '5000',
      'CGST': '450',
      'SGST': '450',
      'Total': '5900',
    };

    const mapping = {
      voucherNumber: 'Inv No',
      date: 'Date',
      partyName: 'Customer',
      taxableAmount: 'Taxable',
      cgstAmount: 'CGST',
      sgstAmount: 'SGST',
      totalAmount: 'Total',
    };

    const res = service.validateRow(2, rawRow, mapping, '27AABCA1234F1Z5', knownLedgers);

    expect(res.validationState).toBe(RiskApprovalState.YELLOW);
    expect(res.matchedLedgerId).toBeNull();
  });

  it('marks row as RED on math discrepancy or invalid GSTIN checksum', () => {
    const rawRow = {
      'Inv No': 'INV-102',
      'Date': '2024-10-15',
      'Customer': 'Tata Motors Commercial Ltd',
      'GSTIN': '27AABCT2727Q1ZZ', // Corrupted checksum
      'Taxable': '10000',
      'CGST': '900',
      'SGST': '900',
      'Total': '15000', // Broken arithmetic: 10000 + 1800 != 15000
    };

    const mapping = {
      voucherNumber: 'Inv No',
      date: 'Date',
      partyName: 'Customer',
      partyGstin: 'GSTIN',
      taxableAmount: 'Taxable',
      cgstAmount: 'CGST',
      sgstAmount: 'SGST',
      totalAmount: 'Total',
    };

    const res = service.validateRow(3, rawRow, mapping, '27AABCA1234F1Z5', knownLedgers);

    expect(res.validationState).toBe(RiskApprovalState.RED);
    expect(res.errorReasons.some((e) => e.includes('GSTIN'))).toBe(true);
    expect(res.errorReasons.some((e) => e.includes('discrepancy'))).toBe(true);
  });

  it('marks high-value transaction (> ₹5,00,000) as BLUE for maker-checker sign-off', () => {
    const rawRow = {
      'Inv No': 'INV-999',
      'Date': '2024-10-15',
      'Customer': 'Tata Motors Commercial Ltd',
      'Taxable': '1000000',
      'CGST': '90000',
      'SGST': '90000',
      'Total': '1180000',
    };

    const mapping = {
      voucherNumber: 'Inv No',
      date: 'Date',
      partyName: 'Customer',
      taxableAmount: 'Taxable',
      cgstAmount: 'CGST',
      sgstAmount: 'SGST',
      totalAmount: 'Total',
    };

    const res = service.validateRow(4, rawRow, mapping, '27AABCA1234F1Z5', knownLedgers);

    expect(res.validationState).toBe(RiskApprovalState.BLUE);
  });
});
