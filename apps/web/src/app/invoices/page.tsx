'use client';
import { logger } from '@/lib/logger';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
  Receipt,
  RefreshCw,
  Eye,
  Copy,
  Ban,
  Pencil,
  ArrowRightCircle,
} from 'lucide-react';
import {
  Button,
  Badge,
  Input,
  DataTable,
  MoneyText,
  DateText,
  Card,
  CardContent,
  ConfirmDialog,
  type ColumnDef,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { useTablePagination } from '@/hooks/use-table-pagination';

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  documentType?: string;
  isRcm?: boolean;
  taxClassification?: string;
  promiseToPayDate?: string;
  party?: { name: string; gstin?: string };
  supplyType: 'INTRA_STATE' | 'INTER_STATE';
  subtotalAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  status: 'DRAFT' | 'ISSUED' | 'CANCELLED';
}

export default function InvoicesPage() {
  const { activeCompanyId } = useCompany();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [docTypeFilter, setDocTypeFilter] = useState<string>('ALL');
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [cancellingInvoice, setCancellingInvoice] = useState<Invoice | null>(null);
  const [cancelOpen, setCancelOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const { page, pageSize, setPage, setPageSize } = useTablePagination({
    storageKey: 'invoices',
    defaultPageSize: 25,
  });

  useEffect(() => {
    loadInvoices();
  }, [statusFilter, activeCompanyId]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const data = await apiClient.listInvoices(activeCompanyId, params);
      setInvoices(data || []);
    } catch (err: unknown) {
      logger.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToTaxInvoice = async (invoiceId: string) => {
    setConvertingId(invoiceId);
    try {
      await apiClient.convertToTaxInvoice(activeCompanyId, invoiceId);
      await loadInvoices();
    } catch (err: unknown) {
      logger.error('Failed to convert to tax invoice', err);
    } finally {
      setConvertingId(null);
    }
  };

  const handleConfirmCancel = async (reason?: string) => {
    if (!cancellingInvoice) return;
    try {
      await apiClient.cancelInvoice(
        activeCompanyId,
        cancellingInvoice.id,
        reason || 'Cancelled by authorized user',
      );
      setCancelOpen(false);
      setCancellingInvoice(null);
      await loadInvoices();
    } catch (err: unknown) {
      logger.error('Failed to cancel invoice', err);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (docTypeFilter !== 'ALL') {
      const type = inv.documentType || 'TAX_INVOICE';
      if (type !== docTypeFilter) return false;
    }
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(term) ||
      inv.party?.name?.toLowerCase().includes(term) ||
      inv.party?.gstin?.toLowerCase().includes(term)
    );
  });

  const totalBilled = invoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
  const issuedCount = invoices.filter((inv) => inv.status === 'ISSUED').length;
  const draftCount = invoices.filter((inv) => inv.status === 'DRAFT').length;

  const columns: ColumnDef<Invoice>[] = [
    {
      key: 'invoiceNumber',
      header: 'Document #',
      width: '140px',
      cell: (inv) => (
        <div>
          <Link
            href={`/invoices/${inv.id}`}
            className="font-mono font-bold text-xs text-brand-text hover:underline inline-flex items-center gap-1"
          >
            {inv.invoiceNumber}
            <ExternalLink className="h-3 w-3 opacity-60" />
          </Link>
          <div className="mt-0.5">
            <Badge
              variant={
                inv.documentType === 'PROFORMA_INVOICE'
                  ? 'warning'
                  : inv.documentType === 'DELIVERY_CHALLAN'
                    ? 'neutral'
                    : 'brand'
              }
              size="xs"
            >
              {inv.documentType === 'PROFORMA_INVOICE'
                ? 'Proforma'
                : inv.documentType === 'DELIVERY_CHALLAN'
                  ? 'Challan'
                  : 'Tax Invoice'}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      key: 'invoiceDate',
      header: 'Date',
      width: '110px',
      cell: (inv) => <DateText date={inv.invoiceDate} />,
    },
    {
      key: 'party',
      header: 'Customer Party',
      cell: (inv) => (
        <div>
          <div className="font-bold text-primary">{inv.party?.name || 'Customer'}</div>
          {inv.party?.gstin && <div className="font-mono text-[10px] text-muted">{inv.party.gstin}</div>}
        </div>
      ),
    },
    {
      key: 'supplyType',
      header: 'Supply Type',
      cell: (inv) => (
        <Badge variant={inv.supplyType === 'INTRA_STATE' ? 'brand' : 'info'} size="xs">
          {inv.supplyType === 'INTRA_STATE' ? 'Intra-State (CGST+SGST)' : 'Inter-State (IGST)'}
        </Badge>
      ),
    },
    {
      key: 'subtotalAmount',
      header: 'Taxable',
      align: 'right',
      cell: (inv) => <MoneyText amount={inv.subtotalAmount} />,
    },
    {
      key: 'totalAmount',
      header: 'Total Amount',
      align: 'right',
      cell: (inv) => <MoneyText amount={inv.totalAmount} className="font-bold text-primary" />,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      cell: (inv) => (
        <Badge
          variant={inv.status === 'ISSUED' ? 'success' : 'neutral'}
          size="xs"
          dot
        >
          {inv.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      width: '150px',
      cell: (inv) => (
        <div className="flex items-center justify-end gap-1.5">
          {inv.documentType && inv.documentType !== 'TAX_INVOICE' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleConvertToTaxInvoice(inv.id)}
              loading={convertingId === inv.id}
              className="h-8 w-8 text-brand-text hover:bg-brand-subtle rounded-lg transition"
              title="Convert to Tax Invoice"
              aria-label="Convert to Tax Invoice"
            >
              <ArrowRightCircle className="h-4 w-4" />
            </Button>
          )}

          {inv.status === 'DRAFT' && (
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="h-8 w-8 text-secondary hover:text-status-warning-text hover:bg-status-warning-subtle rounded-lg transition"
              title="Edit Invoice"
            >
              <Link
                href={`/invoices/new?edit=${inv.id}`}
                aria-label="Edit Invoice"
                className="flex items-center justify-center w-full h-full"
              >
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-8 w-8 text-secondary hover:text-brand-text hover:bg-brand-subtle rounded-lg transition"
            title="View & Print Invoice"
          >
            <Link
              href={`/invoices/${inv.id}`}
              aria-label="View Invoice Details"
              className="flex items-center justify-center w-full h-full"
            >
              <Eye className="h-4 w-4" />
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-8 w-8 text-secondary hover:text-brand-text hover:bg-brand-subtle rounded-lg transition"
            title="Duplicate / Copy to New"
          >
            <Link
              href={`/invoices/new?cloneFrom=${inv.id}`}
              aria-label="Duplicate Invoice"
              className="flex items-center justify-center w-full h-full"
            >
              <Copy className="h-4 w-4" />
            </Link>
          </Button>

          {inv.status === 'ISSUED' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setCancellingInvoice(inv);
                setCancelOpen(true);
              }}
              className="h-8 w-8 text-muted hover:text-status-danger-text hover:bg-status-danger-subtle rounded-lg transition"
              title="Cancel Invoice (Rule 46)"
              aria-label="Cancel Invoice"
            >
              <Ban className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-primary">
              GST Tax Invoices
            </h1>
            <Badge variant="brand" size="sm">Rule 46 Compliant</Badge>
          </div>
          <p className="mt-1 text-sm text-secondary">
            GST compliant billing with automated double-entry ledger posting and maker-checker approvals.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={loadInvoices} loading={loading} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" asChild leftIcon={<Plus className="h-3.5 w-3.5" />}>
            <Link href="/invoices/new">
              Create Tax Invoice
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-secondary">
              <span>Total Invoiced</span>
              <Receipt className="h-4 w-4 text-brand-text" />
            </div>
            <div className="mt-2 text-xl font-black text-primary">
              <MoneyText amount={totalBilled} />
            </div>
            <p className="mt-1 text-[11px] text-muted">{invoices.length} invoices generated</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-secondary">
              <span>Issued & Posted</span>
              <CheckCircle2 className="h-4 w-4 text-status-success-text" />
            </div>
            <div className="mt-2 text-xl font-black text-status-success-text">
              {issuedCount}
            </div>
            <p className="mt-1 text-[11px] text-muted">Posted directly to double-entry ledger</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-secondary">
              <span>Drafts</span>
              <Clock className="h-4 w-4 text-status-warning-text" />
            </div>
            <div className="mt-2 text-xl font-black text-status-warning-text">
              {draftCount}
            </div>
            <p className="mt-1 text-[11px] text-muted">Saved drafts awaiting issue</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <div className="w-full sm:w-72">
            <Input
              placeholder="Search document # or party..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftAddon={<Search className="h-3.5 w-3.5" />}
              size="sm"
            />
          </div>

          {/* Document Type Selector */}
          <div className="flex items-center gap-1 p-1 bg-surface-sunken rounded-xl overflow-x-auto w-full sm:w-auto">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'TAX_INVOICE', label: 'Tax Invoices' },
              { id: 'PROFORMA_INVOICE', label: 'Proforma' },
              { id: 'DELIVERY_CHALLAN', label: 'Challans' },
            ].map((dt) => (
              <button
                key={dt.id}
                onClick={() => setDocTypeFilter(dt.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                  docTypeFilter === dt.id
                    ? 'bg-brand text-inverse shadow-xs'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                {dt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-surface-sunken rounded-xl overflow-x-auto">
          {['ALL', 'ISSUED', 'CANCELLED', 'DRAFT'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              {st === 'ALL' ? 'All Invoices' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredInvoices}
        loading={loading}
        page={page}
        pageSize={pageSize}
        totalItems={filteredInvoices.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        storageKey="invoices"
        isFiltered={statusFilter !== 'ALL' || docTypeFilter !== 'ALL' || Boolean(searchTerm.trim())}
        onClearFilters={() => {
          setStatusFilter('ALL');
          setDocTypeFilter('ALL');
          setSearchTerm('');
        }}
        emptyTitle="No invoices yet"
        emptyDescription="Create your first GST invoice."
        emptyAction={{ label: 'New Invoice', onClick: () => window.location.href = '/invoices/new' }}
      />

      {/* Table Actions Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-surface-sunken rounded-xl text-xs text-secondary">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-border-strong" />
          <span className="text-[11px] font-medium text-secondary">
            Showing <strong className="text-primary">{filteredInvoices.length}</strong> of{' '}
            <strong className="text-primary">{invoices.length}</strong> document{invoices.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <span className="font-semibold text-secondary text-[11px] uppercase tracking-wider">
            Quick Actions:
          </span>

          <div className="inline-flex items-center gap-2">
            <span className="inline-flex items-center justify-center h-6 w-6 rounded-lg bg-brand-subtle text-brand-text border border-subtle shadow-2xs">
              <Eye className="h-3.5 w-3.5" />
            </span>
            <span className="font-medium text-secondary">View / Print</span>
          </div>

          <div className="inline-flex items-center gap-2">
            <span className="inline-flex items-center justify-center h-6 w-6 rounded-lg bg-status-warning-subtle text-status-warning-text border border-subtle shadow-2xs">
              <Pencil className="h-3.5 w-3.5" />
            </span>
            <span className="font-medium text-secondary">Edit Draft</span>
          </div>

          <div className="inline-flex items-center gap-2">
            <span className="inline-flex items-center justify-center h-6 w-6 rounded-lg bg-brand-subtle text-brand-text border border-subtle shadow-2xs">
              <Copy className="h-3.5 w-3.5" />
            </span>
            <span className="font-medium text-secondary">Duplicate</span>
          </div>

          <div className="inline-flex items-center gap-2">
            <span className="inline-flex items-center justify-center h-6 w-6 rounded-lg bg-status-danger-subtle text-status-danger-text border border-subtle shadow-2xs">
              <Ban className="h-3.5 w-3.5" />
            </span>
            <span className="font-medium text-secondary">Cancel (Rule 46)</span>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={cancellingInvoice ? `Cancel Invoice #${cancellingInvoice.invoiceNumber}` : 'Cancel Invoice'}
        description="Statutory Cancellation: Cancelling will mark this document as CANCELLED in the register, reverse its General Ledger postings, and maintain the sequence for GST compliance. Enter a statutory reason:"
        confirmLabel="Confirm Cancellation"
        tone="danger"
        promptPlaceholder="e.g. Order cancelled prior to dispatch / Rate calculation error"
        onConfirm={handleConfirmCancel}
      />
    </div>
  );
}
