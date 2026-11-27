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
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return typeof d === 'string' ? d : '—';

  if (variant === 'iso') {
    return date.toISOString().split('T')[0]!;
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

/**
 * Shared formatMoney helper — single source of truth for currency representation.
 * - 'inr': "₹1,24,500.00"
 * - 'compact': "₹1.25L" or "₹1.5Cr"
 * - 'lakhs': "1.25 Lakhs"
 */
export function formatMoney(
  amount: number | null | undefined,
  variant: 'inr' | 'compact' | 'lakhs' = 'inr'
): string {
  const val = Number(amount) || 0;

  if (variant === 'compact') {
    const abs = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (abs >= 10000000) {
      return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
    }
    if (abs >= 100000) {
      return `${sign}₹${(abs / 100000).toFixed(2)} L`;
    }
    if (abs >= 1000) {
      return `${sign}₹${(abs / 1000).toFixed(1)} K`;
    }
    return `${sign}₹${abs.toFixed(2)}`;
  }

  if (variant === 'lakhs') {
    const abs = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    return `${sign}${(abs / 100000).toFixed(2)} Lakhs`;
  }

  // default 'inr': formatted with Indian comma grouping and 2 decimal places
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);

  return `₹${formatted}`;
}
