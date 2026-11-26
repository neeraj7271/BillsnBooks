'use client';

import React from 'react';
import { Card, CardContent, Button, MoneyText, FormField, Input, Badge } from '@platform/ui';
import { CheckCircle2, Clock, FileText, ShieldCheck } from 'lucide-react';
import type { ComputedInvoiceTotals } from './invoice-math';

interface InvoiceSummaryProps {
  computedTotals: ComputedInvoiceTotals;
  isIntraState: boolean;
  notes: string;
  submitting: boolean;
  submittingDraft?: boolean;
  onNotesChange: (notes: string) => void;
  onSubmit: () => void;
  onSaveDraft?: () => void;
}

export function InvoiceSummary({
  computedTotals,
  isIntraState,
  notes,
  submitting,
  submittingDraft = false,
  onNotesChange,
  onSubmit,
  onSaveDraft,
}: InvoiceSummaryProps) {
  const isHighValue = computedTotals.grandTotal > 50000;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border border-strong">
      <div>
        <FormField label="Invoice Notes / Terms & Conditions" id="inv-notes">
          <Input
            id="inv-notes"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Payment due within 30 days..."
          />
        </FormField>

        {isHighValue && (
          <div className="mt-4 p-3 rounded-xl bg-status-warning-subtle bg-status-warning border border-status-warning border-status-warning text-xs flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-status-warning-text text-status-warning-text shrink-0" />
            <div className="text-status-warning-text text-status-warning-text">
              <span className="font-bold">Maker-Checker Quarantine:</span> Invoices &gt; ₹50,000 will be held in the Approval Inbox for CA partner sign-off before posting to general ledger.
            </div>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-4 space-y-2.5 text-xs">
          <div className="flex justify-between text-secondary text-muted">
            <span>Taxable Subtotal:</span>
            <MoneyText amount={computedTotals.subtotal} />
          </div>

          {isIntraState ? (
            <>
              <div className="flex justify-between text-secondary text-muted">
                <span>Central GST (CGST):</span>
                <MoneyText amount={computedTotals.totalCgst} />
              </div>
              <div className="flex justify-between text-secondary text-muted">
                <span>State GST (SGST):</span>
                <MoneyText amount={computedTotals.totalSgst} />
              </div>
            </>
          ) : (
            <div className="flex justify-between text-secondary text-muted">
              <span>Integrated GST (IGST):</span>
              <MoneyText amount={computedTotals.totalIgst} />
            </div>
          )}

          {computedTotals.roundOff !== 0 && (
            <div className="flex justify-between text-muted text-[11px]">
              <span>Round-off:</span>
              <MoneyText amount={computedTotals.roundOff} />
            </div>
          )}

          {/* Highlighted Total Amount Due */}
          <div className="mt-3 p-3 rounded-xl bg-canvas bg-surface-raised border border-subtle border-strong flex justify-between items-baseline">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary text-muted">Total Amount Due:</span>
            <span className="text-xl font-black font-mono text-brand-text text-brand">
              <MoneyText amount={computedTotals.grandTotal} />
            </span>
          </div>

          {/* Action CTAs: Hero Create & Secondary Draft */}
          <div className="pt-3 space-y-2.5">
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting || submittingDraft}
              className="w-full h-11 px-6 rounded-xl bg-gradient-to-r from-brand via-brand to-brand hover:from-brand hover:via-brand hover:to-brand active:scale-[0.99] text-white font-bold text-sm shadow-md hover:shadow-lg hover:shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating Invoice & Posting...
                </span>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-brand group-hover:scale-110 transition-transform" />
                  <span className="tracking-wide">Create Tax Invoice & Post</span>
                  <span className="text-brand text-xs font-normal ml-0.5 group-hover:translate-x-0.5 transition-transform">→</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between px-1">
              {onSaveDraft ? (
                <button
                  type="button"
                  onClick={onSaveDraft}
                  disabled={submitting || submittingDraft}
                  className="text-xs font-medium text-muted hover:text-primary text-muted hover:text-primary-inverse flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-surface-sunken hover:bg-surface-raised transition cursor-pointer disabled:opacity-50"
                >
                  <FileText className="h-3.5 w-3.5 text-muted" />
                  <span>{submittingDraft ? 'Saving Draft...' : 'Save as Unposted Draft'}</span>
                </button>
              ) : <div />}

              <span className="text-[11px] text-muted flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-status-success-text" />
                GST Section 31
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

