import { cn } from './utils';
import { Skeleton } from './skeleton';

export interface LoadingStateProps {
  rows?: number;
  variant?: 'table' | 'cards' | 'form';
  className?: string;
}

export function LoadingState({ rows = 6, variant = 'table', className }: LoadingStateProps) {
  if (variant === 'cards') {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4', className)} aria-busy="true">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-default bg-surface p-5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-12 rounded-full" />
            </div>
            <Skeleton className="h-4 w-3/4" />
            <div className="pt-2 flex items-center justify-between border-t border-default/50">
              <Skeleton className="h-3 w-1/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'form') {
    return (
      <div className={cn('rounded-2xl border border-default bg-surface p-6 space-y-5 max-w-3xl shadow-2xs', className)} aria-busy="true">
        <div className="space-y-2">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="space-y-4 pt-2">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-9 w-full rounded-xl" />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-default/50">
          <Skeleton className="h-9 w-20 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>
    );
  }

  // Default: table rows skeleton
  return (
    <div className={cn('rounded-2xl border border-default bg-surface p-5 space-y-3 shadow-2xs', className)} aria-busy="true">
      <div className="flex items-center gap-4 pb-3 border-b border-default/60">
        <Skeleton className="h-4 w-1/6" />
        <Skeleton className="h-4 w-2/6" />
        <Skeleton className="h-4 w-2/6" />
        <Skeleton className="h-4 w-1/6" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-1.5">
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-4 w-2/6" />
          <Skeleton className="h-4 w-2/6" />
          <Skeleton className="h-4 w-1/6" />
        </div>
      ))}
    </div>
  );
}
