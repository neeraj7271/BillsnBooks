'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { BackButton } from '@/components/back-button';

export default function ProfitAndLossPage() {
  const { activeCompanyId } = useCompany();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<string>('2024-04-01');
  const [toDate, setToDate] = useState<string>(new Date().toISOString().split('T')[0]);

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

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <BackButton fallbackUrl="/reports" label="Back" />
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Statement of Profit &amp; Loss
            </h1>
            <span className="rounded bg-blue-100 dark:bg-blue-950 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              P&amp;L Schedule III
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Operating revenue, direct costs of sales, indirect overheads, and net operating income.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 dark:text-white focus:outline-hidden"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Highlights */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Operating Revenue</span>
            <p className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
              ₹{Number(data.totalRevenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-emerald-600 font-medium">Income accounts</span>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Direct Expenses</span>
            <p className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
              ₹{Number(data.totalDirectExpenses).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-slate-400">Cost of goods &amp; services</span>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Gross Profit</span>
            <p className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1">
              ₹{Number(data.grossProfit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-slate-400">Revenue - Direct Costs</span>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Net Profit</span>
            <p
              className={`text-2xl font-black font-mono mt-1 ${
                data.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              ₹{Number(data.netProfit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-slate-400">Transferred to Balance Sheet Equity</span>
          </div>
        </div>
      )}

      {/* P&L Statement Structure */}
      {data && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Revenue and Expense Breakdown
            </h3>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {/* 1. Operating Revenue */}
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  I. Revenue from Operations
                </span>
                <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                  ₹{Number(data.totalRevenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="pl-4 space-y-1.5">
                {data.incomeRows.map((r: any) => (
                  <div key={r.ledgerId} className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span>{r.ledgerName} ({r.ledgerCode})</span>
                    <span className="font-mono">
                      ₹{(r.periodCredit - r.periodDebit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Direct Expenses */}
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  II. Cost of Sales &amp; Direct Expenses
                </span>
                <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                  ₹{Number(data.totalDirectExpenses).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* 3. Gross Profit Bar */}
            <div className="p-5 bg-blue-50/40 dark:bg-blue-950/20 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300">
                III. Gross Profit (I - II)
              </span>
              <span className="font-mono font-black text-base text-blue-700 dark:text-blue-400">
                ₹{Number(data.grossProfit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* 4. Indirect Expenses */}
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  IV. Indirect &amp; Administrative Overheads
                </span>
                <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                  ₹{Number(data.totalIndirectExpenses).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="pl-4 space-y-1.5">
                {data.expenseRows.map((r: any) => (
                  <div key={r.ledgerId} className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span>{r.ledgerName} ({r.ledgerCode})</span>
                    <span className="font-mono">
                      ₹{(r.periodDebit - r.periodCredit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Net Profit Final Bar */}
            <div className="p-5 bg-emerald-50/50 dark:bg-emerald-950/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300 block">
                  V. Net Profit / Loss for the Period
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                  Ready for Income Tax Computation and Year-End Capital Adjustment
                </span>
              </div>
              <span className="font-mono font-black text-xl text-emerald-700 dark:text-emerald-400">
                ₹{Number(data.netProfit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

