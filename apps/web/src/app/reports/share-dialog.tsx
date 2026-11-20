'use client';

import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Mail,
  MessageSquare,
  Link as LinkIcon,
  Clock,
  Send,
  ExternalLink,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reportKey: string;
  reportTitle: string;
  companyId: string;
  filters?: any;
}

export function ShareDialog({
  isOpen,
  onClose,
  reportKey,
  reportTitle,
  companyId,
  filters,
}: ShareDialogProps) {
  const [channel, setChannel] = useState<'DIRECT_LINK' | 'WHATSAPP' | 'EMAIL'>('DIRECT_LINK');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [expiresInHours, setExpiresInHours] = useState<number>(168); // 7 days default
  const [remarks, setRemarks] = useState('');
  const [format, setFormat] = useState<'xlsx' | 'pdf'>('xlsx');

  const [loading, setLoading] = useState(false);
  const [shareResult, setShareResult] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateShare = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.shareReport(companyId, reportKey, {
        channel,
        recipientEmail: channel === 'EMAIL' ? recipientEmail : undefined,
        recipientPhone: channel === 'WHATSAPP' ? recipientPhone : undefined,
        expiresInHours,
        filters: { ...filters, format, reportTitle },
        remarks: remarks || undefined,
      });
      setShareResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to generate share link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!shareResult?.shareUrl) return;
    navigator.clipboard.writeText(shareResult.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Share Report
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {reportTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Channels Tab Bar */}
        <div className="mt-5 grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl">
          <button
            type="button"
            onClick={() => { setChannel('DIRECT_LINK'); setShareResult(null); }}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition ${
              channel === 'DIRECT_LINK'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <LinkIcon className="h-3.5 w-3.5" />
            Link
          </button>
          <button
            type="button"
            onClick={() => { setChannel('WHATSAPP'); setShareResult(null); }}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition ${
              channel === 'WHATSAPP'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            WhatsApp
          </button>
          <button
            type="button"
            onClick={() => { setChannel('EMAIL'); setShareResult(null); }}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition ${
              channel === 'EMAIL'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            Email
          </button>
        </div>

        {/* Inputs */}
        <div className="mt-5 space-y-4">
          {/* Format selection */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Export Format
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFormat('xlsx')}
                className={`px-3 py-1 text-xs font-semibold rounded-md border ${
                  format === 'xlsx'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={`px-3 py-1 text-xs font-semibold rounded-md border ${
                  format === 'pdf'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                Branded PDF / Web
              </button>
            </div>
          </div>

          {/* Expiration selection */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Link Validity
            </label>
            <select
              value={expiresInHours}
              onChange={(e) => setExpiresInHours(Number(e.target.value))}
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={24}>24 Hours</option>
              <option value={72}>3 Days</option>
              <option value={168}>7 Days (Recommended)</option>
              <option value={720}>30 Days</option>
            </select>
          </div>

          {channel === 'WHATSAPP' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Recipient WhatsApp Number (Optional)
              </label>
              <input
                type="tel"
                placeholder="e.g. 919876543210"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Include country code without '+' (e.g., 91 for India).
              </p>
            </div>
          )}

          {channel === 'EMAIL' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Recipient Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                placeholder="client@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Remarks / Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Attached sales report for Q3 review"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          {/* Generated Result */}
          {shareResult && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" />
                  Secure Link Ready
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  Expires {new Date(shareResult.expiresAt).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareResult.shareUrl}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-slate-800 dark:text-slate-200 select-all font-mono"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition shrink-0"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              {channel === 'WHATSAPP' && shareResult.whatsappUrl && (
                <a
                  href={shareResult.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition"
                >
                  <MessageSquare className="h-4 w-4" />
                  Open in WhatsApp
                  <ExternalLink className="h-3.5 w-3.5 ml-1 opacity-70" />
                </a>
              )}

              {channel === 'EMAIL' && (
                <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  Report dispatched successfully to {shareResult.recipientEmail}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Close
          </button>
          {!shareResult && (
            <button
              type="button"
              disabled={loading || (channel === 'EMAIL' && !recipientEmail)}
              onClick={handleGenerateShare}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating...
                </>
              ) : channel === 'EMAIL' ? (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Send Email
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5" />
                  Generate Link
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
