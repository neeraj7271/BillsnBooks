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
  Button,
  Badge,
  MoneyText,
  DateText,
  ConfirmDialog,
  Card,
  CardContent,
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

  // Reject Dialog state
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
      const msg = err instanceof Error ? err.message : 'Failed to load approvals';
      setError(msg);
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
      const msg = err instanceof Error ? err.message : 'Failed to approve request';
      setError(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const triggerReject = (id: string) => {
    setRejectId(id);
    setRejectOpen(true);
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
      const msg = err instanceof Error ? err.message : 'Failed to reject request';
      setError(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Approval Inbox
            </h1>
            <Badge variant="brand" size="sm">Maker-Checker</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Senior accountant and CA partner governance queue. High-value transactions requiring authorized sign-off.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadApprovals}
          loading={loading}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          Refresh Inbox
        </Button>
      </div>

      {/* Governance Banner */}
      <div className="rounded-2xl border border-blue-200/60 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 p-4 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs">
          <div className="font-bold text-blue-900 dark:text-blue-200">
            Maker-Checker Posting Guarantee
          </div>
          <div className="mt-0.5 text-blue-700 dark:text-blue-300">
            Invoices exceeding ₹50,000 or marked for escalation are quarantined. Approving posts the double-entry voucher to general ledger.
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-xs text-rose-600 dark:text-rose-400 font-medium">
          {error}
        </div>
      )}

      {/* Queue Card */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">
              Loading approval queue...
            </div>
          ) : approvals.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500 mb-3" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Inbox is Clear</h3>
              <p className="mt-1 text-xs text-slate-400">
                No pending approval requests. All transactions are verified.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {approvals.map((req) => (
                <div
                  key={req.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 shrink-0">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {req.entityType === 'INVOICE' ? 'High-Value Invoice Sign-Off' : req.requestType}
                        </span>
                        <Badge variant="warning" size="xs" dot>Pending Review</Badge>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {req.comments || 'Requires maker-checker sign-off.'}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>Submitted by: <strong>{req.requesterName}</strong></span>
                        </div>
                        <div>Date: <DateText date={req.createdAt} showTime /></div>
                        {req.metadata?.invoiceNumber && (
                          <div className="flex items-center gap-1">
                            <span>Invoice:</span>
                            <Link
                              href={`/invoices/${req.entityId}`}
                              className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                            >
                              {req.metadata.invoiceNumber}
                              <ExternalLink className="h-2.5 w-2.5" />
                            </Link>
                          </div>
                        )}
                        {req.metadata?.totalAmount && (
                          <div className="font-bold text-slate-900 dark:text-white">
                            Amount: <MoneyText amount={req.metadata.totalAmount} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => triggerReject(req.id)}
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
                      Approve & Post
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accessible Reject Reason Dialog */}
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
