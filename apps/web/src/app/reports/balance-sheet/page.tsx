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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border border-strong pb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <BackButton fallbackUrl="/reports" label="Back" />
            <div className="p-2 rounded-xl bg-brand-subtle bg-brand/80 text-brand-text text-brand border border-focus border-focus">
              <PieChart className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-primary dark:text-white">
              Balance Sheet Statement
            </h1>
            <span className="rounded bg-brand-subtle bg-brand px-2 py-0.5 text-[10px] font-bold text-brand-text text-brand border border-focus border-focus">
              Assets = Liabilities + Equity
            </span>
          </div>
          <p className="text-sm text-muted text-muted">
            Authoritative statement of financial position as of selected reporting cutoff date.
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
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-status-danger border-status-danger bg-status-danger-subtle bg-status-danger p-4 text-xs font-semibold text-status-danger-text text-status-danger-text flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-status-danger-text" />
          <span>{error}</span>
        </div>
      )}

      {/* Balance Sheet Verification Banner */}
      {data && (
        <div className="rounded-2xl border border border-strong bg-white bg-surface p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
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
                    Balance Sheet Verified: Zero Discrepancy
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-status-danger-text" />
                    Variance Detected: ₹{data.variance.toLocaleString('en-IN')}
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-6">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted block">Total Assets</span>
                <span className="font-mono font-black text-lg text-primary dark:text-white">
                  ₹{Number(data.totalAssets).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <span className="text-xl font-bold text-muted text-secondary">=</span>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted block">Liabilities &amp; Equity</span>
                <span className="font-mono font-black text-lg text-primary dark:text-white">
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
          <div className="rounded-2xl border border border-strong bg-white bg-surface shadow-xs overflow-hidden flex flex-col justify-between">
            <div>
              <div className="p-5 border-b border border-strong bg-brand-subtle/50 bg-brand/30 flex items-center justify-between">
                <span className="text-sm font-extrabold text-brand-text text-brand uppercase tracking-wide">
                  Assets (Application of Funds)
                </span>
                <span className="font-mono font-black text-sm text-brand-text text-brand">
                  ₹{Number(data.totalAssets).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-2">
                  <span className="text-xs font-black uppercase text-muted block border-b border-subtle border-strong pb-1">
                    Current &amp; Liquid Assets
                  </span>

                  <div className="space-y-2 pt-1">
                    {data.assetRows.map((r: any) => {
                      const netVal = r.closingDebit - r.closingCredit;
                      if (netVal <= 0) return null;
                      return (
                        <div key={r.ledgerId} className="flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-primary text-primary-inverse block">{r.ledgerName}</span>
                            <span className="text-[10px] text-muted font-mono">{r.groupName} ({r.ledgerCode})</span>
                          </div>
                          <span className="font-mono font-bold text-primary text-primary-inverse">
                            ₹{netVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-surface-sunken/70 bg-surface-raised border-t border border-strong flex items-center justify-between">
              <span className="text-xs font-black uppercase text-primary dark:text-white">
                Total Assets
              </span>
              <span className="font-mono font-black text-base text-primary dark:text-white">
                ₹{Number(data.totalAssets).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Right Column: LIABILITIES & EQUITY */}
          <div className="rounded-2xl border border border-strong bg-white bg-surface shadow-xs overflow-hidden flex flex-col justify-between">
            <div>
              <div className="p-5 border-b border border-strong bg-brand-subtle/50 bg-brand/30 flex items-center justify-between">
                <span className="text-sm font-extrabold text-brand-text text-brand uppercase tracking-wide">
                  Liabilities &amp; Equity (Sources of Funds)
                </span>
                <span className="font-mono font-black text-sm text-brand-text text-brand">
                  ₹{Number(data.totalLiabilitiesAndEquity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-5 space-y-6">
                {/* 1. Equity & Reserves */}
                <div className="space-y-2">
                  <span className="text-xs font-black uppercase text-muted block border-b border-subtle border-strong pb-1">
                    Owner Equity &amp; Retained Earnings
                  </span>

                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs bg-status-success-subtle bg-status-success p-2.5 rounded-xl border border-status-success border-status-success">
                      <div>
                        <span className="font-bold text-status-success-text text-status-success-text block">
                          Current Year Net Profit (from P&amp;L)
                        </span>
                        <span className="text-[10px] text-status-success-text text-status-success-text">
                          Automatically rolled over from operations
                        </span>
                      </div>
                      <span className="font-mono font-bold text-status-success-text text-status-success-text">
                        ₹{Number(data.netProfitCurrentYear).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Liabilities & Statutory Taxes */}
                <div className="space-y-2">
                  <span className="text-xs font-black uppercase text-muted block border-b border-subtle border-strong pb-1">
                    Current Liabilities &amp; Duties / Taxes
                  </span>

                  <div className="space-y-2 pt-1">
                    {data.liabilityRows.map((r: any) => {
                      const netVal = r.closingCredit - r.closingDebit;
                      if (netVal === 0) return null;
                      return (
                        <div key={r.ledgerId} className="flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-primary text-primary-inverse block">{r.ledgerName}</span>
                            <span className="text-[10px] text-muted font-mono">{r.groupName} ({r.ledgerCode})</span>
                          </div>
                          <span className="font-mono font-bold text-primary text-primary-inverse">
                            ₹{netVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-surface-sunken/70 bg-surface-raised border-t border border-strong flex items-center justify-between">
              <span className="text-xs font-black uppercase text-primary dark:text-white">
                Total Liabilities &amp; Equity
              </span>
              <span className="font-mono font-black text-base text-primary dark:text-white">
                ₹{Number(data.totalLiabilitiesAndEquity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

