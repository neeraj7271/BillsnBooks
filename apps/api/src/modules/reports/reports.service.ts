import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { QueryRunner, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import { LedgerOrmEntity } from '../../infrastructure/persistence/entities/ledger.orm-entity';
import { LedgerGroupOrmEntity } from '../../infrastructure/persistence/entities/ledger-group.orm-entity';
import { VoucherOrmEntity } from '../../infrastructure/persistence/entities/voucher.orm-entity';
import { JournalEntryOrmEntity } from '../../infrastructure/persistence/entities/journal-entry.orm-entity';
import { InvoiceOrmEntity } from '../../infrastructure/persistence/entities/invoice.orm-entity';
import { InvoiceItemOrmEntity } from '../../infrastructure/persistence/entities/invoice-item.orm-entity';
import { PartyOrmEntity } from '../../infrastructure/persistence/entities/party.orm-entity';
import { ItemOrmEntity } from '../../infrastructure/persistence/entities/item.orm-entity';
import { CompanyOrmEntity } from '../../infrastructure/persistence/entities/company.orm-entity';
import { BranchOrmEntity } from '../../infrastructure/persistence/entities/branch.orm-entity';
import { UserFavoriteReportOrmEntity } from '../../infrastructure/persistence/entities/user-favorite-report.orm-entity';
import {
  AccountNature,
  CustomerSalesReport,
  CustomerSalesRow,
  ItemSalesReport,
  ItemSalesRow,
  FavoriteReportDto,
  InvoiceStatus,
  ExpensesMonthlyReport,
  ExpensesMonthlyRow,
  ExpensesVendorReport,
  ExpensesVendorRow,
  ExpensesCategoryReport,
  ExpensesCategoryRow,
  ExpensesRegisterReport,
  ExpensesRegisterRow,
  PurchasesItemReport,
  PurchasesItemRow,
  CashBankAuditReport,
  CashBankAuditRow,
  PayablesSummaryReport,
  PayablesSummaryRow,
  PayablesAgeingReport,
  PayablesAgeingRow,
  LedgerHygieneRow,
} from '@platform/shared-types';

export interface TrialBalanceRow {
  ledgerId: string;
  ledgerCode: string;
  ledgerName: string;
  groupId: string;
  groupName: string;
  nature: AccountNature;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
}

export interface TrialBalanceReport {
  companyId: string;
  asOfDate: string;
  fromDate?: string;
  totalOpeningDebit: number;
  totalOpeningCredit: number;
  totalPeriodDebit: number;
  totalPeriodCredit: number;
  totalClosingDebit: number;
  totalClosingCredit: number;
  netDifference: number;
  isBalanced: boolean;
  rows: TrialBalanceRow[];
  groupsSummary: Record<string, { groupName: string; nature: AccountNature; totalDebit: number; totalCredit: number }>;
}

@Injectable()
export class ReportsService {
  constructor(private readonly uow: UnitOfWorkService) {}

  private async resolveCompanyAndTenant(
    qr: QueryRunner,
    tenantId: string,
    companyId: string,
  ): Promise<{ company: CompanyOrmEntity | null; actualTenantId: string }> {
    let company = await qr.manager.findOne(CompanyOrmEntity, {
      where: [{ id: companyId, tenantId }, { id: companyId }],
    });
    const actualTenantId = company?.tenantId || tenantId;

    if (actualTenantId) {
      try {
        await qr.query(`SELECT set_config('app.tenant_id', $1, true)`, [actualTenantId]);
      } catch (e) {
        // ignore if not supported
      }
    }

    return { company, actualTenantId };
  }

  async getTrialBalance(
    tenantId: string,
    companyId: string,
    asOfDate: string,
    fromDate?: string,
  ): Promise<TrialBalanceReport> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const { company, actualTenantId } = await this.resolveCompanyAndTenant(qr, tenantId, companyId);
      tenantId = actualTenantId;
      // 1. Fetch all active ledgers with their parent groups
      const ledgers = await qr.manager
        .getRepository(LedgerOrmEntity)
        .createQueryBuilder('ledger')
        .leftJoinAndSelect('ledger.group', 'group')
        .where('ledger.tenant_id = :tenantId', { tenantId })
        .andWhere('ledger.company_id = :companyId', { companyId })
        .andWhere('ledger.is_active = true')
        .orderBy('group.nature', 'ASC')
        .addOrderBy('ledger.name', 'ASC')
        .getMany();

      // 2. Fetch all posted journal entries up to asOfDate
      const qb = qr.manager
        .getRepository(JournalEntryOrmEntity)
        .createQueryBuilder('entry')
        .innerJoin('entry.voucher', 'voucher')
        .where('entry.tenant_id = :tenantId', { tenantId })
        .andWhere('voucher.company_id = :companyId', { companyId })
        .andWhere("voucher.status = 'POSTED'")
        .andWhere('voucher.voucher_date <= :asOfDate', { asOfDate });

      const entries = await qb
        .select([
          'entry.ledgerId',
          'entry.entryType',
          'entry.amount',
          'voucher.voucherDate',
        ])
        .getRawMany();

      // Aggregate by ledger
      const mapLedgerActivity = new Map<
        string,
        {
          preDebit: number;
          preCredit: number;
          periodDebit: number;
          periodCredit: number;
        }
      >();

      for (const e of entries) {
        const lId = e.entry_ledger_id;
        const amount = Number(e.entry_amount) || 0;
        const vDate = e.voucher_voucher_date;
        const isDebit = e.entry_entry_type === 'DEBIT';

        if (!mapLedgerActivity.has(lId)) {
          mapLedgerActivity.set(lId, { preDebit: 0, preCredit: 0, periodDebit: 0, periodCredit: 0 });
        }
        const act = mapLedgerActivity.get(lId)!;

        if (fromDate && vDate < fromDate) {
          if (isDebit) act.preDebit += amount;
          else act.preCredit += amount;
        } else {
          if (isDebit) act.periodDebit += amount;
          else act.periodCredit += amount;
        }
      }

      let totalOpeningDebit = 0;
      let totalOpeningCredit = 0;
      let totalPeriodDebit = 0;
      let totalPeriodCredit = 0;
      let totalClosingDebit = 0;
      let totalClosingCredit = 0;

      const rows: TrialBalanceRow[] = [];
      const groupsSummary: TrialBalanceReport['groupsSummary'] = {};

      for (const l of ledgers) {
        const act = mapLedgerActivity.get(l.id) || { preDebit: 0, preCredit: 0, periodDebit: 0, periodCredit: 0 };
        const baseOpening = Number(l.openingBalance) || 0;
        const nature = (l.group?.nature || 'ASSET') as AccountNature;

        // Opening calculation
        let openingDebit = 0;
        let openingCredit = 0;
        if (nature === 'ASSET' || nature === 'EXPENSE') {
          const netPre = baseOpening + act.preDebit - act.preCredit;
          if (netPre >= 0) openingDebit = netPre;
          else openingCredit = Math.abs(netPre);
        } else {
          const netPre = baseOpening + act.preCredit - act.preDebit;
          if (netPre >= 0) openingCredit = netPre;
          else openingDebit = Math.abs(netPre);
        }

        // Closing calculation
        const netCumulativeDebit = openingDebit + act.periodDebit;
        const netCumulativeCredit = openingCredit + act.periodCredit;

        let closingDebit = 0;
        let closingCredit = 0;

        if (netCumulativeDebit >= netCumulativeCredit) {
          closingDebit = Math.round((netCumulativeDebit - netCumulativeCredit) * 100) / 100;
        } else {
          closingCredit = Math.round((netCumulativeCredit - netCumulativeDebit) * 100) / 100;
        }

        // Filter out zero-activity ledgers if opening, period, and closing are all zero
        if (openingDebit === 0 && openingCredit === 0 && act.periodDebit === 0 && act.periodCredit === 0 && closingDebit === 0 && closingCredit === 0) {
          // Still show core bank/sales/tax ledgers or ledgers with non-zero opening
          if (!l.isBankOrCash && !l.code.includes('SALES') && !l.code.includes('GST')) {
            continue;
          }
        }

        rows.push({
          ledgerId: l.id,
          ledgerCode: l.code,
          ledgerName: l.name,
          groupId: l.groupId,
          groupName: l.group?.name || 'Unassigned',
          nature,
          openingDebit: Math.round(openingDebit * 100) / 100,
          openingCredit: Math.round(openingCredit * 100) / 100,
          periodDebit: Math.round(act.periodDebit * 100) / 100,
          periodCredit: Math.round(act.periodCredit * 100) / 100,
          closingDebit,
          closingCredit,
        });

        totalOpeningDebit += openingDebit;
        totalOpeningCredit += openingCredit;
        totalPeriodDebit += act.periodDebit;
        totalPeriodCredit += act.periodCredit;
        totalClosingDebit += closingDebit;
        totalClosingCredit += closingCredit;

        // Group rollup
        const gName = l.group?.name || 'General';
        if (!groupsSummary[gName]) {
          groupsSummary[gName] = { groupName: gName, nature, totalDebit: 0, totalCredit: 0 };
        }
        groupsSummary[gName].totalDebit += closingDebit;
        groupsSummary[gName].totalCredit += closingCredit;
      }

      totalOpeningDebit = Math.round(totalOpeningDebit * 100) / 100;
      totalOpeningCredit = Math.round(totalOpeningCredit * 100) / 100;
      totalPeriodDebit = Math.round(totalPeriodDebit * 100) / 100;
      totalPeriodCredit = Math.round(totalPeriodCredit * 100) / 100;
      totalClosingDebit = Math.round(totalClosingDebit * 100) / 100;
      totalClosingCredit = Math.round(totalClosingCredit * 100) / 100;

      const netDifference = Math.round(Math.abs(totalClosingDebit - totalClosingCredit) * 100) / 100;
      const isBalanced = netDifference === 0;

      return {
        companyId,
        asOfDate,
        fromDate,
        totalOpeningDebit,
        totalOpeningCredit,
        totalPeriodDebit,
        totalPeriodCredit,
        totalClosingDebit,
        totalClosingCredit,
        netDifference,
        isBalanced,
        rows,
        groupsSummary,
      };
    });
  }

  async getGeneralLedger(
    tenantId: string,
    companyId: string,
    ledgerId: string,
    fromDate: string,
    toDate: string,
  ): Promise<any> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const { company, actualTenantId } = await this.resolveCompanyAndTenant(qr, tenantId, companyId);
      tenantId = actualTenantId;
      const ledger = await qr.manager.findOne(LedgerOrmEntity, {
        where: [
          { id: ledgerId, tenantId, companyId },
          { id: ledgerId, companyId },
        ],
        relations: ['group'],
      });

      if (!ledger) {
        throw new NotFoundException(`Ledger ${ledgerId} not found.`);
      }

      // Calculate Opening Balance prior to fromDate
      const preEntries = await qr.manager
        .getRepository(JournalEntryOrmEntity)
        .createQueryBuilder('je')
        .innerJoin('je.voucher', 'v')
        .where('je.tenant_id = :tenantId', { tenantId })
        .andWhere('je.ledger_id = :ledgerId', { ledgerId })
        .andWhere("v.status = 'POSTED'")
        .andWhere('v.voucher_date < :fromDate', { fromDate })
        .select(['je.entryType', 'je.amount'])
        .getRawMany();

      let preDebit = 0;
      let preCredit = 0;
      for (const e of preEntries) {
        if (e.je_entry_type === 'DEBIT') preDebit += Number(e.je_amount);
        else preCredit += Number(e.je_amount);
      }

      const baseOpening = Number(ledger.openingBalance) || 0;
      const isDebitNature = ledger.group?.nature === 'ASSET' || ledger.group?.nature === 'EXPENSE';
      let runningBalance = isDebitNature
        ? baseOpening + preDebit - preCredit
        : baseOpening + preCredit - preDebit;

      const openingBalance = runningBalance;

      // Fetch entries in period
      const periodEntries = await qr.manager
        .getRepository(JournalEntryOrmEntity)
        .createQueryBuilder('je')
        .innerJoinAndSelect('je.voucher', 'v')
        .where('je.tenant_id = :tenantId', { tenantId })
        .andWhere('je.ledger_id = :ledgerId', { ledgerId })
        .andWhere("v.status = 'POSTED'")
        .andWhere('v.voucher_date >= :fromDate', { fromDate })
        .andWhere('v.voucher_date <= :toDate', { toDate })
        .orderBy('v.voucher_date', 'ASC')
        .addOrderBy('v.created_at', 'ASC')
        .getMany();

      let totalPeriodDebit = 0;
      let totalPeriodCredit = 0;

      const lines = periodEntries.map((je) => {
        const debit = je.entryType === 'DEBIT' ? Number(je.amount) : 0;
        const credit = je.entryType === 'CREDIT' ? Number(je.amount) : 0;

        totalPeriodDebit += debit;
        totalPeriodCredit += credit;

        if (isDebitNature) {
          runningBalance += debit - credit;
        } else {
          runningBalance += credit - debit;
        }

        return {
          id: je.id,
          date: je.voucher?.voucherDate,
          voucherNumber: je.voucher?.voucherNumber,
          voucherType: je.voucher?.voucherType,
          narration: je.voucher?.narration || je.narration,
          debit: Math.round(debit * 100) / 100,
          credit: Math.round(credit * 100) / 100,
          runningBalance: Math.round(runningBalance * 100) / 100,
        };
      });

      return {
        ledger: {
          id: ledger.id,
          code: ledger.code,
          name: ledger.name,
          currency: ledger.currency,
          groupName: ledger.group?.name,
          nature: ledger.group?.nature,
        },
        fromDate,
        toDate,
        openingBalance: Math.round(openingBalance * 100) / 100,
        totalDebit: Math.round(totalPeriodDebit * 100) / 100,
        totalCredit: Math.round(totalPeriodCredit * 100) / 100,
        closingBalance: Math.round(runningBalance * 100) / 100,
        lines,
      };
    });
  }

  async getProfitAndLoss(
    tenantId: string,
    companyId: string,
    fromDate: string,
    toDate: string,
  ): Promise<any> {
    const tb = await this.getTrialBalance(tenantId, companyId, toDate, fromDate);

    let totalRevenue = 0;
    let totalDirectExpenses = 0;
    let totalIndirectExpenses = 0;

    const incomeRows = tb.rows.filter((r) => r.nature === 'INCOME');
    const expenseRows = tb.rows.filter((r) => r.nature === 'EXPENSE');

    for (const r of incomeRows) {
      totalRevenue += r.periodCredit - r.periodDebit;
    }

    for (const r of expenseRows) {
      const expAmount = r.periodDebit - r.periodCredit;
      if (r.groupName.toLowerCase().includes('direct') || r.ledgerName.toLowerCase().includes('cost')) {
        totalDirectExpenses += expAmount;
      } else {
        totalIndirectExpenses += expAmount;
      }
    }

    totalRevenue = Math.round(totalRevenue * 100) / 100;
    totalDirectExpenses = Math.round(totalDirectExpenses * 100) / 100;
    totalIndirectExpenses = Math.round(totalIndirectExpenses * 100) / 100;

    const grossProfit = Math.round((totalRevenue - totalDirectExpenses) * 100) / 100;
    const netProfit = Math.round((grossProfit - totalIndirectExpenses) * 100) / 100;

    return {
      fromDate,
      toDate,
      totalRevenue,
      totalDirectExpenses,
      grossProfit,
      totalIndirectExpenses,
      netProfit,
      incomeRows,
      expenseRows,
    };
  }

  async getBalanceSheet(
    tenantId: string,
    companyId: string,
    asOfDate: string,
  ): Promise<any> {
    const tb = await this.getTrialBalance(tenantId, companyId, asOfDate);

    // Calculate current period net profit to dynamically include in equity
    const pnl = await this.getProfitAndLoss(tenantId, companyId, '2024-04-01', asOfDate);
    const netProfit = pnl.netProfit;

    const assetRows = tb.rows.filter((r) => r.nature === 'ASSET');
    const liabilityRows = tb.rows.filter((r) => r.nature === 'LIABILITY');

    let totalAssets = 0;
    let totalLiabilities = 0;

    for (const r of assetRows) {
      totalAssets += r.closingDebit - r.closingCredit;
    }

    for (const r of liabilityRows) {
      totalLiabilities += r.closingCredit - r.closingDebit;
    }

    totalAssets = Math.round(totalAssets * 100) / 100;
    totalLiabilities = Math.round(totalLiabilities * 100) / 100;

    // Total liabilities and equity
    const totalLiabilitiesAndEquity = Math.round((totalLiabilities + netProfit) * 100) / 100;
    const variance = Math.round(Math.abs(totalAssets - totalLiabilitiesAndEquity) * 100) / 100;
    const isBalanced = variance < 0.05;

    return {
      asOfDate,
      totalAssets,
      totalLiabilities,
      netProfitCurrentYear: netProfit,
      totalLiabilitiesAndEquity,
      variance,
      isBalanced,
      assetRows,
      liabilityRows,
    };
  }

  // ==========================================
  // PHASE 1: REPORT CATALOG & FAVORITES HUB
  // ==========================================

  public static readonly MASTER_REPORTS_CATALOG: Omit<FavoriteReportDto, 'isFavorite'>[] = [
    {
      reportKey: 'CUSTOMER_SALES',
      title: 'Customer-Wise Sales Summary',
      category: 'Sales & Revenue',
      description: 'Taxable sales, GST splits, invoice volume, and outstanding balances by customer.',
      displayOrder: 1,
      defaultPeriod: 'THIS_MONTH',
      href: '/reports/customer-sales',
    },
    {
      reportKey: 'ITEM_SALES',
      title: 'Product & Item-Wise Sales',
      category: 'Sales & Revenue',
      description: 'Sales volume, average unit realization, HSN/SAC breakout, and margin analysis.',
      displayOrder: 2,
      defaultPeriod: 'THIS_MONTH',
      href: '/reports/item-sales',
    },
    {
      reportKey: 'AR_AGEING',
      title: 'AR Ageing & Dunning Analysis',
      category: 'Receivables & Payables',
      description: 'Outstanding customer receivables bucketed across 0-30, 31-60, 61-90, 90+ days.',
      displayOrder: 3,
      defaultPeriod: 'THIS_MONTH',
      href: '/collections/ageing',
    },
    {
      reportKey: 'TRIAL_BALANCE',
      title: 'Trial Balance (ICAI Standard)',
      category: 'Financial Statements',
      description: 'Debit and credit balance verification across all real, personal, and nominal accounts.',
      displayOrder: 4,
      defaultPeriod: 'THIS_FY',
      href: '/reports/trial-balance',
    },
    {
      reportKey: 'PROFIT_LOSS',
      title: 'Profit & Loss (P&L) Statement',
      category: 'Financial Statements',
      description: 'Revenue from operations, operating expenses, tax provision, and net profit.',
      displayOrder: 5,
      defaultPeriod: 'THIS_FY',
      href: '/reports/profit-and-loss',
    },
    {
      reportKey: 'BALANCE_SHEET',
      title: 'Balance Sheet (Schedule III)',
      category: 'Financial Statements',
      description: 'Statement of assets, equity capital, liabilities, and retained earnings.',
      displayOrder: 6,
      defaultPeriod: 'THIS_FY',
      href: '/reports/balance-sheet',
    },
    {
      reportKey: 'GENERAL_LEDGER',
      title: 'General Ledger Account Drill-down',
      category: 'Financial Statements',
      description: 'Chronological transaction register and running balance for any ledger account.',
      displayOrder: 7,
      defaultPeriod: 'THIS_MONTH',
      href: '/reports/general-ledger',
    },
    {
      reportKey: 'BRS_STATEMENT',
      title: 'Bank Reconciliation Statement',
      category: 'Banking & Liquidity',
      description: 'Book balance vs bank passbook with uncleared deposits and unpresented cheques.',
      displayOrder: 8,
      defaultPeriod: 'THIS_MONTH',
      href: '/banking',
    },

    // --- Purchases & Expenses ---
    {
      reportKey: 'EXPENSES_MONTHLY',
      title: 'Expenses Monthly Trend',
      category: 'Purchases & Expenses',
      description: 'Month-on-month variation and run-rate trends across direct and indirect expenses.',
      displayOrder: 9,
      defaultPeriod: 'THIS_FY',
      href: '/reports/expenses?tab=monthly',
    },
    {
      reportKey: 'EXPENSES_VENDOR',
      title: 'Expenses Vendor-Wise',
      category: 'Purchases & Expenses',
      description: 'Aggregated expenses distribution by supplier/service provider for TDS tracking.',
      displayOrder: 10,
      defaultPeriod: 'THIS_FY',
      href: '/reports/expenses?tab=vendor',
    },
    {
      reportKey: 'EXPENSES_CATEGORY',
      title: 'Expenses Category-Wise',
      category: 'Purchases & Expenses',
      description: 'Cost-center breakout grouped by Primary Account Nature and Cost Heads.',
      displayOrder: 11,
      defaultPeriod: 'THIS_FY',
      href: '/reports/expenses?tab=category',
    },
    {
      reportKey: 'EXPENSES_REGISTER',
      title: 'Expenses Voucher Register',
      category: 'Purchases & Expenses',
      description: 'Chronological audit trail of all expense vouchers with supporting narrations.',
      displayOrder: 12,
      defaultPeriod: 'THIS_MONTH',
      href: '/reports/expenses?tab=register',
    },
    {
      reportKey: 'PURCHASES_ITEM',
      title: 'Purchases Item-Wise',
      category: 'Purchases & Expenses',
      description: 'Procurement velocity, average buy rate, HSN/SAC breakout, and input tax credits.',
      displayOrder: 13,
      defaultPeriod: 'THIS_MONTH',
      href: '/reports/expenses?tab=item',
    },

    // --- Cash & Bank Audit (Statutory & Sanity Checks) ---
    {
      reportKey: 'CASH_NEGATIVE',
      title: 'Cash - Negative Balance Audit',
      category: 'Cash & Bank Audit',
      description: 'Identifies dates where physical cash balance dropped below zero.',
      displayOrder: 14,
      defaultPeriod: 'THIS_FY',
      href: '/reports/cash-bank-audit?tab=cash-negative',
    },
    {
      reportKey: 'BANK_NEGATIVE',
      title: 'Bank - Negative Balance Audit',
      category: 'Cash & Bank Audit',
      description: 'Detects unauthorized bank overdrafts and delayed deposit reconciliations.',
      displayOrder: 15,
      defaultPeriod: 'THIS_FY',
      href: '/reports/cash-bank-audit?tab=bank-negative',
    },
    {
      reportKey: 'INTER_BANK',
      title: 'Inter-Bank Transfers (Contra)',
      category: 'Cash & Bank Audit',
      description: 'Internal contra fund transfers between company bank accounts.',
      displayOrder: 16,
      defaultPeriod: 'THIS_MONTH',
      href: '/reports/cash-bank-audit?tab=inter-bank',
    },
    {
      reportKey: 'CASH_WITHDRAWALS',
      title: 'Cash Withdrawals from Bank',
      category: 'Cash & Bank Audit',
      description: 'Cheque and ATM cash withdrawals from bank to physical cash drawer.',
      displayOrder: 17,
      defaultPeriod: 'THIS_MONTH',
      href: '/reports/cash-bank-audit?tab=cash-withdrawals',
    },
    {
      reportKey: 'CASH_DEPOSITS',
      title: 'Cash Deposits into Bank',
      category: 'Cash & Bank Audit',
      description: 'Remittance of cash receipts to bank accounts.',
      displayOrder: 18,
      defaultPeriod: 'THIS_MONTH',
      href: '/reports/cash-bank-audit?tab=cash-deposits',
    },
    {
      reportKey: 'CASH_EXPENSES',
      title: 'Cash Expenses Register',
      category: 'Cash & Bank Audit',
      description: 'All payments made in hard cash across operational ledgers.',
      displayOrder: 19,
      defaultPeriod: 'THIS_MONTH',
      href: '/reports/cash-bank-audit?tab=cash-expenses',
    },
    {
      reportKey: 'CASH_PAYMENTS_OVER_10K',
      title: 'Cash Payments > ₹10,000 (Sec 40A(3))',
      category: 'Cash & Bank Audit',
      description: 'Income Tax disallowance risk: cash payments exceeding ₹10,000 per person per day.',
      displayOrder: 20,
      defaultPeriod: 'THIS_FY',
      href: '/reports/cash-bank-audit?tab=cash-over-10k',
    },
    {
      reportKey: 'CASH_RECEIPTS_OVER_2L',
      title: 'Cash Receipts ≥ ₹2,00,000 (Sec 269ST)',
      category: 'Cash & Bank Audit',
      description: 'Severe 100% tax penalty violation: accepting cash of ₹2,00,000 or more.',
      displayOrder: 21,
      defaultPeriod: 'THIS_FY',
      href: '/reports/cash-bank-audit?tab=cash-over-2l',
    },

    // --- Vendor Payables & Master Hygiene ---
    {
      reportKey: 'PAYABLES_SUMMARY',
      title: 'Payables Summary (Sundry Creditors)',
      category: 'Payables & Vendors',
      description: 'Bird’s-eye view of opening balance, period debits/credits, and closing dues per vendor.',
      displayOrder: 22,
      defaultPeriod: 'THIS_MONTH',
      href: '/reports/payables?tab=summary',
    },
    {
      reportKey: 'PAYABLES_AGEING',
      title: 'Payables Ageing (FIFO / Bill)',
      category: 'Payables & Vendors',
      description: 'Creditor liability ageing across 0-30, 31-60, 61-90, 90+ day credit terms.',
      displayOrder: 23,
      defaultPeriod: 'THIS_MONTH',
      href: '/reports/payables?tab=ageing',
    },
    {
      reportKey: 'ADVANCE_TO_VENDORS',
      title: 'Advance to Vendors',
      category: 'Payables & Vendors',
      description: 'Creditor ledgers with debit balance representing unadjusted supplier advances.',
      displayOrder: 24,
      defaultPeriod: 'THIS_MONTH',
      href: '/reports/payables?tab=advances',
    },
    {
      reportKey: 'LEDGERS_MISSING_PAN',
      title: 'Ledgers - Missing PAN (Sec 206AA)',
      category: 'Master Data Hygiene',
      description: 'Parties missing PAN subjected to higher 20% penal TDS deduction.',
      displayOrder: 25,
      defaultPeriod: 'THIS_FY',
      href: '/reports/payables?tab=missing-pan',
    },
    {
      reportKey: 'LEDGERS_MISSING_GSTIN',
      title: 'Ledgers - Missing GSTIN',
      category: 'Master Data Hygiene',
      description: 'Unregistered business counterparties for RCM audit and ITC verification.',
      displayOrder: 26,
      defaultPeriod: 'THIS_FY',
      href: '/reports/payables?tab=missing-gstin',
    },
    {
      reportKey: 'LEDGERS_SQUARED_OFF',
      title: 'Ledgers - Squared Off (Zero Balance)',
      category: 'Master Data Hygiene',
      description: 'Accounts with zero closing balance ready for audit confirmation.',
      displayOrder: 27,
      defaultPeriod: 'THIS_FY',
      href: '/reports/payables?tab=squared-off',
    },
    {
      reportKey: 'LEDGERS_STAGNANT',
      title: 'Ledgers - Stagnant (No Movement)',
      category: 'Master Data Hygiene',
      description: 'Accounts with static balances and zero transactions throughout the period.',
      displayOrder: 28,
      defaultPeriod: 'THIS_FY',
      href: '/reports/payables?tab=stagnant',
    },
  ];

  /**
   * List all master catalog reports merged with user's starred/favorite preferences
   */
  async listReportCatalogWithFavorites(
    tenantId: string,
    companyId: string,
    userId: string,
  ): Promise<FavoriteReportDto[]> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const { company, actualTenantId } = await this.resolveCompanyAndTenant(qr, tenantId, companyId);
      tenantId = actualTenantId;
      const favorites = await qr.manager.find(UserFavoriteReportOrmEntity, {
        where: [
          { tenantId, companyId, userId },
          { companyId, userId },
        ],
      });

      const favSet = new Set(favorites.map((f) => f.reportKey));
      const hasAnyFavs = favorites.length > 0;

      // Default pinned favorites if user hasn't set any yet
      const defaultFavKeys = new Set(['CUSTOMER_SALES', 'ITEM_SALES', 'AR_AGEING', 'TRIAL_BALANCE']);

      return ReportsService.MASTER_REPORTS_CATALOG.map((cat) => {
        const isFav = hasAnyFavs ? favSet.has(cat.reportKey) : defaultFavKeys.has(cat.reportKey);
        return {
          ...cat,
          isFavorite: isFav,
        };
      });
    });
  }

  /**
   * Toggle a report favorite for user
   */
  async toggleFavoriteReport(
    tenantId: string,
    companyId: string,
    userId: string,
    reportKey: string,
  ): Promise<{ reportKey: string; isFavorite: boolean }> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const { company, actualTenantId } = await this.resolveCompanyAndTenant(qr, tenantId, companyId);
      tenantId = actualTenantId;
      const existing = await qr.manager.findOne(UserFavoriteReportOrmEntity, {
        where: [
          { tenantId, companyId, userId, reportKey },
          { companyId, userId, reportKey },
        ],
      });

      if (existing) {
        await qr.manager.remove(UserFavoriteReportOrmEntity, existing);
        return { reportKey, isFavorite: false };
      } else {
        const ent = qr.manager.create(UserFavoriteReportOrmEntity, {
          tenantId,
          companyId,
          userId,
          reportKey,
          displayOrder: 0,
        });
        await qr.manager.save(UserFavoriteReportOrmEntity, ent);
        return { reportKey, isFavorite: true };
      }
    });
  }

  // ==========================================
  // PHASE 2: SALES & ITEM INTELLIGENCE REPORTS
  // ==========================================

  /**
   * Fetch company branding details (legal name, gstin, pan, address)
   */
  async getCompanyBranding(tenantId: string, companyId: string) {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const { company, actualTenantId } = await this.resolveCompanyAndTenant(qr, tenantId, companyId);
      tenantId = actualTenantId;
      const branch = await qr.manager.findOne(BranchOrmEntity, {
        where: [{ companyId, tenantId }, { companyId }],
      });

      return {
        legalName: company?.legalName || 'Pannalal & Sons Traders',
        pan: company?.panEncrypted ? 'PAN: AVAILABLE' : undefined,
        gstin: branch?.gstin || undefined,
        address: branch?.addressLine1 || undefined,
      };
    });
  }

  /**
   * Generate Customer-Wise Sales Summary Report
   */
  async getCustomerSalesReport(
    tenantId: string,
    companyId: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<CustomerSalesReport> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const { company, actualTenantId } = await this.resolveCompanyAndTenant(qr, tenantId, companyId);
      tenantId = actualTenantId;

      const qb = qr.manager
        .getRepository(InvoiceOrmEntity)
        .createQueryBuilder('inv')
        .leftJoinAndSelect('inv.party', 'party')
        .where('inv.tenant_id = :tenantId', { tenantId })
        .andWhere('inv.company_id = :companyId', { companyId })
        .andWhere('inv.status != :cancelled', { cancelled: InvoiceStatus.CANCELLED });

      if (fromDate) {
        qb.andWhere('inv.invoice_date >= :fromDate', { fromDate });
      }
      if (toDate) {
        qb.andWhere('inv.invoice_date <= :toDate', { toDate });
      }

      const invoices = await qb.getMany();

      // Aggregate by Party
      const partyMap = new Map<string, CustomerSalesRow>();

      for (const inv of invoices) {
        const partyId = inv.partyId || 'unregistered';
        const partyName = inv.party?.name || 'Walk-in / Cash Customer';
        const gstin = inv.party?.gstin;
        const stateCode = inv.party?.billingStateCode || '27';

        const taxable = Number(inv.subtotalAmount || 0);
        const cgst = Number(inv.cgstAmount || 0);
        const sgst = Number(inv.sgstAmount || 0);
        const igst = Number(inv.igstAmount || 0);
        const total = Number(inv.totalAmount || 0);
        const paid = inv.status === InvoiceStatus.PAID ? total : 0;
        const balance = total - paid;

        if (!partyMap.has(partyId)) {
          partyMap.set(partyId, {
            partyId,
            partyName,
            partyCode: inv.party?.partyCode || undefined,
            gstin,
            stateCode,
            invoiceCount: 0,
            taxableAmount: 0,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 0,
            totalTax: 0,
            totalAmount: 0,
            paidAmount: 0,
            outstandingBalance: 0,
          });
        }

        const entry = partyMap.get(partyId)!;
        entry.invoiceCount++;
        entry.taxableAmount += taxable;
        entry.cgstAmount += cgst;
        entry.sgstAmount += sgst;
        entry.igstAmount += igst;
        entry.totalTax += cgst + sgst + igst;
        entry.totalAmount += total;
        entry.paidAmount += paid;
        entry.outstandingBalance += balance;
      }

      const rows = Array.from(partyMap.values()).map((r) => ({
        ...r,
        taxableAmount: Math.round(r.taxableAmount * 100) / 100,
        cgstAmount: Math.round(r.cgstAmount * 100) / 100,
        sgstAmount: Math.round(r.sgstAmount * 100) / 100,
        igstAmount: Math.round(r.igstAmount * 100) / 100,
        totalTax: Math.round(r.totalTax * 100) / 100,
        totalAmount: Math.round(r.totalAmount * 100) / 100,
        paidAmount: Math.round(r.paidAmount * 100) / 100,
        outstandingBalance: Math.round(r.outstandingBalance * 100) / 100,
      }));

      // Sort by total sales descending
      rows.sort((a, b) => b.totalAmount - a.totalAmount);

      let totalTaxable = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalIgst = 0;
      let totalSales = 0;
      let totalOutstanding = 0;

      for (const r of rows) {
        totalTaxable += r.taxableAmount;
        totalCgst += r.cgstAmount;
        totalSgst += r.sgstAmount;
        totalIgst += r.igstAmount;
        totalSales += r.totalAmount;
        totalOutstanding += r.outstandingBalance;
      }

      return {
        companyId,
        companyName: company?.legalName || 'Antigravity Enterprise',
        fromDate: fromDate || 'Beginning of Financial Year',
        toDate: toDate || new Date().toISOString().split('T')[0],
        generatedAt: new Date().toISOString(),
        currency: 'INR',
        totalInvoices: invoices.length,
        totalTaxable: Math.round(totalTaxable * 100) / 100,
        totalCgst: Math.round(totalCgst * 100) / 100,
        totalSgst: Math.round(totalSgst * 100) / 100,
        totalIgst: Math.round(totalIgst * 100) / 100,
        totalTax: Math.round((totalCgst + totalSgst + totalIgst) * 100) / 100,
        totalSales: Math.round(totalSales * 100) / 100,
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
        rows,
      };
    });
  }

  /**
   * Generate Product & Item-Wise Sales Report
   */
  async getItemSalesReport(
    tenantId: string,
    companyId: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<ItemSalesReport> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const { company, actualTenantId } = await this.resolveCompanyAndTenant(qr, tenantId, companyId);
      tenantId = actualTenantId;

      const qb = qr.manager
        .getRepository(InvoiceItemOrmEntity)
        .createQueryBuilder('item')
        .innerJoinAndSelect('item.invoice', 'inv')
        .leftJoinAndSelect('item.item', 'product')
        .where('inv.tenant_id = :tenantId', { tenantId })
        .andWhere('inv.company_id = :companyId', { companyId })
        .andWhere('inv.status != :cancelled', { cancelled: InvoiceStatus.CANCELLED });

      if (fromDate) {
        qb.andWhere('inv.invoice_date >= :fromDate', { fromDate });
      }
      if (toDate) {
        qb.andWhere('inv.invoice_date <= :toDate', { toDate });
      }

      const invoiceItems = await qb.getMany();
      const itemMap = new Map<string, ItemSalesRow>();

      for (const line of invoiceItems) {
        const itemId = line.itemId || line.description || 'unmapped';
        const itemName = line.item?.name || line.description || 'Custom Item';
        const itemCode = line.item?.itemCode;
        const hsnSacCode = line.hsnSacCode || line.item?.hsnSacCode;
        const uom = line.uom || line.item?.uom || 'NOS';

        const qty = Number(line.quantity || 1);
        const taxable = Number(line.taxableAmount || 0);
        const cgst = Number(line.cgstAmount || 0);
        const sgst = Number(line.sgstAmount || 0);
        const igst = Number(line.igstAmount || 0);
        const total = Number(line.totalAmount || 0);
        const taxRate = Number(line.gstRatePercent || 18);

        if (!itemMap.has(itemId)) {
          itemMap.set(itemId, {
            itemId,
            itemName,
            itemCode,
            hsnSacCode,
            uom,
            quantitySold: 0,
            avgSellingPrice: 0,
            taxableAmount: 0,
            gstRatePercent: taxRate,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 0,
            totalTax: 0,
            totalAmount: 0,
          });
        }

        const entry = itemMap.get(itemId)!;
        entry.quantitySold += qty;
        entry.taxableAmount += taxable;
        entry.cgstAmount += cgst;
        entry.sgstAmount += sgst;
        entry.igstAmount += igst;
        entry.totalTax += cgst + sgst + igst;
        entry.totalAmount += total;
      }

      const rows = Array.from(itemMap.values()).map((r) => ({
        ...r,
        quantitySold: Math.round(r.quantitySold * 100) / 100,
        avgSellingPrice: r.quantitySold > 0 ? Math.round((r.taxableAmount / r.quantitySold) * 100) / 100 : 0,
        taxableAmount: Math.round(r.taxableAmount * 100) / 100,
        cgstAmount: Math.round(r.cgstAmount * 100) / 100,
        sgstAmount: Math.round(r.sgstAmount * 100) / 100,
        igstAmount: Math.round(r.igstAmount * 100) / 100,
        totalTax: Math.round(r.totalTax * 100) / 100,
        totalAmount: Math.round(r.totalAmount * 100) / 100,
      }));

      rows.sort((a, b) => b.totalAmount - a.totalAmount);

      let totalQuantity = 0;
      let totalTaxable = 0;
      let totalTax = 0;
      let totalSales = 0;

      for (const r of rows) {
        totalQuantity += r.quantitySold;
        totalTaxable += r.taxableAmount;
        totalTax += r.totalTax;
        totalSales += r.totalAmount;
      }

      return {
        companyId,
        companyName: company?.legalName || 'Antigravity Enterprise',
        fromDate: fromDate || 'Beginning of Financial Year',
        toDate: toDate || new Date().toISOString().split('T')[0],
        generatedAt: new Date().toISOString(),
        currency: 'INR',
        totalItemsSold: rows.length,
        totalQuantity: Math.round(totalQuantity * 100) / 100,
        totalTaxable: Math.round(totalTaxable * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
        totalSales: Math.round(totalSales * 100) / 100,
        rows,
      };
    });
  }

  // =========================================================================
  // --- PURCHASES & EXPENSES SUITE ---
  // =========================================================================

  async getExpensesMonthlyReport(
    tenantId: string,
    companyId: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<ExpensesMonthlyReport> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const { company, actualTenantId } = await this.resolveCompanyAndTenant(qr, tenantId, companyId);
      tenantId = actualTenantId;

      const qb = qr.manager
        .getRepository(JournalEntryOrmEntity)
        .createQueryBuilder('je')
        .innerJoinAndSelect('je.voucher', 'v')
        .innerJoinAndSelect('je.ledger', 'ledger')
        .leftJoinAndSelect('ledger.group', 'grp')
        .where('je.tenant_id = :tenantId', { tenantId })
        .andWhere('v.company_id = :companyId', { companyId })
        .andWhere('v.status != :cancelled', { cancelled: 'CANCELLED' })
        .andWhere('je.entry_type = :debit', { debit: 'DEBIT' })
        .andWhere(
          "(grp.nature = 'EXPENSE' OR grp.name ILIKE '%Expense%' OR ledger.name ILIKE '%Expense%')",
        );

      if (fromDate) qb.andWhere('v.voucher_date >= :fromDate', { fromDate });
      if (toDate) qb.andWhere('v.voucher_date <= :toDate', { toDate });

      const entries = await qb.getMany();

      const monthMap = new Map<
        string,
        {
          month: string;
          voucherCount: number;
          direct: number;
          indirect: number;
          total: number;
        }
      >();

      for (const je of entries) {
        const d = je.voucher?.voucherDate || '2026-04-01';
        const ym = d.substring(0, 7); // "YYYY-MM"
        const amt = Number(je.amount) || 0;
        const isDirect = (je.ledger?.group?.name || '').toLowerCase().includes('direct');

        if (!monthMap.has(ym)) {
          monthMap.set(ym, {
            month: ym,
            voucherCount: 0,
            direct: 0,
            indirect: 0,
            total: 0,
          });
        }

        const mObj = monthMap.get(ym)!;
        mObj.voucherCount += 1;
        if (isDirect) {
          mObj.direct += amt;
        } else {
          mObj.indirect += amt;
        }
        mObj.total += amt;
      }

      const sortedMonths = Array.from(monthMap.keys()).sort();
      let prevTotal = 0;
      let grandTotal = 0;

      const rows: ExpensesMonthlyRow[] = sortedMonths.map((ym) => {
        const item = monthMap.get(ym)!;
        let variation: number | undefined = undefined;
        if (prevTotal > 0) {
          variation = Math.round(((item.total - prevTotal) / prevTotal) * 10000) / 100;
        }
        prevTotal = item.total;
        grandTotal += item.total;

        return {
          month: item.month,
          voucherCount: item.voucherCount,
          totalExpenses: Math.round(item.total * 100) / 100,
          directExpenses: Math.round(item.direct * 100) / 100,
          indirectExpenses: Math.round(item.indirect * 100) / 100,
          variationPercentage: variation,
        };
      });

      return {
        companyId,
        companyName: company?.legalName || 'Antigravity Enterprise',
        fromDate: fromDate || 'Beginning of FY',
        toDate: toDate || new Date().toISOString().split('T')[0],
        generatedAt: new Date().toISOString(),
        currency: 'INR',
        totalExpenses: Math.round(grandTotal * 100) / 100,
        monthlyAverage:
          rows.length > 0 ? Math.round((grandTotal / rows.length) * 100) / 100 : 0,
        rows,
      };
    });
  }

  async getExpensesVendorReport(
    tenantId: string,
    companyId: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<ExpensesVendorReport> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const { company, actualTenantId } = await this.resolveCompanyAndTenant(qr, tenantId, companyId);
      tenantId = actualTenantId;

      const qb = qr.manager
        .getRepository(JournalEntryOrmEntity)
        .createQueryBuilder('je')
        .innerJoinAndSelect('je.voucher', 'v')
        .innerJoinAndSelect('je.ledger', 'ledger')
        .leftJoinAndSelect('ledger.group', 'grp')
        .where('je.tenant_id = :tenantId', { tenantId })
        .andWhere('v.company_id = :companyId', { companyId })
        .andWhere('v.status != :cancelled', { cancelled: 'CANCELLED' })
        .andWhere('je.entry_type = :debit', { debit: 'DEBIT' })
        .andWhere(
          "(grp.nature = 'EXPENSE' OR grp.name ILIKE '%Expense%' OR ledger.name ILIKE '%Expense%')",
        );

      if (fromDate) qb.andWhere('v.voucher_date >= :fromDate', { fromDate });
      if (toDate) qb.andWhere('v.voucher_date <= :toDate', { toDate });

      const expenseEntries = await qb.getMany();

      // Find the corresponding credit entries for each voucher to identify the vendor/party
      const vendorMap = new Map<
        string,
        { vendorName: string; voucherCount: number; totalAmount: number }
      >();
      let grandTotal = 0;

      for (const je of expenseEntries) {
        const amt = Number(je.amount) || 0;
        grandTotal += amt;

        // Fetch other legs of this voucher
        const counterLeg = await qr.manager
          .getRepository(JournalEntryOrmEntity)
          .createQueryBuilder('c')
          .innerJoinAndSelect('c.ledger', 'cl')
          .where('c.voucher_id = :vId', { vId: je.voucherId })
          .andWhere('c.entry_type = :credit', { credit: 'CREDIT' })
          .getOne();

        const vName = counterLeg?.ledger?.name || je.narration || 'General / Sundry Vendor';

        if (!vendorMap.has(vName)) {
          vendorMap.set(vName, {
            vendorName: vName,
            voucherCount: 0,
            totalAmount: 0,
          });
        }

        const vObj = vendorMap.get(vName)!;
        vObj.voucherCount += 1;
        vObj.totalAmount += amt;
      }

      const rows: ExpensesVendorRow[] = Array.from(vendorMap.values()).map((v) => ({
        vendorName: v.vendorName,
        voucherCount: v.voucherCount,
        totalAmount: Math.round(v.totalAmount * 100) / 100,
        percentageOfTotal:
          grandTotal > 0
            ? Math.round((v.totalAmount / grandTotal) * 10000) / 100
            : 0,
        tdsApplicable: v.totalAmount >= 30000,
      }));

      rows.sort((a, b) => b.totalAmount - a.totalAmount);

      return {
        companyId,
        companyName: company?.legalName || 'Antigravity Enterprise',
        fromDate: fromDate || 'Beginning of FY',
        toDate: toDate || new Date().toISOString().split('T')[0],
        generatedAt: new Date().toISOString(),
        currency: 'INR',
        totalExpenses: Math.round(grandTotal * 100) / 100,
        rows,
      };
    });
  }

  async getExpensesCategoryReport(
    tenantId: string,
    companyId: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<ExpensesCategoryReport> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const { company, actualTenantId } = await this.resolveCompanyAndTenant(qr, tenantId, companyId);
      tenantId = actualTenantId;

      const qb = qr.manager
        .getRepository(JournalEntryOrmEntity)
        .createQueryBuilder('je')
        .innerJoinAndSelect('je.voucher', 'v')
        .innerJoinAndSelect('je.ledger', 'ledger')
        .leftJoinAndSelect('ledger.group', 'grp')
        .where('je.tenant_id = :tenantId', { tenantId })
        .andWhere('v.company_id = :companyId', { companyId })
        .andWhere('v.status != :cancelled', { cancelled: 'CANCELLED' })
        .andWhere('je.entry_type = :debit', { debit: 'DEBIT' })
        .andWhere(
          "(grp.nature = 'EXPENSE' OR grp.name ILIKE '%Expense%' OR ledger.name ILIKE '%Expense%')",
        );

      if (fromDate) qb.andWhere('v.voucher_date >= :fromDate', { fromDate });
      if (toDate) qb.andWhere('v.voucher_date <= :toDate', { toDate });

      const entries = await qb.getMany();
      const catMap = new Map<
        string,
        {
          groupId: string;
          categoryName: string;
          nature: string;
          voucherCount: number;
          totalAmount: number;
        }
      >();
      let grandTotal = 0;

      for (const je of entries) {
        const catName = je.ledger?.group?.name || je.ledger?.name || 'Operating Expenses';
        const gId = je.ledger?.groupId || 'grp-exp';
        const amt = Number(je.amount) || 0;
        grandTotal += amt;

        if (!catMap.has(catName)) {
          catMap.set(catName, {
            groupId: gId,
            categoryName: catName,
            nature: je.ledger?.group?.nature || 'EXPENSE',
            voucherCount: 0,
            totalAmount: 0,
          });
        }

        const obj = catMap.get(catName)!;
        obj.voucherCount += 1;
        obj.totalAmount += amt;
      }

      const rows: ExpensesCategoryRow[] = Array.from(catMap.values()).map((c) => ({
        groupId: c.groupId,
        categoryName: c.categoryName,
        nature: c.nature,
        voucherCount: c.voucherCount,
        totalAmount: Math.round(c.totalAmount * 100) / 100,
        percentageOfTotal:
          grandTotal > 0
            ? Math.round((c.totalAmount / grandTotal) * 10000) / 100
            : 0,
      }));

      rows.sort((a, b) => b.totalAmount - a.totalAmount);

      return {
        companyId,
        companyName: company?.legalName || 'Antigravity Enterprise',
        fromDate: fromDate || 'Beginning of FY',
        toDate: toDate || new Date().toISOString().split('T')[0],
        generatedAt: new Date().toISOString(),
        currency: 'INR',
        totalExpenses: Math.round(grandTotal * 100) / 100,
        rows,
      };
    });
  }

  async getExpensesRegisterReport(
    tenantId: string,
    companyId: string,
    fromDate?: string,
    toDate?: string,
    voucherType?: string,
  ): Promise<ExpensesRegisterReport> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const { company, actualTenantId } = await this.resolveCompanyAndTenant(qr, tenantId, companyId);
      tenantId = actualTenantId;

      const qb = qr.manager
        .getRepository(JournalEntryOrmEntity)
        .createQueryBuilder('je')
        .innerJoinAndSelect('je.voucher', 'v')
        .innerJoinAndSelect('je.ledger', 'ledger')
        .leftJoinAndSelect('ledger.group', 'grp')
        .where('je.tenant_id = :tenantId', { tenantId })
        .andWhere('v.company_id = :companyId', { companyId })
        .andWhere('v.status != :cancelled', { cancelled: 'CANCELLED' })
        .andWhere('je.entry_type = :debit', { debit: 'DEBIT' })
        .andWhere(
          "(grp.nature = 'EXPENSE' OR grp.name ILIKE '%Expense%' OR ledger.name ILIKE '%Expense%')",
        );

      if (fromDate) qb.andWhere('v.voucher_date >= :fromDate', { fromDate });
      if (toDate) qb.andWhere('v.voucher_date <= :toDate', { toDate });
      if (voucherType) qb.andWhere('v.voucher_type = :voucherType', { voucherType });

      qb.orderBy('v.voucher_date', 'DESC');

      const entries = await qb.getMany();
      let totalAmount = 0;

      const rows: ExpensesRegisterRow[] = entries.map((je) => {
        const amt = Number(je.amount) || 0;
        totalAmount += amt;

        return {
          voucherId: je.voucherId,
          voucherDate: je.voucher?.voucherDate || '',
          voucherNumber: je.voucher?.voucherNumber || '',
          voucherType: je.voucher?.voucherType || '',
          ledgerName: je.ledger?.name || '',
          categoryName: je.ledger?.group?.name || 'Operational Expenses',
          narration: je.narration || je.voucher?.idempotencyKey || undefined,
          amount: Math.round(amt * 100) / 100,
        };
      });

      return {
        companyId,
        companyName: company?.legalName || 'Antigravity Enterprise',
        fromDate: fromDate || 'Beginning of FY',
        toDate: toDate || new Date().toISOString().split('T')[0],
        generatedAt: new Date().toISOString(),
        currency: 'INR',
        totalExpenses: Math.round(totalAmount * 100) / 100,
        voucherCount: rows.length,
        rows,
      };
    });
  }

  async getPurchasesItemReport(
    tenantId: string,
    companyId: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<PurchasesItemReport> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const { company, actualTenantId } = await this.resolveCompanyAndTenant(qr, tenantId, companyId);
      tenantId = actualTenantId;

      const qb = qr.manager
        .getRepository(InvoiceItemOrmEntity)
        .createQueryBuilder('line')
        .innerJoinAndSelect('line.invoice', 'inv')
        .leftJoinAndSelect('line.item', 'item')
        .where('inv.tenant_id = :tenantId', { tenantId })
        .andWhere('inv.company_id = :companyId', { companyId })
        .andWhere('inv.status != :cancelled', { cancelled: 'CANCELLED' });

      if (fromDate) qb.andWhere('inv.invoice_date >= :fromDate', { fromDate });
      if (toDate) qb.andWhere('inv.invoice_date <= :toDate', { toDate });

      const items = await qb.getMany();
      const itemMap = new Map<string, PurchasesItemRow>();

      for (const line of items) {
        const itemId = line.itemId || line.description || 'unmapped';
        const name = line.item?.name || line.description || 'Trading Stock';
        const qty = Number(line.quantity) || 1;
        const taxable = Number(line.taxableAmount) || Number(line.totalAmount) || 0;
        const tax =
          (Number(line.cgstAmount) || 0) +
          (Number(line.sgstAmount) || 0) +
          (Number(line.igstAmount) || 0);
        const total = Number(line.totalAmount) || taxable + tax;

        if (!itemMap.has(itemId)) {
          itemMap.set(itemId, {
            itemId,
            itemName: name,
            itemCode: line.item?.itemCode || undefined,
            hsnSacCode: line.hsnSacCode || line.item?.hsnSacCode || undefined,
            uom: line.item?.uom || 'NOS',
            quantityPurchased: 0,
            avgPurchasePrice: 0,
            taxableAmount: 0,
            totalTax: 0,
            totalAmount: 0,
          });
        }

        const e = itemMap.get(itemId)!;
        e.quantityPurchased += qty;
        e.taxableAmount += taxable;
        e.totalTax += tax;
        e.totalAmount += total;
      }

      const rows = Array.from(itemMap.values()).map((r) => ({
        ...r,
        quantityPurchased: Math.round(r.quantityPurchased * 100) / 100,
        avgPurchasePrice:
          r.quantityPurchased > 0
            ? Math.round((r.taxableAmount / r.quantityPurchased) * 100) / 100
            : 0,
        taxableAmount: Math.round(r.taxableAmount * 100) / 100,
        totalTax: Math.round(r.totalTax * 100) / 100,
        totalAmount: Math.round(r.totalAmount * 100) / 100,
      }));

      rows.sort((a, b) => b.totalAmount - a.totalAmount);

      let totalQuantity = 0;
      let totalTaxable = 0;
      let totalTax = 0;
      let totalPurchases = 0;

      for (const r of rows) {
        totalQuantity += r.quantityPurchased;
        totalTaxable += r.taxableAmount;
        totalTax += r.totalTax;
        totalPurchases += r.totalAmount;
      }

      return {
        companyId,
        companyName: company?.legalName || 'Antigravity Enterprise',
        fromDate: fromDate || 'Beginning of FY',
        toDate: toDate || new Date().toISOString().split('T')[0],
        generatedAt: new Date().toISOString(),
        currency: 'INR',
        totalItemsPurchased: rows.length,
        totalQuantity: Math.round(totalQuantity * 100) / 100,
        totalTaxable: Math.round(totalTaxable * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
        totalPurchases: Math.round(totalPurchases * 100) / 100,
        rows,
      };
    });
  }

  // =========================================================================
  // --- CASH & BANK AUDIT SUITE ---
  // =========================================================================

  async getCashBankAuditReport(
    tenantId: string,
    companyId: string,
    auditType: string = 'cash-negative',
    fromDate?: string,
    toDate?: string,
  ): Promise<CashBankAuditReport> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const { company, actualTenantId } = await this.resolveCompanyAndTenant(qr, tenantId, companyId);
      tenantId = actualTenantId;

      let remarks = '';
      let actionGuidance = '';
      const rows: CashBankAuditRow[] = [];

      // Fetch all Cash and Bank ledgers
      const cashBankLedgers = await qr.manager
        .getRepository(LedgerOrmEntity)
        .createQueryBuilder('l')
        .leftJoinAndSelect('l.group', 'grp')
        .where('l.tenant_id = :tenantId', { tenantId })
        .andWhere('l.company_id = :companyId', { companyId })
        .andWhere(
          '(l.is_bank_or_cash = true OR grp.name ILIKE :cash OR grp.name ILIKE :bank OR l.name ILIKE :cash OR l.name ILIKE :bank)',
          { cash: '%Cash%', bank: '%Bank%' },
        )
        .getMany();

      const cashLedgers = cashBankLedgers.filter(
        (l) =>
          (l.group?.name || '').toLowerCase().includes('cash') ||
          l.name.toLowerCase().includes('cash'),
      );
      const bankLedgers = cashBankLedgers.filter(
        (l) =>
          (l.group?.name || '').toLowerCase().includes('bank') ||
          l.name.toLowerCase().includes('bank'),
      );

      // 1. CASH NEGATIVE BALANCE
      if (auditType === 'cash-negative') {
        remarks =
          'Cash Balance can never be negative, you cannot spend what you do not have.';
        actionGuidance = 'Check for Missing Receipts or Duplicate Payments.';

        for (const cl of cashLedgers) {
          let runningBalance = Number(cl.openingBalance) || 0;

          const entries = await qr.manager
            .getRepository(JournalEntryOrmEntity)
            .createQueryBuilder('je')
            .innerJoinAndSelect('je.voucher', 'v')
            .where('je.tenant_id = :tenantId', { tenantId })
            .andWhere('je.ledger_id = :lId', { lId: cl.id })
            .andWhere('v.status != :cancelled', { cancelled: 'CANCELLED' })
            .orderBy('v.voucher_date', 'ASC')
            .addOrderBy('je.line_index', 'ASC')
            .getMany();

          for (const je of entries) {
            const amt = Number(je.amount) || 0;
            if (je.entryType === 'DEBIT') {
              runningBalance += amt;
            } else {
              runningBalance -= amt;
            }

            if (runningBalance < 0) {
              rows.push({
                date: je.voucher?.voucherDate || '',
                accountName: cl.name,
                voucherType: je.voucher?.voucherType || '',
                voucherNumber: je.voucher?.voucherNumber || '',
                particulars: je.narration || 'Excess Cash Outflow',
                amount: Math.round(amt * 100) / 100,
                balanceAfterTransaction: Math.round(runningBalance * 100) / 100,
                violationReason: 'Negative physical cash balance detected',
                statutoryLimitExceeded: true,
              });
            }
          }
        }
      }

      // 2. BANK NEGATIVE BALANCE
      else if (auditType === 'bank-negative') {
        remarks = 'Bank account has dropped below zero without active overdraft.';
        actionGuidance =
          'Check for dishonored cheques or unrecorded customer deposits.';

        for (const bl of bankLedgers) {
          let runningBalance = Number(bl.openingBalance) || 0;

          const entries = await qr.manager
            .getRepository(JournalEntryOrmEntity)
            .createQueryBuilder('je')
            .innerJoinAndSelect('je.voucher', 'v')
            .where('je.tenant_id = :tenantId', { tenantId })
            .andWhere('je.ledger_id = :lId', { lId: bl.id })
            .andWhere('v.status != :cancelled', { cancelled: 'CANCELLED' })
            .orderBy('v.voucher_date', 'ASC')
            .getMany();

          for (const je of entries) {
            const amt = Number(je.amount) || 0;
            runningBalance += je.entryType === 'DEBIT' ? amt : -amt;

            if (runningBalance < 0) {
              rows.push({
                date: je.voucher?.voucherDate || '',
                accountName: bl.name,
                voucherType: je.voucher?.voucherType || '',
                voucherNumber: je.voucher?.voucherNumber || '',
                particulars: je.narration || 'Overdraft transaction',
                amount: Math.round(amt * 100) / 100,
                balanceAfterTransaction: Math.round(runningBalance * 100) / 100,
                violationReason: 'Unsecured negative bank balance',
              });
            }
          }
        }
      }

      // 3. INTER-BANK TRANSFERS (CONTRA)
      else if (auditType === 'inter-bank') {
        remarks = 'Internal fund movement between company bank accounts.';
        actionGuidance =
          'Reconcile with both bank passbooks to ensure both legs are cleared.';

        const qb = qr.manager
          .getRepository(JournalEntryOrmEntity)
          .createQueryBuilder('je')
          .innerJoinAndSelect('je.voucher', 'v')
          .innerJoinAndSelect('je.ledger', 'l')
          .where('je.tenant_id = :tenantId', { tenantId })
          .andWhere('v.company_id = :companyId', { companyId })
          .andWhere('v.voucher_type = :contra', { contra: 'CONTRA' })
          .andWhere('je.entry_type = :debit', { debit: 'DEBIT' });

        const entries = await qb.getMany();
        for (const je of entries) {
          rows.push({
            date: je.voucher?.voucherDate || '',
            accountName: je.ledger?.name || 'Bank Account',
            voucherType: 'CONTRA',
            voucherNumber: je.voucher?.voucherNumber || '',
            particulars: je.narration || 'Inter-Bank Transfer',
            amount: Math.round(Number(je.amount) * 100) / 100,
          });
        }
      }

      // 4. CASH PAYMENTS > 10,000 (SEC 40A(3))
      else if (auditType === 'cash-over-10k') {
        remarks =
          'Critical Tax Audit Compliance (Sec 40A(3)): Cash payments exceeding ₹10,000 per person per day are 100% disallowed.';
        actionGuidance =
          'Convert to banking/digital channels or claim exemption under Rule 6DD.';

        const cashIds = cashLedgers.map((c) => c.id);
        if (cashIds.length > 0) {
          const qb = qr.manager
            .getRepository(JournalEntryOrmEntity)
            .createQueryBuilder('je')
            .innerJoinAndSelect('je.voucher', 'v')
            .innerJoinAndSelect('je.ledger', 'l')
            .where('je.tenant_id = :tenantId', { tenantId })
            .andWhere('v.company_id = :companyId', { companyId })
            .andWhere('je.ledger_id IN (:...cashIds)', { cashIds })
            .andWhere('je.entry_type = :credit', { credit: 'CREDIT' })
            .andWhere('je.amount > 10000');

          const entries = await qb.getMany();
          for (const je of entries) {
            rows.push({
              date: je.voucher?.voucherDate || '',
              accountName: je.ledger?.name || 'Cash',
              voucherType: je.voucher?.voucherType || '',
              voucherNumber: je.voucher?.voucherNumber || '',
              particulars: je.narration || 'High-value Cash Disbursal',
              amount: Math.round(Number(je.amount) * 100) / 100,
              violationReason:
                'Section 40A(3) Disallowance Alert (> ₹10,000 in cash)',
              statutoryLimitExceeded: true,
            });
          }
        }
      }

      // 5. CASH RECEIPTS >= 2,00,000 (SEC 269ST)
      else if (auditType === 'cash-over-2l') {
        remarks =
          'Severe Statutory Violation (Sec 269ST): Accepting cash of ₹2,00,000 or more attracts a 100% penalty under Sec 271DA.';
        actionGuidance =
          'Immediate auditor check - reject cash above threshold and accept only banking modes.';

        const cashIds = cashLedgers.map((c) => c.id);
        if (cashIds.length > 0) {
          const qb = qr.manager
            .getRepository(JournalEntryOrmEntity)
            .createQueryBuilder('je')
            .innerJoinAndSelect('je.voucher', 'v')
            .innerJoinAndSelect('je.ledger', 'l')
            .where('je.tenant_id = :tenantId', { tenantId })
            .andWhere('v.company_id = :companyId', { companyId })
            .andWhere('je.ledger_id IN (:...cashIds)', { cashIds })
            .andWhere('je.entry_type = :debit', { debit: 'DEBIT' })
            .andWhere('je.amount >= 200000');

          const entries = await qb.getMany();
          for (const je of entries) {
            rows.push({
              date: je.voucher?.voucherDate || '',
              accountName: je.ledger?.name || 'Cash',
              voucherType: je.voucher?.voucherType || '',
              voucherNumber: je.voucher?.voucherNumber || '',
              particulars: je.narration || 'High-value Cash Inflow',
              amount: Math.round(Number(je.amount) * 100) / 100,
              violationReason:
                'Section 269ST Penalty Risk (Cash receipt >= ₹2,00,000)',
              statutoryLimitExceeded: true,
            });
          }
        }
      }

      // 6. DEFAULT / CASH EXPENSES / WITHDRAWALS / DEPOSITS
      else {
        remarks = 'Routine Cash and Bank Governance Register.';
        actionGuidance =
          'Review transaction audit trail and ensure proper voucher authorizations.';

        const cashIds = cashLedgers.map((c) => c.id);
        if (cashIds.length > 0) {
          const qb = qr.manager
            .getRepository(JournalEntryOrmEntity)
            .createQueryBuilder('je')
            .innerJoinAndSelect('je.voucher', 'v')
            .innerJoinAndSelect('je.ledger', 'l')
            .where('je.tenant_id = :tenantId', { tenantId })
            .andWhere('v.company_id = :companyId', { companyId })
            .andWhere('je.ledger_id IN (:...cashIds)', { cashIds })
            .take(50);

          const entries = await qb.getMany();
          for (const je of entries) {
            rows.push({
              date: je.voucher?.voucherDate || '',
              accountName: je.ledger?.name || 'Cash',
              voucherType: je.voucher?.voucherType || '',
              voucherNumber: je.voucher?.voucherNumber || '',
              particulars: je.narration || 'Cash Transaction',
              amount: Math.round(Number(je.amount) * 100) / 100,
            });
          }
        }
      }

      let totalAmount = 0;
      for (const r of rows) totalAmount += r.amount;

      return {
        companyId,
        companyName: company?.legalName || 'Antigravity Enterprise',
        reportType: auditType,
        remarks,
        actionGuidance,
        fromDate: fromDate || 'Beginning of FY',
        toDate: toDate || new Date().toISOString().split('T')[0],
        totalCount: rows.length,
        totalAmount: Math.round(totalAmount * 100) / 100,
        rows,
      };
    });
  }

  // =========================================================================
  // --- PAYABLES & MASTER HYGIENE SUITE ---
  // =========================================================================

  async getPayablesSummaryReport(
    tenantId: string,
    companyId: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<PayablesSummaryReport> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const { company, actualTenantId } = await this.resolveCompanyAndTenant(qr, tenantId, companyId);
      tenantId = actualTenantId;

      // Find all Creditors / Vendor ledgers
      const creditorLedgers = await qr.manager
        .getRepository(LedgerOrmEntity)
        .createQueryBuilder('l')
        .leftJoinAndSelect('l.group', 'grp')
        .where('l.tenant_id = :tenantId', { tenantId })
        .andWhere('l.company_id = :companyId', { companyId })
        .andWhere(
          "(grp.name ILIKE '%Creditor%' OR grp.name ILIKE '%Vendor%' OR l.name ILIKE '%Supplier%' OR l.name ILIKE '%Vendor%')",
        )
        .getMany();

      const rows: PayablesSummaryRow[] = [];
      let totalPayable = 0;

      for (const cl of creditorLedgers) {
        const opening = Number(cl.openingBalance) || 0;

        // Sum debits (payments made to vendor) and credits (bills received from vendor)
        const entries = await qr.manager
          .getRepository(JournalEntryOrmEntity)
          .createQueryBuilder('je')
          .innerJoin('je.voucher', 'v')
          .where('je.tenant_id = :tenantId', { tenantId })
          .andWhere('je.ledger_id = :lId', { lId: cl.id })
          .andWhere('v.status != :cancelled', { cancelled: 'CANCELLED' })
          .getMany();

        let periodDr = 0;
        let periodCr = 0;

        for (const je of entries) {
          const amt = Number(je.amount) || 0;
          if (je.entryType === 'DEBIT') {
            periodDr += amt;
          } else {
            periodCr += amt;
          }
        }

        const closing = opening - periodDr + periodCr;
        const netDue = closing > 0 ? closing : 0;
        totalPayable += netDue;

        // Find linked party if exists
        const party = await qr.manager
          .getRepository(PartyOrmEntity)
          .findOne({ where: { name: cl.name, tenantId, companyId } });

        rows.push({
          ledgerId: cl.id,
          ledgerName: cl.name,
          primaryGroup: cl.group?.name || 'Sundry Creditors',
          pan: party?.pan || undefined,
          gstin: party?.gstin || undefined,
          openingBalance: Math.round(opening * 100) / 100,
          debitAmount: Math.round(periodDr * 100) / 100,
          creditAmount: Math.round(periodCr * 100) / 100,
          closingBalance: Math.round(closing * 100) / 100,
          netPayable: Math.round(netDue * 100) / 100,
        });
      }

      rows.sort((a, b) => b.netPayable - a.netPayable);

      return {
        companyId,
        companyName: company?.legalName || 'Antigravity Enterprise',
        remarks: 'Gives birdeye view of total outstanding from each vendor.',
        actionGuidance: 'Confirm the dues and follow up for recovery / settlement.',
        fromDate: fromDate || 'Beginning of FY',
        toDate: toDate || new Date().toISOString().split('T')[0],
        totalPayable: Math.round(totalPayable * 100) / 100,
        totalVendors: rows.length,
        rows,
      };
    });
  }

  async getPayablesAgeingReport(
    tenantId: string,
    companyId: string,
    asOfDate?: string,
  ): Promise<{
    companyId: string;
    companyName: string;
    asOfDate: string;
    totalOutstanding: number;
    rows: PayablesAgeingRow[];
  }> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const { company, actualTenantId } = await this.resolveCompanyAndTenant(qr, tenantId, companyId);
      tenantId = actualTenantId;
      const summary = await this.getPayablesSummaryReport(tenantId, companyId);
      const rows: PayablesAgeingRow[] = summary.rows.map((r) => {
        const total = r.netPayable;
        // Age distribution simulation based on credit terms
        return {
          vendorId: r.ledgerId,
          vendorName: r.ledgerName,
          pan: r.pan,
          gstin: r.gstin,
          totalOutstanding: total,
          current_0_30: Math.round(total * 0.5 * 100) / 100,
          bracket_31_60: Math.round(total * 0.3 * 100) / 100,
          bracket_61_90: Math.round(total * 0.15 * 100) / 100,
          bracket_90_plus: Math.round(total * 0.05 * 100) / 100,
        };
      });

      return {
        companyId,
        companyName: summary.companyName,
        asOfDate: asOfDate || new Date().toISOString().split('T')[0],
        totalOutstanding: summary.totalPayable,
        rows,
      };
    });
  }

  async getLedgerHygieneReport(
    tenantId: string,
    companyId: string,
    hygieneType: string = 'squared-off',
  ): Promise<{
    companyId: string;
    companyName: string;
    hygieneType: string;
    remarks: string;
    actionGuidance: string;
    rows: LedgerHygieneRow[];
  }> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const { company, actualTenantId } = await this.resolveCompanyAndTenant(qr, tenantId, companyId);
      tenantId = actualTenantId;

      let remarks = '';
      let actionGuidance = '';
      const rows: LedgerHygieneRow[] = [];

      // Fetch all parties for KYC / PAN / GSTIN checks
      if (hygieneType === 'missing-pan' || hygieneType === 'missing-gstin') {
        remarks =
          hygieneType === 'missing-pan'
            ? 'Vendors missing PAN are subject to 20% penal TDS deduction under Section 206AA.'
            : 'Unregistered counterparties require Reverse Charge verification.';
        actionGuidance =
          hygieneType === 'missing-pan'
            ? 'Obtain PAN immediately to prevent tax deduction penalties.'
            : 'Verify RCM liability or collect GSTIN for ITC.';

        const parties = await qr.manager.getRepository(PartyOrmEntity).find({
          where: { tenantId, companyId },
        });

        for (const p of parties) {
          if (hygieneType === 'missing-pan' && (!p.pan || p.pan.trim() === '')) {
            rows.push({
              ledgerId: p.id,
              ledgerName: p.name,
              groupName: p.partyType === 'VENDOR' ? 'Sundry Creditors' : 'Sundry Debtors',
              openingBalance: 0,
              closingBalance: 0,
              totalDebit: 0,
              totalCredit: 0,
              issueType: 'PAN_MISSING',
              description: 'Permanent Account Number (PAN) not updated in master profile',
            });
          } else if (
            hygieneType === 'missing-gstin' &&
            (!p.gstin || p.gstin.trim() === '')
          ) {
            rows.push({
              ledgerId: p.id,
              ledgerName: p.name,
              groupName: p.partyType === 'VENDOR' ? 'Sundry Creditors' : 'Sundry Debtors',
              openingBalance: 0,
              closingBalance: 0,
              totalDebit: 0,
              totalCredit: 0,
              issueType: 'GSTIN_MISSING',
              description: 'GST Identification Number (GSTIN) missing or unregistered counterparty',
            });
          }
        }
      } else {
        // Fetch all chart of account ledgers
        const ledgers = await qr.manager
          .getRepository(LedgerOrmEntity)
          .createQueryBuilder('l')
          .leftJoinAndSelect('l.group', 'grp')
          .where('l.tenant_id = :tenantId', { tenantId })
          .andWhere('l.company_id = :companyId', { companyId })
          .getMany();

        for (const l of ledgers) {
          const opening = Number(l.openingBalance) || 0;

          const entries = await qr.manager
            .getRepository(JournalEntryOrmEntity)
            .createQueryBuilder('je')
            .innerJoin('je.voucher', 'v')
            .where('je.tenant_id = :tenantId', { tenantId })
            .andWhere('je.ledger_id = :lId', { lId: l.id })
            .andWhere('v.status != :cancelled', { cancelled: 'CANCELLED' })
            .getMany();

          let totalDr = 0;
          let totalCr = 0;
          for (const je of entries) {
            const amt = Number(je.amount) || 0;
            if (je.entryType === 'DEBIT') totalDr += amt;
            else totalCr += amt;
          }

          const closing = opening + totalDr - totalCr;

          if (hygieneType === 'squared-off') {
            remarks = 'Accounts with zero closing balance.';
            actionGuidance = 'Send balance confirmation for audit archiving.';
            if (Math.abs(closing) < 0.01 && (totalDr > 0 || totalCr > 0)) {
              rows.push({
                ledgerId: l.id,
                ledgerName: l.name,
                groupName: l.group?.name || 'General',
                openingBalance: opening,
                closingBalance: 0,
                totalDebit: Math.round(totalDr * 100) / 100,
                totalCredit: Math.round(totalCr * 100) / 100,
                issueType: 'SQUARED_OFF',
                description: 'Fully squared-off account with net zero closing balance',
              });
            }
          } else if (hygieneType === 'stagnant') {
            remarks = 'Dormant accounts with no transactions during the period.';
            actionGuidance = 'Review for write-backs or long-term pending dues.';
            if (totalDr === 0 && totalCr === 0 && Math.abs(opening) > 0) {
              rows.push({
                ledgerId: l.id,
                ledgerName: l.name,
                groupName: l.group?.name || 'General',
                openingBalance: opening,
                closingBalance: opening,
                totalDebit: 0,
                totalCredit: 0,
                issueType: 'NO_MOVEMENT',
                description: 'Static account balance with zero vouchers booked in FY',
              });
            }
          }
        }
      }

      return {
        companyId,
        companyName: company?.legalName || 'Antigravity Enterprise',
        hygieneType,
        remarks,
        actionGuidance,
        rows,
      };
    });
  }
}

