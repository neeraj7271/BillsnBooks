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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-slate-800">
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
          <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="text-amber-800 dark:text-amber-300">
              <span className="font-bold">Maker-Checker Quarantine:</span> Invoices &gt; ₹50,000 will be held in the Approval Inbox for CA partner sign-off before posting to general ledger.
            </div>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-4 space-y-2.5 text-xs">
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Taxable Subtotal:</span>
            <MoneyText amount={computedTotals.subtotal} />
          </div>

          {isIntraState ? (
            <>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Central GST (CGST):</span>
                <MoneyText amount={computedTotals.totalCgst} />
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>State GST (SGST):</span>
                <MoneyText amount={computedTotals.totalSgst} />
              </div>
            </>
          ) : (
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Integrated GST (IGST):</span>
              <MoneyText amount={computedTotals.totalIgst} />
            </div>
          )}

          {computedTotals.roundOff !== 0 && (
            <div className="flex justify-between text-slate-400 text-[11px]">
              <span>Round-off:</span>
              <MoneyText amount={computedTotals.roundOff} />
            </div>
          )}

          {/* Highlighted Total Amount Due */}
          <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex justify-between items-baseline">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Total Amount Due:</span>
            <span className="text-xl font-black font-mono text-blue-600 dark:text-blue-400">
              <MoneyText amount={computedTotals.grandTotal} />
            </span>
          </div>

          {/* Action CTAs: Hero Create & Secondary Draft */}
          <div className="pt-3 space-y-2.5">
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting || submittingDraft}
              className="w-full h-11 px-6 rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-700 hover:via-blue-700 hover:to-indigo-700 active:scale-[0.99] text-white font-bold text-sm shadow-md hover:shadow-lg hover:shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating Invoice & Posting...
                </span>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-blue-200 group-hover:scale-110 transition-transform" />
                  <span className="tracking-wide">Create Tax Invoice & Post</span>
                  <span className="text-blue-200 text-xs font-normal ml-0.5 group-hover:translate-x-0.5 transition-transform">→</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between px-1">
              {onSaveDraft ? (
                <button
                  type="button"
                  onClick={onSaveDraft}
                  disabled={submitting || submittingDraft}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
                >
                  <FileText className="h-3.5 w-3.5 text-slate-400" />
                  <span>{submittingDraft ? 'Saving Draft...' : 'Save as Unposted Draft'}</span>
                </button>
              ) : <div />}

              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                GST Section 31
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

