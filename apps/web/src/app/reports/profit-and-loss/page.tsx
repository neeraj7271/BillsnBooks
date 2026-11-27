'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { ReportPage, MoneyText, DateRangePicker } from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { downloadReportExport } from '@/lib/report-export';

export default function ProfitAndLossPage() {
  const { activeCompanyId } = useCompany();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<string>('2024-04-01');
  const [toDate, setToDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [compareMode, setCompareMode] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getProfitAndLoss(activeCompanyId, fromDate, toDate);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to generate Profit & Loss statement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [fromDate, toDate, activeCompanyId]);

  const dateControls = (
    <DateRangePicker
      from={fromDate}
      to={toDate}
      onChange={({ from: f, to: t }) => {
        setFromDate(f);
        setToDate(t);
      }}
      size="sm"
    />
  );

  const summary = data && (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="rounded-xl border border-default bg-surface p-4 shadow-xs">
        <span className="text-overline uppercase text-muted">Operating Revenue</span>
        <div className="text-h2 text-primary mt-1">
          <MoneyText amount={Number(data.totalRevenue || 0)} />
        </div>
        <span className="text-caption text-status-success-text">Income accounts</span>
      </div>
      <div className="rounded-xl border border-default bg-surface p-4 shadow-xs">
        <span className="text-overline uppercase text-muted">Direct Expenses</span>
        <div className="text-h2 text-primary mt-1">
          <MoneyText amount={Number(data.totalDirectExpenses || 0)} />
        </div>
        <span className="text-caption text-muted">Cost of goods &amp; services</span>
      </div>
      <div className="rounded-xl border border-default bg-surface p-4 shadow-xs">
        <span className="text-overline uppercase text-muted">Gross Profit</span>
        <div className="text-h2 text-brand-text mt-1">
          <MoneyText amount={Number(data.grossProfit || 0)} />
        </div>
        <span className="text-caption text-muted">Revenue - Direct Costs</span>
      </div>
      <div className="rounded-xl border border-default bg-surface p-4 shadow-xs">
        <span className="text-overline uppercase text-muted">Net Profit</span>
        <div
          className={`text-h2 mt-1 ${
            data.netProfit >= 0 ? 'text-status-success-text' : 'text-status-danger-text'
          }`}
        >
          <MoneyText amount={Number(data.netProfit || 0)} negative={data.netProfit < 0} />
        </div>
        <span className="text-caption text-muted">Transferred to Equity</span>
      </div>
    </div>
  );

  return (
    <ReportPage
      title="Statement of Profit & Loss"
      description="Operating revenue, direct costs of sales, indirect overheads, and net operating income (Schedule III)."
      dateControls={dateControls}
      compareMode={compareMode}
      onToggleCompare={() => setCompareMode((v) => !v)}
      onExportExcel={() => downloadReportExport(activeCompanyId, 'PROFIT_LOSS', 'xlsx', { fromDate, toDate, fileBase: 'Profit_and_Loss' })}
      onPrintPdf={() => downloadReportExport(activeCompanyId, 'PROFIT_LOSS', 'pdf', { fromDate, toDate, fileBase: 'Profit_and_Loss' })}
      loading={loading}
      error={error}
      onRetry={loadData}
      isEmpty={!loading && !data}
      summary={summary}
    >
      {data && (
        <div className="rounded-xl border border-default bg-surface shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-default bg-surface-raised flex items-center justify-between">
            <h2 className="text-sm font-semibold text-primary">Revenue and Expense Breakdown</h2>
            <span className="text-caption text-muted">Click any ledger to inspect General Ledger</span>
          </div>

          <div className="divide-y divide-border-subtle">
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-primary">
                  I. Revenue from Operations
                </span>
                <MoneyText amount={Number(data.totalRevenue || 0)} className="text-sm font-bold text-primary" />
              </div>
              <div className="pl-4 space-y-1.5">
                {(data.incomeRows || []).map((r: any) => (
                  <div key={r.ledgerId} className="flex items-center justify-between text-xs text-secondary hover:bg-row-hover rounded px-2 py-1 -mx-2">
                    <Link
                      href={`/reports/general-ledger?ledgerId=${encodeURIComponent(r.ledgerId)}`}
                      className="hover:text-brand-text hover:underline"
                    >
                      {r.ledgerName} ({r.ledgerCode})
                    </Link>
                    <MoneyText amount={Number(r.periodCredit - r.periodDebit)} />
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-primary">
                II. Cost of Sales &amp; Direct Expenses
              </span>
              <MoneyText amount={Number(data.totalDirectExpenses || 0)} className="text-sm font-bold text-primary" />
            </div>

            <div className="px-5 py-3.5 bg-brand-subtle flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-brand-text">
                III. Gross Profit (I - II)
              </span>
              <MoneyText amount={Number(data.grossProfit || 0)} className="text-base font-bold text-brand-text" />
            </div>

            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-primary">
                  IV. Indirect &amp; Administrative Overheads
                </span>
                <MoneyText amount={Number(data.totalIndirectExpenses || 0)} className="text-sm font-bold text-primary" />
              </div>
              <div className="pl-4 space-y-1.5">
                {(data.expenseRows || []).map((r: any) => (
                  <div key={r.ledgerId} className="flex items-center justify-between text-xs text-secondary hover:bg-row-hover rounded px-2 py-1 -mx-2">
                    <Link
                      href={`/reports/general-ledger?ledgerId=${encodeURIComponent(r.ledgerId)}`}
                      className="hover:text-brand-text hover:underline"
                    >
                      {r.ledgerName} ({r.ledgerCode})
                    </Link>
                    <MoneyText amount={Number(r.periodDebit - r.periodCredit)} />
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 bg-status-success-subtle flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wide text-status-success-text block">
                  V. Net Profit / Loss for the Period
                </span>
                <span className="text-caption text-status-success-text">
                  Ready for Income Tax Computation and Year-End Capital Adjustment
                </span>
              </div>
              <MoneyText
                amount={Number(data.netProfit || 0)}
                negative={data.netProfit < 0}
                className="text-xl font-bold text-status-success-text"
              />
            </div>
          </div>
        </div>
      )}
    </ReportPage>
  );
}
