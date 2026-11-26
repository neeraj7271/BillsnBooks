import { AlertTriangle, RotateCcw } from 'lucide-react';
import { cn } from './utils';
import { Button } from './button';

export interface ErrorStateProps {
  title?: string;
  error: Error | string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Unable to load data',
  error,
  onRetry,
  className,
}: ErrorStateProps) {
  const message = typeof error === 'string' ? error : error.message;
  return (
    <div
      role="alert"
      className={cn(
        'rounded-2xl border border-status-danger bg-status-danger-subtle p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-status-danger-text shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-status-danger-text">{title}</h2>
          <p className="text-xs text-status-danger-text">{message}</p>
        </div>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} leftIcon={<RotateCcw className="h-3.5 w-3.5" />}>
          Retry
        </Button>
      )}
    </div>
  );
}
