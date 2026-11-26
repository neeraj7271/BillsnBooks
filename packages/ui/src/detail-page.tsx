import * as React from 'react';
import { cn } from './utils';

export interface DetailPageProps {
  header: React.ReactNode;
  main: React.ReactNode;
  aside: React.ReactNode;
  mobileActions?: React.ReactNode;
  className?: string;
}

export function DetailPage({
  header,
  main,
  aside,
  mobileActions,
  className,
}: DetailPageProps) {
  return (
    <div className={cn('space-y-6 pb-20 lg:pb-0', className)}>
      {header}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 xl:col-span-8 min-w-0 space-y-6">{main}</div>
        <aside className="lg:col-span-5 xl:col-span-4 min-w-0 space-y-4 lg:sticky lg:top-20">
          {aside}
        </aside>
      </div>
      {mobileActions && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-surface/95 backdrop-blur-md px-4 py-3 flex items-center justify-end gap-2 shadow-lg">
          {mobileActions}
        </div>
      )}
    </div>
  );
}
