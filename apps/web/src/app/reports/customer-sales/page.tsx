'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { ReportPage, MoneyText } from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';

export default function CustomerSalesPage() {
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
      const res = await apiClient.getCustomerSalesReport(activeCompanyId, fromDate, toDate);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load Customer Sales report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [fromDate, toDate, activeCompanyId]);

  const downloadFormat = async (format: 'xlsx' | 'html') => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const token = typeof window !== 'undefined' ? localStorage.getItem('antigravity_access_token') : null;
    const res = await fetch(
      `${base}/v1/companies/${activeCompanyId}/reports/CUSTOMER_SALES/export?format=${format}&fromDate=${fromDate}&toDate=${toDate}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Customer_Sales_${fromDate}_${toDate}.${format}`;
    a.click();
  };

  const rows: any[] = data?.rows || [];
  const totalSales = Number(data?.totalAmount || rows.reduce((s, r) => s + Number(r.totalAmount || 0), 0));

  const dateControls = (
    <div className="flex items-center gap-2 rounded-lg border border-default bg-surface px-3 py-1.5 text-xs">
      <Calendar className="h-3.5 w-3.5 text-muted" />
      <input
        type="date"
        aria-label="From date"
        value={fromDate}
        onChange={(e) => setFromDate(e.target.value)}
        className="bg-transparent font-medium text-primary focus:outline-none"
      />
      <span className="text-muted">to</span>
      <input
        type="date"
        aria-label="To date"
        value={toDate}
        onChange={(e) => setToDate(e.target.value)}
        className="bg-transparent font-medium text-primary focus:outline-none"
      />
    </div>
  );

  return (
    <ReportPage
      title="Customer Sales Summary"
      description="Revenue, taxable value, and GST breakdown per customer."
      dateControls={dateControls}
      compareMode={compareMode}
      onToggleCompare={() => setCompareMode((v) => !v)}
      onExportExcel={() => downloadFormat('xlsx')}
      onExportHtml={() => downloadFormat('html')}
      onPrintPdf={() => window.print()}
      loading={loading}
      error={error}
      onRetry={loadData}
      isEmpty={!loading && rows.length === 0}
      summary={
        data && (
          <div className="rounded-xl border border-default bg-surface p-5 shadow-xs flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted">Total Customer Revenue</span>
            <MoneyText amount={totalSales} className="text-xl font-bold text-primary" />
          </div>
        )
      }
    >
      <div className="rounded-xl border border-default bg-surface shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-sunken border-b border-default sticky top-0 z-10">
              <tr className="text-overline uppercase text-muted">
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-right">Invoices</th>
                <th className="py-3 px-4 text-right">Taxable Value</th>
                <th className="py-3 px-4 text-right">GST</th>
                <th className="py-3 px-4 text-right">Total Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle text-xs">
              {rows.map((r, idx) => (
                <tr key={r.partyId || idx} className="hover:bg-row-hover transition-colors">
                  <td className="py-2.5 px-4">
                    <Link
                      href={`/reports/general-ledger?partyName=${encodeURIComponent(r.partyName || '')}`}
                      className="font-semibold text-brand-text hover:underline"
                    >
                      {r.partyName}
                    </Link>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-secondary">
                    {r.invoiceCount || 0}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <MoneyText amount={Number(r.taxableAmount || 0)} className="text-primary" />
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <MoneyText amount={Number(r.taxAmount || 0)} className="text-secondary" />
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <MoneyText amount={Number(r.totalAmount || 0)} className="font-semibold text-primary" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ReportPage>
  );
}
