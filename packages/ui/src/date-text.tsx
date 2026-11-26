import * as React from 'react';
import { cn, formatIndianDate } from './utils';

export type DateTextVariant = 'short' | 'long' | 'relative';

export interface DateTextProps extends React.HTMLAttributes<HTMLTimeElement> {
  date: Date | string | null | undefined;
  variant?: DateTextVariant;
  showTime?: boolean;
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatRelative(d: Date): string {
  const diffMs = Date.now() - d.getTime();
  const diffDays = Math.round(diffMs / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays === -1) return 'Tomorrow';
  if (diffDays > 1 && diffDays < 30) return `${diffDays} days ago`;
  if (diffDays >= 30 && diffDays < 365) return `${Math.floor(diffDays / 30)} mo ago`;
  if (diffDays < -1 && diffDays > -30) return `in ${Math.abs(diffDays)} days`;
  return formatIndianDate(d);
}

export function DateText({
  date,
  variant = 'short',
  showTime = false,
  className,
  ...props
}: DateTextProps) {
  if (!date) {
    return <span className={cn('text-muted print:text-primary', className)}>-</span>;
  }

  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    return <span className={cn('text-muted print:text-primary', className)}>-</span>;
  }

  const day = String(d.getDate()).padStart(2, '0');
  const monIdx = d.getMonth();
  const yrFull = d.getFullYear();
  const yrShort = String(yrFull).slice(-2);

  let dateStr: string;
  if (variant === 'long') {
    dateStr = `${day} ${MONTHS_LONG[monIdx]} ${yrFull}`;
  } else if (variant === 'relative') {
    dateStr = formatRelative(d);
  } else {
    dateStr = `${day} ${MONTHS_SHORT[monIdx]} ${yrShort}`;
  }

  let fullText = dateStr;
  if (showTime) {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    fullText = `${dateStr} ${hours}:${minutes}`;
  }

  return (
    <time
      dateTime={d.toISOString()}
      title={formatIndianDate(d)}
      className={cn('tabular-nums font-mono text-inherit print:text-primary', className)}
      {...props}
    >
      {fullText}
    </time>
  );
}
