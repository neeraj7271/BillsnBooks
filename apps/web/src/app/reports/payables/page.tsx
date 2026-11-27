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
import { toast, DateRangePicker } from '@platform/ui';
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
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-surface px-3.5 py-2 rounded-lg border border-default shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <BackButton fallbackUrl="/reports" label="Back" />
          <div className="h-4 w-px bg-border-default" />
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-primary">
              Vendor Payables & Master Hygiene Suite
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

      {/* 2. Unified Category Tab Bar + More Reports Dropdown */}
      <div className="flex items-center justify-between border-b border-default bg-surface px-3 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`px-3 py-2 text-xs transition border-b-2 whitespace-nowrap ${
              activeTab === 'summary'
                ? 'border-brand text-primary font-bold'
                : 'border-transparent text-secondary hover:text-primary font-medium'
            }`}
          >
            Payables Summary
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ageing-tally')}
            className={`px-3 py-2 text-xs transition border-b-2 whitespace-nowrap ${
              activeTab === 'ageing-tally'
                ? 'border-brand text-primary font-bold'
                : 'border-transparent text-secondary hover:text-primary font-medium'
            }`}
          >
            Payables Ageing - Tally
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ageing-fifo')}
            className={`px-3 py-2 text-xs transition border-b-2 whitespace-nowrap ${
              activeTab === 'ageing-fifo'
                ? 'border-brand text-primary font-bold'
                : 'border-transparent text-secondary hover:text-primary font-medium'
            }`}
          >
            Payables Ageing - FIFO
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('advances')}
            className={`px-3 py-2 text-xs transition border-b-2 whitespace-nowrap ${
              activeTab === 'advances'
                ? 'border-brand text-primary font-bold'
                : 'border-transparent text-secondary hover:text-primary font-medium'
            }`}
          >
            Advance to Vendors
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('receipts')}
            className={`px-3 py-2 text-xs transition border-b-2 whitespace-nowrap ${
              activeTab === 'receipts'
                ? 'border-brand text-primary font-bold'
                : 'border-transparent text-secondary hover:text-primary font-medium'
            }`}
          >
            Receipts from Vendors
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('non-purchase')}
            className={`px-3 py-2 text-xs transition border-b-2 whitespace-nowrap ${
              activeTab === 'non-purchase'
                ? 'border-brand text-primary font-bold'
                : 'border-transparent text-secondary hover:text-primary font-medium'
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
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded border border-default bg-surface text-primary hover:bg-surface-sunken transition"
          >
            <span>More Reports</span>
            <ChevronDown className="h-3 w-3 text-muted" />
          </button>
          {moreDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-72 rounded-lg border border-default bg-surface-overlay shadow-xl py-1 z-30">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('squared-off');
                  setMoreDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-xs hover:bg-surface-sunken transition ${
                  activeTab === 'squared-off'
                    ? 'font-bold text-brand-text bg-brand-subtle'
                    : 'text-secondary'
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
                className={`w-full text-left px-4 py-2 text-xs hover:bg-surface-sunken transition ${
                  activeTab === 'same-balance'
                    ? 'font-bold text-brand-text bg-brand-subtle'
                    : 'text-secondary'
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
                className={`w-full text-left px-4 py-2 text-xs hover:bg-surface-sunken transition ${
                  activeTab === 'unused'
                    ? 'font-bold text-brand-text bg-brand-subtle'
                    : 'text-secondary'
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
                className={`w-full text-left px-4 py-2 text-xs hover:bg-surface-sunken transition ${
                  activeTab === 'missing-pan'
                    ? 'font-bold text-brand-text bg-brand-subtle'
                    : 'text-secondary'
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
                className={`w-full text-left px-4 py-2 text-xs hover:bg-surface-sunken transition ${
                  activeTab === 'missing-gstin'
                    ? 'font-bold text-brand-text bg-brand-subtle'
                    : 'text-secondary'
                }`}
              >
                Ledgers - GSTIN Unavailable
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

      {/* 4. Instant Search Toolbar */}
      <div className="flex items-center justify-between gap-3 bg-surface px-3.5 py-1.5 rounded-lg border border-default shadow-sm shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-muted" />
          <input
            type="text"
            placeholder="Search vendor name, PAN, group, or amounts..."
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-xs rounded-md border border-default bg-surface-sunken text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-focus-ring"
          />
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted">Total Outstanding Payable:</span>
          <span className="font-mono font-bold text-status-danger-text">
            ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* 5. Contained Table with Sticky Header */}
      <div className="flex-1 overflow-hidden rounded-lg border border-default bg-surface shadow-sm flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-surface-sunken text-secondary border-b border-default font-semibold">
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
                  <th className="py-2 px-3 text-right font-bold text-status-danger-text">Net Due (₹)</th>
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
                  <th className="py-2 px-3 text-right text-status-danger-text">&gt;90 Days Overdue (₹)</th>
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
            <tbody className="divide-y divide-border-subtle">
              {filteredRows.map((r: any, idx: number) => (
                <tr key={idx} className="hover:bg-row-hover transition">
                  <td className="py-2 px-3 text-center text-muted font-mono text-[11px]">{idx + 1}</td>
                  {activeTab === 'summary' || activeTab === 'advances' || activeTab === 'receipts' || activeTab === 'non-purchase' ? (
                    <>
                      <td className="py-2 px-3">
                        <span className="text-brand-text hover:underline font-medium cursor-pointer">
                          {r.ledgerName}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-secondary">{r.primaryGroup || 'Sundry Creditors'}</td>
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
                      <td className="py-2 px-3 text-right font-mono font-bold text-status-danger-text">
                        ₹{Number(r.netPayable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </>
                  ) : activeTab.startsWith('ageing') ? (
                    <>
                      <td className="py-2 px-3">
                        <span className="text-brand-text hover:underline font-medium cursor-pointer">
                          {r.vendorName}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-muted">{r.pan || 'N/A'}</td>
                      <td className="py-2 px-3 text-right font-mono text-[11px]">
                        ₹{Number(r.current_0_30 || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[11px]">
                        ₹{Number(r.bracket_31_60 || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[11px]">
                        ₹{Number(r.bracket_61_90 || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[11px] font-semibold text-status-danger-text">
                        ₹{Number(r.bracket_90_plus || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-primary">
                        ₹{Number(r.totalOutstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-2 px-3">
                        <span className="text-brand-text hover:underline font-medium cursor-pointer">
                          {r.ledgerName}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-secondary">{r.groupName || '-'}</td>
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
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-status-warning-subtle text-status-warning-text border border-status-warning/30">
                          {r.issueType || 'AUDIT_FLAG'}
                        </span>
                      </td>
                    </>
                  )}
                </tr>
              ))}

              {filteredRows.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted text-xs">
                    No vendor payables or master records found for this parameter.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted text-xs">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-brand-text mb-2" />
                    Calculating vendor dues and aging brackets...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-3.5 py-1.5 border-t border-default bg-surface-sunken text-[11px] text-muted shrink-0">
          <div>
            Showing <span className="font-semibold text-secondary">{filteredRows.length}</span> creditor ledgers
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-muted uppercase">MSME Samadhaan & Sec 43B(h) Audit Tracked</span>
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
