export interface BankProfile {
  bankName: string;
  ifscPrefixes: string[];
  nameKeywords: string[];
  headerKeywords: string[];
  dateAliases?: string[];
  narrationAliases?: string[];
  refAliases?: string[];
  debitAliases?: string[];
  creditAliases?: string[];
  balanceAliases?: string[];
  amountAliases?: string[];
  crdrAliases?: string[];
}

export interface BankMetadataScanResult {
  bankName: string;
  accountNumber?: string | null;
  ifscCode?: string | null;
  accountHolderName?: string | null;
  headerRowIndex: number;
  openingBalance?: number | null;
  profileMatched: string;
}

export interface ParsedBankRow {
  date: Date;
  valueDate?: Date | null;
  narration: string;
  referenceNumber?: string | null;
  debit: number;
  credit: number;
  balance: number;
}
