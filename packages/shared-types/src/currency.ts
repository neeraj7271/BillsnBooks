export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  label: string;
  decimals: number;
}

export const WORLD_CURRENCIES: CurrencyInfo[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', label: 'INR (₹ - Indian Rupee)', decimals: 2 },
  { code: 'USD', symbol: '$', name: 'US Dollar', label: 'USD ($ - US Dollar)', decimals: 2 },
  { code: 'EUR', symbol: '€', name: 'Euro', label: 'EUR (€ - Euro)', decimals: 2 },
  { code: 'GBP', symbol: '£', name: 'British Pound', label: 'GBP (£ - British Pound)', decimals: 2 },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', label: 'AED (د.إ - UAE Dirham)', decimals: 2 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', label: 'SGD (S$ - Singapore Dollar)', decimals: 2 },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', label: 'CAD (CA$ - Canadian Dollar)', decimals: 2 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', label: 'AUD (A$ - Australian Dollar)', decimals: 2 },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', label: 'SAR (﷼ - Saudi Riyal)', decimals: 2 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', label: 'JPY (¥ - Japanese Yen)', decimals: 0 },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', label: 'CHF (CHF - Swiss Franc)', decimals: 2 },
  { code: 'QAR', symbol: 'QR', name: 'Qatari Riyal', label: 'QAR (QR - Qatari Riyal)', decimals: 2 },
  { code: 'KWD', symbol: 'KD', name: 'Kuwaiti Dinar', label: 'KWD (KD - Kuwaiti Dinar)', decimals: 3 },
  { code: 'BHD', symbol: 'BD', name: 'Bahraini Dinar', label: 'BHD (BD - Bahraini Dinar)', decimals: 3 },
  { code: 'OMR', symbol: 'RO', name: 'Omani Rial', label: 'OMR (RO - Omani Rial)', decimals: 3 },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', label: 'HKD (HK$ - Hong Kong Dollar)', decimals: 2 },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', label: 'MYR (RM - Malaysian Ringgit)', decimals: 2 },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', label: 'CNY (¥ - Chinese Yuan)', decimals: 2 },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', label: 'NZD (NZ$ - New Zealand Dollar)', decimals: 2 },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', label: 'THB (฿ - Thai Baht)', decimals: 2 },
];

export function getCurrencyInfo(code: string): CurrencyInfo {
  const found = WORLD_CURRENCIES.find((c) => c.code.toUpperCase() === code.toUpperCase());
  return (
    found || {
      code: code.toUpperCase(),
      symbol: code.toUpperCase(),
      name: code.toUpperCase(),
      label: `${code.toUpperCase()} (${code.toUpperCase()})`,
      decimals: 2,
    }
  );
}

