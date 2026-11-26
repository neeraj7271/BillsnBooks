'use client';

import React, { useEffect, useState } from 'react';
import { Lock, Unlock, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ListPage, Button, Badge, DateText, type ColumnDef } from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';

interface Period {
  id: string;
  periodName: string;
  startDate: string;
  endDate: string;
  isLocked: boolean;
  lockedAt?: string;
}

export default function PeriodsPage() {
  const { activeCompanyId } = useCompany();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('FIRM_PARTNER');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('antigravity_user');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.role) setUserRole(parsed.role);
        }
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  const canManageLocks = userRole !== 'STAFF_ACCOUNTANT';

  const loadPeriods = async () => {
    setLoading(true);
    try {
      const data = await apiClient.listPeriods(activeCompanyId);
      setPeriods(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load accounting periods');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPeriods();
  }, [activeCompanyId]);

  const handleToggleLock = async (period: Period) => {
    if (!canManageLocks) return;
    setProcessingId(period.id);
    setError(null);
    setSuccess(null);
    try {
      if (period.isLocked) {
        await apiClient.unlockPeriod(activeCompanyId, period.id);
        setSuccess(`Accounting period "${period.periodName}" has been reopened.`);
      } else {
        await apiClient.lockPeriod(activeCompanyId, period.id);
        setSuccess(`Accounting period "${period.periodName}" is now locked against retroactive voucher entry.`);
      }
      await loadPeriods();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update period lock status');
    } finally {
      setProcessingId(null);
    }
  };

  const columns: ColumnDef<Period>[] = [
    {
      key: 'periodName',
      header: 'Period Name',
      cell: (p) => <span className="font-semibold text-primary text-sm">{p.periodName}</span>,
    },
    {
      key: 'startDate',
      header: 'Start Date',
      cell: (p) => <DateText date={p.startDate} />,
    },
    {
      key: 'endDate',
      header: 'End Date',
      cell: (p) => <DateText date={p.endDate} />,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      cell: (p) => (
        <Badge variant={p.isLocked ? 'danger' : 'success'} size="xs" dot>
          {p.isLocked ? 'LOCKED' : 'OPEN'}
        </Badge>
      ),
    },
    {
      key: 'audit',
      header: 'Audit Information',
      cell: (p) => (
        <span className="text-caption text-muted">
          {p.isLocked && p.lockedAt
            ? `Locked on ${new Date(p.lockedAt).toLocaleDateString('en-IN')}`
            : 'Open for journal entry'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Lock Control',
      align: 'center',
      cell: (p) => (
        <Button
          variant={p.isLocked ? 'outline' : 'danger'}
          size="xs"
          loading={processingId === p.id}
          disabled={!canManageLocks}
          title={
            !canManageLocks
              ? 'Only Firm Partners can lock or unlock accounting periods'
              : undefined
          }
          onClick={() => handleToggleLock(p)}
          leftIcon={p.isLocked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
        >
          {p.isLocked ? 'Unlock Month' : 'Lock Month'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {success && (
        <div className="rounded-xl border border-status-success bg-status-success-subtle p-3.5 text-xs font-medium text-status-success-text flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {!canManageLocks && (
        <div className="rounded-xl border border-status-warning bg-status-warning-subtle p-3.5 text-xs font-medium text-status-warning-text flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Read-only view: Only Firm Partners can lock or unlock accounting periods.</span>
        </div>
      )}

      <ListPage<Period>
        header={{
          title: 'Accounting Period Locks',
          subtitle: 'Enforce audit integrity by locking closed accounting periods against retroactive edits.',
          badge: <Badge variant="brand" size="sm">Audit Lock</Badge>,
        }}
        kpis={
          <div className="rounded-xl border border-focus bg-brand-subtle p-4 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-brand-text shrink-0 mt-0.5" />
            <div className="text-xs text-brand-text space-y-0.5">
              <p className="font-semibold">Automated Statutory Safeguard</p>
              <p>
                When a period is locked, the Accounting Core rejects voucher creation, bulk import posts, and bank matches within that window.
              </p>
            </div>
          </div>
        }
        columns={columns}
        data={periods}
        loading={loading}
        error={error}
        onRetry={loadPeriods}
        empty={{
          title: 'No accounting periods found',
          description: 'Financial year periods are auto-generated upon company creation.',
        }}
        tableProps={{ stickyHeader: true }}
      />
    </div>
  );
}
