import * as React from 'react';
import { cn, formatCurrency } from './utils';

export interface MoneyTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  amount: number | string;
  currency?: string;
  showDrCr?: boolean;
  colorCode?: 'none' | 'profit-loss' | 'dr-cr';
}

export function MoneyText({
  amount,
  currency = 'INR',
  showDrCr = false,
  colorCode = 'none',
  className,
  ...props
}: MoneyTextProps) {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const isNaNValue = isNaN(numericAmount);
  const safeAmount = isNaNValue ? 0 : numericAmount;

  // Debit/Credit determination for double entry
  const isDebit = safeAmount > 0;
  const isNegative = safeAmount < 0;
  const absAmount = Math.abs(safeAmount);

  let formatted = formatCurrency(absAmount, currency);
  if (isNegative && !showDrCr) {
    formatted = `-${formatted}`;
  }

  let colorClasses = '';
  if (colorCode === 'profit-loss') {
    if (safeAmount > 0) colorClasses = 'text-emerald-600 dark:text-emerald-400 font-semibold';
    else if (safeAmount < 0) colorClasses = 'text-rose-600 dark:text-rose-400 font-semibold';
  } else if (colorCode === 'dr-cr') {
    if (isDebit) colorClasses = 'text-blue-600 dark:text-blue-400 font-semibold';
    else colorClasses = 'text-emerald-600 dark:text-emerald-400 font-semibold';
  }

  return (
    <span
      className={cn('tabular-nums font-mono', colorClasses, className)}
      {...props}
    >
      {formatted}
      {showDrCr && (
        <span className="ml-1 text-[10px] uppercase font-bold tracking-wider opacity-75">
          {safeAmount >= 0 ? 'Dr' : 'Cr'}
        </span>
      )}
    </span>
  );
}

