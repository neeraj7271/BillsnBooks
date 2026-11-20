import { Decimal } from 'decimal.js';
import { NegativeAmountError, CurrencyMismatchError } from './errors.js';

// Configure Decimal.js precision for accounting (28 digits, 4 decimal places rounding half-up)
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export class Money {
  public readonly amount: Decimal;
  public readonly currency: string;

  constructor(amount: Decimal.Value, currency: string = 'INR') {
    const dec = new Decimal(amount);
    if (dec.isNegative()) {
      throw new NegativeAmountError(dec.toString());
    }
    // Fixed to 4 decimal places for statutory/accounting representation
    this.amount = dec.toDecimalPlaces(4);
    this.currency = currency.toUpperCase();
  }

  public static zero(currency: string = 'INR'): Money {
    return new Money(0, currency);
  }

  public static fromString(amountStr: string, currency: string = 'INR'): Money {
    return new Money(amountStr, currency);
  }

  public plus(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount.plus(other.amount), this.currency);
  }

  public minus(other: Money): Money {
    this.assertSameCurrency(other);
    const result = this.amount.minus(other.amount);
    return new Money(result, this.currency);
  }

  public times(multiplier: Decimal.Value): Money {
    return new Money(this.amount.times(multiplier), this.currency);
  }

  public dividedBy(divisor: Decimal.Value): Money {
    return new Money(this.amount.dividedBy(divisor), this.currency);
  }

  public equals(other: Money): boolean {
    return this.currency === other.currency && this.amount.equals(other.amount);
  }

  public isZero(): boolean {
    return this.amount.isZero();
  }

  public toFixed2(): string {
    return this.amount.toFixed(2);
  }

  public toFixed4(): string {
    return this.amount.toFixed(4);
  }

  public toString(): string {
    return this.amount.toString();
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchError(this.currency, other.currency);
    }
  }
}

