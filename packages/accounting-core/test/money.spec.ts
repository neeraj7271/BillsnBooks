import { Money } from '../src/money.vo';
import { NegativeAmountError, CurrencyMismatchError } from '../src/errors';

describe('Money Value Object', () => {
  it('should initialize with string or number and maintain 4 decimal places', () => {
    const m1 = new Money('100.5');
    expect(m1.toFixed4()).toBe('100.5000');
    expect(m1.toFixed2()).toBe('100.50');
    expect(m1.currency).toBe('INR');
  });

  it('should reject negative amounts', () => {
    expect(() => new Money('-5.00')).toThrow(NegativeAmountError);
  });

  it('should accurately add and subtract amounts without floating point errors', () => {
    const m1 = new Money('0.1');
    const m2 = new Money('0.2');
    const sum = m1.plus(m2);
    expect(sum.toFixed4()).toBe('0.3000');

    const diff = sum.minus(m1);
    expect(diff.toFixed4()).toBe('0.2000');
  });

  it('should disallow operations across different currencies', () => {
    const inr = new Money('100', 'INR');
    const usd = new Money('100', 'USD');
    expect(() => inr.plus(usd)).toThrow(CurrencyMismatchError);
    expect(() => inr.minus(usd)).toThrow(CurrencyMismatchError);
  });

  it('should multiply and divide accurately', () => {
    const m = new Money('100');
    const multiplied = m.times('1.18');
    expect(multiplied.toFixed4()).toBe('118.0000');

    const divided = multiplied.dividedBy('2');
    expect(divided.toFixed4()).toBe('59.0000');
  });

  it('should support fromString, isZero, and toString', () => {
    const m = Money.fromString('0.0000');
    expect(m.isZero()).toBe(true);
    expect(m.toString()).toBe('0');

    const m2 = Money.fromString('123.4567');
    expect(m2.isZero()).toBe(false);
    expect(m2.toString()).toBe('123.4567');
  });
});
