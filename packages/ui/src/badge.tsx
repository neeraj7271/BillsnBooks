import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './utils';

export const badgeVariants = cva(
  'inline-flex items-center font-medium transition-colors select-none',
  {
    variants: {
      variant: {
        brand:
          'bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30',
        success:
          'bg-emerald-50 text-emerald-800 border border-emerald-300/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700/60 font-semibold',
        warning:
          'bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
        danger:
          'bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
        info:
          'bg-sky-50 text-sky-700 border border-sky-200/60 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
        neutral:
          'bg-slate-100 text-slate-700 border border-slate-200/60 dark:bg-slate-800/80 dark:text-slate-200 dark:border-slate-700/60',
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
    brand: 'bg-blue-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-sky-500',
    neutral: 'bg-slate-400',
  }[variant || 'neutral'];

  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotColor)} />}
      {children}
    </span>
  );
}
