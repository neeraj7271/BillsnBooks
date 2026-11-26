'use client';

import React, { useState, useEffect } from 'react';
import {
  Button,
  Input,
  Badge,
  DataTable,
  type ColumnDef,
} from '@platform/ui';
import { RefreshCw, Search, Send, Calendar, ArrowRight } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { AgeingSummaryCards } from './ageing-summary-cards';
import { AgeingDistributionBar } from './ageing-distribution-bar';
import { SendReminderDialog } from './send-reminder-dialog';
import { PromiseToPayDialog } from './promise-to-pay-dialog';
import type { ArAgeingSummaryDto, PartyAgeingDto } from '@platform/shared-types';

export default function ArAgeingPage() {
  const { activeCompanyId } = useCompany();
  const [summary, setSummary] = useState<ArAgeingSummaryDto | null>(null);
  const [parties, setParties] = useState<PartyAgeingDto[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'PARTIES' | 'INVOICES'>('PARTIES');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParty, setSelectedParty] = useState<PartyAgeingDto | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [openReminderModal, setOpenReminderModal] = useState(false);
  const [openPromiseModal, setOpenPromiseModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sum, list, invs] = await Promise.all([
        apiClient.getArAgeingSummary(activeCompanyId),
        apiClient.getPartyAgeing(activeCompanyId),
        apiClient.getInvoicesAgeing(activeCompanyId),
      ]);
      setSummary(sum || null);
      setParties(list || []);
      setInvoices(invs || []);
    } catch (err: unknown) {
      console.error('Failed to load AR Ageing data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeCompanyId]);

  const formatInr = (val: string | number) => {
    const num = Number(val || 0);
    return num.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    });
  };

  const filteredParties = parties.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.partyName.toLowerCase().includes(term) ||
      (p.tradeName && p.tradeName.toLowerCase().includes(term)) ||
      (p.gstin && p.gstin.toLowerCase().includes(term))
    );
  });

  const columns: ColumnDef<PartyAgeingDto>[] = [
    {
      header: 'Debtor / Customer',
      key: 'partyName',
      cell: (row) => (
        <div>
          <div className="font-bold text-primary">{row.partyName}</div>
          <div className="text-[11px] text-muted font-mono">
            {row.gstin || 'Unregistered B2C'}
          </div>
        </div>
      ),
    },
    {
      header: 'Total Outstanding',
      key: 'totalDue',
      cell: (row) => (
        <span className="font-extrabold text-primary tabular-nums">
          {formatInr(row.totalDue)}
        </span>
      ),
    },
    {
      header: '0–30 Days',
      key: 'current0To30',
      cell: (row) => (
        <span className="text-status-success-text font-medium tabular-nums">
          {Number(row.current0To30) > 0 ? formatInr(row.current0To30) : '—'}
        </span>
      ),
    },
    {
      header: '31–60 Days',
      key: 'days31To60',
      cell: (row) => (
        <span className="text-status-warning-text font-medium tabular-nums">
          {Number(row.days31To60) > 0 ? formatInr(row.days31To60) : '—'}
        </span>
      ),
    },
    {
      header: '61–90 Days',
      key: 'days61To90',
      cell: (row) => (
        <span className="text-status-info-text font-medium tabular-nums">
          {Number(row.days61To90) > 0 ? formatInr(row.days61To90) : '—'}
        </span>
      ),
    },
    {
      header: '90+ Days',
      key: 'days90Plus',
      cell: (row) => (
        <span className="text-status-danger-text font-bold tabular-nums">
          {Number(row.days90Plus) > 0 ? formatInr(row.days90Plus) : '—'}
        </span>
      ),
    },
    {
      header: 'Invoices',
      key: 'invoicesCount',
      cell: (row) => (
        <Badge variant="neutral" size="sm">
          {row.invoicesCount} open
        </Badge>
      ),
    },
    {
      header: 'Action',
      key: 'partyId',
      cell: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedParty(row);
            setOpenReminderModal(true);
          }}
          leftIcon={<Send className="h-3 w-3" />}
        >
          Follow Up
        </Button>
      ),
    },
  ];

  const filteredInvoices = invoices.filter((inv) => {
    const term = searchTerm.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(term) ||
      inv.partyName.toLowerCase().includes(term) ||
      (inv.partyGstin && inv.partyGstin.toLowerCase().includes(term))
    );
  });

  const invoiceColumns: ColumnDef<any>[] = [
    {
      header: 'Document #',
      key: 'invoiceNumber',
      cell: (row) => (
        <div>
          <span className="font-mono font-bold text-xs text-brand-text">
            {row.invoiceNumber}
          </span>
          <div className="mt-0.5">
            <Badge variant={row.documentType === 'TAX_INVOICE' ? 'brand' : 'warning'} size="xs">
              {row.documentType === 'TAX_INVOICE' ? 'Tax Invoice' : row.documentType}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      header: 'Customer / Debtor',
      key: 'partyName',
      cell: (row) => (
        <div>
          <div className="font-bold text-primary text-xs">{row.partyName}</div>
          <div className="text-[10px] text-muted font-mono">{row.partyGstin || 'Unregistered'}</div>
        </div>
      ),
    },
    {
      header: 'Due Date',
      key: 'dueDate',
      cell: (row) => (
        <div>
          <div className="text-xs">{row.dueDate || row.invoiceDate}</div>
          <span className={`text-[10px] font-semibold ${row.overdueDays > 0 ? 'text-status-danger-text' : 'text-status-success-text'}`}>
            {row.overdueDays > 0 ? `${row.overdueDays}d overdue` : 'Current'}
          </span>
        </div>
      ),
    },
    {
      header: 'Amount',
      key: 'totalAmount',
      cell: (row) => (
        <span className="font-extrabold text-primary tabular-nums text-xs">
          {formatInr(row.totalAmount)}
        </span>
      ),
    },
    {
      header: 'Promise-to-Pay Commitment',
      key: 'promiseStatus',
      cell: (row) => (
        <div>
          {row.promiseStatus === 'BROKEN' && (
            <Badge variant="warning" size="xs">
              Broken: {row.promiseToPayDate}
            </Badge>
          )}
          {row.promiseStatus === 'DUE_TODAY' && (
            <Badge variant="brand" size="xs">
              Due Today: {row.promiseToPayDate}
            </Badge>
          )}
          {row.promiseStatus === 'UPCOMING' && (
            <Badge variant="info" size="xs">
              Promised: {row.promiseToPayDate}
            </Badge>
          )}
          {row.promiseStatus === 'NO_PROMISE' && (
            <span className="text-xs text-muted italic">No promise recorded</span>
          )}
          {row.promiseToPayNotes && (
            <p className="text-[11px] text-muted italic mt-0.5 max-w-[220px] truncate">
              {row.promiseToPayNotes}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Action',
      key: 'id',
      cell: (row) => (
        <Button
          variant="outline"
          size="xs"
          onClick={() => {
            setSelectedInvoice(row);
            setOpenPromiseModal(true);
          }}
          className="text-xs"
        >
          {row.promiseToPayDate ? 'Update Promise' : 'Record Promise'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-primary">
              Accounts Receivable Ageing
            </h1>
            <Badge variant="brand" size="sm">AR Intelligence</Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            Real-time aging horizons (0-30, 31-60, 61-90, 90+ days), DSO metrics, and automated debtor follow-ups.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            loading={loading}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <AgeingSummaryCards summary={summary} loading={loading} />

      {/* Ageing Distribution Visual Bar */}
      <AgeingDistributionBar summary={summary} />

      {/* Filter & Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
              <Input
                placeholder={
                  viewMode === 'PARTIES'
                    ? 'Search by debtor, trade name, GSTIN...'
                    : 'Search by document # or customer...'
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-1 bg-surface-sunken rounded-xl w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setViewMode('PARTIES')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                  viewMode === 'PARTIES'
                    ? 'bg-surface text-primary shadow-xs'
                    : 'text-muted hover:text-primary'
                }`}
              >
                By Customer ({parties.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode('INVOICES')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                  viewMode === 'INVOICES'
                    ? 'bg-brand text-inverse shadow-xs'
                    : 'text-muted hover:text-primary'
                }`}
              >
                By Invoice & Promises ({invoices.length})
              </button>
            </div>
          </div>

          <div className="text-xs text-muted">
            {viewMode === 'PARTIES'
              ? `Showing ${filteredParties.length} of ${parties.length} customer accounts`
              : `Showing ${filteredInvoices.length} of ${invoices.length} open documents`}
          </div>
        </div>

        {viewMode === 'PARTIES' ? (
          <DataTable
            columns={columns}
            data={filteredParties}
            loading={loading}
            emptyTitle="No Open Debtors"
            emptyDescription="No customer accounts with outstanding dues detected."
          />
        ) : (
          <DataTable
            columns={invoiceColumns}
            data={filteredInvoices}
            loading={loading}
            emptyTitle="No Open Invoices"
            emptyDescription="All issued customer documents have been fully reconciled."
          />
        )}
      </div>

      {/* Follow-up Reminder Modal */}
      <SendReminderDialog
        open={openReminderModal}
        onOpenChange={setOpenReminderModal}
        party={selectedParty}
        onSuccess={loadData}
      />

      {/* Promise-to-Pay Commitment Modal */}
      <PromiseToPayDialog
        open={openPromiseModal}
        onOpenChange={setOpenPromiseModal}
        invoice={selectedInvoice}
        onSuccess={loadData}
      />
    </div>
  );
}
