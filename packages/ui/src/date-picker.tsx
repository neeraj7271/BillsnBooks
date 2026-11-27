'use client';

import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { DayPicker, DateRange } from 'react-day-picker';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from './utils';
import { formatDate } from './format';

export interface DatePickerProps {
  value?: string | Date | null;
  onChange?: (dateIso: string) => void;
  placeholder?: string;
  disabled?: boolean;
  min?: string | Date;
  max?: string | Date;
  size?: 'sm' | 'md';
  className?: string;
  id?: string;
  name?: string;
  required?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  disabled = false,
  min,
  max,
  size = 'md',
  className,
  id,
  name: _name,
  required,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selectedDate = React.useMemo(() => {
    if (!value) return undefined;
    const d = typeof value === 'string' ? new Date(value.includes('T') ? value : `${value}T00:00:00`) : value;
    return isNaN(d.getTime()) ? undefined : d;
  }, [value]);

  const minDate = React.useMemo(() => {
    if (!min) return undefined;
    return typeof min === 'string' ? new Date(min) : min;
  }, [min]);

  const maxDate = React.useMemo(() => {
    if (!max) return undefined;
    return typeof max === 'string' ? new Date(max) : max;
  }, [max]);

  const handleSelect = (d: Date | undefined) => {
    if (d) {
      // Format to YYYY-MM-DD
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      onChange?.(`${year}-${month}-${day}`);
    } else {
      onChange?.('');
    }
    setOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    onChange?.(`${year}-${month}-${day}`);
    setOpen(false);
  };

