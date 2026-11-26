import * as React from 'react';
import { cn, formatCurrency } from './utils';

export interface MoneyTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  amount: number | string;
  currency?: string;
  showDrCr?: boolean;
  negative?: boolean;
  colorCode?: 'none' | 'profit-loss' | 'dr-cr';
}

export function MoneyText({
  amount,
  currency = 'INR',
  showDrCr = false,
  negative = false,
  colorCode = 'none',
  className,
  ...props
}: MoneyTextProps) {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const safeAmount = isNaN(numericAmount) ? 0 : numericAmount;

  const isDebit = safeAmount > 0;
  const isNegative = negative || safeAmount < 0;
  const absAmount = Math.abs(safeAmount);

  let formatted = formatCurrency(absAmount, currency);
  if (isNegative && !showDrCr) {
    formatted = `-${formatted}`;
  }

  let colorClasses = '';
  if (colorCode === 'profit-loss') {
    if (safeAmount > 0) colorClasses = 'text-status-success-text font-semibold';
    else if (safeAmount < 0 || negative) colorClasses = 'text-status-danger-text font-semibold';
  } else if (colorCode === 'dr-cr') {
    if (isDebit) colorClasses = 'text-brand-text font-semibold';
    else colorClasses = 'text-status-success-text font-semibold';
  } else if (negative) {
    colorClasses = 'text-status-danger-text';
  }

  return (
    <span
      className={cn('tabular-nums font-mono', colorClasses, className)}
      {...props}
    >
      {formatted}
      {showDrCr && (
        <span className="ml-1 text-[10px] uppercase font-bold tracking-wider">
          {safeAmount >= 0 ? 'Dr' : 'Cr'}
        </span>
      )}
    </span>
  );
}
