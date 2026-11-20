'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Clock, FileText, Edit, CheckCircle2, Printer, Sliders } from 'lucide-react';
import { Button, ConfirmDialog } from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { InvoiceHeaderBar } from './invoice-header-bar';
import { InvoiceCustomizerDialog } from './invoice-customizer-dialog';
import {
  type InvoiceTemplateId,
  TallyClassicTemplate,
  ModernBrandTemplate,
  MinimalCompactTemplate,
} from './templates';

export default function InvoiceDetailsPage() {
  const params = useParams();
  const invoiceId = params.id as string;
  const { activeCompanyId, setActiveCompanyId } = useCompany();

  const [invoice, setInvoice] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplateId>('TALLY_CLASSIC');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Customizer Dialog
  const [customizerOpen, setCustomizerOpen] = useState(false);
  // Reject Dialog
  const [rejectOpen, setRejectOpen] = useState(false);
  // Cancel Dialog
  const [cancelOpen, setCancelOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('antigravity_default_invoice_template') as InvoiceTemplateId;
      if (stored && ['TALLY_CLASSIC', 'MODERN_BRAND', 'MINIMAL_COMPACT'].includes(stored)) {
        setSelectedTemplate(stored);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const handleSelectTemplate = (templateId: InvoiceTemplateId) => {
    setSelectedTemplate(templateId);
    try {
      localStorage.setItem('antigravity_default_invoice_template', templateId);
    } catch {
      // Ignore localStorage errors
    }
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = invoice?.invoiceNumber || 'Invoice';
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1500);
  };

  useEffect(() => {
    loadInvoice();
  }, [invoiceId, activeCompanyId]);

  const loadInvoice = async () => {
    setLoading(true);
    try {
      let invoiceData = null;
      let effectiveCompanyId = activeCompanyId;

      try {
        // First attempt with active company
        invoiceData = await apiClient.getInvoice(activeCompanyId, invoiceId);
      } catch {
        // Robust multi-company fallback: find the company that owns this invoice
        const companies = await apiClient.listCompanies();
        for (const comp of companies) {
          if (comp.id !== activeCompanyId) {
            try {
              invoiceData = await apiClient.getInvoice(comp.id, invoiceId);
              if (invoiceData) {
                effectiveCompanyId = comp.id;
                setActiveCompanyId(comp.id);
                break;
              }
            } catch {}
          }
        }
      }

      if (!invoiceData) {
        throw new Error(`Invoice with ID '${invoiceId}' not found.`);
      }

      setInvoice(invoiceData);

      // Fetch company master details for statutory header & signatory branding
      try {
        const companies = await apiClient.listCompanies();
        const comp =
          companies?.find((c: any) => c.id === (invoiceData.companyId || effectiveCompanyId)) ||
          companies?.[0];
        setCompany(comp);

        // Fetch company invoice & branding settings
        const targetCompanyId = invoiceData.companyId || effectiveCompanyId;
        const compSettings = await apiClient.getCompanySettings(targetCompanyId);
        setSettings(compSettings || {});
      } catch {
        // Fallback gracefully
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load invoice';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const targetCompanyId = invoice?.companyId || activeCompanyId;
      await apiClient.approveInvoice(targetCompanyId, invoiceId, 'Approved by reviewer');
      await loadInvoice();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to approve invoice';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReject = async (reason?: string) => {
    setActionLoading(true);
    try {
      const targetCompanyId = invoice?.companyId || activeCompanyId;
      await apiClient.rejectInvoice(targetCompanyId, invoiceId, reason || 'Rejected by reviewer');
      setRejectOpen(false);
      await loadInvoice();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reject invoice';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmCancel = async (reason?: string) => {
    setActionLoading(true);
    try {
      const targetCompanyId = invoice?.companyId || activeCompanyId;
      await apiClient.cancelInvoice(
        targetCompanyId,
        invoiceId,
        reason || 'Cancelled by authorized user',
      );
      setCancelOpen(false);
      await loadInvoice();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel invoice';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        Loading invoice #{invoiceId}...
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-8 text-center text-xs text-rose-500 font-semibold">
        {error || 'Invoice not found'}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 print:m-0 print:p-0 print:max-w-none print:w-full print:space-y-0">
      <InvoiceHeaderBar
        invoice={invoice}
        actionLoading={actionLoading}
        selectedTemplate={selectedTemplate}
        onSelectTemplate={handleSelectTemplate}
        onPrint={handlePrint}
        onApprove={handleApprove}
        onTriggerReject={() => setRejectOpen(true)}
        onTriggerCancel={() => setCancelOpen(true)}
        onOpenCustomizer={() => setCustomizerOpen(true)}
      />

      {invoice.status === 'DRAFT' && (
        <div className="print:hidden p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                <span>Draft Invoice (Unposted)</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-200/70 dark:bg-blue-900/80 text-blue-800 dark:text-blue-200">
                  No GL Impact
                </span>
              </div>
              <div className="text-[11px] text-blue-800/80 dark:text-blue-300/80 mt-0.5">
                This document is saved as a Draft. It has not been posted to the General Ledger and can be revised freely.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              asChild
              leftIcon={<Edit className="h-3.5 w-3.5 text-blue-500" />}
            >
              <Link href={`/invoices/new?cloneFrom=${invoice.id}&mode=edit`}>Edit Draft</Link>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApprove}
              loading={actionLoading}
              leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
            >
              Issue & Post to Books
            </Button>
          </div>
        </div>
      )}

      {invoice.status === 'PENDING_APPROVAL' && (
        <div className="print:hidden p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <span>Pending Maker-Checker Sign-off</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-200/70 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200">
                  Dual-Control
                </span>
              </div>
              <div className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                This high-value invoice (&gt; ₹50,000) is held in quarantine until approved. Approving will automatically post the canonical double-entry sales voucher to general ledger.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              disabled={actionLoading}
              onClick={() => setRejectOpen(true)}
              className="border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50"
            >
              Reject
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApprove}
              loading={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
            >
              Approve & Post to Books
            </Button>
          </div>
        </div>
      )}

      {/* Real A4 Print Preview Canvas / Desk Mat */}
      <div className="preview-stage-mat relative rounded-3xl border border-slate-300/70 dark:border-slate-800 bg-slate-200/60 dark:bg-[#070b12] p-3 sm:p-6 md:p-10 shadow-inner flex flex-col items-center overflow-x-auto print:p-0 print:m-0 print:border-none print:bg-transparent print:shadow-none print:block">
        {/* Document Preview Inspector / Header Strip */}
        <div className="w-full max-w-[210mm] mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-600 dark:text-slate-400 print:hidden select-none px-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-100 text-xs tracking-wider uppercase whitespace-nowrap">
              A4 Print Preview
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/90 dark:bg-slate-800/90 font-semibold text-slate-700 dark:text-slate-300 border border-slate-300/70 dark:border-slate-700 whitespace-nowrap shadow-2xs">
              210 × 297 mm • ISO 216
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden md:inline whitespace-nowrap">
              • 100% Print Scale (WYSIWYG)
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono font-medium text-slate-600 dark:text-slate-300 bg-white/90 dark:bg-slate-800/90 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 whitespace-nowrap shadow-2xs">
              Sheet 1 of 1
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCustomizerOpen(true)}
              leftIcon={<Sliders className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
              className="whitespace-nowrap px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 shadow-2xs"
            >
              Branding & QR
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePrint}
              leftIcon={<Printer className="h-3.5 w-3.5 shrink-0" />}
              className="whitespace-nowrap px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            >
              Print / Save PDF
            </Button>
          </div>
        </div>

        {/* Physical A4 Sheet Container */}
        <div
          id="printable-invoice"
          className="printable-document w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3),0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_25px_70px_-10px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.08)] rounded-[2px] px-[12mm] py-[10mm] box-border transition-all print:p-0 print:m-0 print:max-w-none print:w-full print:min-h-0 print:shadow-none print:border-none print:rounded-none"
        >
          {selectedTemplate === 'TALLY_CLASSIC' && (
            <TallyClassicTemplate invoice={invoice} company={company} settings={settings} />
          )}
          {selectedTemplate === 'MODERN_BRAND' && (
            <ModernBrandTemplate invoice={invoice} company={company} settings={settings} />
          )}
          {selectedTemplate === 'MINIMAL_COMPACT' && (
            <MinimalCompactTemplate invoice={invoice} company={company} settings={settings} />
          )}
        </div>

        {/* Preview Footer Cue */}
        <div className="w-full max-w-[210mm] mt-3.5 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 print:hidden select-none px-1">
          <span>End of Sheet • A4 Standard Portrait (210 × 297 mm)</span>
          <span className="font-mono text-[10px]">Exact Print Preview</span>
        </div>
      </div>

      <InvoiceCustomizerDialog
        open={customizerOpen}
        onOpenChange={setCustomizerOpen}
        companyId={invoice?.companyId || activeCompanyId}
        initialSettings={settings}
        onSaved={loadInvoice}
      />

      <ConfirmDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject Invoice"
        description="Provide a reason for rejecting this invoice. The author will be notified to revise the transaction."
        confirmLabel="Confirm Rejection"
        tone="danger"
        promptPlaceholder="Enter reason for rejection..."
        loading={actionLoading}
        onConfirm={handleConfirmReject}
      />

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={`Cancel Tax Invoice #${invoice.invoiceNumber}`}
        description="Statutory Cancellation: Cancelling will mark this document as CANCELLED in the register, reverse its General Ledger postings, and maintain the sequence for GST compliance. Enter a statutory reason:"
        confirmLabel="Confirm Cancellation"
        tone="danger"
        promptPlaceholder="e.g. Order cancelled prior to dispatch / Rate calculation error"
        loading={actionLoading}
        onConfirm={handleConfirmCancel}
      />
    </div>
  );
}
