import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from './utils';

export interface FormFieldProps {
  id?: string;
  label?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  id,
  label,
  required = false,
  hint,
  error,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn('flex flex-col space-y-1.5', className)}>
      {label && (
        <LabelPrimitive.Root
          htmlFor={id}
          className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 select-none"
        >
          {label}
          {required && <span className="text-rose-500 font-bold">*</span>}
        </LabelPrimitive.Root>
      )}

      {children}

      {error ? (
        <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 animate-in fade-in-50">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

