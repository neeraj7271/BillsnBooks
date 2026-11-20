import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './utils';

export const inputVariants = cva(
  'flex w-full rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
  {
    variants: {
      variant: {
        default:
          'border-slate-200 dark:border-slate-800 focus-visible:border-blue-500 focus-visible:ring-blue-500/20',
        error:
          'border-rose-400 dark:border-rose-600 focus-visible:border-rose-500 focus-visible:ring-rose-500/20 text-rose-900 dark:text-rose-100',
      },
      size: {
        sm: 'h-8 px-2.5 text-xs',
        md: 'h-9 px-3 text-xs',
        lg: 'h-11 px-4 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, size, leftAddon, rightAddon, type = 'text', ...props }, ref) => {
    if (leftAddon || rightAddon) {
      return (
        <div className="relative flex items-center w-full">
          {leftAddon && (
            <div className={cn("absolute flex items-center pointer-events-none text-slate-400", size === 'sm' ? 'left-2' : 'left-3')}>
              {leftAddon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              inputVariants({ variant, size }),
              leftAddon && (size === 'sm' ? 'pl-6' : 'pl-9'),
              rightAddon && (size === 'sm' ? 'pr-6' : 'pr-9'),
              className
            )}
            ref={ref}
            {...props}
          />
          {rightAddon && (
            <div className="absolute right-3 flex items-center pointer-events-none text-slate-400">
              {rightAddon}
            </div>
          )}
        </div>
      );
    }

    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
