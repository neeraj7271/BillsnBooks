import * as React from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from './utils';
import { Input } from './input';
import { Button } from './button';

export interface ToolbarProps {
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  bulkActions?: React.ReactNode;
  selectedCount?: number;
  primaryAction?: React.ReactNode;
  className?: string;
}

export function Toolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters,
  bulkActions,
  selectedCount = 0,
  primaryAction,
  className,
}: ToolbarProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {onSearchChange !== undefined && (
            <div className="w-full sm:w-72">
              <Input
                value={searchValue ?? ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                leftAddon={<Search className="h-3.5 w-3.5" />}
                size="sm"
              />
            </div>
          )}
          {filters && (
            <>
              <div className="hidden md:flex items-center gap-2 flex-wrap">{filters}</div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="md:hidden shrink-0"
                onClick={() => setMobileFiltersOpen((v) => !v)}
                aria-label="Toggle filters"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Filters</span>
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {selectedCount > 0 && bulkActions && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-brand-subtle border border-border text-caption font-medium text-brand-text">
              <span>{selectedCount} selected</span>
              {bulkActions}
            </div>
          )}
          {primaryAction}
        </div>
      </div>

      {filters && mobileFiltersOpen && (
        <div className="md:hidden p-3 rounded-lg border border-border bg-surface-raised space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-caption font-semibold text-secondary uppercase">Filters</span>
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              aria-label="Close filters"
              className="p-1 text-muted hover:text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">{filters}</div>
        </div>
      )}
    </div>
  );
}
