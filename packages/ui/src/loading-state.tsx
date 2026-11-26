import { cn } from './utils';
import { Skeleton } from './skeleton';

export interface LoadingStateProps {
  variant?: 'table' | 'cards' | 'detail';
  rows?: number;
  className?: string;
}

export function LoadingState({
  variant = 'table',
  rows = 5,
  className,
}: LoadingStateProps) {
  if (variant === 'cards') {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)} aria-busy="true">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 rounded-xl border border-border bg-surface space-y-3">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'detail') {
    return (
      <div className={cn('grid grid-cols-1 lg:grid-cols-12 gap-6', className)} aria-busy="true">
        <div className="lg:col-span-8 p-6 rounded-xl border border-border bg-surface space-y-4">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="lg:col-span-4 p-6 rounded-xl border border-border bg-surface space-y-3">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-border bg-surface overflow-hidden', className)} aria-busy="true">
      <div className="p-3 border-b border-border-subtle bg-surface-sunken flex gap-4">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-3.5 w-28 ml-auto" />
      </div>
      <div className="divide-y divide-border-subtle">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-3 flex items-center gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-20 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
