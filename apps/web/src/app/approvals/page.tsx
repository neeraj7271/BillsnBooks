'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  ShieldCheck,
  ExternalLink,
  User,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import {
  PageHeader,
  Button,
  Badge,
  MoneyText,
  DateText,
  ConfirmDialog,
  DataTable,
  ErrorState,
  type ColumnDef,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { useTablePagination } from '@/hooks/use-table-pagination';

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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const { page, pageSize, setPage, setPageSize } = useTablePagination({
    storageKey: 'approvals',
    defaultPageSize: 25,
  });

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  useEffect(() => {
    loadApprovals();
  }, [activeCompanyId]);

  const loadApprovals = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.listApprovals(activeCompanyId);
      setApprovals(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setActionLoadingId(id);
    try {
      await apiClient.approveRequest(activeCompanyId, id, 'Approved by partner review');
      await loadApprovals();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to approve request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmReject = async (reason?: string) => {
    if (!rejectId) return;
    setActionLoadingId(rejectId);
    try {
      await apiClient.rejectRequest(activeCompanyId, rejectId, reason || 'Rejected by partner');
      setRejectOpen(false);
      setRejectId(null);
      await loadApprovals();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reject request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const columns: ColumnDef<ApprovalRequest>[] = [
    {
      key: 'request',
      header: 'Request',
      cell: (req) => (
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-status-warning-subtle text-status-warning-text shrink-0 mt-0.5">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-primary text-xs">
              <span>{req.entityType === 'INVOICE' ? 'High-Value Invoice Sign-Off' : req.requestType}</span>
              <Badge variant="warning" size="xs" dot>Pending</Badge>
            </div>
            <p className="text-[11px] text-muted line-clamp-1 mt-0.5">
              {req.comments || 'Requires maker-checker sign-off.'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'requester',
      header: 'Requester',
      width: '180px',
      cell: (req) => (
        <div className="flex items-center gap-1.5 text-xs text-secondary">
          <User className="h-3.5 w-3.5 text-muted shrink-0" />
          <span className="truncate">{req.requesterName}</span>
        </div>
      ),
    },
    {
      key: 'invoice',
      header: 'Reference',
      width: '160px',
      cell: (req) =>
        req.metadata?.invoiceNumber ? (
          <Link
            href={`/invoices/${req.entityId}`}
            className="font-mono text-xs font-semibold text-brand-text hover:underline inline-flex items-center gap-1"
          >
            {req.metadata.invoiceNumber}
            <ExternalLink className="h-3 w-3 opacity-60" />
          </Link>
        ) : (
          <span className="text-xs text-muted font-mono">{req.entityId.slice(0, 8)}…</span>
        ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      width: '130px',
      cell: (req) =>
        req.metadata?.totalAmount !== undefined ? (
          <MoneyText amount={req.metadata.totalAmount} className="text-xs font-semibold text-primary" />
        ) : (
          <span className="text-xs text-muted">—</span>
        ),
    },
    {
      key: 'date',
      header: 'Date',
      width: '140px',
      cell: (req) => <DateText date={req.createdAt} showTime className="text-xs text-secondary" />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      width: '190px',
      cell: (req) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRejectId(req.id);
              setRejectOpen(true);
            }}
            disabled={actionLoadingId === req.id}
          >
            Reject
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleApprove(req.id)}
            loading={actionLoadingId === req.id}
            leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
          >
            Approve
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approval Inbox"
        subtitle="Senior accountant and CA partner governance queue for high-value transactions."
        badge={<Badge variant="brand" size="sm">Maker-Checker</Badge>}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={loadApprovals}
            loading={loading}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh Inbox
          </Button>
        }
      />

      <div className="rounded-2xl border border-focus bg-brand-subtle p-4 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-brand-text shrink-0 mt-0.5" />
        <div className="text-xs text-brand-text">
          <div className="font-semibold">Maker-Checker Posting Guarantee</div>
          <div className="mt-0.5">
            Invoices exceeding ₹50,000 or marked for escalation are quarantined until partner sign-off.
          </div>
        </div>
      </div>

      {error && <ErrorState error={error} onRetry={loadApprovals} />}

      <DataTable
        columns={columns}
        data={approvals}
        loading={loading}
        page={page}
        pageSize={pageSize}
        totalItems={approvals.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        storageKey="approvals"
        emptyTitle="Inbox zero"
        emptyDescription="No invoices pending your approval right now."
      />

      <ConfirmDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject Transaction"
        description="Provide a reason for rejecting this request. The creator will be notified to revise the transaction."
        confirmLabel="Confirm Rejection"
        tone="danger"
        promptPlaceholder="Enter specific audit or reconciliation issue..."
        loading={!!actionLoadingId}
        onConfirm={handleConfirmReject}
      />
    </div>
  );
}
