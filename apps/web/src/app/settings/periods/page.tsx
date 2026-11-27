'use client';

import React, { useEffect, useState } from 'react';
import {
  CalendarClock,
  Lock,
  Unlock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  Button,
  Badge,
  DataTable,
  DateText,
  type ColumnDef,
} from '@platform/ui';
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

  const loadPeriods = async () => {
    setLoading(true);
    try {
      const data = await apiClient.listPeriods(activeCompanyId);
      setPeriods(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load accounting periods';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPeriods();
  }, [activeCompanyId]);

  const handleToggleLock = async (period: Period) => {
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
      const msg = err instanceof Error ? err.message : 'Failed to update period lock status';
      setError(msg);
    } finally {
      setProcessingId(null);
    }
  };

  const columns: ColumnDef<Period>[] = [
    {
      key: 'periodName',
      header: 'Period Name',
      cell: (p) => <span className="font-bold text-primary text-sm">{p.periodName}</span>,
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
        <span className="text-[11px] text-secondary">
          {p.isLocked && p.lockedAt ? `Locked on ${new Date(p.lockedAt).toLocaleDateString('en-IN')}` : 'Open for journal entry'}
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
          onClick={() => handleToggleLock(p)}
          leftIcon={p.isLocked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
        >
          {p.isLocked ? 'Unlock Month' : 'Lock Month'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black tracking-tight text-primary">
              Accounting Period Locks &amp; Month-End Closing
            </h1>
            <Badge variant="brand" size="sm">Audit Lock</Badge>
          </div>
          <p className="text-sm text-secondary">
            Enforce audit integrity by locking closed accounting periods to prevent unauthorized retroactive edits.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-default bg-status-danger-subtle p-4 text-xs font-semibold text-status-danger-text flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-status-danger-text" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-default bg-status-success-subtle p-4 text-xs font-semibold text-status-success-text flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-status-success-text" />
          <span>{success}</span>
        </div>
      )}

      {/* Info Notice */}
      <div className="rounded-2xl border border-default bg-status-info-subtle p-5 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-status-info-text shrink-0 mt-0.5" />
        <div className="text-xs text-primary space-y-1">
          <p className="font-bold">Automated Statutory Safeguard:</p>
          <p className="text-secondary">
            When a period is locked, the Accounting Core strictly rejects any voucher creation, bulk import post, or bank match within the period window.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={periods}
        loading={loading}
        emptyTitle="No locked periods"
        emptyDescription="Lock financial periods to freeze postings and prevent unauthorized edits."
      />
    </div>
  );
}
