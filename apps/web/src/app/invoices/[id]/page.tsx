'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Clock, FileText, Edit, CheckCircle2, Printer, Sliders } from 'lucide-react';
import { Button, ConfirmDialog, DetailPage, Card, CardHeader, CardTitle, CardContent, Badge, MoneyText, DateText } from '@platform/ui';
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
      <div className="p-12 text-center text-xs text-muted">
        Loading invoice #{invoiceId}...
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-8 text-center text-xs text-status-danger-text font-semibold">
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
        <div className="print:hidden p-4 rounded-2xl bg-brand-subtle bg-brand/30 border border-focus border-focus flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-subtle bg-brand/60 text-brand-text text-brand shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-brand-text text-brand flex items-center gap-2">
                <span>Draft Invoice (Unposted)</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-brand-subtle/70 bg-brand/80 text-brand-text text-brand">
                  No GL Impact
                </span>
              </div>
              <div className="text-[11px] text-brand-text text-brand mt-0.5">
                This document is saved as a Draft. It has not been posted to the General Ledger and can be revised freely.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              asChild
              leftIcon={<Edit className="h-3.5 w-3.5 text-brand-text" />}
            >
              <Link href={`/invoices/new?cloneFrom=${invoice.id}&mode=edit`}>Edit Draft</Link>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApprove}
              loading={actionLoading}
              leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
              className="bg-brand hover:bg-brand text-white font-semibold shadow-xs"
            >
              Issue & Post to Books
            </Button>
          </div>
        </div>
      )}

      {invoice.status === 'PENDING_APPROVAL' && (
        <div className="print:hidden p-4 rounded-2xl bg-status-warning-subtle bg-status-warning border border-status-warning border-status-warning flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-xl bg-status-warning-subtle bg-status-warning text-status-warning-text text-status-warning-text shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-status-warning-text text-status-warning-text flex items-center gap-2">
                <span>Pending Maker-Checker Sign-off</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-status-warning-subtle bg-status-warning text-status-warning-text text-status-warning-text">
                  Dual-Control
                </span>
              </div>
              <div className="text-[11px] text-status-warning-text text-status-warning-text mt-0.5">
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
              className="border-status-warning border-status-warning text-status-warning-text text-status-warning-text hover:bg-status-warning-subtle hover:bg-status-warning"
            >
              Reject
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApprove}
              loading={actionLoading}
              className="bg-status-success hover:bg-status-success text-white font-semibold shadow-xs"
            >
              Approve & Post to Books
            </Button>
          </div>
        </div>
      )}

      <DetailPage
        header={null}
        main={
          <div className="preview-stage-mat relative rounded-xl border border-border bg-surface-sunken p-3 sm:p-5 flex flex-col items-center overflow-x-auto print:p-0 print:m-0 print:border-none print:bg-transparent print:block">
            <div className="w-full max-w-[210mm] mb-3 flex flex-wrap items-center justify-between gap-2 text-caption text-secondary print:hidden">
              <span className="font-semibold text-primary">A4 Print Preview (210 × 297 mm)</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCustomizerOpen(true)} leftIcon={<Sliders className="h-3.5 w-3.5" />}>
                  Branding &amp; QR
                </Button>
                <Button variant="primary" size="sm" onClick={handlePrint} leftIcon={<Printer className="h-3.5 w-3.5" />}>
                  Print / Save PDF
                </Button>
              </div>
            </div>
            <div
              id="printable-invoice"
              className="printable-document w-full max-w-[210mm] min-h-[297mm] bg-white text-primary shadow-md rounded-sm px-[12mm] py-[10mm] box-border print:p-0 print:m-0 print:max-w-none print:w-full print:min-h-0 print:shadow-none"
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
          </div>
        }
        aside={
          <div className="space-y-4 print:hidden">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-h3">Invoice Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-body-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Customer</span>
                  <span className="font-semibold text-primary text-right">{invoice.partyNameSnapshot || invoice.party?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Status</span>
                  <Badge variant={invoice.status === 'ISSUED' ? 'success' : invoice.status === 'CANCELLED' ? 'danger' : 'warning'} size="xs">
                    {invoice.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Invoice Date</span>
                  <DateText date={invoice.invoiceDate} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Due Date</span>
                  <DateText date={invoice.dueDate} />
                </div>
                <div className="flex justify-between pt-2 border-t border-border-subtle">
                  <span className="text-muted">Subtotal</span>
                  <MoneyText amount={invoice.subtotalAmount} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">GST</span>
                  <MoneyText amount={Number(invoice.cgstAmount || 0) + Number(invoice.sgstAmount || 0) + Number(invoice.igstAmount || 0)} />
                </div>
                <div className="flex justify-between font-semibold text-primary pt-2 border-t border-border-subtle">
                  <span>Total</span>
                  <MoneyText amount={invoice.totalAmount} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-h3">Accounting &amp; Audit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-caption text-secondary">
                {invoice.voucherId ? (
                  <div className="flex items-center justify-between">
                    <span>Canonical Voucher</span>
                    <Link href="/vouchers" className="text-brand-text font-semibold hover:underline">
                      View in Vouchers →
                    </Link>
                  </div>
                ) : (
                  <p className="text-muted">No voucher posted yet (Draft / Pending Approval).</p>
                )}
                <div className="pt-2 border-t border-border-subtle space-y-1">
                  <div className="flex justify-between"><span>Created</span><DateText date={invoice.createdAt} variant="relative" /></div>
                  {invoice.updatedAt && <div className="flex justify-between"><span>Updated</span><DateText date={invoice.updatedAt} variant="relative" /></div>}
                </div>
              </CardContent>
            </Card>
          </div>
        }
      />

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
