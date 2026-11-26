'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, ShieldCheck, AlertTriangle } from 'lucide-react';
import { ReportPage, MoneyText } from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';

export default function TrialBalancePage() {
  const { activeCompanyId } = useCompany();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [compareMode, setCompareMode] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getTrialBalance(activeCompanyId, asOfDate);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to generate Trial Balance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [asOfDate, activeCompanyId]);

  const dateControls = (
    <div className="flex items-center gap-2 rounded-lg border border-default bg-surface px-3 py-1.5 text-xs">
      <Calendar className="h-3.5 w-3.5 text-muted" />
      <span className="text-muted font-medium">As of:</span>
      <input
        type="date"
        aria-label="As of date"
        value={asOfDate}
        onChange={(e) => setAsOfDate(e.target.value)}
        className="bg-transparent font-medium text-primary focus:outline-none"
      />
    </div>
  );

  const rows: any[] = data?.rows || [];
  const totalDebit = Number(data?.totalDebit || 0);
  const totalCredit = Number(data?.totalCredit || 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const summary = data && (
    <div className="rounded-xl border border-default bg-surface p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${
          isBalanced
            ? 'bg-status-success-subtle text-status-success-text border-status-success'
            : 'bg-status-danger-subtle text-status-danger-text border-status-danger'
        }`}
      >
        {isBalanced ? (
          <>
            <ShieldCheck className="h-4 w-4" />
            Balanced: Debits = Credits (Δ ₹0.00)
          </>
        ) : (
          <>
            <AlertTriangle className="h-4 w-4" />
            Out of Balance: Δ ₹{Math.abs(totalDebit - totalCredit).toFixed(2)}
          </>
        )}
      </span>

      <div className="flex items-center gap-6">
        <div>
          <span className="text-overline uppercase text-muted block">Total Debit</span>
          <MoneyText amount={totalDebit} className="text-lg font-bold text-primary" />
        </div>
        <div>
          <span className="text-overline uppercase text-muted block">Total Credit</span>
          <MoneyText amount={totalCredit} className="text-lg font-bold text-primary" />
        </div>
      </div>
    </div>
  );

  return (
    <ReportPage
      title="Trial Balance"
      description="Ledger-level debit and credit summary with General Ledger drill-down."
      dateControls={dateControls}
      compareMode={compareMode}
      onToggleCompare={() => setCompareMode((v) => !v)}
      onPrintPdf={() => window.print()}
      loading={loading}
      error={error}
      onRetry={loadData}
      isEmpty={!loading && rows.length === 0}
      summary={summary}
    >
      <div className="rounded-xl border border-default bg-surface shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-sunken border-b border-default sticky top-0 z-10">
              <tr className="text-overline uppercase text-muted">
                <th className="py-3 px-4">Ledger Account</th>
                <th className="py-3 px-4">Group</th>
                <th className="py-3 px-4 text-right">Debit (₹)</th>
                <th className="py-3 px-4 text-right">Credit (₹)</th>
                {compareMode && <th className="py-3 px-4 text-right">Net Δ</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle text-xs">
              {rows.map((r) => (
                <tr key={r.ledgerId} className="hover:bg-row-hover transition-colors">
                  <td className="py-2.5 px-4">
                    <Link
                      href={`/reports/general-ledger?ledgerId=${encodeURIComponent(r.ledgerId)}`}
                      className="font-semibold text-brand-text hover:underline"
                    >
                      {r.ledgerName}
                    </Link>
                    <span className="ml-2 font-mono text-[11px] text-muted">{r.ledgerCode}</span>
                  </td>
                  <td className="py-2.5 px-4 text-secondary">{r.groupName}</td>
                  <td className="py-2.5 px-4 text-right">
                    <MoneyText amount={Number(r.closingDebit || 0)} className="text-primary" />
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <MoneyText amount={Number(r.closingCredit || 0)} className="text-primary" />
                  </td>
                  {compareMode && (
                    <td className="py-2.5 px-4 text-right">
                      <MoneyText
                        amount={Number(r.closingDebit || 0) - Number(r.closingCredit || 0)}
                        colorCode="dr-cr"
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-surface-sunken border-t border-default font-bold text-xs">
              <tr>
                <td colSpan={2} className="py-3 px-4 uppercase text-primary">
                  Total
                </td>
                <td className="py-3 px-4 text-right">
                  <MoneyText amount={totalDebit} className="text-primary" />
                </td>
                <td className="py-3 px-4 text-right">
                  <MoneyText amount={totalCredit} className="text-primary" />
                </td>
                {compareMode && <td className="py-3 px-4 text-right text-muted">—</td>}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </ReportPage>
  );
}
