/**
 * Shared formatDate helper — single source of truth for date representation.
 * - 'short': "14 Nov 2026"
 * - 'long': "14 November 2026"
 * - 'iso': "2026-11-14"
 */
export function formatDate(
  d: Date | string | null | undefined,
  variant: 'short' | 'long' | 'iso' = 'short'
): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d.includes('T') ? d : `${d}T00:00:00`) : d;
  if (isNaN(date.getTime())) return typeof d === 'string' ? d : '—';

  if (variant === 'iso') {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const day = date.getDate();
  const year = date.getFullYear();

  if (variant === 'long') {
    const month = date.toLocaleString('en-IN', { month: 'long' });
    return `${day} ${month} ${year}`;
  }

  // default 'short': '14 Nov 2026'
  const month = date.toLocaleString('en-IN', { month: 'short' });
  return `${day} ${month} ${year}`;
}

export function parseISODate(s: string): Date {
  return new Date(s.includes('T') ? s : `${s}T00:00:00`);
}

export function todayISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysISO(s: string, n: number): string {
  const d = parseISODate(s);
  d.setDate(d.getDate() + n);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface FormatMoneyOptions {
  sign?: boolean;
  currency?: string;
  variant?: 'inr' | 'compact' | 'lakhs';
}

/**
 * Shared formatMoney helper — single source of truth for currency representation.
 * - 'inr' (default): "₹1,24,500.00"
 * - 'compact': "₹1.25L" or "₹1.5Cr"
 * - 'lakhs': "1.25 Lakhs"
 */
export function formatMoney(
  amount: number | string | null | undefined,
  optsOrVariant?: 'inr' | 'compact' | 'lakhs' | FormatMoneyOptions
): string {
  const val = Number(amount) || 0;
  const opts: FormatMoneyOptions =
    typeof optsOrVariant === 'string'
      ? { variant: optsOrVariant }
      : optsOrVariant || { variant: 'inr' };

  const variant = opts.variant || 'inr';
  const currencySymbol = opts.currency === undefined ? '₹' : opts.currency;
  const abs = Math.abs(val);
  const isNegative = val < 0;
  const signPrefix = isNegative ? '-' : opts.sign && val > 0 ? '+' : '';

  if (variant === 'compact') {
    if (abs >= 10000000) {
      return `${signPrefix}${currencySymbol}${(abs / 10000000).toFixed(2)} Cr`;
    }
    if (abs >= 100000) {
      return `${signPrefix}${currencySymbol}${(abs / 100000).toFixed(2)} L`;
    }
    if (abs >= 1000) {
      return `${signPrefix}${currencySymbol}${(abs / 1000).toFixed(1)} K`;
    }
    return `${signPrefix}${currencySymbol}${abs.toFixed(2)}`;
  }

  if (variant === 'lakhs') {
    return `${signPrefix}${(abs / 100000).toFixed(2)} Lakhs`;
  }

  // default 'inr': formatted with Indian comma grouping and 2 decimal places
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);

  return `${signPrefix}${currencySymbol}${formatted}`;
}
