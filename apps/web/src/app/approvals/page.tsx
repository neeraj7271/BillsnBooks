'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ShieldCheck, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import {
  Button,
  Badge,
  MoneyText,
  DateText,
  ListPage,
  ConfirmDialog,
  type ColumnDef,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';

interface ApprovalRequest {
  id: string;
  entityType: string;
  entityId: string;
  requestType: string;
  requesterName: string;
  comments?: string;
  createdAt: string;
  metadata?: {
    invoiceNumber?: string;
    totalAmount?: string | number;
  };
}

export default function ApprovalsPage() {
  const { activeCompanyId } = useCompany();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);

  const loadApprovals = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.listApprovals(activeCompanyId);
      setApprovals(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeCompanyId) loadApprovals();
  }, [activeCompanyId]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return approvals;
    const q = searchTerm.toLowerCase();
    return approvals.filter(
      (a) =>
        (a.metadata?.invoiceNumber || '').toLowerCase().includes(q) ||
        a.requesterName.toLowerCase().includes(q) ||
        a.entityType.toLowerCase().includes(q),
    );
  }, [approvals, searchTerm]);

  const columns: ColumnDef<ApprovalRequest>[] = [
    {
      key: 'entity',
      header: 'Document',
      cell: (r) => (
        <Link href={`/invoices/${r.entityId}`} className="font-mono font-semibold text-brand-text hover:underline">
          {r.metadata?.invoiceNumber || r.entityId.slice(0, 8)}
        </Link>
      ),
    },
    { key: 'requestType', header: 'Type', cell: (r) => <Badge variant="warning" size="xs">{r.requestType}</Badge> },
    { key: 'requesterName', header: 'Requested By', cell: (r) => <span className="text-body-sm text-primary">{r.requesterName}</span> },
    { key: 'createdAt', header: 'Submitted', cell: (r) => <DateText date={r.createdAt} variant="relative" /> },
    { key: 'amount', header: 'Amount', align: 'right', cell: (r) => <MoneyText amount={r.metadata?.totalAmount ?? 0} /> },
    {
      key: 'actions',
      header: 'Decision',
      align: 'right',
      cell: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="primary"
            size="xs"
            loading={actionLoadingId === r.id}
            onClick={async () => {
              setActionLoadingId(r.id);
              await apiClient.approveRequest(activeCompanyId, r.id);
              setActionLoadingId(null);
              loadApprovals();
            }}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            Approve
          </Button>
          <Button variant="outline" size="xs" onClick={() => setRejectId(r.id)}>
            <XCircle className="h-3.5 w-3.5 mr-1 text-status-danger-text" />
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <ListPage
        header={{
          title: 'Approvals',
          subtitle: 'Maker-checker queue for high-value invoices and postings.',
          badge: <Badge variant="warning" size="sm">{filtered.length} pending</Badge>,
          actions: (
            <Button variant="outline" size="sm" onClick={loadApprovals} aria-label="Refresh approvals">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>
          ),
        }}
        toolbar={{
          searchValue: searchTerm,
          onSearchChange: setSearchTerm,
          searchPlaceholder: 'Search document # or requester...',
        }}
        data={filtered}
        columns={columns}
        loading={loading}
        error={error}
        onRetry={loadApprovals}
        hasActiveFilters={Boolean(searchTerm)}
        empty={{ icon: <ShieldCheck className="h-5 w-5" />, title: 'All caught up', description: 'No pending approval requests for this company.' }}
        filteredEmpty={{ title: 'No matching requests', description: 'Try clearing your search filter.' }}
      />

      <ConfirmDialog
        open={Boolean(rejectId)}
        onOpenChange={(o) => { if (!o) setRejectId(null); }}
        onConfirm={async (reason) => {
          if (rejectId) {
            await apiClient.rejectRequest(activeCompanyId, rejectId, reason || 'Rejected by partner');
            setRejectId(null);
            loadApprovals();
          }
        }}
        title="Reject Request"
        description="Provide a reason for rejecting this approval request."
        tone="danger"
      />
    </>
  );
}
