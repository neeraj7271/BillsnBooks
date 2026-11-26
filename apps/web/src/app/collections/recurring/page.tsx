'use client';

import React, { useState, useEffect } from 'react';
import {
  Button,
  Badge,
  DataTable,
  Card,
  type ColumnDef,
} from '@platform/ui';
import {
  CalendarClock,
  Plus,
  RefreshCw,
  Play,
  Pause,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { RecurringScheduleDialog } from './recurring-schedule-dialog';
import {
  RecurringScheduleStatus,
  type RecurringScheduleDto,
} from '@platform/shared-types';

export default function RecurringSchedulesPage() {
  const { activeCompanyId } = useCompany();
  const [schedules, setSchedules] = useState<RecurringScheduleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const data = await apiClient.listRecurringSchedules(activeCompanyId);
      setSchedules(data || []);
    } catch (err: unknown) {
      console.error('Failed to load recurring schedules', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, [activeCompanyId]);

  const handleToggleStatus = async (schedule: RecurringScheduleDto) => {
    setActionLoadingId(schedule.id);
    const newStatus =
      schedule.status === RecurringScheduleStatus.ACTIVE
        ? RecurringScheduleStatus.PAUSED
        : RecurringScheduleStatus.ACTIVE;
    try {
      await apiClient.updateRecurringScheduleStatus(undefined, schedule.id, newStatus);
      await loadSchedules();
    } catch (err: unknown) {
      console.error('Failed to update status', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleTriggerRun = async (schedule: RecurringScheduleDto) => {
    setActionLoadingId(schedule.id);
    setSuccessMessage(null);
    try {
      const res = await apiClient.triggerRecurringRun(undefined, schedule.id);
      setSuccessMessage(
        `Successfully generated Invoice #${res.invoiceNumber} for ${schedule.partyName || 'Party'}! Next run scheduled for ${res.schedule.nextRunDate}.`,
      );
      await loadSchedules();
    } catch (err: unknown) {
      console.error('Failed to trigger recurring run', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const activeCount = schedules.filter((s) => s.status === RecurringScheduleStatus.ACTIVE).length;
  const pausedCount = schedules.filter((s) => s.status === RecurringScheduleStatus.PAUSED).length;
  const totalInvoicesGen = schedules.reduce((acc, s) => acc + s.totalRuns, 0);

  const columns: ColumnDef<RecurringScheduleDto>[] = [
    {
      header: 'Customer',
      key: 'partyName',
      cell: (row) => (
        <div>
          <div className="font-bold text-primary">{row.partyName || 'Customer'}</div>
          <div className="text-[11px] text-muted text-muted">
            {row.templatePayload.items[0]?.description || 'Billing Template'}
          </div>
        </div>
      ),
    },
    {
      header: 'Cadence',
      key: 'frequency',
      cell: (row) => (
        <span className="font-semibold text-secondary text-muted capitalize text-xs">
          {row.frequency.toLowerCase()}
        </span>
      ),
    },
    {
      header: 'Next Run Date',
      key: 'nextRunDate',
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-brand-text text-brand">
          {row.nextRunDate}
        </span>
      ),
    },
    {
      header: 'Last Run Date',
      key: 'lastRunDate',
      cell: (row) => (
        <span className="font-mono text-xs text-muted text-muted">
          {row.lastRunDate || 'Never'}
        </span>
      ),
    },
    {
      header: 'Runs Executed',
      key: 'totalRuns',
      cell: (row) => (
        <span className="text-xs font-bold text-primary tabular-nums">
          {row.totalRuns} {row.maxRuns ? `/ ${row.maxRuns}` : ''}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      cell: (row) => (
        <Badge
          variant={
            row.status === RecurringScheduleStatus.ACTIVE
              ? 'success'
              : row.status === RecurringScheduleStatus.PAUSED
              ? 'warning'
              : 'neutral'
          }
          size="sm"
        >
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      key: 'id',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleTriggerRun(row)}
            loading={actionLoadingId === row.id}
            disabled={row.status !== RecurringScheduleStatus.ACTIVE}
            leftIcon={<Play className="h-3 w-3 text-status-success-text" />}
          >
            Run Now
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleToggleStatus(row)}
            loading={actionLoadingId === row.id}
          >
            {row.status === RecurringScheduleStatus.ACTIVE ? (
              <Pause className="h-3 w-3 text-status-warning-text" />
            ) : (
              <Play className="h-3 w-3 text-brand-text" />
            )}
          </Button>
        </div>
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
              Recurring Invoicing Schedules
            </h1>
            <Badge variant="brand" size="sm">Automation</Badge>
          </div>
          <p className="mt-1 text-sm text-muted text-muted">
            Automated recurring invoice generators with statutory GST rule verification on execution dates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadSchedules}
            loading={loading}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setOpenModal(true)}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            New Schedule
          </Button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 bg-status-success-subtle bg-status-success border border-status-success border-status-success rounded-xl text-status-success-text text-status-success-text text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-status-success-text text-status-success-text" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white bg-surface border border border-strong rounded-xl shadow-xs border-l-4 border-l-emerald-500">
          <div className="text-xs font-semibold text-muted text-muted">Active Schedules</div>
          <div className="mt-1 text-2xl font-black text-primary tabular-nums">
            {activeCount}
          </div>
          <div className="text-[11px] text-muted text-muted">Executing automatically</div>
        </Card>
        <Card className="p-4 bg-white bg-surface border border border-strong rounded-xl shadow-xs border-l-4 border-l-amber-500">
          <div className="text-xs font-semibold text-muted text-muted">Paused Schedules</div>
          <div className="mt-1 text-2xl font-black text-primary tabular-nums">
            {pausedCount}
          </div>
          <div className="text-[11px] text-muted text-muted">On-hold billing</div>
        </Card>
        <Card className="p-4 bg-white bg-surface border border border-strong rounded-xl shadow-xs border-l-4 border-l-blue-500">
          <div className="text-xs font-semibold text-muted text-muted">Generated Invoices</div>
          <div className="mt-1 text-2xl font-black text-primary tabular-nums">
            {totalInvoicesGen}
          </div>
          <div className="text-[11px] text-muted text-muted">Total automated cycles</div>
        </Card>
      </div>

      {/* DataTable */}
      <div className="space-y-3">
        <div className="text-sm font-bold text-primary">Active Recurring Pipelines</div>
        <DataTable
          columns={columns}
          data={schedules}
          loading={loading}
          emptyTitle="No Recurring Schedules"
          emptyDescription="Click 'New Schedule' to set up recurring retainer invoicing."
        />
      </div>

      {/* Modal */}
      <RecurringScheduleDialog
        open={openModal}
        onOpenChange={setOpenModal}
        onSuccess={loadSchedules}
      />
    </div>
  );
}
