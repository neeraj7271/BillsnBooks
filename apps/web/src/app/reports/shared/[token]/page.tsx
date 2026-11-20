'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  FileSpreadsheet,
  Download,
  Printer,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ExternalLink,
  Calendar,
  CheckCircle2,
  Lock,
  Building2,
  FileCheck2,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function SharedReportPage() {
  const params = useParams();
  const token = params?.token as string;

  const [shareData, setShareData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchShare = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.getSharedReport(token);
        setShareData(res);
      } catch (err: any) {
        setError(err.message || 'Shared report link is expired or invalid');
      } finally {
        setLoading(false);
      }
    };

    fetchShare();
  }, [token]);

  const handleDownload = (format: 'xlsx' | 'pdf') => {
    const fromDate = shareData?.filters?.fromDate || '';
    const toDate = shareData?.filters?.toDate || '';
    const reportKey = shareData?.reportKey || 'CUSTOMER_SALES';

    const url = `${API_BASE_URL}/v1/companies/c0000000-0000-4000-8000-000000000001/reports/${reportKey}/export?format=${format}&fromDate=${fromDate}&toDate=${toDate}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Verifying secure share link...
          </p>
        </div>
      </div>
    );
  }

  if (error || !shareData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/50 dark:border-amber-800/50 flex items-center justify-center text-amber-500 mx-auto">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Link Expired or Invalid
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            This secure report sharing link is no longer accessible or has exceeded its expiration period. Please contact the sender to request a refreshed link.
          </p>
        </div>
      </div>
    );
  }

  const isExpired = shareData.expiresAt && new Date(shareData.expiresAt).getTime() < Date.now();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between p-4 sm:p-8">
      <div className="max-w-3xl w-full mx-auto space-y-6">
        {/* Verification banner */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 shadow-sm">
          <div className="flex items-center gap-2 font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Verified Secure Document · End-to-End Encrypted Access</span>
          </div>
          <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
            <Clock className="h-3.5 w-3.5" />
            Expires {new Date(shareData.expiresAt).toLocaleDateString()}
          </span>
        </div>

        {/* Main Document Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl p-6 sm:p-10 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  Shared Report
                </span>
                <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {shareData.reportTitle || shareData.reportKey}
                </h1>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-400">Access Count</span>
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 font-mono">
                {shareData.downloadCount} views
              </div>
            </div>
          </div>

          {/* Report Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
            <div>
              <span className="text-slate-400 font-medium">Period Filter</span>
              <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-200 font-mono">
                {shareData.filters?.fromDate || 'Beginning'} → {shareData.filters?.toDate || 'Latest'}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Verification Status</span>
              <p className="mt-0.5 font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Active & Authenticated
              </p>
            </div>
          </div>

          {/* Action Download Buttons */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Download or View Branded Copy
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleDownload('xlsx')}
                className="flex items-center justify-center gap-2.5 p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition"
              >
                <Download className="h-5 w-5" />
                Download Excel (.xlsx)
              </button>

              <button
                type="button"
                onClick={() => handleDownload('pdf')}
                className="flex items-center justify-center gap-2.5 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 font-semibold text-sm shadow-sm transition"
              >
                <Printer className="h-5 w-5 text-slate-500" />
                Print / View PDF
              </button>
            </div>
          </div>

          {/* Legal / Compliance Footnote */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 leading-relaxed space-y-1">
            <p>
              This document was generated directly from the Antigravity Enterprise Ledger Engine. The contents are confidential and intended exclusively for the authorized recipient.
            </p>
          </div>
        </div>
      </div>

      <footer className="mt-8 text-center text-xs text-slate-400">
        Powered by Antigravity Books · Secure Compliance & Accounting Platform
      </footer>
    </div>
  );
}
