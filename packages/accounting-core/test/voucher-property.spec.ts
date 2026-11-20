import fc from 'fast-check';
import { Voucher } from '../src/voucher.entity';
import { JournalEntry } from '../src/journal-entry.entity';
import { Money } from '../src/money.vo';
import { VoucherType, EntryType } from '@platform/shared-types';

describe('Voucher Property-Based Tests (fast-check)', () => {
  it('property: a voucher with identical debit and credit sums must validate without error', () => {
    // Generate an array of positive decimal strings
    const positiveAmounts = fc.array(
      fc.double({ min: 0.01, max: 100000, noNaN: true }).map((n) => n.toFixed(2)),
      { minLength: 1, maxLength: 20 },
    );

    fc.assert(
      fc.property(positiveAmounts, (amounts) => {
        const voucher = new Voucher({
          id: 'v-prop-test',
          tenantId: 't-1',
          companyId: 'c-1',
          branchId: 'b-1',
          financialYearId: 'fy-1',
          voucherType: VoucherType.JOURNAL,
          voucherNumber: 'JRN/001',
          voucherDate: new Date(),
        });

        let line = 1;
        let total = Money.zero();

        // Add arbitrary debit lines
        for (const amt of amounts) {
          const money = new Money(amt);
          total = total.plus(money);
          voucher.addEntry(
            new JournalEntry({
              voucherId: voucher.id,
              ledgerId: `ledger-dr-${line}`,
              entryType: EntryType.DEBIT,
              amount: money,
              lineIndex: line++,
            }),
          );
        }

        // Add matching credit line
        voucher.addEntry(
          new JournalEntry({
            voucherId: voucher.id,
            ledgerId: 'ledger-cr-balancing',
            entryType: EntryType.CREDIT,
            amount: total,
            lineIndex: line++,
          }),
        );

        // Validation must succeed
        expect(() => voucher.validateBalance()).not.toThrow();
        expect(voucher.getTotalDebit().equals(voucher.getTotalCredit())).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
