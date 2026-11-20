import { calculateLineGst } from '../src/tax-calculator';
import { resolvePlaceOfSupply } from '../src/place-of-supply';

describe('GST Tax Calculator', () => {
  it('should split 18% into 9% CGST and 9% SGST for intra-state supply', () => {
    const pos = resolvePlaceOfSupply({
      supplierStateCode: '27',
      placeOfSupplyStateCode: '27',
    });

    const result = calculateLineGst({
      taxableValue: '1000.00',
      gstRatePercent: '18',
      posResult: pos,
    });

    expect(result.taxableValue).toBe('1000.0000');
    expect(result.cgstRate).toBe('9.00');
    expect(result.cgstAmount).toBe('90.0000');
    expect(result.sgstRate).toBe('9.00');
    expect(result.sgstAmount).toBe('90.0000');
    expect(result.igstAmount).toBe('0.0000');
    expect(result.totalTax).toBe('180.0000');
    expect(result.totalValue).toBe('1180.0000');
  });

  it('should apply full 18% IGST for inter-state supply', () => {
    const pos = resolvePlaceOfSupply({
      supplierStateCode: '27',
      placeOfSupplyStateCode: '29',
    });

    const result = calculateLineGst({
      taxableValue: '5000.00',
      gstRatePercent: '18',
      posResult: pos,
    });

    expect(result.cgstAmount).toBe('0.0000');
    expect(result.sgstAmount).toBe('0.0000');
    expect(result.igstRate).toBe('18.00');
    expect(result.igstAmount).toBe('900.0000');
    expect(result.totalTax).toBe('900.0000');
    expect(result.totalValue).toBe('5900.0000');
  });

  it('should calculate cess when provided', () => {
    const pos = resolvePlaceOfSupply({
      supplierStateCode: '27',
      placeOfSupplyStateCode: '29',
    });

    const result = calculateLineGst({
      taxableValue: '10000.00',
      gstRatePercent: '28',
      cessRatePercent: '12',
      posResult: pos,
    });

    expect(result.igstAmount).toBe('2800.0000');
    expect(result.cessAmount).toBe('1200.0000');
    expect(result.totalTax).toBe('4000.0000');
    expect(result.totalValue).toBe('14000.0000');
  });
});

