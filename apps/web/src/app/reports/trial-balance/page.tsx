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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <BackButton fallbackUrl="/reports" label="Back" />
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
              <Scale className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Trial Balance Statement
            </h1>
            <span className="rounded bg-blue-100 dark:bg-blue-950 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              Double-Entry Invariant
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time mathematical validation: Sum(Debits) = Sum(Credits) across all general ledger accounts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="text-slate-500 font-medium">As of:</span>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Balance Banner */}
      {data && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <span className="text-xs uppercase font-bold text-slate-400">Statement Integrity Status</span>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${
                    data.isBalanced
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800'
                      : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800'
                  }`}
                >
                  {data.isBalanced ? (
                    <>
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      Strict Parity Enforced: ₹0.00 Variance
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
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
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {nat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-200/60 dark:border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Closing Debits</span>
              <p className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                ₹{Number(data.totalClosingDebit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-200/60 dark:border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Closing Credits</span>
              <p className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                ₹{Number(data.totalClosingCredit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-200/60 dark:border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Period Debits</span>
              <p className="text-xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1">
                ₹{Number(data.totalPeriodDebit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-200/60 dark:border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Period Credits</span>
              <p className="text-xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1">
                ₹{Number(data.totalPeriodCredit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Trial Balance Statement Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-600 dark:text-slate-400">
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
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredRows.map((r: any) => (
                <tr
                  key={r.ledgerId}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                    {r.ledgerCode}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100 text-sm">
                    <Link
                      href={`/reports/general-ledger?ledgerId=${r.ledgerId}`}
                      className="hover:text-blue-600 hover:underline inline-flex items-center gap-1.5 group/link"
                      title="Drill down to General Ledger Account Statement"
                    >
                      <span>{r.ledgerName}</span>
                      <ArrowUpRight className="h-3 w-3 text-slate-400 group-hover/link:text-blue-600 transition-colors" />
                    </Link>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
                    {r.groupName}
                  </td>
                  <td className="py-3 px-4">
                    <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                      {r.nature}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-500">
                    {r.openingDebit > 0 ? r.openingDebit.toFixed(2) : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-500">
                    {r.openingCredit > 0 ? r.openingCredit.toFixed(2) : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                    {r.periodDebit > 0 ? r.periodDebit.toFixed(2) : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                    {r.periodCredit > 0 ? r.periodCredit.toFixed(2) : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black text-slate-900 dark:text-white">
                    {r.closingDebit > 0 ? `₹${r.closingDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black text-slate-900 dark:text-white">
                    {r.closingCredit > 0 ? `₹${r.closingCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            {data && (
              <tfoot>
                <tr className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/80 font-black text-xs text-slate-900 dark:text-white">
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
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                    ₹{data.totalClosingDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
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
