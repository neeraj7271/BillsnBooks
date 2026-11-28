'use client';

import React, { useState } from 'react';
import { Button, MoneyText, FormField, Badge } from '@platform/ui';
import { CheckCircle2, Clock, FileText, Landmark, ShieldCheck, ChevronDown, HelpCircle } from 'lucide-react';
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
  const [showAdditionalTerms, setShowAdditionalTerms] = useState(false);
  const [additionalTerms, setAdditionalTerms] = useState('');

  return (
    <div className="space-y-6 pt-2" data-testid="invoice-summary-section">
      {/* 2-Column Grid: Notes & Terms Left, Totals Right (max-w-sm) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Notes & Terms Card */}
        <div className="lg:col-span-7 p-5 rounded-xl bg-surface border border-subtle space-y-4 shadow-card">
          <div className="flex items-center justify-between pb-1 border-b border-subtle">
            <h3 className="text-sm font-bold text-primary">Notes & Terms</h3>
          </div>

          <FormField label="Invoice Notes / Terms & Conditions" id="inv-notes">
            <textarea
              id="inv-notes"
              rows={6}
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="e.g. Payment due within 30 days. Please quote invoice number on remittance..."
              className="w-full rounded-xl border border-default bg-surface p-3 text-xs text-primary focus:outline-none focus:ring-2 focus:ring-focus-ring placeholder:text-muted resize-y"
            />
          </FormField>

          <div className="pt-2 border-t border-subtle flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeBankDetails}
                onChange={(e) => setIncludeBankDetails(e.target.checked)}
                className="h-4 w-4 rounded border-default text-brand focus:ring-focus-ring cursor-pointer"
              />
              <span className="font-semibold text-primary flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5 text-muted" />
                Print Bank & Remittance Details on Invoice
              </span>
              <span
                className="text-muted hover:text-primary cursor-help"
                title="Prints company account number, IFSC code, branch, and UPI QR code on the final statutory invoice per Rule 46(q)."
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </span>
            </label>
            <span className="text-[11px] text-muted font-mono font-medium">Rule 46(q)</span>
          </div>

          {/* Attach Additional Terms Disclosure */}
          <div className="pt-2 border-t border-subtle">
            <button
              type="button"
              onClick={() => setShowAdditionalTerms(!showAdditionalTerms)}
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-text hover:opacity-85 transition-opacity"
            >
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  showAdditionalTerms ? 'rotate-180' : ''
                }`}
              />
              <span>Attach additional terms & statutory disclosures</span>
            </button>

            {showAdditionalTerms && (
              <div className="mt-3 space-y-2">
                <textarea
                  rows={3}
                  value={additionalTerms}
                  onChange={(e) => setAdditionalTerms(e.target.value)}
                  placeholder="Additional contractual terms, arbitration clauses, warranty clauses..."
                  className="w-full rounded-xl border border-default bg-surface p-3 text-xs text-primary focus:outline-none focus:ring-2 focus:ring-focus-ring placeholder:text-muted"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Totals Card (max-w-sm on wide screens) */}
        <div className="lg:col-span-5 max-w-sm ml-auto w-full p-5 rounded-xl bg-surface-sunken space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-subtle">
            <h3 className="text-sm font-bold text-primary">Totals</h3>
            <Badge variant="brand" size="xs">
              {isIntraState ? 'Intra-State' : 'Inter-State'}
            </Badge>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between text-secondary">
              <span>Subtotal</span>
              <MoneyText amount={computedTotals.subtotal} className="tabular-nums font-mono text-right" />
            </div>

            <div className="flex justify-between text-secondary">
              <span>Discount (–)</span>
              <span className="tabular-nums font-mono text-right text-muted">₹ 0.00</span>
            </div>

            <div className="flex justify-between text-secondary font-medium pt-1 border-t border-subtle">
              <span>Taxable</span>
              <MoneyText amount={computedTotals.subtotal} className="tabular-nums font-mono text-right" />
            </div>

            {isIntraState ? (
              <>
                <div className="flex justify-between text-secondary pl-2">
                  <span>CGST</span>
                  <MoneyText amount={computedTotals.totalCgst} className="tabular-nums font-mono text-right" />
                </div>
                <div className="flex justify-between text-secondary pl-2">
                  <span>SGST</span>
                  <MoneyText amount={computedTotals.totalSgst} className="tabular-nums font-mono text-right" />
                </div>
              </>
            ) : (
              <div className="flex justify-between text-secondary pl-2">
                <span>IGST</span>
                <MoneyText amount={computedTotals.totalIgst} className="tabular-nums font-mono text-right" />
              </div>
            )}

            {computedTotals.roundOff !== 0 && (
              <div className="flex justify-between text-muted text-[11px] pt-1 border-t border-subtle">
                <span>Round Off</span>
                <MoneyText amount={computedTotals.roundOff} className="tabular-nums font-mono text-right" />
              </div>
            )}

            {/* Grand Total row separated by 1-px divider above */}
            <div className="pt-3 border-t border-default flex justify-between items-baseline">
              <span className="text-base font-bold text-primary">Grand Total</span>
              <span className="text-base font-bold font-mono text-primary tabular-nums text-right">
                <MoneyText amount={computedTotals.grandTotal} />
              </span>
            </div>
          </div>

          {/* Below the card: GST Rule 46 Compliant ✓ + shortcut hints */}
          <div className="pt-3 border-t border-subtle space-y-1 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-status-success-text">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>GST Rule 46 Compliant ✓</span>
            </div>
            <div className="text-[11px] text-muted">
              ⌘S to Save Draft · ⌘⏎ to Submit
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Action Bar at Bottom */}
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
