import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Search, Plus, X } from 'lucide-react';
import { cn } from './utils';

export interface ComboboxOption {
  label: string;
  value: string;
  category?: string;
  disabled?: boolean;
}

export interface ComboboxAction {
  label: string;
  onSelect: () => void;
  icon?: React.ReactNode;
}

export interface ComboboxProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  topAction?: ComboboxAction;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  id?: string;
}

export function Combobox({
  value,
  defaultValue,
  onValueChange,
  options = [],
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search or paste...',
  emptyText = 'No matching options found.',
  topAction,
  disabled = false,
  size = 'md',
  className,
  id,
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState<string>(value || defaultValue || '');
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedValue = value !== undefined ? value : internalValue;

  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (val: string) => {
    setInternalValue(val);
    if (onValueChange) onValueChange(val);
    setIsOpen(false);
  };

  const selectedOption = options.find((opt) => opt.value === selectedValue);

  const filteredOptions = options.filter((opt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      opt.label.toLowerCase().includes(q) ||
      opt.value.toLowerCase().includes(q) ||
      (opt.category && opt.category.toLowerCase().includes(q))
    );
  });

  const sizeClasses = {
    sm: 'h-8 px-2.5 text-xs',
    md: 'h-9 px-3 text-xs',
    lg: 'h-11 px-4 text-sm',
  }[size];

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          'flex w-full items-center justify-between rounded-xl border border-default bg-surface text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:border-focus disabled:cursor-not-allowed disabled:opacity-50 text-left cursor-pointer shadow-xs',
          sizeClasses,
          className
        )}
      >
        <span className={cn('truncate', !selectedOption && 'text-muted')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted opacity-80 ml-2" />
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[14rem] max-w-sm rounded-xl border border-default bg-surface-raised p-1.5 text-primary shadow-xl animate-in fade-in-80 zoom-in-95">
          {/* Search Box */}
          <div className="relative mb-1.5">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg bg-surface-sunken border border-default py-1.5 pl-8 pr-7 text-xs text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-border-focus"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Top Action: Always on top in the list */}
          {topAction && (
            <div className="mb-1 pb-1 border-b border-subtle">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  topAction.onSelect();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-brand-text hover:bg-brand-subtle transition-colors text-left"
              >
                {topAction.icon || <Plus className="h-3.5 w-3.5 text-brand-text shrink-0" />}
                <span>{topAction.label}</span>
              </button>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted">
                {emptyText}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === selectedValue;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      'relative flex w-full cursor-pointer select-none items-center rounded-lg py-1.5 pl-7 pr-2 text-xs outline-none text-left transition-colors',
                      isSelected
                        ? 'bg-brand-subtle text-brand-text font-medium'
                        : 'text-secondary hover:bg-surface-sunken hover:text-primary',
                      opt.disabled && 'pointer-events-none opacity-50'
                    )}
                  >
                    {isSelected && (
                      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                        <Check className="h-3.5 w-3.5 text-brand-text" />
                      </span>
                    )}
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

