import { Injectable } from '@nestjs/common';

export interface TokenizedNarration {
  rawNarration: string;
  paymentMode: 'NEFT' | 'RTGS' | 'IMPS' | 'UPI' | 'CHEQUE' | 'BANK_CHARGE' | 'INTEREST' | 'POS_CARD' | 'OTHER';
  referenceNumber: string | null;
  extractedPartyName: string | null;
  vpa: string | null;
  isBankChargeOrInterest: boolean;
}

@Injectable()
export class NarrationTokenizerService {
  tokenize(narration: string): TokenizedNarration {
    const raw = (narration || '').trim();
    const clean = raw.replace(/\s+/g, ' ');

    let paymentMode: TokenizedNarration['paymentMode'] = 'OTHER';
    let referenceNumber: string | null = null;
    let extractedPartyName: string | null = null;
    let vpa: string | null = null;
    let isBankChargeOrInterest = false;

    // 1. Bank charges & Interest detection
    if (/(?:bank charge|consolidated charge|sms charge|annual fee|gst on|service tax|amc fee)/i.test(clean)) {
      paymentMode = 'BANK_CHARGE';
      extractedPartyName = 'Bank Charges';
      isBankChargeOrInterest = true;
    } else if (/(?:interest credit|int\.pd|interest capitalized)/i.test(clean)) {
      paymentMode = 'INTEREST';
      extractedPartyName = 'Bank Interest';
      isBankChargeOrInterest = true;
    }
    // 2. UPI Transactions
    else if (clean.toUpperCase().includes('UPI')) {
      paymentMode = 'UPI';
      const upiRefMatch = clean.match(/(?:UPI[\/\-](?:CR[\/\-]|DR[\/\-])?)(\d{12})/i) || clean.match(/\b(\d{12})\b/);
      if (upiRefMatch) {
        referenceNumber = upiRefMatch[1];
      }

      const vpaMatch = clean.match(/([a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64})/);
      if (vpaMatch) {
        vpa = vpaMatch[1];
        extractedPartyName = vpaMatch[1];
      } else {
        const parts = clean.split(/[\/\-]/).map((p) => p.trim()).filter((p) => p.length > 2 && !/^(UPI|CR|DR|\d+)$/i.test(p));
        if (parts.length > 0) {
          extractedPartyName = parts[0];
        }
      }
    }
    // 3. NEFT Transactions
    else if (clean.toUpperCase().includes('NEFT')) {
      paymentMode = 'NEFT';
      const neftRefMatch = clean.match(/NEFT[\/\-]([A-Za-z0-9]{10,22})/i) || clean.match(/\b(N[0-9]{10,16})\b/i);
      if (neftRefMatch) {
        referenceNumber = neftRefMatch[1];
      }
      const parts = clean.split(/[\/\-]/).map((p) => p.trim()).filter(Boolean);
      for (const part of parts) {
        if (
          part.toUpperCase() === 'NEFT' ||
          part === referenceNumber ||
          /^(NEFT|CR|DR|HDFC|ICIC|SBIN|P2A|\d+)$/i.test(part) ||
          part.match(/^[A-Z]{4}0[A-Z0-9]{6}$/i)
        ) {
          continue;
        }
        if (part.length > 2) {
          extractedPartyName = part;
          break;
        }
      }
    }
    // 4. RTGS Transactions
    else if (clean.toUpperCase().includes('RTGS')) {
      paymentMode = 'RTGS';
      const rtgsRefMatch = clean.match(/RTGS[\/\-](?:CMS[\/\-])?([A-Za-z0-9]{10,22})/i) || clean.match(/\b(R[0-9]{10,16})\b/i);
      if (rtgsRefMatch) {
        referenceNumber = rtgsRefMatch[1];
      }
      const parts = clean.split(/[\/\-]/).map((p) => p.trim()).filter(Boolean);
      for (const part of parts) {
        if (
          part.toUpperCase() === 'RTGS' ||
          part.toUpperCase() === 'CMS' ||
          part === referenceNumber ||
          /^(RTGS|CMS|CR|DR|HDFC|ICIC|SBIN|\d+)$/i.test(part) ||
          part.match(/^[A-Z]{4}0[A-Z0-9]{6}$/i)
        ) {
          continue;
        }
        if (part.length > 2) {
          extractedPartyName = part;
          break;
        }
      }
    }
    // 5. IMPS Transactions
    else if (clean.toUpperCase().includes('IMPS')) {
      paymentMode = 'IMPS';
      const impsRefMatch = clean.match(/IMPS[\/\-](?:P2A[\/\-|P2U[\/\-])?(\d{12})/i) || clean.match(/\b(\d{12})\b/);
      if (impsRefMatch) {
        referenceNumber = impsRefMatch[1];
      }
      const parts = clean.split(/[\/\-]/).map((p) => p.trim()).filter(Boolean);
      for (const part of parts) {
        if (
          part.toUpperCase() === 'IMPS' ||
          part === referenceNumber ||
          /^(IMPS|P2A|P2U|CR|DR|\d+)$/i.test(part)
        ) {
          continue;
        }
        if (part.length > 2) {
          extractedPartyName = part;
          break;
        }
      }
    }
    // 6. Cheques
    else if (/(?:CHQ|CHEQUE|CLG|CLEARING)/i.test(clean)) {
      paymentMode = 'CHEQUE';
      const chqRefMatch = clean.match(/(?:CHQ|CHEQUE|CLG)[^\d]*(\d{4,8})/i) || clean.match(/\b(\d{6})\b/);
      if (chqRefMatch) {
        referenceNumber = chqRefMatch[1];
      }
      const parts = clean.split(/[\/\-:]/).map((p) => p.trim()).filter(Boolean);
      for (const part of parts) {
        if (
          part === referenceNumber ||
          /^(CHQ|CHEQUE|CLG|CLEARING|DEPOSIT|WITHDRAWAL|\d+|\s)+$/i.test(part)
        ) {
          continue;
        }
        if (part.length > 2) {
          extractedPartyName = part;
          break;
        }
      }
    }
    // 7. POS / Card
    else if (/(?:POS|CARD|ATM|ECOM)/i.test(clean)) {
      paymentMode = 'POS_CARD';
      const cardRefMatch = clean.match(/\b(\d{4,16}X*\d*)\b/);
      if (cardRefMatch) {
        referenceNumber = cardRefMatch[1];
      }
      const parts = clean.split(/[\/\- ]/).map((p) => p.trim()).filter(Boolean);
      const partyCandidates = parts.filter((p) => !/^(POS|CARD|ATM|ECOM|TXN|\d+|X+)$/i.test(p));
      if (partyCandidates.length > 0) {
        extractedPartyName = partyCandidates.join(' ');
      }
    } else {
      const genericRef = clean.match(/\b([A-Z0-9]{8,20})\b/);
      if (genericRef && !/^(PAYMENT|TRANSFER|DEPOSIT|WITHDRAWAL)$/i.test(genericRef[1])) {
        referenceNumber = genericRef[1];
      }
    }

    if (extractedPartyName && (extractedPartyName.length < 2 || /^\d+$/.test(extractedPartyName))) {
      extractedPartyName = null;
    }

    return {
      rawNarration: raw,
      paymentMode,
      referenceNumber,
      extractedPartyName,
      vpa,
      isBankChargeOrInterest,
    };
  }
}