  const handleClear = () => {
    onChange?.('');
    setOpen(false);
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          className={cn(
            'flex items-center justify-between gap-2 rounded-xl border border-default bg-surface text-primary transition shadow-2xs hover:border-strong focus:outline-none focus:ring-2 focus:ring-border-focus disabled:opacity-50 disabled:pointer-events-none',
            size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3 text-xs',
            !selectedDate && 'text-muted',
            className
          )}
        >
          <span className="truncate">
            {selectedDate ? formatDate(selectedDate, 'short') : placeholder}
          </span>
          <CalendarIcon className="h-3.5 w-3.5 text-muted shrink-0" />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className="z-50 rounded-xl border border-subtle bg-surface-raised p-3 shadow-popover text-primary animate-in fade-in-0 zoom-in-95 focus:outline-none"
        >
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            weekStartsOn={1}
            disabled={[
              ...(minDate ? [{ before: minDate }] : []),
              ...(maxDate ? [{ after: maxDate }] : []),
            ]}
            classNames={{
              root: 'text-xs select-none',
              months: 'flex flex-col space-y-2',
              month_caption: 'flex justify-center pt-1 relative items-center mb-2 font-bold text-sm text-primary',
              nav: 'flex items-center justify-between absolute top-1 inset-x-1',
              button_previous: 'h-7 w-7 rounded-lg border border-default bg-surface hover:bg-surface-sunken flex items-center justify-center text-muted hover:text-primary transition',
              button_next: 'h-7 w-7 rounded-lg border border-default bg-surface hover:bg-surface-sunken flex items-center justify-center text-muted hover:text-primary transition',
              month_grid: 'w-full border-collapse space-y-1',
              weekdays: 'flex text-muted font-semibold text-[11px] mb-1 justify-around',
              weekday: 'w-8 text-center',
              week: 'flex w-full mt-1 justify-around',
              day: 'h-8 w-8 text-center text-xs p-0 relative focus:outline-none rounded-lg transition-colors hover:bg-surface-sunken',
              day_button: 'w-full h-full flex items-center justify-center font-medium',
              selected: '!bg-brand !text-inverse font-bold shadow-xs hover:!bg-brand-hover',
              today: 'ring-1 ring-brand font-bold text-brand-text',
              outside: 'text-muted/40 pointer-events-none',
              disabled: 'text-muted/30 cursor-not-allowed',
            }}
          />

          <div className="flex items-center justify-between pt-2 border-t border-default/60 mt-2">
            {!required ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-muted hover:text-primary transition"
              >
                Clear
              </button>
            ) : <div />}
            <button
              type="button"
              onClick={handleToday}
              className="text-xs font-semibold text-brand-text hover:underline"
            >
              Today
            </button>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export interface DateRangePickerProps {
  from?: string | Date | null;
  to?: string | Date | null;
  onChange?: (range: { from: string; to: string }) => void;
  size?: 'sm' | 'md';
  className?: string;
  showQuickChips?: boolean;
}

export function DateRangePicker({
  from,
  to,
  onChange,
  size = 'sm',
  className,
  showQuickChips = true,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selectedRange = React.useMemo<DateRange | undefined>(() => {
    const f = from ? (typeof from === 'string' ? new Date(from.includes('T') ? from : `${from}T00:00:00`) : from) : undefined;
    const t = to ? (typeof to === 'string' ? new Date(to.includes('T') ? to : `${to}T00:00:00`) : to) : undefined;
    if (!f && !t) return undefined;
    return { from: f, to: t };
  }, [from, to]);

  const handleSelect = (range: DateRange | undefined) => {
    if (!range) return;
    const formatIso = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (range.from && range.to) {
      onChange?.({
        from: formatIso(range.from),
        to: formatIso(range.to),
      });
      setOpen(false);
    } else if (range.from) {
      onChange?.({
        from: formatIso(range.from),
        to: formatIso(range.from),
      });
    }
  };

  const applyQuickRange = (type: 'this_month' | 'last_month' | 'this_quarter' | 'this_fy' | 'last_fy') => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    const formatIso = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (type === 'this_month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (type === 'last_month') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (type === 'this_quarter') {
      const qMonth = Math.floor(today.getMonth() / 3) * 3;
      start = new Date(today.getFullYear(), qMonth, 1);
      end = new Date(today.getFullYear(), qMonth + 3, 0);
    } else if (type === 'this_fy') {
      // Indian FY starts 1st April
      const fyStartYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
      start = new Date(fyStartYear, 3, 1);
      end = new Date(fyStartYear + 1, 2, 31);
    } else if (type === 'last_fy') {
      const fyStartYear = today.getMonth() >= 3 ? today.getFullYear() - 1 : today.getFullYear() - 2;
      start = new Date(fyStartYear, 3, 1);
      end = new Date(fyStartYear + 1, 2, 31);
    }

    onChange?.({ from: formatIso(start), to: formatIso(end) });
    setOpen(false);
  };

  const label = React.useMemo(() => {
    if (from && to) {
      return `${formatDate(from, 'short')} – ${formatDate(to, 'short')}`;
    }
    if (from) {
      return `From ${formatDate(from, 'short')}`;
    }
    return 'Select date range';
  }, [from, to]);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-2 rounded-xl border border-default bg-surface px-3 text-xs font-medium text-primary transition shadow-2xs hover:border-strong focus:outline-none focus:ring-2 focus:ring-border-focus',
            size === 'sm' ? 'h-8' : 'h-9',
            className
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 text-muted shrink-0" />
          <span className="truncate">{label}</span>
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className="z-50 rounded-xl border border-subtle bg-surface-raised p-4 shadow-popover text-primary animate-in fade-in-0 zoom-in-95 focus:outline-none max-w-sm"
        >
          {showQuickChips && (
            <div className="flex flex-wrap gap-1.5 pb-3 border-b border-default/60 mb-3">
              {[
                { id: 'this_month', label: 'This Month' },
                { id: 'last_month', label: 'Last Month' },
                { id: 'this_quarter', label: 'This Quarter' },
                { id: 'this_fy', label: 'This FY' },
                { id: 'last_fy', label: 'Last FY' },
              ].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => applyQuickRange(chip.id as any)}
                  className="px-2 py-1 rounded-md text-[11px] font-medium bg-surface-sunken hover:bg-brand-subtle hover:text-brand-text transition"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          <DayPicker
            mode="range"
            selected={selectedRange}
            onSelect={handleSelect}
            weekStartsOn={1}
            classNames={{
              root: 'text-xs select-none',
              months: 'flex flex-col space-y-2',
              month_caption: 'flex justify-center pt-1 relative items-center mb-2 font-bold text-sm text-primary',
              nav: 'flex items-center justify-between absolute top-1 inset-x-1',
              button_previous: 'h-7 w-7 rounded-lg border border-default bg-surface hover:bg-surface-sunken flex items-center justify-center text-muted hover:text-primary transition',
              button_next: 'h-7 w-7 rounded-lg border border-default bg-surface hover:bg-surface-sunken flex items-center justify-center text-muted hover:text-primary transition',
              month_grid: 'w-full border-collapse space-y-1',
              weekdays: 'flex text-muted font-semibold text-[11px] mb-1 justify-around',
              weekday: 'w-8 text-center',
              week: 'flex w-full mt-1 justify-around',
              day: 'h-8 w-8 text-center text-xs p-0 relative focus:outline-none rounded-lg transition-colors hover:bg-surface-sunken',
              day_button: 'w-full h-full flex items-center justify-center font-medium',
              range_start: '!bg-brand !text-inverse font-bold rounded-l-lg',
              range_end: '!bg-brand !text-inverse font-bold rounded-r-lg',
              range_middle: '!bg-brand-subtle !text-brand-text font-semibold rounded-none',
              today: 'ring-1 ring-brand font-bold text-brand-text',
              outside: 'text-muted/40 pointer-events-none',
            }}
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
