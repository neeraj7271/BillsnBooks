'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ReportPage,
  DataTable,
  MoneyText,
  Badge,
  Card,
  CardContent,
  Input,
  type ColumnDef,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { ShareDialog } from '../share-dialog';

export default function CustomerSalesPage() {
  const { activeCompanyId } = useCompany();
  const today = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();
  const fyStart = new Date().getMonth() >= 3 ? `${currentYear}-04-01` : `${currentYear - 1}-04-01`;

  const [fromDate, setFromDate] = useState(fyStart);
  const [toDate, setToDate] = useState(today);
  const [data, setData] = useState<any | null>(null);
  const [prevData, setPrevData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const loadReport = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getCustomerSalesReport(activeCompanyId, fromDate, toDate);
      setData(res);
      if (compareMode) {
        const f = new Date(fromDate);
        f.setFullYear(f.getFullYear() - 1);
        const t = new Date(toDate);
        t.setFullYear(t.getFullYear() - 1);
        const pRes = await apiClient.getCustomerSalesReport(
          activeCompanyId,
          f.toISOString().split('T')[0],
          t.toISOString().split('T')[0],
        );
        setPrevData(pRes);
      } else {
        setPrevData(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load customer sales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [fromDate, toDate, activeCompanyId, compareMode]);

  useEffect(() => {
    if (!activeCompanyId) return;
    apiClient
      .getReportsCatalog(activeCompanyId)
      .then((items) => {
        const match = items?.find((it: any) => it.reportKey === 'CUSTOMER_SALES');
        if (match) setIsFavorite(Boolean(match.isFavorite));
      })
      .catch(() => {});
  }, [activeCompanyId]);

  const rows = useMemo(() => {
    const base = data?.rows || [];
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter((r: any) => (r.partyName || '').toLowerCase().includes(q) || (r.gstin || '').toLowerCase().includes(q));
  }, [data, search]);

  const prevByParty = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of prevData?.rows || []) m.set(r.partyName, Number(r.totalAmount || 0));
    return m;
  }, [prevData]);

  const columns: ColumnDef<any>[] = [
    {
      key: 'partyName',
      header: 'Customer',
      sortable: true,
      cell: (r) => (
        <Link href="/parties" className="font-semibold text-brand-text hover:underline">
          {r.partyName}
        </Link>
      ),
    },
    { key: 'gstin', header: 'GSTIN', cell: (r) => <span className="font-mono text-caption text-muted">{r.gstin || 'Unregistered'}</span> },
    { key: 'invoiceCount', header: 'Invoices', align: 'right', sortable: true, cell: (r) => <Badge variant="neutral" size="xs">{r.invoiceCount}</Badge> },
    { key: 'taxableAmount', header: 'Taxable', align: 'right', sortable: true, cell: (r) => <MoneyText amount={r.taxableAmount} /> },
    { key: 'totalTax', header: 'GST', align: 'right', sortable: true, cell: (r) => <MoneyText amount={r.totalTax} /> },
    { key: 'totalAmount', header: 'Total Sales', align: 'right', sortable: true, cell: (r) => <MoneyText amount={r.totalAmount} /> },
    ...(compareMode
      ? [
          {
            key: 'prevSales',
            header: 'Prev FY',
            align: 'right' as const,
            cell: (r: any) => <MoneyText amount={prevByParty.get(r.partyName) || 0} />,
          },
        ]
      : []),
  ];

  const downloadFormat = async (format: 'xlsx' | 'html') => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const token = typeof window !== 'undefined' ? localStorage.getItem('antigravity_access_token') : null;
    const res = await fetch(
      `${base}/v1/companies/${activeCompanyId}/reports/CUSTOMER_SALES/export?format=${format}&fromDate=${fromDate}&toDate=${toDate}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Customer_Sales_${fromDate}_${toDate}.${format}`;
    a.click();
  };

  return (
    <>
      <ReportPage
        title="Customer-Wise Sales"
        description="Taxable revenue, GST breakdown, and outstanding receivables per customer."
        isFavorite={isFavorite}
        onToggleFavorite={async () => {
          setIsFavorite((v) => !v);
          await apiClient.toggleFavoriteReport(activeCompanyId, 'CUSTOMER_SALES').catch(() => {});
        }}
        compareMode={compareMode}
        onToggleCompare={() => setCompareMode((v) => !v)}
        onExportExcel={() => downloadFormat('xlsx')}
        onExportHtml={() => downloadFormat('html')}
        onPrintPdf={() => window.print()}
        onShare={() => setShareOpen(true)}
        loading={loading}
        error={error}
        onRetry={loadReport}
        isEmpty={rows.length === 0}
        dateControls={
          <>
            <Input type="date" size="sm" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" aria-label="From date" />
            <Input type="date" size="sm" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" aria-label="To date" />
            <Input size="sm" placeholder="Filter customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" aria-label="Filter customer" />
          </>
        }
        summary={
          data && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card><CardContent className="p-4"><div className="text-caption text-muted">Total Sales</div><div className="mt-1 text-h2"><MoneyText amount={data.totalSales || 0} align="left" /></div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-caption text-muted">Total Taxable</div><div className="mt-1 text-h2"><MoneyText amount={data.totalTaxable || 0} align="left" /></div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="text-caption text-muted">Total GST</div><div className="mt-1 text-h2"><MoneyText amount={data.totalTax || 0} align="left" /></div></CardContent></Card>
            </div>
          )
        }
      >
        <DataTable columns={columns} data={rows} stickyHeader />
      </ReportPage>

      <ShareDialog
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        companyId={activeCompanyId}
        reportKey="CUSTOMER_SALES"
        reportTitle="Customer-Wise Sales"
        filters={{ fromDate, toDate }}
      />
    </>
  );
}
