'use client';

import * as React from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from './utils';
import { toast } from './toast';

export interface MonoCopyableProps {
  value: string;
  label?: string;
  className?: string;
  showIcon?: boolean;
}

export function MonoCopyable({
  value,
  label = 'Value',
  className,
  showIcon = true,
}: MonoCopyableProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!value || value === '—' || value === 'N/A') return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(value);
      }
      setCopied(true);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  if (!value || value === '—') {
    return <span className={cn('font-mono text-xs text-muted', className)}>—</span>;
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`Click to copy ${label}`}
      className={cn(
        'group inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wide rounded-md px-1 py-0.5 transition-colors hover:bg-surface-sunken text-primary cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-border-focus',
        className
      )}
    >
      <span className="truncate">{value}</span>
      {showIcon && (
        <span className="text-muted group-hover:text-primary transition-opacity shrink-0">
          {copied ? (
            <Check className="h-3 w-3 text-status-success shrink-0" />
          ) : (
            <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          )}
        </span>
      )}
    </button>
  );
}
