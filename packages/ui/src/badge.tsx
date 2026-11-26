import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './utils';

export const badgeVariants = cva(
  'inline-flex items-center font-medium transition-colors select-none',
  {
    variants: {
      variant: {
        brand: 'bg-brand-subtle text-brand-text border border-focus',
        success: 'bg-status-success-subtle text-status-success-text border border-status-success font-semibold',
        warning: 'bg-status-warning-subtle text-status-warning-text border border-status-warning',
        danger: 'bg-status-danger-subtle text-status-danger-text border border-status-danger',
        info: 'bg-status-info-subtle text-status-info-text border border-status-info',
        neutral: 'bg-surface-sunken text-secondary border border-default',
      },
      size: {
        xs: 'text-[10px] px-1.5 py-0.5 rounded-md gap-1 tracking-tight',
        sm: 'text-xs px-2 py-0.5 rounded-lg gap-1.5',
        md: 'text-xs px-2.5 py-1 rounded-xl gap-2 font-semibold',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'sm',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({
  className,
  variant,
  size,
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const dotColor = {
    brand: 'bg-brand',
    success: 'bg-status-success',
    warning: 'bg-status-warning',
    danger: 'bg-status-danger',
    info: 'bg-status-info',
    neutral: 'bg-muted',
  }[variant || 'neutral'];

  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotColor)} />}
      {children}
    </span>
  );
}
