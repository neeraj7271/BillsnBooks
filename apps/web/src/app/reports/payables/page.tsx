'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Users,
  ShieldCheck,
  Download,
  Printer,
  Share2,
  Calendar,
  ArrowLeft,
  ChevronDown,
  Loader2,
  Search,
  Star,
  ArrowUpDown,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { ShareDialog } from '../share-dialog';
import { BackButton } from '@/components/back-button';

export default function PayablesSuitePage() {
  const { activeCompanyId } = useCompany();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'summary';

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
      case 'summary':
        return 'PAYABLES_SUMMARY';
      case 'ageing-tally':
      case 'ageing-fifo':
        return 'PAYABLES_AGEING';
      case 'advances':
        return 'ADVANCE_TO_VENDORS';
      case 'receipts':
        return 'RECEIPTS_FROM_VENDORS';
      case 'non-purchase':
        return 'VENDORS_VOUCHER_TYPES';
      case 'squared-off':
        return 'LEDGERS_SQUARED_OFF';
      case 'same-balance':
        return 'LEDGERS_SAME_BALANCE';
      case 'unused':
        return 'LEDGERS_UNUSED';
      case 'missing-pan':
        return 'LEDGERS_MISSING_PAN';
      case 'missing-gstin':
        return 'LEDGERS_MISSING_GSTIN';
      default:
        return 'PAYABLES_SUMMARY';
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
      console.error('Failed to toggle favorite', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'summary' || activeTab === 'advances' || activeTab === 'receipts' || activeTab === 'non-purchase') {
        const res = await apiClient.getPayablesSummary(activeCompanyId, fromDate, toDate);
        setData(res);
      } else if (activeTab === 'ageing-tally' || activeTab === 'ageing-fifo') {
        const res = await apiClient.getPayablesAgeing(activeCompanyId, toDate);
        setData(res);
      } else {
        const res = await apiClient.getLedgerHygiene(activeCompanyId, activeTab);
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load payables report', err);
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
      alert(`Export error: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handlePrintPdf = async () => {
    try {
      const rKey = getCurrentReportKey();
      await apiClient.downloadReportExport(activeCompanyId, rKey, 'pdf', fromDate, toDate);
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

  const getBannerInfo = () => {
    switch (activeTab) {
      case 'summary':
        return {
          remarks: 'Gives birdeye view of total outstanding from each vendor.',
          action: 'Confirm the dues and follow up for recovery.',
        };
      case 'ageing-tally':
      case 'ageing-fifo':
        return {
          remarks: 'Aging classification based on invoice due dates.',
          action: 'Schedule payments prioritizing MSME overdue suppliers under 45-day rule.',
        };
      case 'advances':
        return {
          remarks: 'Prepayments and advance sums disbursed to trade suppliers.',
          action: 'Ensure original tax invoices and bills are received against advances.',
        };
      case 'receipts':
        return {
          remarks: 'Refunds or credit notes issued by trade vendors.',
          action: 'Adjust against outstanding invoices or verify bank receipt credit.',
        };
      case 'non-purchase':
        return {
          remarks: 'Vendor ledger entries originating outside formal Purchase Register vouchers.',
          action: 'Scrutinize journal vouchers and direct contra debit/credits.',
        };
      case 'squared-off':
        return {
          remarks: 'Ledger accounts with zero closing balance after completed reconciliation.',
          action: 'Review settled party balances and archive dormant supplier ledgers.',
        };
      case 'same-balance':
        return {
          remarks: 'Ledgers showing stagnant opening and closing balances across period.',
          action: 'Audit unmoving creditor accounts for unresolved commercial disputes.',
        };
      case 'unused':
        return {
          remarks: 'Chart of Accounts ledgers with zero debit and credit activity.',
          action: 'Identify unused or redundant accounts for ledger hygiene.',
        };
      case 'missing-pan':
        return {
          remarks: 'Vendors missing PAN are subject to 20% penal TDS deduction under Section 206AA.',
          action: 'Obtain PAN immediately to prevent tax deduction penalties.',
        };
      case 'missing-gstin':
        return {
          remarks: 'Unregistered counterparties require Reverse Charge verification.',
          action: 'Verify RCM liability or collect GSTIN for ITC compliance.',
        };
      default:
        return {
          remarks: 'Vendor ledger and balance verification summary.',
          action: 'Scrutinize ledger entries for accounting accuracy.',
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

  const totalOutstanding = data?.totalPayable || data?.totalOutstanding || 0;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden space-y-2.5 animate-in fade-in duration-150">
      {/* 1. Slim Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <BackButton fallbackUrl="/reports" label="Back" />
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Vendor Payables & Master Hygiene Suite
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200/50">
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

      {/* 2. Unified Category Tab Bar + More Reports Dropdown (Matches Reference Image 3) */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`px-3 py-2 text-xs transition border-b-2 whitespace-nowrap ${
              activeTab === 'summary'
                ? 'border-orange-500 text-slate-900 dark:text-white font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
          >
            Payables Summary
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ageing-tally')}
            className={`px-3 py-2 text-xs transition border-b-2 whitespace-nowrap ${
              activeTab === 'ageing-tally'
                ? 'border-orange-500 text-slate-900 dark:text-white font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
          >
            Payables Ageing - Tally
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ageing-fifo')}
            className={`px-3 py-2 text-xs transition border-b-2 whitespace-nowrap ${
              activeTab === 'ageing-fifo'
                ? 'border-orange-500 text-slate-900 dark:text-white font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
          >
            Payables Ageing - FIFO
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('advances')}
            className={`px-3 py-2 text-xs transition border-b-2 whitespace-nowrap ${
              activeTab === 'advances'
                ? 'border-orange-500 text-slate-900 dark:text-white font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
          >
            Advance to Vendors
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('receipts')}
            className={`px-3 py-2 text-xs transition border-b-2 whitespace-nowrap ${
              activeTab === 'receipts'
                ? 'border-orange-500 text-slate-900 dark:text-white font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
          >
            Receipts from Vendors
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('non-purchase')}
            className={`px-3 py-2 text-xs transition border-b-2 whitespace-nowrap ${
              activeTab === 'non-purchase'
                ? 'border-orange-500 text-slate-900 dark:text-white font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
          >
            Vendors booked through vouchers other than Purchase
          </button>
        </div>

        {/* More Reports Dropdown */}
        <div ref={dropdownRef} className="relative inline-block text-left shrink-0 my-1">
          <button
            type="button"
            onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition"
          >
            <span>More Reports</span>
            <ChevronDown className="h-3 w-3 text-slate-500" />
          </button>
          {moreDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-72 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl py-1 z-30">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('squared-off');
                  setMoreDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition ${
                  activeTab === 'squared-off'
                    ? 'font-bold text-orange-600 bg-orange-50/50'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                Ledgers - Squared Off
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('same-balance');
                  setMoreDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition ${
                  activeTab === 'same-balance'
                    ? 'font-bold text-orange-600 bg-orange-50/50'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                Ledgers - Same Opening & Closing Balance
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('unused');
                  setMoreDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition ${
                  activeTab === 'unused'
                    ? 'font-bold text-orange-600 bg-orange-50/50'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                Ledgers - Not Used
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('missing-pan');
                  setMoreDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition ${
                  activeTab === 'missing-pan'
                    ? 'font-bold text-orange-600 bg-orange-50/50'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                Ledgers - PAN Unavailable
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('missing-gstin');
                  setMoreDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition ${
                  activeTab === 'missing-gstin'
                    ? 'font-bold text-orange-600 bg-orange-50/50'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                Ledgers - GSTIN Unavailable
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Peach / Blush Remarks & Action Bar with Purple Favorite Star (Matches Reference Image 3) */}
      <div className="flex items-center justify-between gap-3 px-3.5 py-1.5 rounded-lg bg-[#fff7f6] dark:bg-[#2b161c] border border-[#fbd4d0] dark:border-[#52202b] text-xs shrink-0">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#551a3b] dark:text-[#f8b4be] shrink-0">Remarks :</span>
            <span className="text-slate-800 dark:text-slate-200">{banner.remarks}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#551a3b] dark:text-[#f8b4be] shrink-0">Action :</span>
            <span className="text-slate-700 dark:text-slate-300">{banner.action}</span>
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

      {/* 4. Instant Search Toolbar */}
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search vendor name, PAN, group, or amounts..."
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-500 dark:text-slate-400">Total Outstanding Payable:</span>
          <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
            ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* 5. Contained Table with Exact Sticky Blush/Peach Header (Matches Reference Image 3) */}
      <div className="flex-1 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-[#fce8e6] dark:bg-[#3d1922] text-[#601925] dark:text-[#ffb3c0] border-b border-[#f7c5cb] dark:border-[#5e222f] font-semibold">
              {activeTab === 'summary' || activeTab === 'advances' || activeTab === 'receipts' || activeTab === 'non-purchase' ? (
                <tr>
                  <th className="py-2 px-3 w-12 text-center">Sr. No.</th>
                  <th className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      <span>Ledger Name</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                      <Search className="h-2.5 w-2.5 opacity-40 ml-0.5" />
                    </div>
                  </th>
                  <th className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      <span>Primary Group</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                      <Search className="h-2.5 w-2.5 opacity-40 ml-0.5" />
                    </div>
                  </th>
                  <th className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span>Opening Balance</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                      <Search className="h-2.5 w-2.5 opacity-40 ml-0.5" />
                    </div>
                  </th>
                  <th className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span>Debit(Sales) Amount</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                      <Search className="h-2.5 w-2.5 opacity-40 ml-0.5" />
                    </div>
                  </th>
                  <th className="py-2 px-3 text-right">Credit(Purchase) Amount</th>
                  <th className="py-2 px-3 text-right">Closing Balance</th>
                  <th className="py-2 px-3 text-right font-bold text-rose-700 dark:text-rose-300">Net Due (₹)</th>
                </tr>
              ) : activeTab.startsWith('ageing') ? (
                <tr>
                  <th className="py-2 px-3 w-12 text-center">Sr. No.</th>
                  <th className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      <span>Vendor / Creditor Name</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                      <Search className="h-2.5 w-2.5 opacity-40 ml-0.5" />
                    </div>
                  </th>
                  <th className="py-2 px-3">PAN</th>
                  <th className="py-2 px-3 text-right">0 - 30 Days (₹)</th>
                  <th className="py-2 px-3 text-right">31 - 60 Days (₹)</th>
                  <th className="py-2 px-3 text-right">61 - 90 Days (₹)</th>
                  <th className="py-2 px-3 text-right text-rose-600">&gt;90 Days Overdue (₹)</th>
                  <th className="py-2 px-3 text-right font-bold">Total Due (₹)</th>
                </tr>
              ) : (
                <tr>
                  <th className="py-2 px-3 w-12 text-center">Sr. No.</th>
                  <th className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      <span>Ledger / Entity Name</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                      <Search className="h-2.5 w-2.5 opacity-40 ml-0.5" />
                    </div>
                  </th>
                  <th className="py-2 px-3">Group Category</th>
                  <th className="py-2 px-3 text-right">Opening Bal</th>
                  <th className="py-2 px-3 text-right">Debit Sum</th>
                  <th className="py-2 px-3 text-right">Credit Sum</th>
                  <th className="py-2 px-3 text-right">Closing Bal</th>
                  <th className="py-2 px-3 text-center">Audit Issue</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredRows.map((r: any, idx: number) => (
                <tr key={idx} className="hover:bg-orange-50/20 dark:hover:bg-slate-800/40 transition">
                  <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                  {activeTab === 'summary' || activeTab === 'advances' || activeTab === 'receipts' || activeTab === 'non-purchase' ? (
                    <>
                      <td className="py-2 px-3">
                        <span className="text-[#ea580c] dark:text-[#fb923c] hover:underline font-medium cursor-pointer">
                          {r.ledgerName}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{r.primaryGroup || 'Sundry Creditors'}</td>
                      <td className="py-2 px-3 text-right font-mono text-[11px]">
                        {Number(r.openingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[11px]">
                        {Number(r.debitAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[11px]">
                        {Number(r.creditAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[11px]">
                        {Number(r.closingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        ₹{Number(r.netPayable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </>
                  ) : activeTab.startsWith('ageing') ? (
                    <>
                      <td className="py-2 px-3">
                        <span className="text-[#ea580c] dark:text-[#fb923c] hover:underline font-medium cursor-pointer">
                          {r.vendorName}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{r.pan || 'N/A'}</td>
                      <td className="py-2 px-3 text-right font-mono text-[11px]">
                        ₹{Number(r.current_0_30 || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[11px]">
                        ₹{Number(r.bracket_31_60 || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[11px]">
                        ₹{Number(r.bracket_61_90 || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                        ₹{Number(r.bracket_90_plus || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        ₹{Number(r.totalOutstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-2 px-3">
                        <span className="text-[#ea580c] dark:text-[#fb923c] hover:underline font-medium cursor-pointer">
                          {r.ledgerName}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{r.groupName || '-'}</td>
                      <td className="py-2 px-3 text-right font-mono text-[11px]">
                        {Number(r.openingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[11px]">
                        {Number(r.totalDebit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[11px]">
                        {Number(r.totalCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[11px]">
                        {Number(r.closingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60">
                          {r.issueType || 'AUDIT_FLAG'}
                        </span>
                      </td>
                    </>
                  )}
                </tr>
              ))}

              {filteredRows.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No vendor payables or master records found for this parameter.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-purple-500 mb-2" />
                    Calculating vendor dues and aging brackets...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-3.5 py-1.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-[11px] text-slate-500 shrink-0">
          <div>
            Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredRows.length}</span> creditor ledgers
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-slate-400 uppercase">MSME Samadhaan & Sec 43B(h) Audit Tracked</span>
          </div>
        </div>
      </div>

      <ShareDialog
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        reportKey={getCurrentReportKey()}
        reportTitle="Vendor Payables & Aging Report"
        companyId={activeCompanyId}
        filters={{ fromDate, toDate, tab: activeTab }}
      />
    </div>
  );
}
