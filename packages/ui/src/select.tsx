import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from './utils';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectProps {
  id?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options?: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

export function Select({
  id,
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder = 'Select an option...',
  disabled = false,
  size = 'md',
  className,
  children,
  'aria-label': ariaLabel,
}: SelectProps & { 'aria-label'?: string }) {
  const sizeClasses = {
    sm: 'h-8 px-2.5 text-xs',
    md: 'h-9 px-3 text-xs',
    lg: 'h-11 px-4 text-sm',
  }[size];

  return (
    <SelectPrimitive.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel || (typeof placeholder === 'string' && placeholder ? placeholder : 'Select option')}
        className={cn(
          'flex w-full items-center justify-between rounded-xl border border-default bg-surface text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:border-focus disabled:cursor-not-allowed disabled:opacity-50 text-left',
          sizeClasses,
          className
        )}
      >
        <span className="truncate block flex-1 text-left mr-1">
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted opacity-80" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="z-50 min-w-[8rem] max-h-72 overflow-y-auto rounded-xl border border-subtle bg-surface-raised p-1 text-primary shadow-popover animate-in fade-in-80"
        >
          <SelectPrimitive.Viewport className="p-1">
            {options
              ? options.map((opt) => (
                  <SelectPrimitive.Item
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                    className="relative flex w-full cursor-pointer select-none items-center rounded-lg py-1.5 pl-8 pr-2 text-xs outline-none focus:bg-surface-sunken data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                  >
                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                      <SelectPrimitive.ItemIndicator>
                        <Check className="h-3.5 w-3.5 text-brand-text" />
                      </SelectPrimitive.ItemIndicator>
                    </span>
                    <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                  </SelectPrimitive.Item>
                ))
              : children}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-pointer select-none items-center rounded-lg py-1.5 pl-8 pr-2 text-xs outline-none focus:bg-surface-sunken data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-3.5 w-3.5 text-brand-text" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));

SelectItem.displayName = 'SelectItem';
