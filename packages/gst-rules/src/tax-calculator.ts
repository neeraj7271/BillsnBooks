import { Decimal } from 'decimal.js';
import { SupplyType, TaxComponentBreakup } from '@platform/shared-types';
import { PosResolutionResult } from './place-of-supply.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export interface TaxCalculationLineInput {
  taxableValue: string | number;
  gstRatePercent: string | number; // e.g. 18 for 18%
  cessRatePercent?: string | number; // e.g. 12 for 12%
  posResult: PosResolutionResult;
}

export function calculateLineGst(input: TaxCalculationLineInput): TaxComponentBreakup {
  const taxableVal = new Decimal(input.taxableValue).toDecimalPlaces(4);
  const gstRate = new Decimal(input.gstRatePercent);
  const cessRate = input.cessRatePercent ? new Decimal(input.cessRatePercent) : new Decimal(0);

  let cgstRate = new Decimal(0);
  let cgstAmount = new Decimal(0);
  let sgstRate = new Decimal(0);
  let sgstAmount = new Decimal(0);
  let igstRate = new Decimal(0);
  let igstAmount = new Decimal(0);

  if (input.posResult.supplyType === SupplyType.INTRA_STATE) {
    // Half to CGST, half to SGST/UTGST
    cgstRate = gstRate.dividedBy(2);
    sgstRate = gstRate.dividedBy(2);

    cgstAmount = taxableVal.times(cgstRate).dividedBy(100).toDecimalPlaces(4);
    sgstAmount = taxableVal.times(sgstRate).dividedBy(100).toDecimalPlaces(4);
  } else {
    // Full to IGST
    igstRate = gstRate;
    igstAmount = taxableVal.times(igstRate).dividedBy(100).toDecimalPlaces(4);
  }

  const cessAmount = cessRate.isZero()
    ? new Decimal(0)
    : taxableVal.times(cessRate).dividedBy(100).toDecimalPlaces(4);

  const totalTax = cgstAmount.plus(sgstAmount).plus(igstAmount).plus(cessAmount);
  const totalValue = taxableVal.plus(totalTax);

  return {
    taxableValue: taxableVal.toFixed(4),
    cgstRate: cgstRate.toFixed(2),
    cgstAmount: cgstAmount.toFixed(4),
    sgstRate: sgstRate.toFixed(2),
    sgstAmount: sgstAmount.toFixed(4),
    igstRate: igstRate.toFixed(2),
    igstAmount: igstAmount.toFixed(4),
    cessRate: cessRate.toFixed(2),
    cessAmount: cessAmount.toFixed(4),
    totalTax: totalTax.toFixed(4),
    totalValue: totalValue.toFixed(4),
  };
}

