import * as React from 'react';
import { Search } from 'lucide-react';
import { cn } from './utils';
import { Input } from './input';

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
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-3', className)}>
      <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
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
        {filters}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {selectedCount > 0 && bulkActions}
        {primaryAction}
      </div>
    </div>
  );
}
