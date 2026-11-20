import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from './utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary:
          'bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 focus-visible:ring-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500',
        secondary:
          'bg-slate-100 text-slate-800 hover:bg-slate-200 active:bg-slate-300 focus-visible:ring-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
        outline:
          'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 active:bg-slate-100 focus-visible:ring-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
        ghost:
          'text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 focus-visible:ring-slate-400 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100',
        danger:
          'bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:bg-rose-800 focus-visible:ring-rose-500 dark:bg-rose-600 dark:hover:bg-rose-500',
        link:
          'text-blue-600 underline-offset-4 hover:underline focus-visible:ring-blue-500 dark:text-blue-400 p-0 h-auto',
      },
      size: {
        xs: 'h-7 px-2.5 text-xs rounded-lg gap-1.5',
        sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
        md: 'h-9 px-4 text-xs font-semibold rounded-xl gap-2',
        lg: 'h-11 px-5 text-sm font-semibold rounded-xl gap-2.5',
        icon: 'h-8 w-8 rounded-lg p-0',
        'icon-sm': 'h-7 w-7 rounded-md p-0',
        'icon-lg': 'h-9 w-9 rounded-xl p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    if (asChild && React.isValidElement(children)) {
      return (
        <Slot
          ref={ref as any}
          className={cn(buttonVariants({ variant, size }), className)}
          {...props}
        >
          {React.cloneElement(children as React.ReactElement<any>, {
            children: (
              <>
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-current" />
                ) : (
                  leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
                )}
                {(children as React.ReactElement<any>).props.children}
                {!loading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
              </>
            ),
          })}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin text-current" />
            {children}
          </>
        ) : (
          <>
            {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
