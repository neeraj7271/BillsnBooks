'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { ReportPage, MoneyText, DataTable, DateRangePicker, type ColumnDef } from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { ShareDialog } from '../share-dialog';

export default function CustomerSalesPage() {
  const { activeCompanyId } = useCompany();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<string>('2024-04-01');
  const [toDate, setToDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [shareOpen, setShareOpen] = useState<boolean>(false);

  const { page, pageSize, setPage, setPageSize } = useTablePagination({
    storageKey: 'report_customer_sales',
    defaultPageSize: 25,
  });

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

  const columns: ColumnDef<any>[] = [
    {
      key: 'partyName',
      header: 'Customer',
      cell: (r) => (
        <Link
          href={`/reports/general-ledger?partyName=${encodeURIComponent(r.partyName || '')}`}
          className="font-semibold text-brand-text hover:underline"
        >
          {r.partyName}
        </Link>
      ),
    },
    {
      key: 'invoiceCount',
      header: 'Invoices',
      align: 'right',
      width: '120px',
      cell: (r) => <span className="font-mono tabular-nums text-secondary">{r.invoiceCount || 0}</span>,
    },
    {
      key: 'taxableAmount',
      header: 'Taxable Value',
      align: 'right',
      width: '160px',
      cell: (r) => <MoneyText amount={Number(r.taxableAmount || 0)} className="text-primary" />,
    },
    {
      key: 'taxAmount',
      header: 'GST',
      align: 'right',
      width: '140px',
      cell: (r) => <MoneyText amount={Number(r.taxAmount || 0)} className="text-secondary" />,
    },
    {
      key: 'totalAmount',
      header: 'Total Sales',
      align: 'right',
      width: '180px',
      cell: (r) => <MoneyText amount={Number(r.totalAmount || 0)} className="font-semibold text-primary" />,
    },
  ];

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
      onShare={() => setShareOpen(true)}
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
      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        page={page}
        pageSize={pageSize}
        totalItems={rows.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        storageKey="report_customer_sales"
        emptyTitle="No customer sales"
        emptyDescription="No sales recorded for the selected date range."
      />
      <ShareDialog
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        reportKey="CUSTOMER_SALES"
        reportTitle="Customer Sales Summary"
        companyId={activeCompanyId}
        filters={{ fromDate, toDate }}
      />
    </ReportPage>
  );
}
