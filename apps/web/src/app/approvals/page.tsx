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
  Card,
  CardContent,
  LoadingState,
  ErrorState,
  EmptyState,
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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

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

      {loading ? (
        <LoadingState rows={4} />
      ) : approvals.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-6 w-6 text-status-success-text" />}
          title="Inbox is Clear"
          description="No pending approval requests. All transactions are verified."
        />
      ) : (
        <Card>
          <CardContent className="p-0 divide-y divide-border-subtle">
            {approvals.map((req) => (
              <div
                key={req.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-row-hover transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-status-warning-subtle text-status-warning-text shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-primary text-sm">
                        {req.entityType === 'INVOICE' ? 'High-Value Invoice Sign-Off' : req.requestType}
                      </span>
                      <Badge variant="warning" size="xs" dot>Pending Review</Badge>
                    </div>
                    <p className="text-xs text-secondary">
                      {req.comments || 'Requires maker-checker sign-off.'}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted pt-1">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Submitted by: <strong className="text-secondary">{req.requesterName}</strong>
                      </span>
                      <span>Date: <DateText date={req.createdAt} showTime /></span>
                      {req.metadata?.invoiceNumber && (
                        <span className="flex items-center gap-1">
                          Invoice:
                          <Link
                            href={`/invoices/${req.entityId}`}
                            className="font-mono font-semibold text-brand-text hover:underline inline-flex items-center gap-0.5"
                          >
                            {req.metadata.invoiceNumber}
                            <ExternalLink className="h-2.5 w-2.5" />
                          </Link>
                        </span>
                      )}
                      {req.metadata?.totalAmount && (
                        <span className="font-semibold text-primary">
                          Amount: <MoneyText amount={req.metadata.totalAmount} />
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
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
                    Approve &amp; Post
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
