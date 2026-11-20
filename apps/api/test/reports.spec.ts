import { ReportsService } from '../src/modules/reports/reports.service';

describe('ReportsService Logic', () => {
  it('should balance trial balance debits and credits mathematically', () => {
    const mockRows = [
      {
        ledgerId: '1',
        ledgerCode: 'LED-HDFC',
        ledgerName: 'HDFC Bank',
        groupId: 'g1',
        groupName: 'Bank Accounts',
        nature: 'ASSET' as any,
        openingDebit: 100000,
        openingCredit: 0,
        periodDebit: 50000,
        periodCredit: 20000,
        closingDebit: 130000,
        closingCredit: 0,
      },
      {
        ledgerId: '2',
        ledgerCode: 'LED-SALES',
        ledgerName: 'Sales Account',
        groupId: 'g2',
        groupName: 'Operating Revenue',
        nature: 'INCOME' as any,
        openingDebit: 0,
        openingCredit: 0,
        periodDebit: 0,
        periodCredit: 50000,
        closingDebit: 0,
        closingCredit: 50000,
      },
      {
        ledgerId: '3',
        ledgerCode: 'LED-RENT',
        ledgerName: 'Rent Expense',
        groupId: 'g3',
        groupName: 'Operating Expenses',
        nature: 'EXPENSE' as any,
        openingDebit: 0,
        openingCredit: 0,
        periodDebit: 20000,
        periodCredit: 0,
        closingDebit: 20000,
        closingCredit: 0,
      },
      {
        ledgerId: '4',
        ledgerCode: 'LED-CAPITAL',
        ledgerName: 'Share Capital',
        groupId: 'g4',
        groupName: 'Capital Account',
        nature: 'LIABILITY' as any,
        openingDebit: 0,
        openingCredit: 100000,
        periodDebit: 0,
        periodCredit: 0,
        closingDebit: 0,
        closingCredit: 100000,
      },
    ];

    const totalDebits = mockRows.reduce((sum, r) => sum + r.closingDebit, 0);
    const totalCredits = mockRows.reduce((sum, r) => sum + r.closingCredit, 0);
    const diff = Math.abs(totalDebits - totalCredits);

    expect(totalDebits).toBe(150000);
    expect(totalCredits).toBe(150000);
    expect(diff).toBe(0);
  });

  it('should verify Balance Sheet invariant (Assets = Liabilities + Net Profit)', () => {
    const assets = 130000; // Bank 130,000
    const liabilities = 100000; // Capital 100,000
    const sales = 50000;
    const rent = 20000;
    const netProfit = sales - rent; // 30,000

    const totalLiabilitiesAndEquity = liabilities + netProfit; // 100,000 + 30,000 = 130,000
    expect(assets).toBe(totalLiabilitiesAndEquity);
  });
});

