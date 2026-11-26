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
      <div className="relative w-full max-w-lg rounded-2xl bg-surface border border-default shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-brand-subtle border border-brand/20 flex items-center justify-center text-brand-text">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-primary">
                Share Report
              </h3>
              <p className="text-xs text-muted">
                {reportTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:text-primary hover:bg-surface-sunken transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Channels Tab Bar */}
        <div className="mt-5 grid grid-cols-3 gap-2 p-1 bg-surface-sunken rounded-xl">
          <button
            type="button"
            onClick={() => { setChannel('DIRECT_LINK'); setShareResult(null); }}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition ${
              channel === 'DIRECT_LINK'
                ? 'bg-surface text-brand-text shadow-sm'
                : 'text-secondary hover:text-primary'
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
                ? 'bg-surface text-status-success-text shadow-sm'
                : 'text-secondary hover:text-primary'
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
                ? 'bg-surface text-status-info-text shadow-sm'
                : 'text-secondary hover:text-primary'
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
            <label className="text-xs font-medium text-secondary">
              Export Format
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFormat('xlsx')}
                className={`px-3 py-1 text-xs font-semibold rounded-md border ${
                  format === 'xlsx'
                    ? 'border-status-success bg-status-success-subtle text-status-success-text'
                    : 'border-default text-secondary'
                }`}
              >
                Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={`px-3 py-1 text-xs font-semibold rounded-md border ${
                  format === 'pdf'
                    ? 'border-status-info bg-status-info-subtle text-status-info-text'
                    : 'border-default text-secondary'
                }`}
              >
                Branded PDF / Web
              </button>
            </div>
          </div>

          {/* Expiration selection */}
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">
              Link Validity
            </label>
            <select
              value={expiresInHours}
              onChange={(e) => setExpiresInHours(Number(e.target.value))}
              className="w-full text-xs rounded-lg border border-default bg-surface px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-focus-ring"
            >
              <option value={24}>24 Hours</option>
              <option value={72}>3 Days</option>
              <option value={168}>7 Days (Recommended)</option>
              <option value={720}>30 Days</option>
            </select>
          </div>

          {channel === 'WHATSAPP' && (
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">
                Recipient WhatsApp Number (Optional)
              </label>
              <input
                type="tel"
                placeholder="e.g. 919876543210"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="w-full text-xs rounded-lg border border-default bg-surface px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-focus-ring"
              />
              <p className="text-[11px] text-muted mt-1">
                Include country code without '+' (e.g., 91 for India).
              </p>
            </div>
          )}

          {channel === 'EMAIL' && (
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">
                Recipient Email <span className="text-status-danger-text">*</span>
              </label>
              <input
                type="email"
                placeholder="client@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full text-xs rounded-lg border border-default bg-surface px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-focus-ring"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-secondary mb-1">
              Remarks / Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Attached sales report for Q3 review"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full text-xs rounded-lg border border-default bg-surface px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-focus-ring"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-status-danger-subtle border border-status-danger/30 text-xs text-status-danger-text">
              {error}
            </div>
          )}

          {/* Generated Result */}
          {shareResult && (
            <div className="p-3.5 rounded-xl bg-surface-sunken border border-default space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-status-success-text">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" />
                  Secure Link Ready
                </span>
                <span className="text-[11px] text-muted font-normal">
                  Expires {new Date(shareResult.expiresAt).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareResult.shareUrl}
                  className="w-full text-xs rounded-lg border border-default bg-surface px-3 py-1.5 text-primary select-all font-mono"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand text-inverse text-xs font-medium hover:bg-brand-hover transition shrink-0"
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
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-status-success hover:opacity-90 text-inverse text-xs font-semibold transition"
                >
                  <MessageSquare className="h-4 w-4" />
                  Open in WhatsApp
                  <ExternalLink className="h-3.5 w-3.5 ml-1 opacity-70" />
                </a>
              )}

              {channel === 'EMAIL' && (
                <div className="text-[11px] text-secondary flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-status-success-text" />
                  Report dispatched successfully to {shareResult.recipientEmail}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-subtle">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg text-secondary hover:bg-surface-sunken transition"
          >
            Close
          </button>
          {!shareResult && (
            <button
              type="button"
              disabled={loading || (channel === 'EMAIL' && !recipientEmail)}
              onClick={handleGenerateShare}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-brand hover:bg-brand-hover text-inverse shadow-sm transition disabled:opacity-50"
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
