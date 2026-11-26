import * as React from 'react';
import { cn } from './utils';
import { PageHeader, type PageHeaderProps } from './page-header';
import { Toolbar, type ToolbarProps } from './toolbar';
import { DataTable, type DataTableProps } from './data-table';
import { EmptyState, type EmptyStateProps } from './empty-state';
import { LoadingState } from './loading-state';
import { ErrorState } from './error-state';

export interface ListPageProps<T extends Record<string, any>> {
  header: PageHeaderProps;
  kpis?: React.ReactNode;
  toolbar?: ToolbarProps;
  data: T[];
  columns: DataTableProps<T>['columns'];
  loading?: boolean;
  error?: Error | string | null;
  onRetry?: () => void;
  empty?: EmptyStateProps;
  filteredEmpty?: EmptyStateProps;
  hasActiveFilters?: boolean;
  tableProps?: Omit<DataTableProps<T>, 'columns' | 'data' | 'loading'>;
  footer?: React.ReactNode;
  className?: string;
}

export function ListPage<T extends Record<string, any>>({
  header,
  kpis,
  toolbar,
  data,
  columns,
  loading = false,
  error = null,
  onRetry,
  empty,
  filteredEmpty,
  hasActiveFilters = false,
  tableProps,
  footer,
  className,
}: ListPageProps<T>) {
  return (
    <div className={cn('space-y-6', className)}>
      <PageHeader {...header} />
      {kpis}
      {toolbar && <Toolbar {...toolbar} />}
      {error ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : loading ? (
        <LoadingState rows={8} />
      ) : data.length === 0 ? (
        hasActiveFilters && filteredEmpty ? (
          <EmptyState {...filteredEmpty} />
        ) : empty ? (
          <EmptyState {...empty} />
        ) : (
          <DataTable columns={columns} data={data} {...tableProps} />
        )
      ) : (
        <DataTable columns={columns} data={data} {...tableProps} />
      )}
      {footer}
    </div>
  );
}
