import { AccountNature } from '@platform/shared-types';
import { Money } from './money.vo.js';

export interface LedgerProps {
  id: string;
  tenantId: string;
  companyId: string;
  groupId: string;
  code: string;
  name: string;
  nature: AccountNature;
  openingBalance?: Money;
  currentBalance?: Money;
  isBankOrCash?: boolean;
  isActive?: boolean;
}

export class Ledger {
  public readonly id: string;
  public readonly tenantId: string;
  public readonly companyId: string;
  public readonly groupId: string;
  public readonly code: string;
  public readonly name: string;
  public readonly nature: AccountNature;
  public readonly openingBalance: Money;
  private _currentBalance: Money;
  public readonly isBankOrCash: boolean;
  public isActive: boolean;

  constructor(props: LedgerProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.companyId = props.companyId;
    this.groupId = props.groupId;
    this.code = props.code;
    this.name = props.name;
    this.nature = props.nature;
    this.openingBalance = props.openingBalance ?? Money.zero();
    this._currentBalance = props.currentBalance ?? this.openingBalance;
    this.isBankOrCash = props.isBankOrCash ?? false;
    this.isActive = props.isActive ?? true;
  }

  public get currentBalance(): Money {
    return this._currentBalance;
  }

  public applyDebit(amount: Money): void {
    // For Asset and Expense, debit increases balance. For Liability, Equity, Income, debit decreases.
    if (this.nature === AccountNature.ASSET || this.nature === AccountNature.EXPENSE) {
      this._currentBalance = this._currentBalance.plus(amount);
    } else {
      this._currentBalance = this._currentBalance.minus(amount);
    }
  }

  public applyCredit(amount: Money): void {
    // For Liability, Equity, Income, credit increases balance. For Asset and Expense, credit decreases.
    if (this.nature === AccountNature.LIABILITY || this.nature === AccountNature.EQUITY || this.nature === AccountNature.INCOME) {
      this._currentBalance = this._currentBalance.plus(amount);
    } else {
      this._currentBalance = this._currentBalance.minus(amount);
    }
  }
}

