import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from './utils';

export interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  label?: string;
  description?: string;
}

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(({ className, label, description, id, ...props }, ref) => {
  const switchElement = (
    <SwitchPrimitive.Root
      id={id}
      ref={ref}
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-300 dark:data-[state=unchecked]:bg-slate-700',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0'
        )}
      />
    </SwitchPrimitive.Root>
  );

  if (!label && !description) {
    return switchElement;
  }

  return (
    <div className="flex items-start gap-3">
      {switchElement}
      <div className="flex flex-col space-y-0.5">
        {label && (
          <label
            htmlFor={id}
            className="text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer select-none"
          >
            {label}
          </label>
        )}
        {description && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>
    </div>
  );
});

Switch.displayName = 'Switch';

