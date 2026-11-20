import { Voucher } from '../src/voucher.entity';
import { JournalEntry } from '../src/journal-entry.entity';
import { Money } from '../src/money.vo';
import { VoucherType, VoucherStatus, EntryType } from '@platform/shared-types';
import {
  UnbalancedVoucherError,
  PostedVoucherImmutableError,
  EmptyVoucherError,
} from '../src/errors';

describe('Voucher Aggregate Root', () => {
  const createDraftVoucher = () =>
    new Voucher({
      id: 'v-100',
      tenantId: 't-1',
      companyId: 'c-1',
      branchId: 'b-1',
      financialYearId: 'fy-2026',
      voucherType: VoucherType.SALES,
      voucherNumber: 'INV/2026/001',
      voucherDate: new Date('2026-05-15'),
    });

  it('should reject posting an empty voucher', () => {
    const voucher = createDraftVoucher();
    expect(() => voucher.post()).toThrow(EmptyVoucherError);
  });

  it('should reject posting when debits do not equal credits', () => {
    const voucher = createDraftVoucher();
    voucher.addEntry(
      new JournalEntry({
        voucherId: voucher.id,
        ledgerId: 'debtors-ledger',
        entryType: EntryType.DEBIT,
        amount: new Money('1000.00'),
        lineIndex: 1,
      }),
    );
    voucher.addEntry(
      new JournalEntry({
        voucherId: voucher.id,
        ledgerId: 'sales-ledger',
        entryType: EntryType.CREDIT,
        amount: new Money('800.00'),
        lineIndex: 2,
      }),
    );

    expect(() => voucher.post()).toThrow(UnbalancedVoucherError);
    expect(voucher.status).toBe(VoucherStatus.DRAFT);
  });

  it('should successfully post when debits equal credits', () => {
    const voucher = createDraftVoucher();
    voucher.addEntry(
      new JournalEntry({
        voucherId: voucher.id,
        ledgerId: 'debtors-ledger',
        entryType: EntryType.DEBIT,
        amount: new Money('1180.00'),
        lineIndex: 1,
      }),
    );
    voucher.addEntry(
      new JournalEntry({
        voucherId: voucher.id,
        ledgerId: 'sales-ledger',
        entryType: EntryType.CREDIT,
        amount: new Money('1000.00'),
        lineIndex: 2,
      }),
    );
    voucher.addEntry(
      new JournalEntry({
        voucherId: voucher.id,
        ledgerId: 'output-gst-ledger',
        entryType: EntryType.CREDIT,
        amount: new Money('180.00'),
        lineIndex: 3,
      }),
    );

    voucher.post();
    expect(voucher.status).toBe(VoucherStatus.POSTED);
    expect(voucher.getTotalDebit().toFixed4()).toBe('1180.0000');
    expect(voucher.getTotalCredit().toFixed4()).toBe('1180.0000');
  });

  it('should forbid modifications to a posted voucher', () => {
    const voucher = createDraftVoucher();
    voucher.addEntry(
      new JournalEntry({
        voucherId: voucher.id,
        ledgerId: 'cash-ledger',
        entryType: EntryType.DEBIT,
        amount: new Money('500.00'),
        lineIndex: 1,
      }),
    );
    voucher.addEntry(
      new JournalEntry({
        voucherId: voucher.id,
        ledgerId: 'sales-ledger',
        entryType: EntryType.CREDIT,
        amount: new Money('500.00'),
        lineIndex: 2,
      }),
    );
    voucher.post();

    expect(() =>
      voucher.addEntry(
        new JournalEntry({
          voucherId: voucher.id,
          ledgerId: 'extra-ledger',
          entryType: EntryType.DEBIT,
          amount: new Money('100.00'),
          lineIndex: 3,
        }),
      ),
    ).toThrow(PostedVoucherImmutableError);
  });

  it('should generate a valid balanced reversal voucher', () => {
    const voucher = createDraftVoucher();
    voucher.addEntry(
      new JournalEntry({
        voucherId: voucher.id,
        ledgerId: 'bank-ledger',
        entryType: EntryType.DEBIT,
        amount: new Money('500.00'),
        lineIndex: 1,
      }),
    );
    voucher.addEntry(
      new JournalEntry({
        voucherId: voucher.id,
        ledgerId: 'revenue-ledger',
        entryType: EntryType.CREDIT,
        amount: new Money('500.00'),
        lineIndex: 2,
      }),
    );
    voucher.post();

    const reversal = voucher.createReversal('v-reversal-1', 'REV/2026/001');
    expect(voucher.status).toBe(VoucherStatus.REVERSED);
    expect(reversal.reversalOfId).toBe(voucher.id);
    expect(reversal.entries).toHaveLength(2);

    // Assert flipped entry types
    const entry1 = reversal.entries[0]!;
    const entry2 = reversal.entries[1]!;
    expect(entry1.entryType).toBe(EntryType.CREDIT);
    expect(entry2.entryType).toBe(EntryType.DEBIT);

    // Reversal should be postable and balanced
    reversal.post();
    expect(reversal.status).toBe(VoucherStatus.POSTED);
  });

  it('should reject reversing an unposted voucher', () => {
    const voucher = createDraftVoucher();
    expect(() => voucher.createReversal('rev-1', 'REV/001')).toThrow(
      'Cannot reverse voucher v-100 with status DRAFT. Only POSTED vouchers can be reversed.',
    );
  });

  it('should support cancellation of draft vouchers and forbid subsequent changes', () => {
    const voucher = createDraftVoucher();
    voucher.cancel('Client requested cancellation');
    expect(voucher.status).toBe(VoucherStatus.CANCELLED);
    expect(voucher.narration).toContain('Client requested cancellation');

    expect(() =>
      voucher.addEntry(
        new JournalEntry({
          voucherId: voucher.id,
          ledgerId: 'l-1',
          entryType: EntryType.DEBIT,
          amount: new Money('100'),
          lineIndex: 1,
        }),
      ),
    ).toThrow('is in terminal status CANCELLED and cannot be modified');
  });
});
