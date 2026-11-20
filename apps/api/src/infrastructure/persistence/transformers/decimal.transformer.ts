import { ValueTransformer } from 'typeorm';
import { Decimal } from 'decimal.js';

export class DecimalTransformer implements ValueTransformer {
  to(value?: Decimal | string | number | null): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (value instanceof Decimal) {
      return value.toFixed(4);
    }
    return new Decimal(value).toFixed(4);
  }

  from(value?: string | null): Decimal | null {
    if (value === null || value === undefined) {
      return null;
    }
    return new Decimal(value);
  }
}

