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
      alert(`Export error: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handlePrintPdf = async () => {
    try {
      await apiClient.downloadReportExport(activeCompanyId, 'ITEM_SALES', 'pdf', fromDate, toDate);
    } catch (err: any) {
      alert(`Print error: ${err.message}`);
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
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <BackButton fallbackUrl="/reports" label="Back" />
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Product & Item-Wise Sales Analysis
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200/50">
              FY {currentYear}-{currentYear + 1}
            </span>
          </div>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none text-xs"
            />
            <span className="text-slate-400 text-[11px]">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none text-xs"
            />
          </div>

          <div className="hidden lg:flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPresetDate('THIS_MONTH')}
              className="px-2 py-1 text-[11px] font-medium rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setPresetDate('LAST_MONTH')}
              className="px-2 py-1 text-[11px] font-medium rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
            >
              Last Month
            </button>
            <button
              type="button"
              onClick={() => setPresetDate('THIS_FY')}
              className="px-2 py-1 text-[11px] font-medium rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
            >
              This FY
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

          <button
            type="button"
            onClick={() => setIsShareOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
          >
            <Share2 className="h-3.5 w-3.5 text-indigo-500" />
            <span className="hidden sm:inline">Share Report</span>
          </button>
          <button
            type="button"
            onClick={handlePrintPdf}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" />
            <span>Print / PDF</span>
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={handleExportExcel}
            className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            <span>Export Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* 2. Peach / Blush Remarks & Action Bar with Purple Favorite Star */}
      <div className="flex items-center justify-between gap-3 px-3.5 py-1.5 rounded-lg bg-[#fff7f6] dark:bg-[#2b161c] border border-[#fbd4d0] dark:border-[#52202b] text-xs shrink-0">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#551a3b] dark:text-[#f8b4be] shrink-0">Remarks :</span>
            <span className="text-slate-800 dark:text-slate-200">
              SKU movement, selling rates, and quantity distribution across product catalogue.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#551a3b] dark:text-[#f8b4be] shrink-0">Action :</span>
            <span className="text-slate-700 dark:text-slate-300">
              Identify fast-moving inventory items and optimize reorder quantities.
            </span>
          </div>
        </div>

        {/* Purple Favorite Star Button */}
        <button
          type="button"
          onClick={handleToggleFavorite}
          title={isFavorite ? 'Remove from Favorite Reports' : 'Add to Favorite Reports'}
          className="shrink-0 p-1.5 rounded-md bg-[#6b21a8] hover:bg-[#581c87] text-white shadow-sm transition flex items-center justify-center"
        >
          <Star className={`h-3.5 w-3.5 ${isFavorite ? 'fill-amber-400 text-amber-400' : 'text-white'}`} />
        </button>
      </div>

      {/* 3. Metrics Summary & Search Bar */}
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by product name, HSN code, or SKU..."
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400">Distinct Products: </span>
            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
              {filteredRows.length}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Total Quantity Sold: </span>
            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
              {data?.totalQuantity || 0}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Gross Item Sales: </span>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
              ₹{(data?.totalSales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Contained Data Grid with Exact Sticky Blush/Peach Header */}
      <div className="flex-1 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-[#fce8e6] dark:bg-[#3d1922] text-[#601925] dark:text-[#ffb3c0] border-b border-[#f7c5cb] dark:border-[#5e222f] font-semibold">
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
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredRows.map((row: any, idx: number) => (
                <tr key={row.itemId || idx} className="hover:bg-orange-50/20 dark:hover:bg-slate-800/40 transition">
                  <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                  <td className="py-2 px-3 font-medium text-[#ea580c] dark:text-[#fb923c] hover:underline cursor-pointer">
                    {row.itemName}
                  </td>
                  <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                    {row.hsnSacCode || '-'}
                  </td>
                  <td className="py-2 px-3 text-center uppercase font-mono text-[10px] text-slate-600 dark:text-slate-400">
                    {row.uom || 'NOS'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                    {row.quantitySold}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-700 dark:text-slate-300 text-[11px]">
                    ₹{Number(row.avgSellingPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-700 dark:text-slate-300 text-[11px]">
                    ₹{Number(row.taxableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                    ₹{Number(row.totalTax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100 text-[11px]">
                    ₹{Number(row.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}

              {filteredRows.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    No item sales records found for the selected period.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-indigo-500 mb-2" />
                    Loading product sales summary...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-3.5 py-1.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-[11px] text-slate-500 shrink-0">
          <div>
            Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredRows.length}</span> items
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-slate-400 uppercase">HSN/SAC Inventory Audited</span>
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
