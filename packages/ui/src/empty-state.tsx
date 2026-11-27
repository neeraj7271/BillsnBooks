import * as React from 'react';
import { Inbox, Search } from 'lucide-react';
import { cn } from './utils';
import { Button } from './button';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'outline' | 'secondary';
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode | EmptyStateAction;
  className?: string;
  /** When true or when icon not supplied, renders filter-empty state */
  isFiltered?: boolean;
  onClearFilters?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  isFiltered,
  onClearFilters,
}: EmptyStateProps) {
  let displayIcon = icon;
  let displayTitle = title;
  let displayDescription = description;
  let displayAction = action;

  if (isFiltered) {
    displayIcon = icon ?? <Search className="h-6 w-6 text-muted" />;
    displayTitle = title || 'No matches found';
    displayDescription = description || 'Try widening or clearing your search filters.';
    if (onClearFilters && !action) {
      displayAction = {
        label: 'Clear filters',
        onClick: onClearFilters,
        variant: 'outline',
      };
    }
  }

  const renderAction = () => {
    if (!displayAction) return null;
    if (React.isValidElement(displayAction)) {
      return displayAction;
    }
    if (typeof displayAction === 'object' && 'label' in displayAction && 'onClick' in displayAction) {
      const act = displayAction as EmptyStateAction;
      return (
        <Button
          variant={act.variant || 'primary'}
          size="sm"
          onClick={act.onClick}
          className="shadow-xs"
        >
          {act.label}
        </Button>
      );
    }
    return null;
  };

  return (
    <div
      data-testid="empty-state"
      className={cn(
        'flex flex-col items-center justify-center text-center rounded-2xl border border-default bg-surface p-12 space-y-3 shadow-2xs',
        className
      )}
    >
      <div className="h-12 w-12 rounded-full bg-surface-sunken flex items-center justify-center text-muted shrink-0">
        {displayIcon ?? <Inbox className="h-6 w-6" />}
      </div>
      <h3 className="text-base font-semibold text-primary">{displayTitle}</h3>
      {displayDescription && (
        <p className="text-xs text-secondary max-w-sm leading-relaxed">{displayDescription}</p>
      )}
      {displayAction && <div className="pt-2">{renderAction()}</div>}
    </div>
  );
}
