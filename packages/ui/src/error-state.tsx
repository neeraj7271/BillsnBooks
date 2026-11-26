'use client';

import * as React from 'react';
import { AlertTriangle, RotateCcw, Copy, Check } from 'lucide-react';
import { cn } from './utils';
import { Button } from './button';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  error?: Error | string | null;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not complete this request. Please retry or copy the error context to report it.',
  error,
  onRetry,
  className,
}: ErrorStateProps) {
  const [copied, setCopied] = React.useState(false);

  const handleReport = async () => {
    const context = [
      `Title: ${title}`,
      `Message: ${typeof error === 'string' ? error : error?.message || description}`,
      `URL: ${typeof window !== 'undefined' ? window.location.href : ''}`,
      `Timestamp: ${new Date().toISOString()}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(context);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable
    }
  };

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center text-center py-10 px-6 rounded-xl border border-status-danger bg-status-danger-subtle',
        className,
      )}
    >
      <div className="h-10 w-10 rounded-lg bg-surface text-status-danger-text flex items-center justify-center mb-3">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h3 className="text-h3 text-primary">{title}</h3>
      <p className="mt-1 text-body-sm text-secondary max-w-md">{description}</p>
      <div className="mt-4 flex items-center gap-2">
        {onRetry && (
          <Button type="button" variant="primary" size="sm" onClick={onRetry}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Retry
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" onClick={handleReport}>
          {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
          {copied ? 'Copied' : 'Report'}
        </Button>
      </div>
    </div>
  );
}
