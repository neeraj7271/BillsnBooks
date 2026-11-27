'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, AlertTriangle, Calendar } from 'lucide-react';
import { ReportPage, MoneyText, DatePicker } from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';

export default function BalanceSheetPage() {
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

  const dateControls = (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted font-medium">As of:</span>
      <DatePicker
        value={asOfDate}
        onChange={setAsOfDate}
        size="sm"
      />
    </div>
  );

  const summary = data && (
    <div className="rounded-xl border border-default bg-surface p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${
          data.isBalanced
            ? 'bg-status-success-subtle text-status-success-text border-status-success'
            : 'bg-status-danger-subtle text-status-danger-text border-status-danger'
        }`}
      >
        {data.isBalanced ? (
          <>
            <ShieldCheck className="h-4 w-4" />
            Balance Sheet Verified: Zero Discrepancy
          </>
        ) : (
          <>
            <AlertTriangle className="h-4 w-4" />
            Variance Detected: ₹{Number(data.variance || 0).toLocaleString('en-IN')}
          </>
        )}
      </span>

      <div className="flex items-center gap-6">
        <div>
          <span className="text-overline uppercase text-muted block">Total Assets</span>
          <MoneyText amount={Number(data.totalAssets || 0)} className="text-lg font-bold text-primary" />
        </div>
        <span className="text-lg font-semibold text-muted">=</span>
        <div>
          <span className="text-overline uppercase text-muted block">Liabilities &amp; Equity</span>
          <MoneyText
            amount={Number(data.totalLiabilitiesAndEquity || 0)}
            className="text-lg font-bold text-primary"
          />
        </div>
      </div>
    </div>
  );

  return (
    <ReportPage
      title="Balance Sheet"
      description="Authoritative statement of financial position (Assets = Liabilities + Equity)."
      dateControls={dateControls}
      compareMode={compareMode}
      onToggleCompare={() => setCompareMode((v) => !v)}
      onPrintPdf={() => window.print()}
      loading={loading}
      error={error}
      onRetry={loadData}
      isEmpty={!loading && !data}
      summary={summary}
    >
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-default bg-surface shadow-xs overflow-hidden flex flex-col justify-between">
            <div>
              <div className="px-5 py-3.5 border-b border-default bg-brand-subtle flex items-center justify-between">
                <span className="text-xs font-bold text-brand-text uppercase tracking-wide">
                  Assets (Application of Funds)
                </span>
                <MoneyText amount={Number(data.totalAssets || 0)} className="text-sm font-bold text-brand-text" />
              </div>

              <div className="p-5 space-y-3">
                <span className="text-overline uppercase text-muted block border-b border-subtle pb-1">
                  Current &amp; Liquid Assets
                </span>
                <div className="space-y-2 pt-1">
                  {(data.assetRows || []).map((r: any) => {
                    const netVal = r.closingDebit - r.closingCredit;
                    if (netVal <= 0) return null;
                    return (
                      <div key={r.ledgerId} className="flex items-center justify-between text-xs hover:bg-row-hover rounded px-2 py-1 -mx-2">
                        <div>
                          <Link
                            href={`/reports/general-ledger?ledgerId=${encodeURIComponent(r.ledgerId)}`}
                            className="font-semibold text-primary hover:text-brand-text hover:underline block"
                          >
                            {r.ledgerName}
                          </Link>
                          <span className="text-caption text-muted font-mono">
                            {r.groupName} ({r.ledgerCode})
                          </span>
                        </div>
                        <MoneyText amount={netVal} className="font-semibold text-primary" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-surface-raised border-t border-default flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-primary">Total Assets</span>
              <MoneyText amount={Number(data.totalAssets || 0)} className="text-base font-bold text-primary" />
            </div>
          </div>

          <div className="rounded-xl border border-default bg-surface shadow-xs overflow-hidden flex flex-col justify-between">
            <div>
              <div className="px-5 py-3.5 border-b border-default bg-brand-subtle flex items-center justify-between">
                <span className="text-xs font-bold text-brand-text uppercase tracking-wide">
                  Liabilities &amp; Equity (Sources of Funds)
                </span>
                <MoneyText
                  amount={Number(data.totalLiabilitiesAndEquity || 0)}
                  className="text-sm font-bold text-brand-text"
                />
              </div>

              <div className="p-5 space-y-5">
                <div className="space-y-2">
                  <span className="text-overline uppercase text-muted block border-b border-subtle pb-1">
                    Owner Equity &amp; Retained Earnings
                  </span>
                  <div className="flex items-center justify-between text-xs bg-status-success-subtle p-3 rounded-lg border border-status-success">
                    <div>
                      <span className="font-semibold text-status-success-text block">
                        Current Year Net Profit (from P&amp;L)
                      </span>
                      <span className="text-caption text-status-success-text">
                        Automatically rolled over from operations
                      </span>
                    </div>
                    <MoneyText
                      amount={Number(data.netProfitCurrentYear || 0)}
                      className="font-bold text-status-success-text"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-overline uppercase text-muted block border-b border-subtle pb-1">
                    Current Liabilities &amp; Duties / Taxes
                  </span>
                  <div className="space-y-2 pt-1">
                    {(data.liabilityRows || []).map((r: any) => {
                      const netVal = r.closingCredit - r.closingDebit;
                      if (netVal === 0) return null;
                      return (
                        <div key={r.ledgerId} className="flex items-center justify-between text-xs hover:bg-row-hover rounded px-2 py-1 -mx-2">
                          <div>
                            <Link
                              href={`/reports/general-ledger?ledgerId=${encodeURIComponent(r.ledgerId)}`}
                              className="font-semibold text-primary hover:text-brand-text hover:underline block"
                            >
                              {r.ledgerName}
                            </Link>
                            <span className="text-caption text-muted font-mono">
                              {r.groupName} ({r.ledgerCode})
                            </span>
                          </div>
                          <MoneyText amount={netVal} className="font-semibold text-primary" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-surface-raised border-t border-default flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-primary">Total Liabilities &amp; Equity</span>
              <MoneyText
                amount={Number(data.totalLiabilitiesAndEquity || 0)}
                className="text-base font-bold text-primary"
              />
            </div>
          </div>
        </div>
      )}
    </ReportPage>
  );
}
