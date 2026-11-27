'use client';

import * as React from 'react';
import { Star, Download, Share2, GitCompare, Printer } from 'lucide-react';
import { cn } from './utils';
import { PageHeader } from './page-header';
import { Button } from './button';
import { LoadingState } from './loading-state';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';

export interface ReportPageProps {
  title: string;
  description?: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  dateControls?: React.ReactNode;
  compareMode?: boolean;
  onToggleCompare?: () => void;
  onExportExcel?: () => void;
  onExportHtml?: () => void;
  onPrintPdf?: () => void;
  onShare?: () => void;
  loading?: boolean;
  error?: Error | string | null;
  onRetry?: () => void;
  isEmpty?: boolean;
  summary?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ReportPage({
  title,
  description,
  isFavorite,
  onToggleFavorite,
  dateControls,
  compareMode,
  onToggleCompare,
  onExportExcel,
  onExportHtml,
  onPrintPdf,
  onShare,
  loading = false,
  error = null,
  onRetry,
  isEmpty = false,
  summary,
  children,
  className,
}: ReportPageProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <PageHeader
        title={title}
        subtitle={description}
        badge={
          onToggleFavorite && (
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              className={cn(
                'p-1.5 rounded-lg border border-default transition-colors',
                isFavorite
                  ? 'bg-status-warning-subtle text-status-warning-text'
                  : 'bg-surface text-muted hover:text-primary'
              )}
            >
              <Star className={cn('h-4 w-4', isFavorite && 'fill-current')} />
            </button>
          )
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {onToggleCompare && (
              <Button
                type="button"
                size="sm"
                variant={compareMode ? 'primary' : 'outline'}
                onClick={onToggleCompare}
                leftIcon={<GitCompare className="h-3.5 w-3.5" />}
              >
                Compare Period
              </Button>
            )}
            {onExportExcel && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onExportExcel}
                leftIcon={<Download className="h-3.5 w-3.5" />}
              >
                Excel
              </Button>
            )}
            {onExportHtml && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onExportHtml}
                leftIcon={<Download className="h-3.5 w-3.5" />}
              >
                HTML
              </Button>
            )}
            {onPrintPdf && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onPrintPdf}
                leftIcon={<Printer className="h-3.5 w-3.5" />}
              >
                Print / PDF
              </Button>
            )}
            {onShare && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onShare}
                leftIcon={<Share2 className="h-3.5 w-3.5" />}
              >
                Share
              </Button>
            )}
          </div>
        }
      />

      {dateControls && <div className="flex flex-wrap items-center gap-3">{dateControls}</div>}
      {summary}
      {error ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : loading ? (
        <LoadingState rows={8} />
      ) : isEmpty ? (
        <EmptyState title="No report data" description="No entries found for the selected period." />
      ) : (
        children
      )}
    </div>
  );
}
