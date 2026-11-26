import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from './utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary:
          'bg-brand text-inverse shadow-xs hover:bg-brand-hover focus-visible:ring-border-focus',
        secondary:
          'bg-surface-sunken text-primary border border-default hover:bg-surface-raised focus-visible:ring-border-focus',
        outline:
          'border border-default bg-surface text-primary hover:bg-surface-sunken focus-visible:ring-border-focus',
        ghost:
          'text-secondary hover:bg-surface-sunken hover:text-primary focus-visible:ring-border-focus',
        danger:
          'bg-status-danger text-inverse shadow-xs hover:opacity-90 focus-visible:ring-status-danger',
        link:
          'text-brand-text underline-offset-4 hover:underline focus-visible:ring-border-focus p-0 h-auto',
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
