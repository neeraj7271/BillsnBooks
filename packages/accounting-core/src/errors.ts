export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UnbalancedVoucherError extends DomainError {
  constructor(
    public readonly voucherId: string,
    public readonly totalDebit: string,
    public readonly totalCredit: string,
    public readonly difference: string,
  ) {
    super(
      `Voucher ${voucherId} is unbalanced. Debit (${totalDebit}) does not equal Credit (${totalCredit}). Difference: ${difference}`,
    );
  }
}

export class NegativeAmountError extends DomainError {
  constructor(public readonly amount: string) {
    super(`Accounting amount must be positive. Received: ${amount}`);
  }
}

export class PostedVoucherImmutableError extends DomainError {
  constructor(public readonly voucherId: string) {
    super(`Posted voucher ${voucherId} is immutable. To modify accounting impact, create a reversal voucher.`);
  }
}

export class CurrencyMismatchError extends DomainError {
  constructor(public readonly expected: string, public readonly received: string) {
    super(`Currency mismatch. Expected ${expected}, received ${received}`);
  }
}

export class EmptyVoucherError extends DomainError {
  constructor(public readonly voucherId: string) {
    super(`Voucher ${voucherId} has no journal entries. A valid voucher must have at least one debit and one credit entry.`);
  }
}

