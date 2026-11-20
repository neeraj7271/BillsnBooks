import { Injectable } from '@nestjs/common';
import { validateGstin, isValidStateCode } from '@platform/gst-rules';
import { RiskApprovalState, ColumnMappingConfig, ParsedRowData } from '@platform/shared-types';
import { Decimal } from 'decimal.js';

export interface ValidatedRowResult {
  rowIndex: number;
  rawData: Record<string, any>;
  parsedData: ParsedRowData;
  validationState: RiskApprovalState;
  errorReasons: string[];
  matchedLedgerId?: string | null;
  matchedLedgerName?: string | null;
}

export interface PartyLedgerLookup {
  id: string;
  name: string;
  gstin?: string | null;
}

@Injectable()
export class ImportValidationService {
  /**
   * Parse and validate a single row against accounting and GST statutory rules
   */
  public validateRow(
    rowIndex: number,
    rawRow: Record<string, any>,
    mapping: ColumnMappingConfig,
    companyGstin?: string | null,
    knownLedgers: PartyLedgerLookup[] = [],
  ): ValidatedRowResult {
    const errorReasons: string[] = [];
    const parsedData: ParsedRowData = {};

    // Helper to safely extract mapped value
    const getVal = (canonicalKey: string): string => {
      let header = mapping[canonicalKey];
      if (!header) {
        // Fallback if mapping was sent as { [header]: canonicalKey }
        for (const [k, v] of Object.entries(mapping)) {
          if (v === canonicalKey) {
            header = k;
            break;
          }
        }
      }
      if (!header || rawRow[header] === undefined || rawRow[header] === null) {
        return '';
      }
      return String(rawRow[header]).trim();
    };

    // 1. Voucher Number
    const voucherNumber = getVal('voucherNumber');
    if (!voucherNumber) {
      errorReasons.push('Invoice / Voucher Number is missing');
    } else {
      parsedData.voucherNumber = voucherNumber;
    }

    // 2. Date
    const rawDate = getVal('date');
    if (!rawDate) {
      errorReasons.push('Transaction date is missing');
    } else {
      const parsedDate = this.parseFlexibleDate(rawDate);
      if (!parsedDate) {
        errorReasons.push(`Invalid date format '${rawDate}'. Expected DD/MM/YYYY or YYYY-MM-DD.`);
      } else {
        parsedData.date = parsedDate.toISOString().split('T')[0];
      }
    }

    // 3. Party Name
    const partyName = getVal('partyName');
    if (!partyName) {
      errorReasons.push('Party / Customer / Vendor name is missing');
    } else {
      parsedData.partyName = partyName;
    }

    // 4. GSTIN
    const partyGstin = getVal('partyGstin');
    if (partyGstin) {
      const gstinResult = validateGstin(partyGstin);
      if (!gstinResult.isValid) {
        errorReasons.push(`Invalid Party GSTIN: ${gstinResult.error}`);
      } else {
        parsedData.partyGstin = partyGstin.toUpperCase();
      }
    }

    // 5. Place of Supply
    let pos = getVal('placeOfSupply');
    if (!pos && parsedData.partyGstin) {
      // Derive POS from first 2 digits of GSTIN if not explicitly provided
      pos = parsedData.partyGstin.substring(0, 2);
    }
    if (pos) {
      // Normalize state code: if "7" -> "07", if "Delhi" -> "07"
      const normalizedPos = pos.length === 1 ? `0${pos}` : pos;
      if (!isValidStateCode(normalizedPos)) {
        errorReasons.push(`Invalid Place of Supply state code '${pos}'`);
      } else {
        parsedData.placeOfSupply = normalizedPos;
      }
    }

    // 6. HSN / SAC Code Validation
    const hsnCode = getVal('hsnCode');
    if (hsnCode) {
      const cleanHsn = hsnCode.replace(/[^0-9]/g, '');
      const isService = cleanHsn.startsWith('99') && cleanHsn.length === 6;
      const isGoods = [4, 6, 8].includes(cleanHsn.length);

      if (!isService && !isGoods) {
        errorReasons.push(
          `Invalid HSN/SAC code '${hsnCode}'. HSN must be 4, 6, or 8 digits; Services (SAC) must be 6 digits starting with 99.`,
        );
      }
      parsedData.hsnCode = cleanHsn;
    }

    // 7. Amounts & Tax Math
    const parseAmount = (val: string): Decimal => {
      if (!val) return new Decimal(0);
      const clean = val.replace(/,/g, '').replace(/[₹$]/g, '').trim();
      const num = parseFloat(clean);
      return isNaN(num) ? new Decimal(0) : new Decimal(num);
    };

    let taxableDec = parseAmount(getVal('taxableAmount'));
    const cgstDec = parseAmount(getVal('cgstAmount'));
    const sgstDec = parseAmount(getVal('sgstAmount'));
    const igstDec = parseAmount(getVal('igstAmount'));
    let totalDec = parseAmount(getVal('totalAmount'));

    // Check if quantity and unit rate exist in raw row if taxableAmount was not explicitly mapped
    if (taxableDec.isZero()) {
      const rawQty = parseAmount(String(rawRow['Quantity'] || rawRow['quantity'] || rawRow['Qty'] || ''));
      const rawRate = parseAmount(String(rawRow['Rate'] || rawRow['Unit Price'] || rawRow['rate'] || rawRow['Price'] || ''));
      const rawDisc = parseAmount(String(rawRow['Discount'] || rawRow['discount'] || '0'));
      if (rawQty.gt(0) && rawRate.gt(0)) {
        taxableDec = rawQty.times(rawRate).minus(rawDisc);
      }
    }

    parsedData.taxableAmount = taxableDec.toNumber();
    parsedData.cgstAmount = cgstDec.toNumber();
    parsedData.sgstAmount = sgstDec.toNumber();
    parsedData.igstAmount = igstDec.toNumber();

    // Tax rate validation (if explicit taxRate column exists or rawRow has Tax Rate)
    const rawTaxRate = getVal('taxRate') || String(rawRow['Tax Rate'] || rawRow['taxRate'] || rawRow['Tax Rate %'] || '');
    if (rawTaxRate) {
      const rateNum = parseFloat(rawTaxRate.replace(/%/g, '').trim());
      const STATUTORY_GST_SLABS = [0, 0.1, 0.25, 1.5, 3, 5, 12, 18, 28];
      if (!isNaN(rateNum) && !STATUTORY_GST_SLABS.includes(rateNum)) {
        errorReasons.push(
          `Invalid GST Tax Rate ${rateNum}%. Must be a standard statutory rate (0, 0.1, 0.25, 1.5, 3, 5, 12, 18, 28).`,
        );
      } else if (!isNaN(rateNum) && rateNum > 0 && cgstDec.isZero() && sgstDec.isZero() && igstDec.isZero()) {
        // If taxable is 0 but total is present, back-calculate taxable
        if (taxableDec.isZero() && totalDec.gt(0)) {
          taxableDec = totalDec
            .dividedBy(new Decimal(1).plus(new Decimal(rateNum).dividedBy(100)))
            .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
          parsedData.taxableAmount = taxableDec.toNumber();
        }

        if (taxableDec.gt(0)) {
          // Auto-calculate tax amounts based on Place of Supply
          const taxTotal = taxableDec.times(rateNum).dividedBy(100);
          const companyState = companyGstin ? companyGstin.substring(0, 2) : '27';
          const isInter = parsedData.placeOfSupply && parsedData.placeOfSupply !== companyState;

          if (isInter) {
            parsedData.igstAmount = taxTotal.toNumber();
          } else {
            const half = taxTotal.dividedBy(2).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
            parsedData.cgstAmount = half.toNumber();
            parsedData.sgstAmount = half.toNumber();
          }
        }
      }
    }

    const finalCgst = new Decimal(parsedData.cgstAmount || 0);
    const finalSgst = new Decimal(parsedData.sgstAmount || 0);
    const finalIgst = new Decimal(parsedData.igstAmount || 0);

    if (taxableDec.lte(0) && totalDec.lte(0)) {
      errorReasons.push('Invoice must have positive taxable or total amount');
    }

    // If total not provided, auto-compute
    const sumOfParts = taxableDec.plus(finalCgst).plus(finalSgst).plus(finalIgst);
    if (totalDec.lte(0) && sumOfParts.gt(0)) {
      totalDec = sumOfParts;
    }
    parsedData.totalAmount = totalDec.toNumber();

    // Verify arithmetic sum: Taxable + CGST + SGST + IGST = Total (tolerance 0.10)
    const discrepancy = totalDec.minus(sumOfParts).abs();
    if (discrepancy.gt(0.10)) {
      errorReasons.push(
        `Math discrepancy: Total (₹${totalDec.toFixed(2)}) ≠ Taxable + Taxes (₹${sumOfParts.toFixed(2)})`,
      );
    }

    // 8. Place of Supply & Tax Type Integrity
    const companyState = companyGstin ? companyGstin.substring(0, 2) : null;
    if (companyState && parsedData.placeOfSupply) {
      const isInterState = companyState !== parsedData.placeOfSupply;
      if (isInterState) {
        if (cgstDec.gt(0) || sgstDec.gt(0)) {
          errorReasons.push(
            `Inter-state supply (POS: ${parsedData.placeOfSupply} vs Co: ${companyState}) cannot have CGST/SGST. Must be IGST.`,
          );
        }
      } else {
        if (igstDec.gt(0)) {
          errorReasons.push(
            `Intra-state supply (POS: ${parsedData.placeOfSupply}) cannot have IGST. Must be CGST + SGST.`,
          );
        }
        if (cgstDec.minus(sgstDec).abs().gt(0.05)) {
          errorReasons.push('CGST and SGST amounts must be equal for intra-state supply');
        }
      }
    }

    // 9. Ledger Matching
    let matchedLedgerId: string | null = null;
    let matchedLedgerName: string | null = null;
    let missingLedger = false;

    if (partyName) {
      const cleanPartyName = partyName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const matched = knownLedgers.find((l) => {
        const cleanLedger = l.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleanLedger === cleanPartyName || cleanLedger.includes(cleanPartyName);
      });

      if (matched) {
        matchedLedgerId = matched.id;
        matchedLedgerName = matched.name;
      } else {
        missingLedger = true;
      }
    }

    // 10. Determine Validation State
    let validationState: RiskApprovalState;
    if (errorReasons.length > 0) {
      validationState = RiskApprovalState.RED; // Critical statutory / math errors
    } else if (missingLedger) {
      validationState = RiskApprovalState.YELLOW; // Missing ledger requires mapping
    } else if (totalDec.gt(500000)) {
      validationState = RiskApprovalState.BLUE; // Maker-checker required for amounts > ₹5,00,000
    } else {
      validationState = RiskApprovalState.GREEN; // Clean, ready to post
    }

    return {
      rowIndex,
      rawData: rawRow,
      parsedData,
      validationState,
      errorReasons,
      matchedLedgerId,
      matchedLedgerName,
    };
  }

