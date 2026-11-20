import { Voucher, JournalEntry, Money } from '@platform/accounting-core';
import { VoucherOrmEntity } from '../entities/voucher.orm-entity';
import { JournalEntryOrmEntity } from '../entities/journal-entry.orm-entity';

export class VoucherMapper {
  static toDomain(orm: VoucherOrmEntity): Voucher {
    const domainEntries = (orm.entries || []).map(
      (e) =>
        new JournalEntry({
          id: e.id,
          voucherId: e.voucherId,
          ledgerId: e.ledgerId,
          entryType: e.entryType,
          amount: new Money(e.amount.toString(), e.currency),
          narration: e.narration ?? undefined,
          lineIndex: e.lineIndex,
        }),
    );

    return new Voucher({
      id: orm.id,
      tenantId: orm.tenantId,
      companyId: orm.companyId,
      branchId: orm.branchId,
      financialYearId: orm.financialYearId,
      voucherType: orm.voucherType,
      voucherNumber: orm.voucherNumber,
      voucherDate: new Date(orm.voucherDate),
      status: orm.status,
      narration: orm.narration ?? undefined,
      idempotencyKey: orm.idempotencyKey ?? undefined,
      reversalOfId: orm.reversalOfId ?? undefined,
      version: orm.version,
      entries: domainEntries,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(domain: Voucher): VoucherOrmEntity {
    const orm = new VoucherOrmEntity();
    orm.id = domain.id;
    orm.tenantId = domain.tenantId;
    orm.companyId = domain.companyId;
    orm.branchId = domain.branchId;
    orm.financialYearId = domain.financialYearId;
    orm.voucherType = domain.voucherType;
    orm.voucherNumber = domain.voucherNumber;
    orm.voucherDate = domain.voucherDate.toISOString().split('T')[0]!;
    orm.status = domain.status;
    orm.totalAmount = domain.getTotalDebit().amount;
    orm.idempotencyKey = domain.idempotencyKey ?? null;
    orm.reversalOfId = domain.reversalOfId ?? null;
    orm.narration = domain.narration ?? null;
    orm.version = domain.version;

    orm.entries = domain.entries.map((e) => {
      const entryOrm = new JournalEntryOrmEntity();
      if (e.id) entryOrm.id = e.id;
      entryOrm.tenantId = domain.tenantId;
      entryOrm.voucherId = domain.id;
      entryOrm.ledgerId = e.ledgerId;
      entryOrm.entryType = e.entryType;
      entryOrm.amount = e.amount.amount;
      entryOrm.currency = e.amount.currency;
      entryOrm.narration = e.narration ?? null;
      entryOrm.lineIndex = e.lineIndex;
      return entryOrm;
    });

    return orm;
  }
}

