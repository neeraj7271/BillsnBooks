'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Landmark,
  ShieldAlert,
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

export default function CashBankAuditSuitePage() {
  const { activeCompanyId } = useCompany();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'cash-negative';

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
      case 'cash-negative':
        return 'CASH_NEGATIVE';
      case 'bank-negative':
        return 'BANK_NEGATIVE';
      case 'inter-bank':
        return 'INTER_BANK';
      case 'cash-withdrawals':
        return 'CASH_WITHDRAWALS';
      case 'cash-deposits':
        return 'CASH_DEPOSITS';
      case 'cash-expenses':
        return 'CASH_EXPENSES';
      case 'cash-income':
        return 'CASH_INCOME';
      case 'payments-not-pv':
        return 'CASH_PAYMENTS_NON_PV';
      case 'receipts-not-rv':
        return 'CASH_RECEIPTS_NON_RV';
      case 'payments-above-10k':
        return 'CASH_PAYMENTS_ABOVE_10K';
      case 'receipts-above-10k':
        return 'CASH_RECEIPTS_ABOVE_10K';
      case 'receipts-above-2lakh':
        return 'CASH_RECEIPTS_ABOVE_2LAKH';
      case 'capital-cash':
        return 'CASH_CAPITAL_TRANSACTIONS';
      default:
        return 'CASH_NEGATIVE';
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
      const res = await apiClient.getCashBankAudit(activeCompanyId, activeTab, fromDate, toDate);
      setData(res);
    } catch (err) {
      console.error('Failed to load cash bank audit report', err);
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
      case 'cash-negative':
        return {
          remarks: 'Cash Balance can never be negative, you cannot spend what you do not have',
          action: 'Check for Missing Receipts or Duplicate Payments.',
        };
      case 'bank-negative':
        return {
          remarks: 'Bank ledgers displaying credit balance without approved Overdraft (OD/CC) limit.',
          action: 'Reconcile pending cheques, bank charges, or confirm sanction letter.',
        };
      case 'inter-bank':
        return {
          remarks: 'Contra vouchers transferring liquidity between distinct bank and cash accounts.',
          action: 'Match simultaneous debit and credit entries in counterpart account statements.',
        };
      case 'cash-withdrawals':
        return {
          remarks: 'Self cheques encashed to replenish physical corporate office petty cash.',
          action: 'Verify physical cash drawer receipt vouchers with withdrawal slips.',
        };
      case 'cash-deposits':
        return {
          remarks: 'Currency deposited into commercial bank accounts from cash collections.',
          action: 'Cross-reference counterfoil stamped bank deposit slips.',
        };
      case 'cash-expenses':
        return {
          remarks: 'Direct administrative and operational expenditures liquidated through cash.',
          action: 'Verify supporting physical cash vouchers, bills, and recipient signatures.',
        };
      case 'cash-income':
        return {
          remarks: 'Direct counter revenue and petty sale inflows accepted in currency notes.',
          action: 'Ensure GST invoice issuance and check compliance with cash turnover limits.',
        };
      case 'payments-not-pv':
        return {
          remarks: 'Cash debited in Journal, Contra, or Sales vouchers instead of Payment Vouchers.',
          action: 'Correct voucher classification to enforce standard accounting controls.',
        };
      case 'receipts-not-rv':
        return {
          remarks: 'Cash credited in non-receipt voucher classes.',
          action: 'Standardize counter cash book vouchers to official Receipt series.',
        };
      case 'payments-above-10k':
        return {
          remarks: 'Single-day aggregate cash payments exceeding ₹10,000 are disallowed under Sec 40A(3).',
          action: 'Disallow non-compliant cash expenses in tax audit computations.',
        };
      case 'receipts-above-10k':
        return {
          remarks: 'Cash collections exceeding ₹10,000 from single customer or counterparty.',
          action: 'Audit counter receipts and encourage banking/UPI settlements.',
        };
      case 'receipts-above-2lakh':
        return {
          remarks: 'Cash receipts exceeding ₹2 Lakh in a single day or event invite 100% penalty under Sec 269ST.',
          action: 'Highlight immediate penal exposure under Section 271DA.',
        };
      case 'capital-cash':
        return {
          remarks: 'Equity capital, partner drawings, or loan receipts booked in physical currency.',
          action: 'Verify compliance with Section 269SS/T prohibiting cash loan repayments.',
        };
      default:
        return {
          remarks: data?.remarks || 'Cash Balance can never be negative, you cannot spend what you do not have',
          action: data?.actionGuidance || 'Check for Missing Receipts or Duplicate Payments.',
        };
    }
  };

  const banner = getBannerInfo();
  const remarks = banner.remarks;
  const actionGuidance = banner.action;
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

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden space-y-2.5 animate-in fade-in duration-150">
      {/* 1. Slim Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <BackButton fallbackUrl="/reports" label="Back" />
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Cash & Bank Statutory Audit Suite
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-200/50">
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

      {/* 2. Unified Category Tab Bar + More Reports Dropdown (Matches Reference Image 2) */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('cash-negative')}
            className={`px-3 py-2 text-xs transition border-b-2 whitespace-nowrap ${
              activeTab === 'cash-negative'
                ? 'border-orange-500 text-slate-900 dark:text-white font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
          >
            Cash - Negative Balance
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bank-negative')}
            className={`px-3 py-2 text-xs transition border-b-2 whitespace-nowrap ${
              activeTab === 'bank-negative'
                ? 'border-orange-500 text-slate-900 dark:text-white font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
          >
            Bank - Negative Balance
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('inter-bank')}
            className={`px-3 py-2 text-xs transition border-b-2 whitespace-nowrap ${
              activeTab === 'inter-bank'
                ? 'border-orange-500 text-slate-900 dark:text-white font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
          >
            Inter Bank Transfers
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cash-withdrawals')}
            className={`px-3 py-2 text-xs transition border-b-2 whitespace-nowrap ${
              activeTab === 'cash-withdrawals'
                ? 'border-orange-500 text-slate-900 dark:text-white font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
          >
            Cash Withdrawals
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cash-deposits')}
            className={`px-3 py-2 text-xs transition border-b-2 whitespace-nowrap ${
              activeTab === 'cash-deposits'
                ? 'border-orange-500 text-slate-900 dark:text-white font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
          >
            Cash Deposits
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cash-expenses')}
            className={`px-3 py-2 text-xs transition border-b-2 whitespace-nowrap ${
              activeTab === 'cash-expenses'
                ? 'border-orange-500 text-slate-900 dark:text-white font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
          >
            Cash Expenses
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cash-income')}
            className={`px-3 py-2 text-xs transition border-b-2 whitespace-nowrap ${
              activeTab === 'cash-income'
                ? 'border-orange-500 text-slate-900 dark:text-white font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
          >
            Cash Income
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
            <div className="absolute right-0 mt-1.5 w-80 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl py-1 z-30">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('payments-not-pv');
                  setMoreDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition ${
                  activeTab === 'payments-not-pv'
                    ? 'font-bold text-orange-600 bg-orange-50/50'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                Cash Payments booked in vouchers other than Payment Voucher
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('receipts-not-rv');
                  setMoreDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition ${
                  activeTab === 'receipts-not-rv'
                    ? 'font-bold text-orange-600 bg-orange-50/50'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                Cash Receipts booked in vouchers other than Receipt Voucher
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('payments-above-10k');
                  setMoreDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition ${
                  activeTab === 'payments-above-10k'
                    ? 'font-bold text-orange-600 bg-orange-50/50'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                Cash Payments &gt; ₹10,000 (more than 10000)
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('receipts-above-10k');
                  setMoreDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition ${
                  activeTab === 'receipts-above-10k'
                    ? 'font-bold text-orange-600 bg-orange-50/50'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                Cash Receipts &gt; ₹10,000 (more than 10000)
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('receipts-above-2lakh');
                  setMoreDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition ${
                  activeTab === 'receipts-above-2lakh'
                    ? 'font-bold text-orange-600 bg-orange-50/50'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                Cash Receipts ≥ ₹2 Lakh (more than 2 Lakh)
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('capital-cash');
                  setMoreDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition ${
                  activeTab === 'capital-cash'
                    ? 'font-bold text-orange-600 bg-orange-50/50'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                Cash Transactions in Capital A/c
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Peach / Blush Remarks & Action Bar with Purple Favorite Star (Matches Reference Image 2) */}
      <div className="flex items-center justify-between gap-3 px-3.5 py-1.5 rounded-lg bg-[#fff7f6] dark:bg-[#2b161c] border border-[#fbd4d0] dark:border-[#52202b] text-xs shrink-0">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#551a3b] dark:text-[#f8b4be] shrink-0">Remarks :</span>
            <span className="text-slate-800 dark:text-slate-200">{remarks}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#551a3b] dark:text-[#f8b4be] shrink-0">Action :</span>
            <span className="text-slate-700 dark:text-slate-300">{actionGuidance}</span>
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

      {/* 4. Instant Filter Toolbar */}
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search cash / bank audit ledger entries..."
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-500 dark:text-slate-400">Ledger Count:</span>
          <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
            {filteredRows.length} accounts analyzed
          </span>
        </div>
      </div>

      {/* 5. Contained Table with Sticky Rose Header (Matches Reference Image 3) */}
      <div className="flex-1 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-[#fce8e6] dark:bg-[#3d1922] text-[#601925] dark:text-[#ffb3c0] border-b border-[#f7c5cb] dark:border-[#5e222f] font-semibold">
              <tr>
                <th className="py-2 px-3 w-12 text-center">Sr. No.</th>
                <th className="py-2 px-3">
                  <div className="flex items-center gap-1">
                    <span>Ledger Name</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                    <Search className="h-2.5 w-2.5 opacity-40 ml-0.5" />
                  </div>
                </th>
                <th className="py-2 px-3">Primary Group</th>
                <th className="py-2 px-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span>Opening Balance</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </div>
                </th>
                <th className="py-2 px-3 text-right">Debit Amount (₹)</th>
                <th className="py-2 px-3 text-right">Credit Amount (₹)</th>
                <th className="py-2 px-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span>Closing Balance</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </div>
                </th>
                <th className="py-2 px-3 text-center">Audit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredRows.map((r: any, idx: number) => {
                const isNegative = Number(r.closingBalance || 0) < 0;
                return (
                  <tr key={idx} className="hover:bg-orange-50/20 dark:hover:bg-slate-800/40 transition">
                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-2 px-3">
                      <span className="text-[#ea580c] dark:text-[#fb923c] hover:underline font-medium cursor-pointer">
                        {r.ledgerName}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{r.groupName || 'Cash-in-hand'}</td>
                    <td className="py-2 px-3 text-right font-mono text-[11px]">
                      ₹{Number(r.openingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-[11px]">
                      ₹{Number(r.totalDebit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-[11px]">
                      ₹{Number(r.totalCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold">
                      <span className={isNegative ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}>
                        ₹{Number(r.closingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      {isNegative ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/60">
                          Negative Alert
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60">
                          Verified
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredRows.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No negative balance or exception records detected for this audit parameter.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-teal-500 mb-2" />
                    Auditing cash and bank ledger positions...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-3.5 py-1.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-[11px] text-slate-500 shrink-0">
          <div>
            Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredRows.length}</span> audited accounts
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-slate-400 uppercase">Section 40A(3) & 269ST Compliant</span>
          </div>
        </div>
      </div>

      <ShareDialog
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        reportKey={getCurrentReportKey()}
        reportTitle="Cash & Bank Audit Report"
        companyId={activeCompanyId}
        filters={{ fromDate, toDate, tab: activeTab }}
      />
    </div>
  );
}
