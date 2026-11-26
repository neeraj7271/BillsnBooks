import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './utils';

export const inputVariants = cva(
  'flex w-full rounded-xl border bg-white bg-surface text-primary text-primary-inverse placeholder:text-muted dark:placeholder:text-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
  {
    variants: {
      variant: {
        default:
          'border border-strong focus-visible:border-focus focus-visible:ring-focus-ring',
        error:
          'border-status-danger border-status-danger focus-visible:border-status-danger focus-visible:ring-status-danger text-status-danger-text text-status-danger-text',
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
            <div className={cn("absolute flex items-center pointer-events-none text-muted", size === 'sm' ? 'left-2' : 'left-3')}>
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
            <div className="absolute right-3 flex items-center pointer-events-none text-muted">
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
