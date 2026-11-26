import * as React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from './utils';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-6 rounded-xl border border-dashed border-border bg-surface',
        className,
      )}
    >
      <div className="h-11 w-11 rounded-lg bg-surface-sunken text-muted flex items-center justify-center mb-3">
        {icon || <Inbox className="h-5 w-5" />}
      </div>
      <h3 className="text-h3 text-primary">{title}</h3>
      {description && <p className="mt-1 text-body-sm text-muted max-w-md">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
