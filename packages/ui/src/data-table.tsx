import * as React from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';
import { Skeleton } from './skeleton';
import { EmptyState } from './empty-state';
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
  emptyIcon?: React.ReactNode;
  emptyAction?: { label: string; onClick: () => void } | React.ReactNode;
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
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  storageKey?: string;
  showPagination?: boolean;
  // Filter state
  isFiltered?: boolean;
  onClearFilters?: () => void;
  className?: string;
}

function formatIndianNumber(num: number): string {
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('en-IN').format(num);
}

function getPaginationItems(activePage: number, totalPages: number): (number | 'ellipsis-start' | 'ellipsis-end')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (activePage <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis-end', totalPages];
  }
  if (activePage >= totalPages - 3) {
    return [1, 'ellipsis-start', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, 'ellipsis-start', activePage - 1, activePage, activePage + 1, 'ellipsis-end', totalPages];
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items to display right now.',
  emptyIcon,
  emptyAction,
  density = 'comfortable',
  stickyHeader = false,
  onRowClick,
  sortColumn,
  sortDirection,
  onSort,
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  storageKey,
  showPagination = true,
  isFiltered = false,
  onClearFilters,
  className,
}: DataTableProps<T>) {
  const [internalPage, setInternalPage] = React.useState(1);
  const [internalPageSize, setInternalPageSize] = React.useState(() => {
    if (pageSize) return pageSize;
    if (storageKey && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`dt_page_size_${storageKey}`);
        if (saved && !isNaN(Number(saved))) return Number(saved);
      } catch {}
    }
    return 25;
  });

  const effectivePageSize = pageSize ?? internalPageSize;
  const activePage = page ?? internalPage;
  const effectiveTotal = totalItems ?? data.length;
  const isAutoPaginated = showPagination && (totalItems !== undefined || data.length > 0 || page !== undefined);

  // Client-side slice if totalItems not explicitly supplied or if data has all rows
  const displayData = React.useMemo(() => {
    if (!showPagination) return data;
    // If totalItems is provided and data length is only the current page slice, don't re-slice
    if (totalItems !== undefined && data.length <= effectivePageSize) return data;
    const start = (activePage - 1) * effectivePageSize;
    return data.slice(start, start + effectivePageSize);
  }, [data, showPagination, activePage, effectivePageSize, totalItems]);

  const cellPadding = density === 'compact' ? 'py-2 px-3 sm:px-4 text-xs' : 'py-3.5 px-4 sm:px-5 text-xs';
  const headerPadding = density === 'compact' ? 'py-2 px-3 sm:px-4 text-[11px]' : 'py-3 px-4 sm:px-5 text-xs';

  const totalPages = Math.max(1, Math.ceil(effectiveTotal / effectivePageSize));
  const startItem = effectiveTotal === 0 ? 0 : (activePage - 1) * effectivePageSize + 1;
  const endItem = effectiveTotal === 0 ? 0 : Math.min(activePage * effectivePageSize, effectiveTotal);

  const handlePage = (p: number) => {
    const targetPage = Math.max(1, Math.min(p, totalPages));
    if (onPageChange) onPageChange(targetPage);
    else setInternalPage(targetPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`dt_page_size_${storageKey}`, String(newSize));
      } catch {}
    }
    if (onPageSizeChange) {
      onPageSizeChange(newSize);
    } else {
      setInternalPageSize(newSize);
    }
    handlePage(1);
  };

  // Keyboard navigation
  React.useEffect(() => {
    if (!showPagination) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === '[') {
        if (activePage > 1) {
          e.preventDefault();
          handlePage(activePage - 1);
        }
      } else if (e.key === ']') {
        if (activePage < totalPages) {
          e.preventDefault();
          handlePage(activePage + 1);
        }
      } else if (e.key === 'Home') {
        if (activePage > 1) {
          e.preventDefault();
          handlePage(1);
        }
      } else if (e.key === 'End') {
        if (activePage < totalPages) {
          e.preventDefault();
          handlePage(totalPages);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPagination, activePage, totalPages]);

  const paginationItems = React.useMemo(
    () => getPaginationItems(activePage, totalPages),
    [activePage, totalPages]
  );

  return (
    <div className={cn('flex flex-col w-full rounded-xl border border-subtle bg-surface overflow-hidden shadow-card', className)}>
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className={cn('bg-surface-sunken border-b border-default', stickyHeader && 'sticky top-0 z-10 backdrop-blur-xs')}>
            <tr>
              {columns.map((col) => {
                const isSorted = sortColumn === col.key;
                return (
                  <th
                    key={col.key}
                    style={{ width: col.width }}
                    className={cn(
                      'font-semibold uppercase tracking-wide text-muted select-none',
                      headerPadding,
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.sortable && 'cursor-pointer hover:text-primary',
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
                        <span className="text-muted">
                          {isSorted ? (
                            sortDirection === 'asc' ? (
                              <ChevronUp className="h-3.5 w-3.5 text-brand-text" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-brand-text" />
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

          <tbody className="divide-y divide-border-subtle">
            {loading ? (
              Array.from({ length: 8 }).map((_, rIdx) => (
                <tr key={`skel-row-${rIdx}`} aria-busy="true">
                  {columns.map((_, cIdx) => (
                    <td key={`skel-cell-${rIdx}-${cIdx}`} className={cellPadding}>
                      <Skeleton className="h-4 w-full max-w-[80%]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : displayData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-6 px-4 text-center">
                  {isFiltered ? (
                    <EmptyState
                      isFiltered={true}
                      onClearFilters={onClearFilters}
                      className="border-0 shadow-none bg-transparent p-4"
                    />
                  ) : (
                    <EmptyState
                      icon={emptyIcon}
                      title={emptyTitle}
                      description={emptyDescription}
                      action={emptyAction}
                      className="border-0 shadow-none bg-transparent p-4"
                    />
                  )}
                </td>
              </tr>
            ) : (
              displayData.map((row, rIdx) => (
                <tr
                  key={row.id || `row-${rIdx}`}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'transition-colors hover:bg-surface-sunken',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'text-primary',
                        cellPadding,
                        col.align === 'right' && 'text-right tabular-nums',
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

      {isAutoPaginated && (
        <div className="min-h-[40px] px-4 py-2 border-t border-subtle bg-surface-sunken flex flex-wrap items-center justify-between gap-3">
          {/* Left: Showing 1–20 of 5,003 */}
          <p className="text-xs text-muted tabular-nums">
            Showing <span className="font-semibold text-primary">{formatIndianNumber(startItem)}</span>–<span className="font-semibold text-primary">{formatIndianNumber(endItem)}</span> of <span className="font-semibold text-primary">{formatIndianNumber(effectiveTotal)}</span>
          </p>

          {/* Center: Desktop numbered page buttons + Mobile compact */}
          <div className="hidden md:flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={activePage <= 1}
              onClick={() => handlePage(activePage - 1)}
              aria-label="Previous page"
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            {paginationItems.map((item, idx) => {
              if (item === 'ellipsis-start' || item === 'ellipsis-end') {
                return (
                  <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted select-none">
                    …
                  </span>
                );
              }
              const isCurrent = item === activePage;
              return (
                <button
                  key={`page-${item}`}
                  type="button"
                  onClick={() => handlePage(item)}
                  className={cn(
                    'min-w-[28px] h-7 px-1.5 rounded-md text-xs font-medium tabular-nums transition-colors',
                    isCurrent
                      ? 'bg-brand-subtle text-brand-text font-semibold'
                      : 'text-secondary hover:text-primary hover:bg-surface-sunken'
                  )}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {item}
                </button>
              );
            })}
            <Button
              variant="outline"
              size="icon-sm"
              disabled={activePage >= totalPages}
              onClick={() => handlePage(activePage + 1)}
              aria-label="Next page"
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex md:hidden items-center gap-1.5">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={activePage <= 1}
              onClick={() => handlePage(activePage - 1)}
              aria-label="Previous page"
              className="h-7 w-7"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-medium text-secondary tabular-nums">
              Page {activePage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={activePage >= totalPages}
              onClick={() => handlePage(activePage + 1)}
              aria-label="Next page"
              className="h-7 w-7"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Right: Rows per page dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted whitespace-nowrap hidden sm:inline">Rows per page:</span>
            <select
              aria-label="Rows per page"
              value={effectivePageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="h-7 rounded-md border border-default bg-surface px-2 text-xs font-medium text-primary focus:outline-hidden focus:ring-1 focus:ring-brand shadow-2xs"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
