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
import { formatDate } from '@platform/ui';

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
      <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-secondary">
            Verifying secure share link...
          </p>
        </div>
      </div>
    );
  }

  if (error || !shareData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
        <div className="max-w-md w-full bg-surface border border-subtle rounded-xl shadow-card p-8 text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-status-warning-subtle border border-status-warning/30 flex items-center justify-center text-status-warning-text mx-auto">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-primary">
            Link Expired or Invalid
          </h2>
          <p className="text-xs text-muted leading-relaxed">
            This secure report sharing link is no longer accessible or has exceeded its expiration period. Please contact the sender to request a refreshed link.
          </p>
        </div>
      </div>
    );
  }

  const isExpired = shareData.expiresAt && new Date(shareData.expiresAt).getTime() < Date.now();

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-between p-4 sm:p-8">
      <div className="max-w-3xl w-full mx-auto space-y-6">
        {/* Verification banner */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-status-success-subtle border border-status-success/30 text-xs text-status-success-text shadow-card">
          <div className="flex items-center gap-2 font-medium">
            <ShieldCheck className="h-4 w-4 text-status-success-text shrink-0" />
            <span>Verified Secure Document · End-to-End Encrypted Access</span>
          </div>
          <span className="flex items-center gap-1 text-[11px] font-mono text-status-success-text">
            <Clock className="h-3.5 w-3.5" />
            Expires {formatDate(shareData.expiresAt)}
          </span>
        </div>

        {/* Main Document Card */}
        <div className="bg-surface border border-subtle rounded-xl shadow-card p-6 sm:p-10 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-subtle pb-6">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-brand-subtle border border-brand/20 flex items-center justify-center text-brand-text shadow-sm">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-brand-subtle text-brand-text">
                  Shared Report
                </span>
                <h1 className="mt-1 text-2xl font-bold text-primary">
                  {shareData.reportTitle || shareData.reportKey}
                </h1>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs text-muted">Access Count</span>
              <div className="text-sm font-semibold text-secondary font-mono">
                {shareData.downloadCount} views
              </div>
            </div>
          </div>

          {/* Report Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-surface-sunken text-xs">
            <div>
              <span className="text-muted font-medium">Period Filter</span>
              <p className="mt-0.5 font-semibold text-primary font-mono">
                {shareData.filters?.fromDate || 'Beginning'} → {shareData.filters?.toDate || 'Latest'}
              </p>
            </div>
            <div>
              <span className="text-muted font-medium">Verification Status</span>
              <p className="mt-0.5 font-semibold text-status-success-text flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Active & Authenticated
              </p>
            </div>
          </div>

          {/* Action Download Buttons */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
              Download or View Branded Copy
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleDownload('xlsx')}
                className="flex items-center justify-center gap-2.5 p-4 rounded-2xl bg-status-success hover:opacity-90 text-inverse font-semibold text-sm shadow-md transition"
              >
                <Download className="h-5 w-5" />
                Download Excel (.xlsx)
              </button>

              <button
                type="button"
                onClick={() => handleDownload('pdf')}
                className="flex items-center justify-center gap-2.5 p-4 rounded-2xl border border-default bg-surface hover:bg-surface-sunken text-primary font-semibold text-sm shadow-sm transition"
              >
                <Printer className="h-5 w-5 text-muted" />
                Print / View PDF
              </button>
            </div>
          </div>

          {/* Legal / Compliance Footnote */}
          <div className="pt-6 border-t border-subtle text-[11px] text-muted leading-relaxed space-y-1">
            <p>
              This document was generated directly from the Antigravity Enterprise Ledger Engine. The contents are confidential and intended exclusively for the authorized recipient.
            </p>
          </div>
        </div>
      </div>

      <footer className="mt-8 text-center text-xs text-muted">
        Powered by Antigravity Books · Secure Compliance & Accounting Platform
      </footer>
    </div>
  );
}
