import * as React from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { Button } from './button';
import { Skeleton } from './skeleton';
import { cn } from './utils';

export interface ColumnDef<T> {
  key: string;
  header: string | React.ReactNode;
  cell: (row: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  width?: string;
  className?: string;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  density?: 'comfortable' | 'compact';
  stickyHeader?: boolean;
  onRowClick?: (row: T) => void;
  // Sorting
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnKey: string) => void;
  // Pagination
  page?: number;
  pageSize?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items to display right now.',
  density = 'comfortable',
  stickyHeader = false,
  onRowClick,
  sortColumn,
  sortDirection,
  onSort,
  page,
  pageSize = 10,
  totalItems,
  onPageChange,
  className,
}: DataTableProps<T>) {
  const cellPadding = density === 'compact' ? 'py-2 px-3 sm:px-4 text-xs' : 'py-3.5 px-4 sm:px-5 text-xs';
  const headerPadding = density === 'compact' ? 'py-2 px-3 sm:px-4 text-[11px]' : 'py-3 px-4 sm:px-5 text-xs';

  const totalPages = totalItems ? Math.ceil(totalItems / pageSize) : 1;
  const startItem = page && totalItems ? (page - 1) * pageSize + 1 : 1;
  const endItem = page && totalItems ? Math.min(page * pageSize, totalItems) : data.length;

  return (
    <div className={cn('flex flex-col w-full rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 overflow-hidden shadow-xs', className)}>
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className={cn('bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800/80', stickyHeader && 'sticky top-0 z-10 backdrop-blur-xs')}>
            <tr>
              {columns.map((col) => {
                const isSorted = sortColumn === col.key;
                return (
                  <th
                    key={col.key}
                    style={{ width: col.width }}
                    className={cn(
                      'font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none',
                      headerPadding,
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.sortable && 'cursor-pointer hover:text-slate-900 dark:hover:text-slate-100',
                      col.className
                    )}
                    onClick={() => col.sortable && onSort?.(col.key)}
                  >
                    <div
                      className={cn(
                        'inline-flex items-center gap-1.5',
                        col.align === 'right' && 'justify-end w-full',
                        col.align === 'center' && 'justify-center w-full'
                      )}
                    >
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="text-slate-400">
                          {isSorted ? (
                            sortDirection === 'asc' ? (
                              <ChevronUp className="h-3.5 w-3.5 text-blue-600" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-blue-600" />
                            )
                          ) : (
                            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {loading ? (
              Array.from({ length: 4 }).map((_, rIdx) => (
                <tr key={`skel-row-${rIdx}`}>
                  {columns.map((_, cIdx) => (
                    <td key={`skel-cell-${rIdx}-${cIdx}`} className={cellPadding}>
                      <Skeleton className="h-4 w-full max-w-[80%]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 px-4 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                      <Inbox className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {emptyTitle}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm">
                      {emptyDescription}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, rIdx) => (
                <tr
                  key={row.id || `row-${rIdx}`}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/50',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'text-slate-800 dark:text-slate-200',
                        cellPadding,
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center',
                        col.className
                      )}
                    >
                      {col.cell(row, rIdx)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {page !== undefined && totalItems !== undefined && totalItems > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{startItem}</span> to{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">{endItem}</span> of{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">{totalItems}</span> results
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-semibold px-2 text-slate-600 dark:text-slate-400">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
