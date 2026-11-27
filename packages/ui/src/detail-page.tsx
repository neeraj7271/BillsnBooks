import * as React from 'react';
import { cn } from './utils';
import { PageHeader, type PageHeaderProps } from './page-header';
import { LoadingState } from './loading-state';
import { ErrorState } from './error-state';

export interface DetailPageProps {
  header: PageHeaderProps;
  loading?: boolean;
  error?: Error | string | null;
  onRetry?: () => void;
  primary: React.ReactNode;
  sidebar?: React.ReactNode;
  className?: string;
}

export function DetailPage({
  header,
  loading = false,
  error = null,
  onRetry,
  primary,
  sidebar,
  className,
}: DetailPageProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <PageHeader {...header} />
      {error ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : loading ? (
        <LoadingState rows={8} />
      ) : sidebar ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-6">{primary}</div>
          <aside className="lg:col-span-5 space-y-6">{sidebar}</aside>
        </div>
      ) : (
        primary
      )}
    </div>
  );
}