  /**
   * Flexible date parsing for DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, or Excel serialized integers
   */
  private parseFlexibleDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    const s = dateStr.trim();

    // Check if it's an Excel numeric timestamp (e.g. 45214)
    if (/^\d{5}$/.test(s)) {
      const serial = parseInt(s, 10);
      const utcDays = Math.floor(serial - 25569);
      const utcValue = utcDays * 86400 * 1000;
      const dateInfo = new Date(utcValue);
      return isNaN(dateInfo.getTime()) ? null : dateInfo;
    }

    // Standard ISO YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }

    // DD/MM/YYYY or DD-MM-YYYY
    const parts = s.split(/[\/\-.]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2].length === 2 ? `20${parts[2]}` : parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime()) && d.getDate() === day && d.getMonth() === month) {
        return d;
      }
    }

    const fallback = new Date(s);
    return isNaN(fallback.getTime()) ? null : fallback;
  }

  /**
   * Statutorily auto-corrects tax distribution (IGST vs CGST+SGST) based on Place of Supply
   */
  public autoFixGstTaxSplit(
    parsedData: ParsedRowData,
    companyStateCode: string,
  ): {
    updatedData: ParsedRowData;
    fixed: boolean;
    description: string;
  } {
    const pos = parsedData.placeOfSupply;
    if (!pos || !companyStateCode) {
      return { updatedData: parsedData, fixed: false, description: 'Missing POS or Company State' };
    }

    const isInterState = pos !== companyStateCode;
    const cgst = new Decimal(parsedData.cgstAmount || 0);
    const sgst = new Decimal(parsedData.sgstAmount || 0);
    const igst = new Decimal(parsedData.igstAmount || 0);
    const taxable = new Decimal(parsedData.taxableAmount || 0);

    const updated = { ...parsedData };
    let fixed = false;
    let description = '';

    if (isInterState) {
      // Must be IGST only
      if (cgst.gt(0) || sgst.gt(0)) {
        const totalTax = cgst.plus(sgst).plus(igst);
        updated.igstAmount = totalTax.toNumber();
        updated.cgstAmount = 0;
        updated.sgstAmount = 0;
        updated.totalAmount = taxable.plus(totalTax).toNumber();
        fixed = true;
        description = `Converted CGST+SGST to IGST ₹${totalTax.toFixed(2)} for Inter-State supply (POS ${pos})`;
      }
    } else {
      // Must be CGST + SGST (50:50)
      if (igst.gt(0)) {
        const totalTax = igst.plus(cgst).plus(sgst);
        const halfTax = totalTax.dividedBy(2).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
        updated.cgstAmount = halfTax.toNumber();
        updated.sgstAmount = halfTax.toNumber();
        updated.igstAmount = 0;
        updated.totalAmount = taxable.plus(halfTax.times(2)).toNumber();
        fixed = true;
        description = `Split IGST into CGST (₹${halfTax.toFixed(2)}) + SGST (₹${halfTax.toFixed(2)}) for Intra-State supply (POS ${pos})`;
      }
    }

    return { updatedData: updated, fixed, description };
  }
}

