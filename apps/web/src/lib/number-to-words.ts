/**
 * Converts numbers to Indian English words (using Lakhs, Crores format).
 * Essential for statutory GST Invoices and Tally ERP/Prime formats.
 */

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function convertBelowThousand(n: number): string {
  let str = '';
  if (n >= 100) {
    str += `${ONES[Math.floor(n / 100)]} Hundred `;
    n %= 100;
  }
  if (n > 0) {
    if (n < 20) {
      str += ONES[n];
    } else {
      str += TENS[Math.floor(n / 10)];
      if (n % 10 > 0) {
        str += ` ${ONES[n % 10]}`;
      }
    }
  }
  return str.trim();
}

export function numberToIndianWords(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num) || num === 0) return 'Zero Rupees Only';

  const parts = Math.abs(num).toFixed(2).split('.');
  let integerPart = parseInt(parts[0] || '0', 10);
  const decimalPart = parseInt(parts[1] || '0', 10);

  let words = '';

  // Crores (>= 1,00,00,000)
  if (integerPart >= 10000000) {
    const crores = Math.floor(integerPart / 10000000);
    words += `${convertBelowThousand(crores)} Crore `;
    integerPart %= 10000000;
  }

  // Lakhs (>= 1,00,000)
  if (integerPart >= 100000) {
    const lakhs = Math.floor(integerPart / 100000);
    words += `${convertBelowThousand(lakhs)} Lakh `;
    integerPart %= 100000;
  }

  // Thousands (>= 1,000)
  if (integerPart >= 1000) {
    const thousands = Math.floor(integerPart / 1000);
    words += `${convertBelowThousand(thousands)} Thousand `;
    integerPart %= 1000;
  }

  // Remaining (< 1,000)
  if (integerPart > 0) {
    words += `${convertBelowThousand(integerPart)} `;
  }

  words = words.trim();

  let result = `INR ${words} Rupees`;

  if (decimalPart > 0) {
    result += ` and ${convertBelowThousand(decimalPart)} Paise`;
  }

  return `${result} Only`;
}

