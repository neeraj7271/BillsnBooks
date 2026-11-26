'use client';

import * as React from 'react';
import { cn } from './utils';
import { Button } from './button';

export interface FormPageProps {
  header: React.ReactNode;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  submitting?: boolean;
  isDirty?: boolean;
  extraActions?: React.ReactNode;
  className?: string;
}

export function FormPage({
  header,
  children,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  submitting = false,
  isDirty = false,
  extraActions,
  className,
}: FormPageProps) {
  React.useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  return (
    <form onSubmit={onSubmit} className={cn('space-y-6 pb-24', className)}>
      {header}
      <div className="space-y-6">{children}</div>
      <div className="sticky bottom-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 border-t border-border bg-surface/95 backdrop-blur-md flex items-center justify-between gap-3">
        <div className="text-caption text-muted">
          {isDirty ? 'Unsaved changes' : ''}
        </div>
        <div className="flex items-center gap-2">
          {extraActions}
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              {cancelLabel}
            </Button>
          )}
          <Button type="submit" variant="primary" loading={submitting}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
