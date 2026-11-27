import * as React from 'react';
import { cn } from './utils';
import { PageHeader, type PageHeaderProps } from './page-header';

export interface FormPageProps {
  header: PageHeaderProps;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function FormPage({ header, children, footer, className }: FormPageProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <PageHeader {...header} />
      <div>{children}</div>
      {footer && (
        <div className="sticky bottom-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-surface border-t border-default shadow-xs flex items-center justify-end gap-3">
          {footer}
        </div>
      )}
    </div>
  );
}
