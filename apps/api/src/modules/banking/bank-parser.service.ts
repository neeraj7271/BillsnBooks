import { Injectable, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { parse as csvParse } from 'csv-parse/sync';
import * as ExcelJS from 'exceljs';
import { NarrationTokenizerService, TokenizedNarration } from './narration-tokenizer.service';
import { BankMetadataScanner } from './bank-statement-engine/bank-metadata-scanner';
import { BANK_PROFILES, UNIVERSAL_DEFAULT_PROFILE } from './bank-statement-engine/bank-registry';
import { BankProfile } from './bank-statement-engine/bank-profile.interface';

export interface ParsedBankTransaction {
  transactionDate: Date;
  valueDate: Date | null;
  narration: string;
  debitAmount: number;
  creditAmount: number;
  balanceAfter: number;
  referenceNumber: string | null;
  paymentMode: string;
  extractedPartyName: string | null;
  continuityValid: boolean;
  expectedBalance: number;
}

export interface BankStatementParseResult {
  fileHashSha256: string;
  fileName: string;
  openingBalance: number;
  closingBalance: number;
  totalTransactions: number;
  totalDebits: number;
  totalCredits: number;
  isContinuityValid: boolean;
  periodStart: Date | null;
  periodEnd: Date | null;
  transactions: ParsedBankTransaction[];
  bankDetected: string;
  accountNumber?: string | null;
  ifscCode?: string | null;
  accountHolderName?: string | null;
}

@Injectable()
export class BankParserService {
  constructor(private readonly tokenizer: NarrationTokenizerService) {}

  public hashBuffer(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  public async parseStatement(
    buffer: Buffer,
    fileName: string,
    initialOpeningBalance?: number,
  ): Promise<BankStatementParseResult> {
    const fileHash = this.hashBuffer(buffer);
    const rows = await this.extractRows(buffer, fileName);

    if (!rows || rows.length === 0) {
      throw new BadRequestException('The bank statement file is empty or could not be parsed.');
    }

    // Advanced 2-Pass metadata and bank profile scanning
    const scanResult = BankMetadataScanner.scan(rows);
    const { headerRowIndex } = scanResult;

    if (headerRowIndex === -1) {
      throw new BadRequestException(
        'Could not identify valid bank statement columns (Date, Narration/Description, Debit/Credit, Balance).',
      );
    }

    // Match bank profile
    const matchedProfile =
      BANK_PROFILES.find((p) => p.bankName === scanResult.bankName) || UNIVERSAL_DEFAULT_PROFILE;

    const { mapping, bankDetected } = this.mapHeaderColumns(rows[headerRowIndex], matchedProfile);

    const dataRows = rows.slice(headerRowIndex + 1);
    const parsedTxns: ParsedBankTransaction[] = [];

    let calculatedBalance = initialOpeningBalance ?? (scanResult.openingBalance ?? 0);
    let openingBalanceDetected: number | null = scanResult.openingBalance ?? null;
    let closingBalanceDetected = 0;
    let totalDebits = 0;
    let totalCredits = 0;
    let isContinuityValid = true;

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row || row.length === 0 || row.every((c: any) => c === undefined || c === null || String(c).trim() === '')) {
        continue;
      }

      const dateStr = mapping.date !== undefined ? String(row[mapping.date] ?? '').trim() : '';
      const date = this.parseDate(dateStr);
      if (!date) {
        // Skip non-transaction rows (e.g. footnotes, summary rows at the bottom)
        continue;
      }

      const valueDateStr = mapping.valueDate !== undefined ? String(row[mapping.valueDate] ?? '').trim() : '';
      const valueDate = valueDateStr ? this.parseDate(valueDateStr) : null;

      const narration = mapping.narration !== undefined ? String(row[mapping.narration] ?? '').trim() : '';
      const refCol = mapping.reference !== undefined ? String(row[mapping.reference] ?? '').trim() : '';

      let debit = mapping.debit !== undefined ? this.parseAmount(row[mapping.debit]) : 0;
      let credit = mapping.credit !== undefined ? this.parseAmount(row[mapping.credit]) : 0;

      // Handle single amount column with Cr/Dr indicator if applicable
      if (debit === 0 && credit === 0 && mapping.amount !== undefined) {
        const amt = this.parseAmount(row[mapping.amount]);
        const indicator = mapping.crdr !== undefined ? String(row[mapping.crdr] ?? '').toUpperCase().trim() : '';
        const rowStr = row.map((c: any) => String(c || '')).join(' ').toUpperCase();

        if (indicator.includes('CR') || (!indicator && rowStr.includes(' CR'))) {
          credit = amt;
        } else {
          debit = amt;
        }
      }

      const statedBalance = mapping.balance !== undefined ? this.parseAmount(row[mapping.balance]) : 0;

      // Tokenize narration
      const tokenized: TokenizedNarration = this.tokenizer.tokenize(narration);
      const refNumber = refCol || tokenized.referenceNumber;

      if (openingBalanceDetected === null) {
        openingBalanceDetected = statedBalance - credit + debit;
        calculatedBalance = openingBalanceDetected;
      }

      calculatedBalance = Math.round((calculatedBalance + credit - debit) * 100) / 100;
      const diff = Math.abs(calculatedBalance - statedBalance);
      const continuityValid = diff < 0.05;

      if (!continuityValid) {
        isContinuityValid = false;
      }

      closingBalanceDetected = statedBalance;
      totalDebits += debit;
      totalCredits += credit;

      parsedTxns.push({
        transactionDate: date,
        valueDate,
        narration,
        debitAmount: debit,
        creditAmount: credit,
        balanceAfter: statedBalance,
        referenceNumber: refNumber || null,
        paymentMode: tokenized.paymentMode,
        extractedPartyName: tokenized.extractedPartyName,
        continuityValid,
        expectedBalance: calculatedBalance,
      });
    }

    if (parsedTxns.length === 0) {
      throw new BadRequestException('No valid transaction entries found in the statement.');
    }

    const openingBalance = openingBalanceDetected ?? 0;
    const closingBalance = closingBalanceDetected;

    const dates = parsedTxns.map((t) => t.transactionDate.getTime());
    const periodStart = new Date(Math.min(...dates));
    const periodEnd = new Date(Math.max(...dates));

    return {
      fileHashSha256: fileHash,
      fileName,
      openingBalance,
      closingBalance,
      totalTransactions: parsedTxns.length,
      totalDebits: Math.round(totalDebits * 100) / 100,
      totalCredits: Math.round(totalCredits * 100) / 100,
      isContinuityValid,
      periodStart,
      periodEnd,
      transactions: parsedTxns,
      bankDetected: scanResult.bankName || bankDetected,
      accountNumber: scanResult.accountNumber,
      ifscCode: scanResult.ifscCode,
      accountHolderName: scanResult.accountHolderName,
    };
  }

  private async extractRows(buffer: Buffer, fileName: string): Promise<any[][]> {
    const isCsv = fileName.toLowerCase().endsWith('.csv') || fileName.toLowerCase().endsWith('.txt');
    if (isCsv) {
      const content = buffer.toString('utf-8');
      const records = csvParse(content, {
        columns: false,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });
      return records as any[][];
    } else {
      const workbook = new ExcelJS.Workbook();
      // @ts-ignore
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new BadRequestException('Excel workbook has no sheets.');
      }

      const rows: any[][] = [];
      worksheet.eachRow({ includeEmpty: false }, (row) => {
        const values = Array.isArray(row.values) ? row.values.slice(1) : [];
        rows.push(values);
      });
      return rows;
    }
  }

  private mapHeaderColumns(
    headerRow: any[],
    profile: BankProfile,
  ): {
    mapping: {
      date?: number;
      valueDate?: number;
      narration?: number;
      reference?: number;
      debit?: number;
      credit?: number;
      balance?: number;
      amount?: number;
      crdr?: number;
    };
    bankDetected: string;
  } {
    const mapping: any = {};
    const row = headerRow.map((cell) => String(cell || '').trim().toLowerCase());

    const dateAliases = profile.dateAliases || ['date', 'txn date', 'transaction date'];
    const narrationAliases = profile.narrationAliases || ['narration', 'description', 'particulars'];
    const refAliases = profile.refAliases || ['ref no', 'cheque no', 'chq no'];
    const debitAliases = profile.debitAliases || ['debit', 'withdrawal', 'dr'];
    const creditAliases = profile.creditAliases || ['credit', 'deposit', 'cr'];
    const balanceAliases = profile.balanceAliases || ['balance', 'closing balance'];
    const amountAliases = profile.amountAliases || ['amount'];
    const crdrAliases = profile.crdrAliases || ['type', 'cr/dr', 'dr / cr'];

    for (let c = 0; c < row.length; c++) {
      const col = row[c];
      if (!col) continue;

      if (mapping.date === undefined && dateAliases.some((a) => col === a || col.includes(a))) {
        mapping.date = c;
      } else if (mapping.valueDate === undefined && (col.includes('value date') || col === 'val date')) {
        mapping.valueDate = c;
      } else if (mapping.narration === undefined && narrationAliases.some((a) => col === a || col.includes(a))) {
        mapping.narration = c;
      } else if (mapping.reference === undefined && refAliases.some((a) => col === a || col.includes(a))) {
        mapping.reference = c;
      } else if (mapping.debit === undefined && debitAliases.some((a) => col === a || col.includes(a))) {
        mapping.debit = c;
      } else if (mapping.credit === undefined && creditAliases.some((a) => col === a || col.includes(a))) {
        mapping.credit = c;
      } else if (mapping.balance === undefined && balanceAliases.some((a) => col === a || col.includes(a))) {
        mapping.balance = c;
      } else if (mapping.amount === undefined && amountAliases.some((a) => col === a || col.includes(a))) {
        mapping.amount = c;
      } else if (mapping.crdr === undefined && crdrAliases.some((a) => col === a || col.includes(a))) {
        mapping.crdr = c;
      }
    }

    return { mapping, bankDetected: profile.bankName };
  }

  private parseAmount(val: any): number {
    if (val === undefined || val === null) return 0;
    const str = String(val).replace(/,/g, '').replace(/[₹$]/g, '').trim();
    if (!str || str === '-' || str === '--') return 0;
    const num = parseFloat(str);
    return isNaN(num) ? 0 : Math.abs(num);
  }

  private parseDate(val: string): Date | null {
    if (!val) return null;
    const clean = val.trim();

    // Check Excel numeric serial date (e.g. 45214)
    if (/^\d{5}$/.test(clean)) {
      const serial = parseInt(clean, 10);
      const utcDays = Math.floor(serial - 25569);
      const utcValue = utcDays * 86400 * 1000;
      const dateInfo = new Date(utcValue);
      return isNaN(dateInfo.getTime()) ? null : dateInfo;
    }

    // DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyy = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1], 10);
      const month = parseInt(ddmmyyyy[2], 10) - 1;
      const year = parseInt(ddmmyyyy[3], 10);
      const d = new Date(Date.UTC(year, month, day));
      if (!isNaN(d.getTime())) return d;
    }

    // DD-Mon-YYYY (e.g. 01-Nov-2026 or 15-Oct-24)
    const monthNames: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    const ddMonYyyy = clean.match(/^(\d{1,2})[\/\-\s]([A-Za-z]{3})[\/\-\s](\d{2,4})$/);
    if (ddMonYyyy) {
      const day = parseInt(ddMonYyyy[1], 10);
      const monthStr = ddMonYyyy[2].toLowerCase();
      let year = parseInt(ddMonYyyy[3], 10);
      if (year < 100) year += 2000;
      if (monthNames[monthStr] !== undefined) {
        const d = new Date(Date.UTC(year, monthNames[monthStr], day));
        if (!isNaN(d.getTime())) return d;
      }
    }

    // YYYY-MM-DD
    const yyyymmdd = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (yyyymmdd) {
      const year = parseInt(yyyymmdd[1], 10);
      const month = parseInt(yyyymmdd[2], 10) - 1;
      const day = parseInt(yyyymmdd[3], 10);
      const d = new Date(Date.UTC(year, month, day));
      if (!isNaN(d.getTime())) return d;
    }

    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d;
  }
}
