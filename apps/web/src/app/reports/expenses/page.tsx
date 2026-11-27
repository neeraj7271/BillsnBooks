'use client';
import { logger } from '@/lib/logger';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  TrendingUp,
  Receipt,
  Download,
  Printer,
  Share2,
  Calendar,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Building2,
  Users,
  Package,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  Filter,
  Loader2,
  Search,
  Sparkles,
  ArrowUpRight,
  SlidersHorizontal,
  Star,
  ArrowUpDown,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { toast, DateRangePicker, formatMoney } from '@platform/ui';
import { ShareDialog } from '../share-dialog';
import { BackButton } from '@/components/back-button';

export default function ExpensesSuitePage() {
  const { activeCompanyId } = useCompany();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'monthly';

  const today = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();
  const fyStart = new Date().getMonth() >= 3 ? `${currentYear}-04-01` : `${currentYear - 1}-04-01`;

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [fromDate, setFromDate] = useState<string>(fyStart);
  const [toDate, setToDate] = useState<string>(today);
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState<boolean>(false);
  const [tableSearch, setTableSearch] = useState<string>('');
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMoreDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getCurrentReportKey = (): string => {
    switch (activeTab) {
      case 'dashboard':
      case 'monthly':
        return 'EXPENSES_MONTHLY';
      case 'vendor':
        return 'EXPENSES_VENDOR';
      case 'category':
        return 'EXPENSES_CATEGORY';
      case 'register':
        return 'EXPENSES_REGISTER';
      case 'item':
        return 'PURCHASES_ITEM';
      case 'voucher-type':
        return 'EXPENSES_REGISTER';
      case 'negative':
        return 'LEDGERS_NEGATIVE';
      default:
        return 'EXPENSES_MONTHLY';
    }
  };

  // Sync Favorite status for current report key
  useEffect(() => {
    const key = getCurrentReportKey();
    apiClient
      .getReportsCatalog(activeCompanyId)
      .then((items) => {
        const match = items?.find((it: any) => it.reportKey === key);
        if (match) setIsFavorite(match.isFavorite);
      })
      .catch(() => {});
  }, [activeTab, activeCompanyId]);

  const handleToggleFavorite = async () => {
    const key = getCurrentReportKey();
    setIsFavorite(!isFavorite);
    try {
      await apiClient.toggleFavoriteReport(activeCompanyId, key);
    } catch (err) {
      logger.error('Failed to toggle favorite', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'monthly' || activeTab === 'dashboard') {
        const res = await apiClient.getExpensesMonthly(activeCompanyId, fromDate, toDate);
        setData(res);
      } else if (activeTab === 'vendor') {
        const res = await apiClient.getExpensesVendor(activeCompanyId, fromDate, toDate);
        setData(res);
      } else if (activeTab === 'category') {
        const res = await apiClient.getExpensesCategory(activeCompanyId, fromDate, toDate);
        setData(res);
      } else if (activeTab === 'register' || activeTab === 'voucher-type') {
        const res = await apiClient.getExpensesRegister(activeCompanyId, fromDate, toDate);
        setData(res);
      } else if (activeTab === 'item') {
        const res = await apiClient.getPurchasesItems(activeCompanyId, fromDate, toDate);
        setData(res);
      } else if (activeTab === 'negative') {
        const res = await apiClient.getLedgerHygiene(activeCompanyId, 'negative-balance');
        setData(res);
      }
    } catch (err) {
      logger.error('Failed to load expense report', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, fromDate, toDate, activeCompanyId]);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const rKey = getCurrentReportKey();
      await apiClient.downloadReportExport(activeCompanyId, rKey, 'xlsx', fromDate, toDate);
    } catch (err: any) {
      toast.error(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handlePrintPdf = async () => {
    try {
      const rKey = getCurrentReportKey();
      await apiClient.downloadReportExport(activeCompanyId, rKey, 'pdf', fromDate, toDate);
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

  const getBannerInfo = () => {
    switch (activeTab) {
      case 'dashboard':
      case 'monthly':
        return {
          remarks: 'Expenses incurred during the month',
          action: 'Review the variation or trend of Expenses month on month',
        };
      case 'vendor':
        return {
          remarks: 'Vendor-wise expense aggregation for commercial review',
          action: 'Identify vendors nearing Section 194C/194J TDS thresholds',
        };
      case 'category':
        return {
          remarks: 'Cost-center classification across operational accounts',
          action: 'Scrutinize high-spend expense heads and optimize budget allocation',
        };
      case 'register':
        return {
          remarks: 'Chronological audit trail of all expense vouchers',
          action: 'Verify bills and tax deduction entries with original invoices',
        };
      case 'item':
        return {
          remarks: 'SKU and product procurement volume and rate analysis',
          action: 'Compare purchase rates with historical supplier contracts',
        };
      case 'voucher-type':
        return {
          remarks: 'Expense vouchers segmented by voucher transaction types',
          action: 'Audit unusual voucher classes used for operational expenditures',
        };
      case 'negative':
        return {
          remarks: 'Expense and vendor ledgers displaying inverted debit/credit balance',
          action: 'Investigate erroneous reverse entries or missing vendor payments',
        };
      default:
        return {
          remarks: 'Detailed expense breakdown and ledger verification',
          action: 'Scrutinize ledger entries for accounting accuracy',
        };
    }
  };

  const banner = getBannerInfo();
  const rawRows = data?.rows || [];

  const filteredRows = useMemo(() => {
    if (!tableSearch.trim()) return rawRows;
    const q = tableSearch.toLowerCase();
    return rawRows.filter((r: any) => {
      return Object.values(r).some((val) =>
        String(val).toLowerCase().includes(q)
      );
    });
  }, [rawRows, tableSearch]);

  const totalAmount = data?.totalExpenses || data?.totalPurchases || 0;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden space-y-2.5 animate-in fade-in duration-150">
      {/* 1. Modern Slim Top Bar: Navigation + FY + Date Presets + Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-surface px-3.5 py-2 rounded-lg border border-default shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <BackButton fallbackUrl="/reports" label="Back" />
          <div className="h-4 w-px bg-border-default" />
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-primary">
              Purchases & Operational Expenses Suite
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-status-warning-subtle text-status-warning-text border border-status-warning/30">
              FY {currentYear}-{currentYear + 1}
            </span>
          </div>
        </div>

        {/* Date Selector & Action Buttons in One Sleek Row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Picker */}
          <DateRangePicker
            from={fromDate}
            to={toDate}
            onChange={({ from: f, to: t }) => {
              setFromDate(f);
              setToDate(t);
            }}
            size="sm"
          />

          {/* Quick Presets */}
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

          {/* Actions */}
          <button
            type="button"
            onClick={() => setIsShareOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-default bg-surface text-primary hover:bg-surface-sunken"
          >
            <Share2 className="h-3.5 w-3.5 text-brand-text" />
            <span className="hidden sm:inline">Share</span>
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

      {/* 2. Unified Category Tab Bar + More Reports Dropdown */}
      <div className="flex items-center justify-between border-b border-default bg-surface px-3 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-2 text-xs transition border-b-2 whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'border-brand text-primary font-bold'
                : 'border-transparent text-secondary hover:text-primary font-medium'
            }`}
          >
            Purchase Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('monthly')}
            className={`px-3 py-2 text-xs transition border-b-2 whitespace-nowrap ${
              activeTab === 'monthly'
                ? 'border-brand text-primary font-bold'
                : 'border-transparent text-secondary hover:text-primary font-medium'
            }`}
          >
            Expenses Monthly
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vendor')}
            className={`px-3 py-2 text-xs transition border-b-2 whitespace-nowrap ${
              activeTab === 'vendor'
                ? 'border-brand text-primary font-bold'
                : 'border-transparent text-secondary hover:text-primary font-medium'
            }`}
          >
            Expenses VendorWise
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('category')}
            className={`px-3 py-2 text-xs transition border-b-2 whitespace-nowrap ${
              activeTab === 'category'
                ? 'border-brand text-primary font-bold'
                : 'border-transparent text-secondary hover:text-primary font-medium'
            }`}
          >
            Expenses CategoryWise
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('register')}
            className={`px-3 py-2 text-xs transition border-b-2 whitespace-nowrap ${
              activeTab === 'register'
                ? 'border-brand text-primary font-bold'
                : 'border-transparent text-secondary hover:text-primary font-medium'
            }`}
          >
            Expenses Register
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('item')}
            className={`px-3 py-2 text-xs transition border-b-2 whitespace-nowrap ${
              activeTab === 'item'
                ? 'border-brand text-primary font-bold'
                : 'border-transparent text-secondary hover:text-primary font-medium'
            }`}
          >
            Purchases ItemWise
          </button>
        </div>

        {/* More Reports Dropdown */}
        <div ref={dropdownRef} className="relative inline-block text-left shrink-0 my-1">
          <button
            type="button"
            onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded border border-default bg-surface text-primary hover:bg-surface-sunken transition"
          >
            <span>More Reports</span>
            <ChevronDown className="h-3 w-3 text-muted" />
          </button>
          {moreDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-60 rounded-lg border border-default bg-surface-overlay shadow-xl py-1 z-30">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('voucher-type');
                  setMoreDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-xs hover:bg-surface-sunken transition ${
                  activeTab === 'voucher-type'
                    ? 'font-bold text-brand-text bg-brand-subtle'
                    : 'text-secondary'
                }`}
              >
                Expenses VoucherTypeWise
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('negative');
                  setMoreDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-xs hover:bg-surface-sunken transition ${
                  activeTab === 'negative'
                    ? 'font-bold text-brand-text bg-brand-subtle'
                    : 'text-secondary'
                }`}
              >
                Ledgers-Negative Balance
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Remarks & Action Bar with Favorite Star */}
      <div className="flex items-center justify-between gap-3 px-3.5 py-1.5 rounded-lg bg-brand-subtle border border-default text-xs shrink-0">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-bold text-brand-text shrink-0">Remarks :</span>
            <span className="text-primary">{banner.remarks}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-brand-text shrink-0">Action :</span>
            <span className="text-secondary">{banner.action}</span>
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

      {/* 4. Filter Toolbar & Instant Search Bar */}
      <div className="flex items-center justify-between gap-3 bg-surface px-3.5 py-1.5 rounded-lg border border-default shadow-sm shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-muted" />
          <input
            type="text"
            placeholder="Search report rows (ledger, voucher, amount)..."
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-xs rounded-md border border-default bg-surface-sunken text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-focus-ring"
          />
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted">Total Period Outflow:</span>
          <span className="font-mono font-bold text-brand-text">
            {formatMoney(totalAmount)}
          </span>
        </div>
      </div>

      {/* 5. Contained Data Grid with Sticky Header */}
      <div className="flex-1 overflow-hidden rounded-lg border border-default bg-surface shadow-sm flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-surface-sunken text-secondary border-b border-default font-semibold">
              {activeTab === 'monthly' || activeTab === 'dashboard' ? (
                <tr>
                  <th className="py-2 px-3 w-12 text-center">Sr. No.</th>
                  <th className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      <span>Expense Month</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                      <Search className="h-2.5 w-2.5 opacity-40 ml-0.5" />
                    </div>
                  </th>
                  <th className="py-2 px-3 text-center">Voucher Count</th>
                  <th className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span>Direct Expenses (₹)</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                    </div>
                  </th>
                  <th className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span>Indirect Expenses (₹)</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                    </div>
                  </th>
                  <th className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span>Total Expenses (₹)</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                    </div>
                  </th>
                  <th className="py-2 px-3 text-right">MoM Trend</th>
                </tr>
              ) : activeTab === 'vendor' ? (
                <tr>
                  <th className="py-2 px-3 w-12 text-center">Sr. No.</th>
                  <th className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      <span>Vendor / Payee Name</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                      <Search className="h-2.5 w-2.5 opacity-40 ml-0.5" />
                    </div>
                  </th>
                  <th className="py-2 px-3 text-center">Voucher Count</th>
                  <th className="py-2 px-3 text-right">Total Expense (₹)</th>
                  <th className="py-2 px-3 text-right">Spend Share %</th>
                  <th className="py-2 px-3 text-center">TDS Check</th>
                </tr>
              ) : activeTab === 'category' ? (
                <tr>
                  <th className="py-2 px-3 w-12 text-center">Sr. No.</th>
                  <th className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      <span>Cost Category / Head</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                      <Search className="h-2.5 w-2.5 opacity-40 ml-0.5" />
                    </div>
                  </th>
                  <th className="py-2 px-3">Account Nature</th>
                  <th className="py-2 px-3 text-center">Vouchers</th>
                  <th className="py-2 px-3 text-right">Total Expense (₹)</th>
                  <th className="py-2 px-3 text-right">% of Total</th>
                </tr>
              ) : activeTab === 'item' ? (
                <tr>
                  <th className="py-2 px-3 w-12 text-center">Sr. No.</th>
                  <th className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      <span>Item / Product Name</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                      <Search className="h-2.5 w-2.5 opacity-40 ml-0.5" />
                    </div>
                  </th>
                  <th className="py-2 px-3">HSN / SAC</th>
                  <th className="py-2 px-3 text-center">UOM</th>
                  <th className="py-2 px-3 text-right">Qty Purchased</th>
                  <th className="py-2 px-3 text-right">Avg Rate (₹)</th>
                  <th className="py-2 px-3 text-right">Taxable (₹)</th>
                  <th className="py-2 px-3 text-right">Total (₹)</th>
                </tr>
              ) : (
                <tr>
                  <th className="py-2 px-3 w-12 text-center">Sr. No.</th>
                  <th className="py-2 px-3">Voucher Date</th>
                  <th className="py-2 px-3">Voucher No</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      <span>Ledger Name</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                      <Search className="h-2.5 w-2.5 opacity-40 ml-0.5" />
                    </div>
                  </th>
                  <th className="py-2 px-3">Particulars / Narration</th>
                  <th className="py-2 px-3 text-right">Amount (₹)</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredRows.map((r: any, idx: number) => (
                <tr key={idx} className="hover:bg-row-hover transition">
                  <td className="py-2 px-3 text-center text-muted font-mono text-[11px]">{idx + 1}</td>
                  {activeTab === 'monthly' || activeTab === 'dashboard' ? (
                    <>
                      <td className="py-2 px-3 font-medium text-primary">{r.month}</td>
                      <td className="py-2 px-3 text-center font-mono text-[11px]">{r.voucherCount}</td>
                      <td className="py-2 px-3 text-right font-mono text-[11px]">
                        {formatMoney(r.directExpenses || 0)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[11px]">
                        {formatMoney(r.indirectExpenses || 0)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-brand-text">
                        {formatMoney(r.totalExpenses || 0)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {r.variationPercentage !== undefined ? (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              r.variationPercentage > 0
                                ? 'text-status-danger-text bg-status-danger-subtle'
                                : 'text-status-success-text bg-status-success-subtle'
                            }`}
                          >
                            {r.variationPercentage > 0 ? `+${r.variationPercentage}%` : `${r.variationPercentage}%`}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </>
                  ) : activeTab === 'vendor' ? (
                    <>
                      <td className="py-2 px-3">
                        <span className="text-brand-text hover:underline font-medium cursor-pointer">
                          {r.vendorName}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-[11px]">{r.voucherCount}</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-primary">
                        {formatMoney(r.totalAmount || 0)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[11px]">{r.percentageOfTotal}%</td>
                      <td className="py-2 px-3 text-center">
                        {r.tdsApplicable ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-status-warning-subtle text-status-warning-text border border-status-warning/30">
                            Check Sec 194C/J
                          </span>
                        ) : (
                          <span className="text-muted text-[10px]">Normal</span>
                        )}
                      </td>
                    </>
                  ) : activeTab === 'category' ? (
                    <>
                      <td className="py-2 px-3 font-medium text-primary">{r.categoryName}</td>
                      <td className="py-2 px-3 font-mono text-muted uppercase text-[10px]">{r.nature}</td>
                      <td className="py-2 px-3 text-center font-mono text-[11px]">{r.voucherCount}</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-primary">
                        {formatMoney(r.totalAmount || 0)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[11px]">{r.percentageOfTotal}%</td>
                    </>
                  ) : activeTab === 'item' ? (
                    <>
                      <td className="py-2 px-3">
                        <span className="text-brand-text hover:underline font-medium cursor-pointer">
                          {r.itemName}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-muted text-[11px]">{r.hsnSacCode || '-'}</td>
                      <td className="py-2 px-3 text-center uppercase font-mono text-[10px]">{r.uom}</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">{r.quantityPurchased}</td>
                      <td className="py-2 px-3 text-right font-mono text-[11px]">
                        {formatMoney(r.avgPurchasePrice || 0)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[11px]">
                        {formatMoney(r.taxableAmount || 0)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-primary">
                        {formatMoney(r.totalAmount || 0)}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-2 px-3 font-mono text-secondary text-[11px]">{r.voucherDate}</td>
                      <td className="py-2 px-3 font-mono font-semibold text-primary text-[11px]">{r.voucherNumber}</td>
                      <td className="py-2 px-3 font-mono text-[10px] text-muted uppercase">{r.voucherType}</td>
                      <td className="py-2 px-3 font-medium text-primary">{r.ledgerName}</td>
                      <td className="py-2 px-3 text-muted italic text-[11px] max-w-xs truncate">{r.narration || '-'}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-brand-text">
                        {formatMoney(r.amount || 0)}
                      </td>
                    </>
                  )}
                </tr>
              ))}

              {filteredRows.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted text-xs">
                    No transactions found for the selected period / search filter.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted text-xs">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-brand-text mb-2" />
                    Loading expense records...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Compact Table Status Bar */}
        <div className="flex items-center justify-between px-3.5 py-1.5 border-t border-default bg-surface-sunken text-[11px] text-muted shrink-0">
          <div>
            Showing <span className="font-semibold text-secondary">{filteredRows.length}</span> records
            {tableSearch && <span> (filtered from {rawRows.length})</span>}
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-muted uppercase">Double-entry verified</span>
          </div>
        </div>
      </div>

      <ShareDialog
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        reportKey={getCurrentReportKey()}
        reportTitle="Purchases & Operational Expenses Report"
        companyId={activeCompanyId}
        filters={{ fromDate, toDate, tab: activeTab }}
      />
    </div>
  );
}
