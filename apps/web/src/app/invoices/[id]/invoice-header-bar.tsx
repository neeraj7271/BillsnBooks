import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Printer,
  Download,
  CheckCircle2,
  FileText,
  LayoutTemplate,
  Check,
  Copy,
  Edit,
  Ban,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import { Button, Badge } from '@platform/ui';
import { INVOICE_TEMPLATES, type InvoiceTemplateId } from './templates/types';

interface InvoiceHeaderBarProps {
  invoice: any;
  actionLoading: boolean;
  selectedTemplate: InvoiceTemplateId;
  onSelectTemplate: (templateId: InvoiceTemplateId) => void;
  onPrint: () => void;
  onApprove?: () => void;
  onTriggerReject?: () => void;
  onTriggerCancel: () => void;
  onOpenCustomizer?: () => void;
}

export function InvoiceHeaderBar({
  invoice,
  actionLoading,
  selectedTemplate,
  onSelectTemplate,
  onPrint,
  onApprove,
  onTriggerReject,
  onTriggerCancel,
  onOpenCustomizer,
}: InvoiceHeaderBarProps) {
  const isCancelled = invoice.status === 'CANCELLED';
  const isIssued = invoice.status === 'ISSUED';
  const isPending = invoice.status === 'PENDING_APPROVAL' || invoice.status === 'DRAFT';

  const statusVariant = isIssued
    ? 'success'
    : invoice.status === 'PENDING_APPROVAL'
    ? 'warning'
    : isCancelled
    ? 'danger'
    : 'neutral';

  const formatStatus = (status: string) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return 'Pending Approval';
      case 'ISSUED':
        return 'Issued';
      case 'CANCELLED':
        return 'Cancelled';
      case 'DRAFT':
        return 'Draft';
      case 'REJECTED':
        return 'Rejected';
      default:
        return status;
    }
  };

  return (
    <div className="print:hidden space-y-4">
      {/* Top Main Navigation and Status Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: Back button & Document Identity */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/invoices"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-default bg-surface text-secondary hover:text-primary transition shadow-2xs shrink-0"
            title="Back to Invoices"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-black text-primary font-mono tracking-tight whitespace-nowrap">
                {invoice.invoiceNumber}
              </h1>
              <Badge variant={statusVariant} size="sm" dot>
                {formatStatus(invoice.status)}
              </Badge>
            </div>
            <p className="text-xs text-secondary truncate">
              Tax Invoice for <span className="font-medium text-primary">{invoice.partyNameSnapshot || invoice.party?.name || 'Customer'}</span>
            </p>
          </div>
        </div>

        {/* Right: Clean Document Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Edit / Revise for Pending Approval */}
          {isPending && (
            <Button
              variant="outline"
              size="sm"
              asChild
              leftIcon={<Edit className="h-3.5 w-3.5 text-brand-text" />}
              className="whitespace-nowrap"
            >
              <Link href={`/invoices/new?cloneFrom=${invoice.id}&mode=edit`}>Edit</Link>
            </Button>
          )}

          {/* Duplicate / Copy to New */}
          <Button
            variant="outline"
            size="sm"
            asChild
            leftIcon={<Copy className="h-3.5 w-3.5" />}
            className="whitespace-nowrap"
          >
            <Link href={`/invoices/new?cloneFrom=${invoice.id}`}>Duplicate</Link>
          </Button>

          {invoice.voucherId && (
            <Button variant="outline" size="sm" asChild leftIcon={<FileText className="h-3.5 w-3.5" />} className="whitespace-nowrap">
              <Link href="/vouchers">Canonical Voucher</Link>
            </Button>
          )}

          {onOpenCustomizer && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenCustomizer}
              leftIcon={<Sliders className="h-3.5 w-3.5 text-brand-text" />}
              title="Configure Company Logo, Signature, DSC, Payment QR, and Terms"
              className="whitespace-nowrap"
            >
              Branding & QR
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onPrint}
            leftIcon={<Printer className="h-3.5 w-3.5" />}
            className="whitespace-nowrap"
          >
            Print
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onPrint}
            leftIcon={<Download className="h-3.5 w-3.5" />}
            className="whitespace-nowrap bg-brand hover:bg-brand-hover text-inverse font-semibold"
          >
            Download PDF
          </Button>

          {/* Cancel & Credit Note Actions for Issued Invoices */}
          {isIssued && (
            <>
              <Button
                variant="outline"
                size="sm"
                asChild
                leftIcon={<RotateCcw className="h-3.5 w-3.5 text-status-warning-text" />}
                title="Issue Rule 53 Statutory Credit Note against this invoice"
              >
                <Link href={`/invoices/new?cloneFrom=${invoice.id}&docType=CREDIT_NOTE`}>
                  Credit Note
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={actionLoading}
                onClick={onTriggerCancel}
                leftIcon={<Ban className="h-3.5 w-3.5 text-status-danger-text" />}
                className="text-status-danger-text border-status-danger hover:bg-status-danger-subtle"
              >
                Cancel Invoice
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Invoice Template Selector Banner */}
      <div className="p-3 rounded-2xl bg-surface border border-default shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-brand-subtle border border-default flex items-center justify-center text-brand-text shrink-0">
            <LayoutTemplate className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-primary flex items-center gap-2 whitespace-nowrap">
              <span>PDF Template:</span>
              <span className="text-brand-text font-mono">
                {INVOICE_TEMPLATES.find((t) => t.id === selectedTemplate)?.name}
              </span>
            </div>
            <div className="text-[11px] text-secondary truncate max-w-lg">
              {INVOICE_TEMPLATES.find((t) => t.id === selectedTemplate)?.description}
            </div>
          </div>
        </div>

        {/* Template Segmented Toggle Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-sunken border border-default shrink-0 overflow-x-auto">
          {INVOICE_TEMPLATES.map((tmpl) => {
            const isSelected = selectedTemplate === tmpl.id;
            return (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => onSelectTemplate(tmpl.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap ${
                  isSelected
                    ? 'bg-surface text-brand-text shadow-2xs border border-default font-bold'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 text-brand-text" />}
                <span>{tmpl.name}</span>
                {tmpl.badge && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${
                    isSelected ? 'bg-brand-subtle text-brand-text' : 'bg-surface text-secondary'
                  }`}>
                    {tmpl.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
