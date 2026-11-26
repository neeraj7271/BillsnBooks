'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Scale,
  ShieldCheck,
  AlertTriangle,
  Download,
  Printer,
  Calendar,
  Filter,
  ArrowUpRight,
  ChevronDown,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { BackButton } from '@/components/back-button';

export default function TrialBalancePage() {
  const { activeCompanyId } = useCompany();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedNature, setSelectedNature] = useState<string>('ALL');

  const loadTrialBalance = async () => {
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
    loadTrialBalance();
  }, [asOfDate, activeCompanyId]);

  const rows = data?.rows || [];
  const filteredRows = rows.filter(
    (r: any) => selectedNature === 'ALL' || r.nature === selectedNature,
  );

  const handleExportCSV = () => {
    if (!data) return;
    const headers = ['Account Code', 'Ledger Name', 'Group', 'Nature', 'Opening Dr', 'Opening Cr', 'Period Dr', 'Period Cr', 'Closing Dr', 'Closing Cr'];
    const csvRows = [headers.join(',')];

    for (const r of rows) {
      csvRows.push([
        `"${r.ledgerCode}"`,
        `"${r.ledgerName}"`,
        `"${r.groupName}"`,
        `"${r.nature}"`,
        r.openingDebit.toFixed(2),
        r.openingCredit.toFixed(2),
        r.periodDebit.toFixed(2),
        r.periodCredit.toFixed(2),
        r.closingDebit.toFixed(2),
        r.closingCredit.toFixed(2),
      ].join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trial_balance_${asOfDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border border-strong pb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <BackButton fallbackUrl="/reports" label="Back" />
            <div className="p-2 rounded-xl bg-brand-subtle bg-brand/80 text-brand-text text-brand border border-focus border-focus">
              <Scale className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-primary dark:text-white">
              Trial Balance Statement
            </h1>
            <span className="rounded bg-brand-subtle bg-brand px-2 py-0.5 text-[10px] font-bold text-brand-text text-brand border border-focus border-focus">
              Double-Entry Invariant
            </span>
          </div>
          <p className="text-sm text-muted text-muted">
            Real-time mathematical validation: Sum(Debits) = Sum(Credits) across all general ledger accounts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border border-strong bg-white bg-surface px-3 py-1.5 text-xs">
            <Calendar className="h-4 w-4 text-muted" />
            <span className="text-muted font-medium">As of:</span>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="bg-transparent font-semibold text-primary dark:text-white focus:outline-hidden"
            />
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-xl border border border-strong bg-white bg-surface px-4 py-2 text-xs font-semibold text-secondary text-muted hover:bg-canvas hover:bg-surface-raised shadow-xs transition"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-status-danger border-status-danger bg-status-danger-subtle bg-status-danger p-4 text-xs font-semibold text-status-danger-text text-status-danger-text flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-status-danger-text" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Balance Banner */}
      {data && (
        <div className="rounded-2xl border border border-strong bg-white bg-surface p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-subtle border-strong pb-4">
            <div>
              <span className="text-xs uppercase font-bold text-muted">Statement Integrity Status</span>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${
                    data.isBalanced
                      ? 'bg-status-success-subtle text-status-success-text border-status-success bg-status-success text-status-success-text border-status-success'
                      : 'bg-status-danger-subtle text-status-danger-text border-status-danger bg-status-danger text-status-danger-text border-status-danger'
                  }`}
                >
                  {data.isBalanced ? (
                    <>
                      <ShieldCheck className="h-4 w-4 text-status-success-text" />
                      Strict Parity Enforced: ₹0.00 Variance
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-status-danger-text" />
                      ₹{data.netDifference.toLocaleString('en-IN')} Out of Balance!
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(['ALL', 'ASSET', 'LIABILITY', 'INCOME', 'EXPENSE'] as const).map((nat) => (
                <button
                  key={nat}
                  type="button"
                  onClick={() => setSelectedNature(nat)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                    selectedNature === nat
                      ? 'bg-brand text-white shadow-xs'
                      : 'bg-surface-sunken text-secondary bg-surface-raised text-muted'
                  }`}
                >
                  {nat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
            <div className="rounded-xl bg-canvas bg-surface-raised p-4 border border border-strong">
              <span className="text-[11px] font-semibold text-muted uppercase">Total Closing Debits</span>
              <p className="text-xl font-black font-mono text-primary dark:text-white mt-1">
                ₹{Number(data.totalClosingDebit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="rounded-xl bg-canvas bg-surface-raised p-4 border border border-strong">
              <span className="text-[11px] font-semibold text-muted uppercase">Total Closing Credits</span>
              <p className="text-xl font-black font-mono text-primary dark:text-white mt-1">
                ₹{Number(data.totalClosingCredit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="rounded-xl bg-canvas bg-surface-raised p-4 border border border-strong">
              <span className="text-[11px] font-semibold text-muted uppercase">Period Debits</span>
              <p className="text-xl font-black font-mono text-brand-text text-brand mt-1">
                ₹{Number(data.totalPeriodDebit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="rounded-xl bg-canvas bg-surface-raised p-4 border border border-strong">
              <span className="text-[11px] font-semibold text-muted uppercase">Period Credits</span>
              <p className="text-xl font-black font-mono text-brand-text text-brand mt-1">
                ₹{Number(data.totalPeriodCredit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Trial Balance Statement Table */}
      <div className="rounded-2xl border border border-strong bg-white bg-surface shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border border-strong bg-canvas bg-surface-raised font-semibold text-secondary text-muted">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Ledger Name</th>
                <th className="py-3 px-4">Group</th>
                <th className="py-3 px-4">Nature</th>
                <th className="py-3 px-4 text-right">Opening Dr (₹)</th>
                <th className="py-3 px-4 text-right">Opening Cr (₹)</th>
                <th className="py-3 px-4 text-right">Period Dr (₹)</th>
                <th className="py-3 px-4 text-right">Period Cr (₹)</th>
                <th className="py-3 px-4 text-right">Closing Dr (₹)</th>
                <th className="py-3 px-4 text-right">Closing Cr (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle divide-strong">
              {filteredRows.map((r: any) => (
                <tr
                  key={r.ledgerId}
                  className="hover:bg-canvas hover:bg-surface-raised transition-colors"
                >
                  <td className="py-3 px-4 font-mono font-bold text-brand-text text-brand">
                    {r.ledgerCode}
                  </td>
                  <td className="py-3 px-4 font-bold text-primary text-primary-inverse text-sm">
                    <Link
                      href={`/reports/general-ledger?ledgerId=${r.ledgerId}`}
                      className="hover:text-brand-text hover:underline inline-flex items-center gap-1.5 group/link"
                      title="Drill down to General Ledger Account Statement"
                    >
                      <span>{r.ledgerName}</span>
                      <ArrowUpRight className="h-3 w-3 text-muted group-hover/link:text-brand-text transition-colors" />
                    </Link>
                  </td>
                  <td className="py-3 px-4 font-semibold text-secondary text-muted">
                    {r.groupName}
                  </td>
                  <td className="py-3 px-4">
                    <span className="rounded bg-surface-sunken bg-surface-raised px-2 py-0.5 text-[10px] font-bold text-secondary text-muted">
                      {r.nature}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-muted">
                    {r.openingDebit > 0 ? r.openingDebit.toFixed(2) : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-muted">
                    {r.openingCredit > 0 ? r.openingCredit.toFixed(2) : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-secondary text-muted">
                    {r.periodDebit > 0 ? r.periodDebit.toFixed(2) : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-secondary text-muted">
                    {r.periodCredit > 0 ? r.periodCredit.toFixed(2) : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black text-primary dark:text-white">
                    {r.closingDebit > 0 ? `₹${r.closingDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black text-primary dark:text-white">
                    {r.closingCredit > 0 ? `₹${r.closingCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            {data && (
              <tfoot>
                <tr className="border-t-2 border border-strong bg-surface-sunken/80 bg-surface-raised font-black text-xs text-primary dark:text-white">
                  <td colSpan={4} className="py-3.5 px-4 uppercase tracking-wider text-right">
                    Grand Total
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">
                    ₹{data.totalOpeningDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">
                    ₹{data.totalOpeningCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">
                    ₹{data.totalPeriodDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">
                    ₹{data.totalPeriodCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-status-success-text text-status-success-text">
                    ₹{data.totalClosingDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-status-success-text text-status-success-text">
                    ₹{data.totalClosingCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
