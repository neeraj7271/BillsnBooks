import { VoucherType, VoucherStatus } from '@platform/shared-types';
import { Money } from './money.vo.js';
import { JournalEntry } from './journal-entry.entity.js';
import {
  DomainError,
  UnbalancedVoucherError,
  PostedVoucherImmutableError,
  EmptyVoucherError,
} from './errors.js';

export interface VoucherProps {
  id: string;
  tenantId: string;
  companyId: string;
  branchId: string;
  financialYearId: string;
  voucherType: VoucherType;
  voucherNumber: string;
  voucherDate: Date;
  status?: VoucherStatus;
  narration?: string;
  idempotencyKey?: string;
  reversalOfId?: string;
  version?: number;
  entries?: JournalEntry[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class Voucher {
  public readonly id: string;
  public readonly tenantId: string;
  public readonly companyId: string;
  public readonly branchId: string;
  public readonly financialYearId: string;
  public readonly voucherType: VoucherType;
  public readonly voucherNumber: string;
  public readonly voucherDate: Date;
  private _status: VoucherStatus;
  public narration?: string;
  public readonly idempotencyKey?: string;
  public readonly reversalOfId?: string;
  public version: number;
  private _entries: JournalEntry[];
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(props: VoucherProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.companyId = props.companyId;
    this.branchId = props.branchId;
    this.financialYearId = props.financialYearId;
    this.voucherType = props.voucherType;
    this.voucherNumber = props.voucherNumber;
    this.voucherDate = props.voucherDate;
    this._status = props.status ?? VoucherStatus.DRAFT;
    this.narration = props.narration;
    this.idempotencyKey = props.idempotencyKey;
    this.reversalOfId = props.reversalOfId;
    this.version = props.version ?? 1;
    this._entries = props.entries ? [...props.entries] : [];
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  public get status(): VoucherStatus {
    return this._status;
  }

  public get entries(): readonly JournalEntry[] {
    return Object.freeze([...this._entries]);
  }

  public addEntry(entry: JournalEntry): void {
    this.assertMutable();
    this._entries.push(entry);
    this.updatedAt = new Date();
  }

  public getTotalDebit(): Money {
    return this._entries
      .filter((e) => e.isDebit())
      .reduce((sum, e) => sum.plus(e.amount), Money.zero());
  }

  public getTotalCredit(): Money {
    return this._entries
      .filter((e) => e.isCredit())
      .reduce((sum, e) => sum.plus(e.amount), Money.zero());
  }

  public validateBalance(): void {
    if (this._entries.length === 0) {
      throw new EmptyVoucherError(this.id);
    }

    const hasDebit = this._entries.some((e) => e.isDebit());
    const hasCredit = this._entries.some((e) => e.isCredit());

    if (!hasDebit || !hasCredit) {
      throw new UnbalancedVoucherError(
        this.id,
        this.getTotalDebit().toFixed4(),
        this.getTotalCredit().toFixed4(),
        'Missing either debit or credit entry',
      );
    }

    const totalDebit = this.getTotalDebit();
    const totalCredit = this.getTotalCredit();

    if (!totalDebit.equals(totalCredit)) {
      const diff = totalDebit.minus(totalCredit).amount.abs().toFixed(4);
      throw new UnbalancedVoucherError(
        this.id,
        totalDebit.toFixed4(),
        totalCredit.toFixed4(),
        diff,
      );
    }
  }

  public post(): void {
    this.assertMutable();
    this.validateBalance();
    this._status = VoucherStatus.POSTED;
    this.updatedAt = new Date();
  }

  public createReversal(newVoucherId: string, reversalVoucherNumber: string): Voucher {
    if (this._status !== VoucherStatus.POSTED) {
      throw new DomainError(`Cannot reverse voucher ${this.id} with status ${this._status}. Only POSTED vouchers can be reversed.`);
    }

    const reversalEntries = this._entries.map((e) => e.createReversalEntry(newVoucherId));

    const reversalVoucher = new Voucher({
      id: newVoucherId,
      tenantId: this.tenantId,
      companyId: this.companyId,
      branchId: this.branchId,
      financialYearId: this.financialYearId,
      voucherType: this.voucherType,
      voucherNumber: reversalVoucherNumber,
      voucherDate: new Date(),
      status: VoucherStatus.DRAFT,
      narration: `Reversal of voucher ${this.voucherNumber}${this.narration ? `: ${this.narration}` : ''}`,
      reversalOfId: this.id,
      entries: reversalEntries,
    });

    this._status = VoucherStatus.REVERSED;
    this.updatedAt = new Date();

    return reversalVoucher;
  }

  public cancel(reason: string): void {
    this.assertMutable();
    this._status = VoucherStatus.CANCELLED;
    this.narration = `${this.narration ?? ''} [CANCELLED: ${reason}]`.trim();
    this.updatedAt = new Date();
  }

  private assertMutable(): void {
    if (this._status === VoucherStatus.POSTED) {
      throw new PostedVoucherImmutableError(this.id);
    }
    if (this._status === VoucherStatus.CANCELLED || this._status === VoucherStatus.REVERSED) {
      throw new DomainError(`Voucher ${this.id} is in terminal status ${this._status} and cannot be modified.`);
    }
  }
}
