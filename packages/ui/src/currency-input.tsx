import * as React from 'react';
import { Input, type InputProps } from './input';
import { cn } from './utils';

export interface CurrencyInputProps
  extends Omit<InputProps, 'value' | 'onChange'> {
  value: number | string | undefined;
  onChange: (value: number) => void;
  currencySymbol?: string;
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, currencySymbol = '₹', className, ...props }, ref) => {
    const [displayVal, setDisplayVal] = React.useState<string>(() => {
      if (value === undefined || value === null || value === '') return '';
      return String(value);
    });

    React.useEffect(() => {
      if (value === undefined || value === null || value === '') {
        setDisplayVal('');
      } else {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        if (!isNaN(num)) {
          if (num === 0 && displayVal === '') {
            return;
          }
          if (String(num) !== displayVal && parseFloat(displayVal) !== num) {
            setDisplayVal(String(num));
          }
        }
      }
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9.-]/g, '');
      setDisplayVal(raw);
      const parsed = parseFloat(raw);
      onChange(isNaN(parsed) ? 0 : parsed);
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        leftAddon={<span className="font-semibold text-xs text-muted">{currencySymbol}</span>}
        className={cn('tabular-nums font-mono text-right', className)}
        value={displayVal}
        onChange={handleInputChange}
        placeholder={props.placeholder || '0.00'}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
