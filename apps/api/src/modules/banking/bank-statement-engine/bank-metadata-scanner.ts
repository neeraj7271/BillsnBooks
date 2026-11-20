import { BankProfile, BankMetadataScanResult } from './bank-profile.interface';
import { BANK_PROFILES, UNIVERSAL_DEFAULT_PROFILE } from './bank-registry';

export class BankMetadataScanner {
  private static readonly ACCOUNT_NO_REGEX =
    /(?:account\s*(?:no|number|num|#)|a\/c\s*(?:no|num)?|ac\s*no)[\s:]*([0-9Xx\*\-]{8,22})/i;
  private static readonly IFSC_REGEX = /\b([A-Z]{4}0[A-Z0-9]{6})\b/i;
  private static readonly OPENING_BAL_REGEX =
    /(?:opening\s*balance|open\s*bal|op\s*bal)[\s:]*([0-9,]+(?:\.[0-9]{1,2})?)/i;

  /**
   * Performs 2-pass scanning on pre-table metadata and boundary detection
   */
  public static scan(rows: any[][]): BankMetadataScanResult {
    let accountNumber: string | null = null;
    let ifscCode: string | null = null;
    let accountHolderName: string | null = null;
    let openingBalance: number | null = null;
    let detectedProfile: BankProfile = UNIVERSAL_DEFAULT_PROFILE;

    const maxScanRows = Math.min(rows.length, 35);
    const textBuffer: string[] = [];

    // Pass 1: Extract Pre-Table Metadata
    for (let r = 0; r < maxScanRows; r++) {
      const rowText = rows[r]
        .map((cell) => String(cell || '').trim())
        .filter(Boolean)
        .join(' ');

      if (!rowText) continue;
      textBuffer.push(rowText.toLowerCase());

      // 1. Account Number
      if (!accountNumber) {
        const accMatch = rowText.match(this.ACCOUNT_NO_REGEX);
        if (accMatch && accMatch[1]) {
          accountNumber = accMatch[1].replace(/[\s\-]/g, '');
        }
      }

      // 2. IFSC Code
      if (!ifscCode) {
        const ifscMatch = rowText.match(this.IFSC_REGEX);
        if (ifscMatch && ifscMatch[1]) {
          ifscCode = ifscMatch[1].toUpperCase();
        }
      }

      // 3. Opening Balance
      if (openingBalance === null) {
        const balMatch = rowText.match(this.OPENING_BAL_REGEX);
        if (balMatch && balMatch[1]) {
          const val = parseFloat(balMatch[1].replace(/,/g, ''));
          if (!isNaN(val)) openingBalance = val;
        }
      }

      // 4. Customer Name (typically preceding account number or under "Customer Name: ...")
      if (!accountHolderName) {
        const nameMatch = rowText.match(/(?:customer|holder|account\s*name|name)[\s:]+([A-Za-z\s.]{3,40})/i);
        if (nameMatch && nameMatch[1]) {
          const cleanName = nameMatch[1].trim();
          if (!cleanName.toLowerCase().includes('account') && !cleanName.toLowerCase().includes('statement')) {
            accountHolderName = cleanName;
          }
        }
      }
    }

    // Identify Bank from IFSC or Content Keywords
    const combinedText = textBuffer.join(' ');
    if (ifscCode) {
      const prefix = ifscCode.substring(0, 4);
      const match = BANK_PROFILES.find((p) => p.ifscPrefixes.includes(prefix));
      if (match) detectedProfile = match;
    }

    if (detectedProfile === UNIVERSAL_DEFAULT_PROFILE) {
      for (const profile of BANK_PROFILES) {
        if (profile.nameKeywords.some((kw) => combinedText.includes(kw))) {
          detectedProfile = profile;
          break;
        }
      }
    }

    // Pass 2: Boundary Detection - Find the row containing the table header
    let headerRowIndex = -1;
    let highestMatchScore = 0;

    for (let r = 0; r < maxScanRows; r++) {
      const row = rows[r].map((cell) => String(cell || '').trim().toLowerCase());
      if (row.length === 0) continue;

      let score = 0;
      const hasDate = row.some((c) =>
        [...(detectedProfile.dateAliases || []), 'date', 'txn date'].some((alias) => c.includes(alias)),
      );
      const hasNarration = row.some((c) =>
        [...(detectedProfile.narrationAliases || []), 'narration', 'description', 'particulars'].some((alias) =>
          c.includes(alias),
        ),
      );
      const hasDebit = row.some((c) =>
        [...(detectedProfile.debitAliases || []), 'debit', 'withdrawal', 'dr'].some((alias) => c.includes(alias)),
      );
      const hasCredit = row.some((c) =>
        [...(detectedProfile.creditAliases || []), 'credit', 'deposit', 'cr'].some((alias) => c.includes(alias)),
      );
      const hasBalance = row.some((c) =>
        [...(detectedProfile.balanceAliases || []), 'balance'].some((alias) => c.includes(alias)),
      );
      const hasAmount = row.some((c) =>
        [...(detectedProfile.amountAliases || []), 'amount'].some((alias) => c === alias || c.includes(alias)),
      );

      if (hasDate) score += 3;
      if (hasNarration) score += 3;
      if (hasDebit) score += 2;
      if (hasCredit) score += 2;
      if (hasBalance) score += 2;
      if (hasAmount) score += 2;

      // Bonus if matches bank-specific header keywords
      for (const kw of detectedProfile.headerKeywords) {
        if (row.some((c) => c.includes(kw))) score += 1;
      }

      if (score > highestMatchScore && hasDate && (hasNarration || hasDebit || hasCredit || hasAmount)) {
        highestMatchScore = score;
        headerRowIndex = r;
      }
    }

    return {
      bankName: detectedProfile.bankName,
      accountNumber,
      ifscCode,
      accountHolderName,
      headerRowIndex,
      openingBalance,
      profileMatched: detectedProfile.bankName,
    };
  }
}
