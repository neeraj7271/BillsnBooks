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
        'flex flex-col items-center justify-center text-center rounded-2xl border border-default bg-surface p-12 space-y-3',
        className
      )}
    >
      <div className="h-12 w-12 rounded-full bg-surface-sunken flex items-center justify-center text-muted">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <h2 className="text-h3 text-primary">{title}</h2>
      {description && <p className="text-body-sm text-muted max-w-md">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
