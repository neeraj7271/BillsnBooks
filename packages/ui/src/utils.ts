import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format currency amount based on currency code (e.g. INR uses ₹12,34,567.89, USD uses $1,234,567.89, EUR uses €1,234,567.89)
 */
export function formatCurrency(amount: number | string, currency: string = 'INR'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return currency === 'INR' ? '₹ 0.00' : `${currency} 0.00`;

  const curr = currency.toUpperCase();
  const locale = curr === 'INR' ? 'en-IN' : 'en-US';

  try {
    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
    return formatted.replace(/^₹(?=\d)/, '₹ ');
  } catch {
    return `${curr} ${num.toFixed(2)}`;
  }
}

/**
 * Backward compatible Indian Lakhs/Crores currency format
 */
export function formatIndianCurrency(amount: number | string): string {
  return formatCurrency(amount, 'INR');
}

/**
 * Format date in Indian statutory DD/MM/YYYY format
 */
export function formatIndianDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

