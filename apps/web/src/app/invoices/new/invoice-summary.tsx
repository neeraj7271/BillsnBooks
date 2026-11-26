'use client';

import React, { useState } from 'react';
import { Card, CardContent, Button, MoneyText, FormField, Badge } from '@platform/ui';
import { CheckCircle2, Clock, FileText, Landmark, ShieldCheck } from 'lucide-react';
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
  const [includeBankDetails, setIncludeBankDetails] = useState(true);
  const isHighValue = computedTotals.grandTotal > 50000;

  return (
    <div className="space-y-6 pt-2">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Fieldset 5 — Notes & Terms */}
        <fieldset className="lg:col-span-6 p-5 rounded-2xl bg-surface border border-default space-y-4">
          <legend className="px-2 text-xs font-bold uppercase tracking-wider text-secondary">
            5. Notes, Terms & Settlement Instructions
          </legend>

          <FormField label="Invoice Notes / Terms & Conditions" id="inv-notes">
            <textarea
              id="inv-notes"
              rows={3}
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="e.g. Payment due within 30 days. Please quote invoice number on remittance..."
              className="w-full rounded-xl border border-default bg-surface p-3 text-xs text-primary focus:outline-none focus:ring-2 focus:ring-focus-ring placeholder:text-muted"
            />
          </FormField>

          <div className="pt-2 border-t border-subtle flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeBankDetails}
                onChange={(e) => setIncludeBankDetails(e.target.checked)}
                className="h-4 w-4 rounded border-default text-brand focus:ring-focus-ring"
              />
              <span className="font-semibold text-primary flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5 text-muted" />
                Print Bank & Remittance Details on Invoice
              </span>
            </label>
            <span className="text-[11px] text-muted">Rule 46(q)</span>
          </div>

          {isHighValue && (
            <div className="p-3 rounded-xl bg-status-warning-subtle border border-status-warning text-xs flex items-center gap-2.5">
              <Clock className="h-4 w-4 text-status-warning-text shrink-0" />
              <div className="text-status-warning-text">
                <span className="font-bold">Maker-Checker Quarantine:</span> Invoices &gt; ₹50,000 will require partner approval before final General Ledger posting.
              </div>
            </div>
          )}
        </fieldset>

        {/* Fieldset 4 — Totals */}
        <fieldset className="lg:col-span-6 p-5 rounded-2xl bg-surface-sunken border border-default space-y-3">
          <legend className="px-2 text-xs font-bold uppercase tracking-wider text-secondary">
            4. Statutory Tax & Value Breakdown
          </legend>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-secondary">
              <span>Taxable Value (Subtotal):</span>
              <MoneyText amount={computedTotals.subtotal} className="tabular-nums font-mono" />
            </div>

            {isIntraState ? (
              <>
                <div className="flex justify-between text-secondary">
                  <span>Central GST (CGST):</span>
                  <MoneyText amount={computedTotals.totalCgst} className="tabular-nums font-mono" />
                </div>
                <div className="flex justify-between text-secondary">
                  <span>State GST (SGST):</span>
                  <MoneyText amount={computedTotals.totalSgst} className="tabular-nums font-mono" />
                </div>
              </>
            ) : (
              <div className="flex justify-between text-secondary">
                <span>Integrated GST (IGST):</span>
                <MoneyText amount={computedTotals.totalIgst} className="tabular-nums font-mono" />
              </div>
            )}

            {computedTotals.roundOff !== 0 && (
              <div className="flex justify-between text-muted text-[11px]">
                <span>Round-off Adjustment:</span>
                <MoneyText amount={computedTotals.roundOff} className="tabular-nums font-mono" />
              </div>
            )}

            {/* Grand Total */}
            <div className="mt-3 p-3.5 rounded-xl bg-surface border border-subtle flex justify-between items-baseline shadow-xs">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-secondary block">
                  Total Amount Due
                </span>
                <span className="text-[10px] text-muted">Inclusive of all applicable GST</span>
              </div>
              <span className="text-xl font-black font-mono text-brand-text tabular-nums">
                <MoneyText amount={computedTotals.grandTotal} />
              </span>
            </div>
          </div>
        </fieldset>
      </div>

      {/* Sticky Action Bar at Bottom-Right */}
      <div className="sticky bottom-0 z-20 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-4 bg-surface/95 backdrop-blur-md border-t border-default flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2 text-caption text-muted">
          <ShieldCheck className="w-4 h-4 text-status-success-text" />
          <span>GST Rule 46 Compliant</span>
          <span className="hidden md:inline">· ⌘S to Save Draft · ⌘↵ to Submit</span>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {onSaveDraft && (
            <Button
              type="button"
              variant="outline"
              size="md"
              disabled={submitting || submittingDraft}
              loading={submittingDraft}
              onClick={onSaveDraft}
              leftIcon={<FileText className="h-4 w-4" />}
            >
              Save as Draft
            </Button>
          )}

          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={submitting || submittingDraft}
            loading={submitting}
            onClick={onSubmit}
            leftIcon={<CheckCircle2 className="h-4 w-4" />}
          >
            Save & Submit for Approval
          </Button>
        </div>
      </div>
    </div>
  );
}

