import * as React from 'react';
import { cn, formatIndianDate } from './utils';

export interface DateTextProps extends React.HTMLAttributes<HTMLTimeElement> {
  date: Date | string | null | undefined;
  showTime?: boolean;
  variant?: 'short' | 'long' | 'relative';
}

export function DateText({
  date,
  showTime = false,
  variant = 'short',
  className,
  ...props
}: DateTextProps) {
  if (!date) {
    return <span className={cn('text-muted print:text-black', className)}>-</span>;
  }

  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    return <span className={cn('text-muted print:text-black', className)}>-</span>;
  }

  let fullText = formatIndianDate(d);
  if (variant === 'long') {
    fullText = d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } else if (variant === 'relative') {
    const diffDays = Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) fullText = 'Today';
    else if (diffDays === 1) fullText = 'Yesterday';
    else if (diffDays > 1 && diffDays < 30) fullText = `${diffDays}d ago`;
  }

  if (showTime && variant !== 'relative') {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    fullText = `${fullText} ${hours}:${minutes}`;
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
