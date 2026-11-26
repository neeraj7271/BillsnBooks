'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Receipt, RefreshCw, Eye, Ban, ArrowRightCircle } from 'lucide-react';
import {
  Button,
  Badge,
  MoneyText,
  DateText,
  Card,
  CardContent,
  ListPage,
  ConfirmDialog,
  type ColumnDef,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  documentType?: string;
  party?: { name: string; gstin?: string };
  totalAmount: number;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'ISSUED' | 'CANCELLED';
}

export default function InvoicesPage() {
  const { activeCompanyId } = useCompany();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [docTypeFilter, setDocTypeFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [cancellingInvoice, setCancellingInvoice] = useState<Invoice | null>(null);

  const pageSize = 20;

  const loadInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const data = await apiClient.listInvoices(activeCompanyId, params);
      setInvoices(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeCompanyId) loadInvoices();
  }, [statusFilter, activeCompanyId]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (docTypeFilter !== 'ALL' && (inv.documentType || 'TAX_INVOICE') !== docTypeFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          inv.invoiceNumber.toLowerCase().includes(q) ||
          (inv.party?.name || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [invoices, docTypeFilter, searchTerm]);

  const totalBilled = useMemo(
    () => invoices.filter((i) => i.status !== 'CANCELLED').reduce((s, i) => s + Number(i.totalAmount || 0), 0),
    [invoices],
  );
  const issuedCount = invoices.filter((i) => i.status === 'ISSUED').length;
  const pendingCount = invoices.filter((i) => i.status === 'PENDING_APPROVAL').length;

  const statusBadge = (status: Invoice['status']) => {
    const map: Record<Invoice['status'], 'success' | 'warning' | 'danger' | 'neutral'> = {
      ISSUED: 'success',
      PENDING_APPROVAL: 'warning',
      CANCELLED: 'danger',
      DRAFT: 'neutral',
    };
    return <Badge variant={map[status]} size="xs">{status.replace('_', ' ')}</Badge>;
  };

  const columns: ColumnDef<Invoice>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      sortable: true,
      cell: (r) => (
        <Link href={`/invoices/${r.id}`} className="font-mono font-semibold text-brand-text hover:underline">
          {r.invoiceNumber}
        </Link>
      ),
    },
    { key: 'invoiceDate', header: 'Date', sortable: true, cell: (r) => <DateText date={r.invoiceDate} /> },
    { key: 'party', header: 'Customer', cell: (r) => <span className="font-medium text-primary">{r.party?.name || 'Customer'}</span> },
    { key: 'status', header: 'Status', cell: (r) => statusBadge(r.status) },
    { key: 'totalAmount', header: 'Total', align: 'right', sortable: true, cell: (r) => <MoneyText amount={r.totalAmount} /> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Link href={`/invoices/${r.id}`} aria-label={`View ${r.invoiceNumber}`} className="p-1.5 rounded-lg hover:bg-surface-sunken text-muted hover:text-primary">
            <Eye className="h-3.5 w-3.5" />
          </Link>
          {r.documentType === 'PROFORMA_INVOICE' && (
            <Button
              variant="ghost"
              size="xs"
              loading={convertingId === r.id}
              aria-label={`Convert ${r.invoiceNumber}`}
              onClick={async () => {
                setConvertingId(r.id);
                await apiClient.convertToTaxInvoice(activeCompanyId, r.id);
                setConvertingId(null);
                loadInvoices();
              }}
            >
              <ArrowRightCircle className="h-3.5 w-3.5" />
            </Button>
          )}
          {r.status !== 'CANCELLED' && (
            <Button variant="ghost" size="xs" aria-label={`Cancel ${r.invoiceNumber}`} onClick={() => setCancellingInvoice(r)}>
              <Ban className="h-3.5 w-3.5 text-status-danger-text" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const paged = filteredInvoices.slice((page - 1) * pageSize, page * pageSize);

  return (
    <>
      <ListPage
        header={{
          title: 'Invoices',
          subtitle: 'GST tax invoices, proforma documents, and canonical double-entry postings.',
          badge: <Badge variant="brand" size="sm">Rule 46</Badge>,
          actions: (
            <Button variant="outline" size="sm" onClick={loadInvoices} loading={loading} aria-label="Refresh invoices">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>
          ),
        }}
        kpis={
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card><CardContent className="p-4"><div className="text-caption text-muted">Total Invoiced</div><div className="mt-1 text-h2"><MoneyText amount={totalBilled} align="left" /></div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-caption text-muted">Issued &amp; Posted</div><div className="mt-1 text-h2 text-status-success-text">{issuedCount}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-caption text-muted">Awaiting Approval</div><div className="mt-1 text-h2 text-status-warning-text">{pendingCount}</div></CardContent></Card>
          </div>
        }
        toolbar={{
          searchValue: searchTerm,
          onSearchChange: (v) => { setSearchTerm(v); setPage(1); },
          searchPlaceholder: 'Search invoice # or customer...',
          filters: (
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['ALL', 'ISSUED', 'PENDING_APPROVAL', 'DRAFT', 'CANCELLED'] as const).map((st) => (
                <Button key={st} size="xs" variant={statusFilter === st ? 'primary' : 'outline'} onClick={() => { setStatusFilter(st); setPage(1); }}>
                  {st === 'ALL' ? 'All' : st.replace('_', ' ')}
                </Button>
              ))}
              {(['ALL', 'TAX_INVOICE', 'PROFORMA_INVOICE', 'DELIVERY_CHALLAN'] as const).map((dt) => (
                <Button key={dt} size="xs" variant={docTypeFilter === dt ? 'secondary' : 'ghost'} onClick={() => { setDocTypeFilter(dt); setPage(1); }}>
                  {dt === 'ALL' ? 'All Docs' : dt.replace('_', ' ')}
                </Button>
              ))}
            </div>
          ),
          primaryAction: (
            <Link
              href="/invoices/new"
              className="h-8 px-3.5 rounded-lg bg-brand hover:bg-brand-hover text-primary-inverse font-semibold text-caption inline-flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Tax Invoice</span>
            </Link>
          ),
        }}
        data={paged}
        columns={columns}
        loading={loading}
        error={error}
        onRetry={loadInvoices}
        hasActiveFilters={Boolean(searchTerm || statusFilter !== 'ALL' || docTypeFilter !== 'ALL')}
        empty={{ icon: <Receipt className="h-5 w-5" />, title: 'No invoices found', description: 'Create your first GST tax invoice to post to books.' }}
        filteredEmpty={{ title: 'No matching invoices', description: 'Try clearing your status or search filter.' }}
        tableProps={{ page, pageSize, totalItems: filteredInvoices.length, onPageChange: setPage }}
      />

      <ConfirmDialog
        open={Boolean(cancellingInvoice)}
        onOpenChange={(o) => { if (!o) setCancellingInvoice(null); }}
        onConfirm={async (reason) => {
          if (cancellingInvoice) {
            await apiClient.cancelInvoice(activeCompanyId, cancellingInvoice.id, reason || 'Cancelled by user');
            setCancellingInvoice(null);
            loadInvoices();
          }
        }}
        title="Cancel Invoice"
        description={`Cancel invoice ${cancellingInvoice?.invoiceNumber}? A reversal voucher will be posted.`}
        tone="danger"
      />
    </>
  );
}
