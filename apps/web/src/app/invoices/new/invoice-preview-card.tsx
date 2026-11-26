'use client';

import React from 'react';
import { Card, CardContent, MoneyText, DateText, Button } from '@platform/ui';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import type { LineItem } from './invoice-math';

export type TemplateStyle = 'Minimal' | 'Modern' | 'Tally';

interface InvoicePreviewCardProps {
  templateStyle: TemplateStyle;
  setTemplateStyle: (tpl: TemplateStyle) => void;
  activeCompany: any;
  activeBranch: any;
  documentType: string;
  displayInvoiceNo: string;
  selectedParty: any;
  invoiceDate: string;
  dueDate: string;
  posStateCode: string;
  lineItems: LineItem[];
  computedTotals: any;
  isIntraState: boolean;
  notes: string;
  onBackToEdit?: () => void;
  showBackToEdit?: boolean;
}

export function InvoicePreviewCard({
  templateStyle,
  setTemplateStyle,
  activeCompany,
  activeBranch,
  documentType,
  displayInvoiceNo,
  selectedParty,
  invoiceDate,
  dueDate,
  posStateCode,
  lineItems,
  computedTotals,
  isIntraState,
  notes,
  onBackToEdit,
  showBackToEdit = false,
}: InvoicePreviewCardProps) {
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="space-y-3">
      {/* Top Bar with Template Switcher & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3 rounded-2xl border border-default shadow-xs">
        <div className="flex items-center gap-2">
          {showBackToEdit && onBackToEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onBackToEdit}
              leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
            >
              Back to Edit
            </Button>
          )}
          <span className="text-overline uppercase text-muted font-bold">
            Live GST Invoice Preview
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-surface-sunken p-0.5 border border-default">
            {(['Minimal', 'Modern', 'Tally'] as TemplateStyle[]).map((tpl) => (
              <button
                key={tpl}
                type="button"
                onClick={() => setTemplateStyle(tpl)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  templateStyle === tpl
                    ? 'bg-surface text-primary shadow-xs'
                    : 'text-muted hover:text-primary'
                }`}
              >
                {tpl}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="h-3.5 w-3.5" />}
            title="Print or Export to PDF"
          >
            Print / PDF
          </Button>
        </div>
      </div>

      {/* Styled Invoice Canvas */}
      <Card className="overflow-hidden shadow-sm">
        <div
          className={`p-6 border-b border-subtle flex items-start justify-between ${
            templateStyle === 'Modern'
              ? 'bg-brand-subtle'
              : templateStyle === 'Tally'
              ? 'bg-surface-sunken'
              : 'bg-surface'
          }`}
        >
          <div>
            <div className="text-base font-bold text-primary">
              {activeCompany?.legalName || 'Your Company'}
            </div>
            {(activeBranch?.gstin || activeCompany?.pan) && (
              <div className="font-mono text-xs text-secondary mt-0.5">
                {activeBranch?.gstin ? `GSTIN: ${activeBranch.gstin}` : `PAN: ${activeCompany?.pan}`}
              </div>
            )}
            <div className="text-[11px] text-muted mt-1">
              Rule 46 Tax Invoice · Original for Recipient
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold uppercase tracking-wider text-brand-text">
              {documentType.replace('_', ' ')}
            </div>
            <div className="font-mono text-sm font-black text-primary mt-0.5">
              {displayInvoiceNo}
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-5 text-xs">
          <div className="grid grid-cols-2 gap-6 pb-4 border-b border-subtle">
            <div>
              <div className="text-overline uppercase text-muted font-bold">Billed To (Recipient)</div>
              <div className="font-bold text-sm text-primary mt-1">
                {selectedParty?.name || 'Customer Not Selected'}
              </div>
              {selectedParty?.gstin && (
                <div className="font-mono text-xs text-secondary mt-0.5">
                  GSTIN: {selectedParty.gstin}
                </div>
              )}
              {selectedParty?.pan && (
                <div className="font-mono text-[11px] text-muted">
                  PAN: {selectedParty.pan}
                </div>
              )}
            </div>
            <div className="text-right space-y-1.5">
              <div>
                <span className="text-muted">Invoice Date: </span>
                <DateText date={invoiceDate} className="text-primary font-semibold" />
              </div>
              <div>
                <span className="text-muted">Due Date: </span>
                <DateText date={dueDate} className="text-primary font-semibold" />
              </div>
              <div>
                <span className="text-muted">Place of Supply: </span>
                <span className="font-mono font-bold text-primary">{posStateCode}</span>
                <span className="ml-1 text-[11px] text-muted">
                  ({isIntraState ? 'Intra-State' : 'Inter-State'})
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-12 text-overline uppercase text-muted font-bold pb-1.5 border-b border-subtle">
              <span className="col-span-5">Item Description</span>
              <span className="col-span-2">HSN/SAC</span>
              <span className="col-span-1 text-right">Qty</span>
              <span className="col-span-2 text-right">Rate</span>
              <span className="col-span-2 text-right">Amount</span>
            </div>
            {lineItems.map((l, idx) => {
              const lineAmt =
                (Number(l.quantity) || 0) *
                (Number(l.unitPrice) || 0) *
                (1 - (Number(l.discountPercent) || 0) / 100);
              return (
                <div key={idx} className="grid grid-cols-12 items-center text-xs py-1">
                  <span className="col-span-5 truncate text-primary font-medium">
                    {l.description || `Line Item ${idx + 1}`}
                  </span>
                  <span className="col-span-2 font-mono text-[11px] text-muted">
                    {l.hsnSacCode || '—'}
                  </span>
                  <span className="col-span-1 text-right font-mono tabular-nums text-secondary">
                    {l.quantity} {l.uom}
                  </span>
                  <span className="col-span-2 text-right font-mono tabular-nums text-secondary">
                    <MoneyText amount={l.unitPrice} />
                  </span>
                  <span className="col-span-2 text-right font-mono tabular-nums font-semibold text-primary">
                    <MoneyText amount={lineAmt} />
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-default space-y-2">
            <div className="flex justify-between text-secondary">
              <span>Taxable Value (Subtotal):</span>
              <MoneyText amount={computedTotals.subtotal} className="font-mono tabular-nums" />
            </div>
            {isIntraState ? (
              <>
                <div className="flex justify-between text-secondary">
                  <span>Central Tax (CGST):</span>
                  <MoneyText amount={computedTotals.totalCgst} className="font-mono tabular-nums" />
                </div>
                <div className="flex justify-between text-secondary">
                  <span>State Tax (SGST):</span>
                  <MoneyText amount={computedTotals.totalSgst} className="font-mono tabular-nums" />
                </div>
              </>
            ) : (
              <div className="flex justify-between text-secondary">
                <span>Integrated Tax (IGST):</span>
                <MoneyText amount={computedTotals.totalIgst} className="font-mono tabular-nums" />
              </div>
            )}
            {computedTotals.roundOff !== 0 && (
              <div className="flex justify-between text-muted text-[11px]">
                <span>Round-off:</span>
                <MoneyText amount={computedTotals.roundOff} className="font-mono tabular-nums" />
              </div>
            )}
            <div className="flex justify-between pt-3 border-t border-subtle text-base font-black text-primary">
              <span>Invoice Total (INR):</span>
              <span className="text-brand-text font-mono tabular-nums">
                <MoneyText amount={computedTotals.grandTotal} />
              </span>
            </div>
          </div>

          {notes && (
            <div className="pt-3 border-t border-subtle text-[11px] text-muted">
              <strong className="text-secondary">Terms & Conditions: </strong>
              {notes}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
