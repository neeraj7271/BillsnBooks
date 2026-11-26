'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  FormField,
  Input,
  Select,
  Button,
  Badge,
} from '@platform/ui';
import { Settings, Hash, FileText, CheckCircle2, LayoutTemplate, Check, Layers, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { INVOICE_TEMPLATES, type InvoiceTemplateId } from '../[id]/templates/types';

interface InvoiceSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string;
  docType?: string;
  branchId?: string;
  customInvoiceNumber: string;
  onCustomInvoiceNumberChange: (num: string) => void;
  prefix: string;
  onPrefixChange: (prefix: string) => void;
  suffix: string;
  onSuffixChange: (suffix: string) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  nextSeq?: number;
  autoInvoiceNumber?: string;
  onSeriesUpdated?: () => void;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  TAX_INVOICE: 'Tax Invoice (Sales)',
  CREDIT_NOTE: 'Credit Note (Section 34)',
  DEBIT_NOTE: 'Debit Note (Section 34)',
  PROFORMA_INVOICE: 'Proforma Invoice (Estimate)',
  DELIVERY_CHALLAN: 'Delivery Challan (Jobwork/Logistics)',
};

export function InvoiceSettingsDialog({
  open,
  onOpenChange,
  companyId,
  docType = 'TAX_INVOICE',
  branchId,
  customInvoiceNumber,
  onCustomInvoiceNumberChange,
  prefix,
  onPrefixChange,
  suffix,
  onSuffixChange,
  notes,
  onNotesChange,
  nextSeq = 1,
  autoInvoiceNumber,
  onSeriesUpdated,
}: InvoiceSettingsDialogProps) {
  const [mode, setMode] = useState<'AUTO' | 'CUSTOM'>(
    customInvoiceNumber ? 'CUSTOM' : 'AUTO'
  );
  const [tempCustom, setTempCustom] = useState(customInvoiceNumber);
  const [tempPrefix, setTempPrefix] = useState(prefix || 'INV-');
  const [tempSuffix, setTempSuffix] = useState(suffix || '');
  const [tempStartSeq, setTempStartSeq] = useState<number | string>(nextSeq || 1);
  const [tempSeqPadding, setTempSeqPadding] = useState<string>('5');
  const [tempNotes, setTempNotes] = useState(notes);
  const [defaultTemplate, setDefaultTemplate] = useState<InvoiceTemplateId>('TALLY_CLASSIC');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState(false);

  const docTypeLabel = DOC_TYPE_LABELS[docType] || docType;

  // On open, load the active series from backend if available
  useEffect(() => {
    if (!open) return;
    setError(null);

    try {
      const stored = localStorage.getItem('antigravity_default_invoice_template') as InvoiceTemplateId;
      if (stored && ['TALLY_CLASSIC', 'MODERN_BRAND', 'MINIMAL_COMPACT'].includes(stored)) {
        setDefaultTemplate(stored);
      }
    } catch {
      // Ignore localStorage errors
    }

    if (companyId && docType) {
      apiClient.listNumberingSeries(companyId, docType, branchId)
        .then((seriesList) => {
          if (seriesList && seriesList.length > 0) {
            const active = seriesList.find((s: any) => s.isActive) || seriesList[0];
            if (active) {
              setTempSeqPadding(String(active.seqPadding || 5));
              const currentOrStart = active.currentSeq === 0 ? active.startSeq : active.currentSeq + 1;
              setTempStartSeq(currentOrStart || 1);
              if (active.formatPattern) {
                const parts = active.formatPattern.split('{SEQ}');
                if (parts.length > 0) setTempPrefix(parts[0]);
                if (parts.length > 1) setTempSuffix(parts[1]);
              }
            }
          }
        })
        .catch(() => {
          // Fallback to current props
        });
    }
  }, [open, companyId, docType, branchId]);

  // Compute live preview
  const pad = Number(tempSeqPadding) || 1;
  const seqNum = Math.max(1, Number(tempStartSeq) || 1);
  const seqPadded = pad > 1 ? String(seqNum).padStart(pad, '0') : String(seqNum);
  const previewAuto = `${tempPrefix}${seqPadded}${tempSuffix}`;

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (mode === 'CUSTOM') {
        onCustomInvoiceNumberChange(tempCustom.trim().toUpperCase());
      } else {
        onCustomInvoiceNumberChange('');
        onPrefixChange(tempPrefix.trim());
        onSuffixChange(tempSuffix.trim());

        // Persist to backend active numbering series
        if (companyId && docType) {
          await apiClient.configureActiveNumberingSeries(companyId, {
            docType,
            branchId: branchId || null,
            prefix: tempPrefix.trim(),
            suffix: tempSuffix.trim(),
            startSeq: seqNum,
            seqPadding: pad,
            isManual: false,
          });
          onSeriesUpdated?.();
        }
      }

      onNotesChange(tempNotes);
      try {
        localStorage.setItem('antigravity_default_invoice_template', defaultTemplate);
      } catch {
        // Ignore
      }

      setSavedMsg(true);
      setTimeout(() => {
        setSavedMsg(false);
        onOpenChange(false);
      }, 500);
    } catch (err: any) {
      setError(err?.message || 'Failed to update numbering series configuration.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-brand-subtle border border-default flex items-center justify-center text-brand-text">
              <Settings className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle>Document Numbering & Series Configuration</DialogTitle>
              <DialogDescription className="text-xs">
                Configure starting sequence number, prefixes, suffixes, and numbering modes.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Document Type Scope Banner */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-sunken border border-default text-xs">
          <div className="flex items-center gap-2 text-secondary">
            <Layers className="h-3.5 w-3.5 text-brand-text" />
            <span>Configuring Series for: <strong className="text-primary">{docTypeLabel}</strong></span>
          </div>
          <Badge variant="brand" size="xs">Independent Series</Badge>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-status-danger-subtle border border-status-danger text-xs text-status-danger-text flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-status-danger-text shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {savedMsg && (
          <div className="p-3 rounded-xl bg-status-success-subtle border border-status-success text-xs text-status-success-text font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-status-success-text shrink-0" />
            <span>Series settings saved and applied!</span>
          </div>
        )}

        <form onSubmit={handleApply} className="space-y-4 text-xs">
          {/* Mode Selector */}
          <div>
            <label className="font-semibold text-primary block mb-1.5">
              Numbering Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('AUTO')}
                className={`p-3 rounded-xl border text-left transition ${
                  mode === 'AUTO'
                    ? 'border-brand bg-brand-subtle text-brand-text font-bold shadow-2xs'
                    : 'border-default hover:bg-surface-sunken text-secondary'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Hash className="w-3.5 h-3.5" />
                  <span>Auto-Sequence (GST Compliant)</span>
                </div>
                <div className="text-[11px] opacity-75 font-normal">
                  Atomic sequential counter with customizable starting number
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('CUSTOM')}
                className={`p-3 rounded-xl border text-left transition ${
                  mode === 'CUSTOM'
                    ? 'border-brand bg-brand-subtle text-brand-text font-bold shadow-2xs'
                    : 'border-default hover:bg-surface-sunken text-secondary'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Manual Custom Number</span>
                </div>
                <div className="text-[11px] opacity-75 font-normal">
                  Type any custom document number directly per invoice
                </div>
              </button>
            </div>
          </div>

          {/* Configuration Inputs */}
          {mode === 'CUSTOM' ? (
            <div className="p-3.5 rounded-xl bg-surface-sunken border border-default space-y-2">
              <FormField label="Custom Invoice Number" required id="custom-inv-num">
                <Input
                  id="custom-inv-num"
                  required
                  value={tempCustom}
                  onChange={(e) => setTempCustom(e.target.value.toUpperCase())}
                  placeholder="e.g. INV/2026/001 or TAX/99"
                  className="font-mono uppercase font-bold text-sm"
                />
              </FormField>
              <p className="text-[11px] text-muted">
                This exact custom number will be assigned to this specific document upon creation.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-surface-sunken border border-default space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Prefix" id="seq-prefix">
                  <Input
                    id="seq-prefix"
                    value={tempPrefix}
                    onChange={(e) => setTempPrefix(e.target.value.toUpperCase())}
                    placeholder="e.g. INV- or INV/ or ACME/"
                    className="font-mono uppercase text-xs"
                  />
                </FormField>

                <FormField label="Starting / Next Number" id="seq-start" required>
                  <Input
                    id="seq-start"
                    type="number"
                    min="1"
                    value={tempStartSeq === '' ? '' : tempStartSeq}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTempStartSeq(val === '' ? '' : (parseInt(val, 10) || 1));
                    }}
                    placeholder="1 or 101 or 1001"
                    className="font-mono text-xs font-bold"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Zero Padding (Digits)" id="seq-padding">
                  <Select
                    value={tempSeqPadding}
                    onValueChange={setTempSeqPadding}
                    options={[
                      { label: '5 Digits (e.g. 00001, 00101)', value: '5' },
                      { label: '4 Digits (e.g. 0001, 0101)', value: '4' },
                      { label: '3 Digits (e.g. 001, 101)', value: '3' },
                      { label: 'Exact / No Leading Zeroes (e.g. 1, 101)', value: '1' },
                    ]}
                  />
                </FormField>

                <FormField label="Suffix (Optional)" id="seq-suffix">
                  <Input
                    id="seq-suffix"
                    value={tempSuffix}
                    onChange={(e) => setTempSuffix(e.target.value.toUpperCase())}
                    placeholder="e.g. /26-27 or -MH"
                    className="font-mono uppercase text-xs"
                  />
                </FormField>
              </div>

              {/* Live Preview Display */}
              <div className="pt-2.5 border-t border-default flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] text-secondary font-semibold uppercase tracking-wider block">
                    Next Document Number Preview:
                  </span>
                  <span className="text-[10px] text-muted">
                    Will be allocated to the next {docTypeLabel} saved
                  </span>
                </div>
                <span className="font-mono font-black text-brand-text text-sm px-3 py-1.5 rounded-lg bg-brand-subtle border border-default shadow-2xs">
                  {previewAuto}
                </span>
              </div>
            </div>
          )}

          {/* Default Invoice PDF Template */}
          <div>
            <label className="font-semibold text-primary block mb-1.5 flex items-center gap-1.5">
              <LayoutTemplate className="w-3.5 h-3.5 text-brand-text" />
              <span>Default Invoice PDF Template</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {INVOICE_TEMPLATES.map((tmpl) => {
                const isSelected = defaultTemplate === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => setDefaultTemplate(tmpl.id)}
                    className={`p-2.5 rounded-xl border text-left transition select-none ${
                      isSelected
                        ? 'border-brand bg-brand-subtle text-brand-text font-bold shadow-2xs'
                        : 'border-default hover:bg-surface-sunken text-secondary'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold leading-tight">{tmpl.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-brand-text shrink-0" />}
                    </div>
                    <div className="text-[10px] opacity-75 font-normal line-clamp-2 leading-snug">
                      {tmpl.tagline}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Default Notes & Terms */}
          <FormField label="Invoice Notes / Terms & Conditions" id="inv-notes">
            <Input
              id="inv-notes"
              value={tempNotes}
              onChange={(e) => setTempNotes(e.target.value)}
              placeholder="e.g. Payment due within 30 days."
            />
          </FormField>

          <div className="p-3 rounded-xl bg-surface-sunken border border-default flex items-center justify-between text-xs">
            <div className="text-secondary">
              Company Logo, Signature/DSC & Payment QR
            </div>
            <a
              href="/settings/invoice-branding"
              target="_blank"
              rel="noreferrer"
              className="text-brand-text font-semibold hover:underline"
            >
              Configure Branding →
            </a>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={saving}
            >
              Apply & Save Series
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
