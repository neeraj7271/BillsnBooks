'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Receipt,
  Download,
  Printer,
  Share2,
  Calendar,
  ArrowLeft,
  Package,
  Layers,
  FileSpreadsheet,
  Loader2,
  Search,
  Star,
  ArrowUpDown,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { toast, DateRangePicker } from '@platform/ui';
import { ShareDialog } from '../share-dialog';
import { BackButton } from '@/components/back-button';

export default function ItemSalesPage() {
  const { activeCompanyId } = useCompany();
  const today = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();
  const fyStart = new Date().getMonth() >= 3 ? `${currentYear}-04-01` : `${currentYear - 1}-04-01`;

  const [fromDate, setFromDate] = useState<string>(fyStart);
  const [toDate, setToDate] = useState<string>(today);
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);
  const [tableSearch, setTableSearch] = useState<string>('');
  const [isFavorite, setIsFavorite] = useState<boolean>(false);

  useEffect(() => {
    apiClient
      .getReportsCatalog(activeCompanyId)
      .then((items) => {
        const match = items?.find((it: any) => it.reportKey === 'ITEM_SALES');
        if (match) setIsFavorite(match.isFavorite);
      })
      .catch(() => {});
  }, [activeCompanyId]);

  const handleToggleFavorite = async () => {
    setIsFavorite(!isFavorite);
    try {
      await apiClient.toggleFavoriteReport(activeCompanyId, 'ITEM_SALES');
    } catch (err) {
      console.error('Failed to toggle favorite', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getItemSales(activeCompanyId, fromDate, toDate);
      setData(res);
    } catch (err) {
      console.error('Failed to load item sales report', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [fromDate, toDate, activeCompanyId]);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await apiClient.downloadReportExport(activeCompanyId, 'ITEM_SALES', 'xlsx', fromDate, toDate);
    } catch (err: any) {
      toast.error(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handlePrintPdf = async () => {
    try {
      await apiClient.downloadReportExport(activeCompanyId, 'ITEM_SALES', 'pdf', fromDate, toDate);
    } catch (err: any) {
      toast.error(`Print failed: ${err.message}`);
    }
  };

  const setPresetDate = (type: 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_FY') => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    if (type === 'THIS_MONTH') {
      const start = new Date(y, m, 1).toISOString().split('T')[0];
      setFromDate(start);
      setToDate(today);
    } else if (type === 'LAST_MONTH') {
      const start = new Date(y, m - 1, 1).toISOString().split('T')[0];
      const end = new Date(y, m, 0).toISOString().split('T')[0];
      setFromDate(start);
      setToDate(end);
    } else if (type === 'THIS_FY') {
      setFromDate(fyStart);
      setToDate(today);
    }
  };

  const rawRows = data?.rows || [];

  const filteredRows = useMemo(() => {
    if (!tableSearch.trim()) return rawRows;
    const q = tableSearch.toLowerCase();
    return rawRows.filter((r: any) => {
      return (
        r.itemName?.toLowerCase().includes(q) ||
        r.itemCode?.toLowerCase().includes(q) ||
        r.hsnSacCode?.toLowerCase().includes(q) ||
        r.uom?.toLowerCase().includes(q)
      );
    });
  }, [rawRows, tableSearch]);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden space-y-2.5 animate-in fade-in duration-150">
      {/* 1. Slim Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-surface px-3.5 py-2 rounded-lg border border-default shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <BackButton fallbackUrl="/reports" label="Back" />
          <div className="h-4 w-px bg-border-default" />
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-primary">
              Product & Item-Wise Sales Analysis
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-subtle text-brand-text border border-brand/20">
              FY {currentYear}-{currentYear + 1}
            </span>
          </div>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker
            from={fromDate}
            to={toDate}
            onChange={({ from: f, to: t }) => {
              setFromDate(f);
              setToDate(t);
            }}
            size="sm"
          />

          <div className="hidden lg:flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPresetDate('THIS_MONTH')}
              className="px-2 py-1 text-[11px] font-medium rounded border border-default bg-surface text-secondary hover:bg-surface-sunken"
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setPresetDate('LAST_MONTH')}
              className="px-2 py-1 text-[11px] font-medium rounded border border-default bg-surface text-secondary hover:bg-surface-sunken"
            >
              Last Month
            </button>
            <button
              type="button"
              onClick={() => setPresetDate('THIS_FY')}
              className="px-2 py-1 text-[11px] font-medium rounded border border-default bg-surface text-secondary hover:bg-surface-sunken"
            >
              This FY
            </button>
          </div>

          <div className="h-4 w-px bg-border-default hidden sm:block" />

          <button
            type="button"
            onClick={() => setIsShareOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-default bg-surface text-primary hover:bg-surface-sunken"
          >
            <Share2 className="h-3.5 w-3.5 text-brand-text" />
            <span className="hidden sm:inline">Share Report</span>
          </button>
          <button
            type="button"
            onClick={handlePrintPdf}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-default bg-surface text-primary hover:bg-surface-sunken"
          >
            <Printer className="h-3.5 w-3.5 text-muted" />
            <span>Print / PDF</span>
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={handleExportExcel}
            className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md bg-status-success hover:opacity-90 text-inverse shadow-sm disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            <span>Export Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* 2. Remarks & Action Bar with Favorite Star */}
      <div className="flex items-center justify-between gap-3 px-3.5 py-1.5 rounded-lg bg-brand-subtle border border-default text-xs shrink-0">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-bold text-brand-text shrink-0">Remarks :</span>
            <span className="text-primary">
              SKU movement, selling rates, and quantity distribution across product catalogue.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-brand-text shrink-0">Action :</span>
            <span className="text-secondary">
              Identify fast-moving inventory items and optimize reorder quantities.
            </span>
          </div>
        </div>

        {/* Favorite Star Button */}
        <button
          type="button"
          onClick={handleToggleFavorite}
          title={isFavorite ? 'Remove from Favorite Reports' : 'Add to Favorite Reports'}
          className="shrink-0 p-1.5 rounded-md bg-brand hover:bg-brand-hover text-inverse shadow-sm transition flex items-center justify-center"
        >
          <Star className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current text-status-warning' : 'text-inverse'}`} />
        </button>
      </div>

      {/* 3. Metrics Summary & Search Bar */}
      <div className="flex items-center justify-between gap-3 bg-surface px-3.5 py-1.5 rounded-lg border border-default shadow-sm shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-muted" />
          <input
            type="text"
            placeholder="Search by product name, HSN code, or SKU..."
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-xs rounded-md border border-default bg-surface-sunken text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-focus-ring"
          />
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-muted">Distinct Products: </span>
            <span className="font-mono font-semibold text-primary">
              {filteredRows.length}
            </span>
          </div>
          <div>
            <span className="text-muted">Total Quantity Sold: </span>
            <span className="font-mono font-semibold text-primary">
              {data?.totalQuantity || 0}
            </span>
          </div>
          <div>
            <span className="text-muted">Gross Item Sales: </span>
            <span className="font-mono font-bold text-brand-text">
              ₹{(data?.totalSales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Contained Data Grid with Sticky Header */}
      <div className="flex-1 overflow-hidden rounded-lg border border-default bg-surface shadow-sm flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-surface-sunken text-secondary border-b border-default font-semibold">
              <tr>
                <th className="py-2 px-3 w-12 text-center">Sr. No.</th>
                <th className="py-2 px-3">
                  <div className="flex items-center gap-1">
                    <span>Product / Item Name</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                    <Search className="h-2.5 w-2.5 opacity-40 ml-0.5" />
                  </div>
                </th>
                <th className="py-2 px-3">HSN / SAC</th>
                <th className="py-2 px-3 text-center">UOM</th>
                <th className="py-2 px-3 text-right">Qty Sold</th>
                <th className="py-2 px-3 text-right">Avg Rate (₹)</th>
                <th className="py-2 px-3 text-right">Taxable Turnover (₹)</th>
                <th className="py-2 px-3 text-right">Taxes (₹)</th>
                <th className="py-2 px-3 text-right">Gross Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredRows.map((row: any, idx: number) => (
                <tr key={row.itemId || idx} className="hover:bg-row-hover transition">
                  <td className="py-2 px-3 text-center text-muted font-mono text-[11px]">{idx + 1}</td>
                  <td className="py-2 px-3 font-medium text-brand-text hover:underline cursor-pointer">
                    {row.itemName}
                  </td>
                  <td className="py-2 px-3 font-mono text-[11px] text-muted">
                    {row.hsnSacCode || '-'}
                  </td>
                  <td className="py-2 px-3 text-center uppercase font-mono text-[10px] text-secondary">
                    {row.uom || 'NOS'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-semibold text-primary text-[11px]">
                    {row.quantitySold}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-secondary text-[11px]">
                    ₹{Number(row.avgSellingPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-secondary text-[11px]">
                    ₹{Number(row.taxableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-muted text-[11px]">
                    ₹{Number(row.totalTax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-primary text-[11px]">
                    ₹{Number(row.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}

              {filteredRows.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted text-xs">
                    No item sales records found for the selected period.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted text-xs">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-brand-text mb-2" />
                    Loading product sales summary...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-3.5 py-1.5 border-t border-default bg-surface-sunken text-[11px] text-muted shrink-0">
          <div>
            Showing <span className="font-semibold text-secondary">{filteredRows.length}</span> items
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-muted uppercase">HSN/SAC Inventory Audited</span>
          </div>
        </div>
      </div>

      <ShareDialog
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        reportKey="ITEM_SALES"
        reportTitle="Product & Item-Wise Sales Analysis Report"
        companyId={activeCompanyId}
        filters={{ fromDate, toDate }}
      />
    </div>
  );
}
