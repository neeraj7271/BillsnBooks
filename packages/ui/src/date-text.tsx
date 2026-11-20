import * as React from 'react';
import { cn, formatIndianDate } from './utils';

export interface DateTextProps extends React.HTMLAttributes<HTMLTimeElement> {
  date: Date | string | null | undefined;
  showTime?: boolean;
}

export function DateText({
  date,
  showTime = false,
  className,
  ...props
}: DateTextProps) {
  if (!date) {
    return <span className={cn('text-slate-400 dark:text-slate-500 print:text-slate-700', className)}>-</span>;
  }

  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    return <span className={cn('text-slate-400 dark:text-slate-500 print:text-slate-700', className)}>-</span>;
  }

  const dateStr = formatIndianDate(d);
  let fullText = dateStr;

  if (showTime) {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    fullText = `${dateStr} ${hours}:${minutes}`;
  }

  return (
    <time
      dateTime={d.toISOString()}
      className={cn('tabular-nums font-mono text-inherit print:text-black', className)}
      {...props}
    >
      {fullText}
    </time>
  );
}

