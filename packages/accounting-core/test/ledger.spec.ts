import { Ledger } from '../src/ledger.entity';
import { Money } from '../src/money.vo';
import { AccountNature } from '@platform/shared-types';

describe('Ledger Entity', () => {
  it('should initialize with opening balance and default to zero if omitted', () => {
    const l1 = new Ledger({
      id: 'l-1',
      tenantId: 't-1',
      companyId: 'c-1',
      groupId: 'g-1',
      code: 'BANK-01',
      name: 'HDFC Bank Current A/c',
      nature: AccountNature.ASSET,
    });
    expect(l1.openingBalance.toFixed2()).toBe('0.00');
    expect(l1.currentBalance.toFixed2()).toBe('0.00');

    const l2 = new Ledger({
      id: 'l-2',
      tenantId: 't-1',
      companyId: 'c-1',
      groupId: 'g-1',
      code: 'CAP-01',
      name: 'Owner Capital',
      nature: AccountNature.EQUITY,
      openingBalance: new Money('500000'),
    });
    expect(l2.openingBalance.toFixed2()).toBe('500000.00');
    expect(l2.currentBalance.toFixed2()).toBe('500000.00');
  });

  it('should increase asset and expense balance on debit, decrease on credit', () => {
    const bank = new Ledger({
      id: 'l-bank',
      tenantId: 't-1',
      companyId: 'c-1',
      groupId: 'g-bank',
      code: 'BANK',
      name: 'Bank',
      nature: AccountNature.ASSET,
    });

    bank.applyDebit(new Money('1000'));
    expect(bank.currentBalance.toFixed2()).toBe('1000.00');

    bank.applyCredit(new Money('400'));
    expect(bank.currentBalance.toFixed2()).toBe('600.00');
  });

  it('should increase liability, equity and income balance on credit, decrease on debit', () => {
    const sales = new Ledger({
      id: 'l-sales',
      tenantId: 't-1',
      companyId: 'c-1',
      groupId: 'g-sales',
      code: 'SALES',
      name: 'Sales Revenue',
      nature: AccountNature.INCOME,
    });

    sales.applyCredit(new Money('5000'));
    expect(sales.currentBalance.toFixed2()).toBe('5000.00');

    sales.applyDebit(new Money('1000'));
    expect(sales.currentBalance.toFixed2()).toBe('4000.00');
  });
});

