'use client';

import React, { useEffect, useState } from 'react';
import {
  PieChart,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  Building2,
  Landmark,
  Scale,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { BackButton } from '@/components/back-button';

export default function BalanceSheetPage() {
  const { activeCompanyId } = useCompany();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getBalanceSheet(activeCompanyId, asOfDate);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to generate Balance Sheet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [asOfDate, activeCompanyId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <BackButton fallbackUrl="/reports" label="Back" />
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
              <PieChart className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Balance Sheet Statement
            </h1>
            <span className="rounded bg-blue-100 dark:bg-blue-950 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              Assets = Liabilities + Equity
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Authoritative statement of financial position as of selected reporting cutoff date.
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
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Balance Sheet Verification Banner */}
      {data && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
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
                    Balance Sheet Verified: Zero Discrepancy
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    Variance Detected: ₹{data.variance.toLocaleString('en-IN')}
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-6">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Assets</span>
                <span className="font-mono font-black text-lg text-slate-900 dark:text-white">
                  ₹{Number(data.totalAssets).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <span className="text-xl font-bold text-slate-300 dark:text-slate-700">=</span>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Liabilities &amp; Equity</span>
                <span className="font-mono font-black text-lg text-slate-900 dark:text-white">
                  ₹{Number(data.totalLiabilitiesAndEquity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Two-Column Assets vs. Liabilities Layout */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: ASSETS */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden flex flex-col justify-between">
            <div>
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-950/30 flex items-center justify-between">
                <span className="text-sm font-extrabold text-blue-950 dark:text-blue-300 uppercase tracking-wide">
                  Assets (Application of Funds)
                </span>
                <span className="font-mono font-black text-sm text-blue-700 dark:text-blue-400">
                  ₹{Number(data.totalAssets).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-2">
                  <span className="text-xs font-black uppercase text-slate-400 block border-b border-slate-100 dark:border-slate-800 pb-1">
                    Current &amp; Liquid Assets
                  </span>

                  <div className="space-y-2 pt-1">
                    {data.assetRows.map((r: any) => {
                      const netVal = r.closingDebit - r.closingCredit;
                      if (netVal <= 0) return null;
                      return (
                        <div key={r.ledgerId} className="flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100 block">{r.ledgerName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{r.groupName} ({r.ledgerCode})</span>
                          </div>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            ₹{netVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-100/70 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-900 dark:text-white">
                Total Assets
              </span>
              <span className="font-mono font-black text-base text-slate-900 dark:text-white">
                ₹{Number(data.totalAssets).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Right Column: LIABILITIES & EQUITY */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden flex flex-col justify-between">
            <div>
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-950/30 flex items-center justify-between">
                <span className="text-sm font-extrabold text-indigo-950 dark:text-indigo-300 uppercase tracking-wide">
                  Liabilities &amp; Equity (Sources of Funds)
                </span>
                <span className="font-mono font-black text-sm text-indigo-700 dark:text-indigo-400">
                  ₹{Number(data.totalLiabilitiesAndEquity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-5 space-y-6">
                {/* 1. Equity & Reserves */}
                <div className="space-y-2">
                  <span className="text-xs font-black uppercase text-slate-400 block border-b border-slate-100 dark:border-slate-800 pb-1">
                    Owner Equity &amp; Retained Earnings
                  </span>

                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs bg-emerald-50/60 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40">
                      <div>
                        <span className="font-bold text-emerald-900 dark:text-emerald-300 block">
                          Current Year Net Profit (from P&amp;L)
                        </span>
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                          Automatically rolled over from operations
                        </span>
                      </div>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        ₹{Number(data.netProfitCurrentYear).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Liabilities & Statutory Taxes */}
                <div className="space-y-2">
                  <span className="text-xs font-black uppercase text-slate-400 block border-b border-slate-100 dark:border-slate-800 pb-1">
                    Current Liabilities &amp; Duties / Taxes
                  </span>

                  <div className="space-y-2 pt-1">
                    {data.liabilityRows.map((r: any) => {
                      const netVal = r.closingCredit - r.closingDebit;
                      if (netVal === 0) return null;
                      return (
                        <div key={r.ledgerId} className="flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100 block">{r.ledgerName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{r.groupName} ({r.ledgerCode})</span>
                          </div>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            ₹{netVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-100/70 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-900 dark:text-white">
                Total Liabilities &amp; Equity
              </span>
              <span className="font-mono font-black text-base text-slate-900 dark:text-white">
                ₹{Number(data.totalLiabilitiesAndEquity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

