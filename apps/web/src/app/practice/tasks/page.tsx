'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckSquare, Plus, RefreshCw, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Button,
  Badge,
  DataTable,
  DateText,
  LoadingState,
  PageHeader,
  type ColumnDef,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { TaskDialog } from './task-dialog';
import { TaskStatusDialog } from './task-status-dialog';

interface TaskItem {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  category: string;
  statutoryPeriod: string;
  dueDate: string;
  status: string;
  priority: string;
  assignedToName: string;
  filingAcknowledgmentNumber?: string;
}

function ComplianceTasksContent() {
  const searchParams = useSearchParams();
  const initialClientId = searchParams.get('clientId') || '';

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [openCreateModal, setOpenCreateModal] = useState(false);

  // Status update modal state
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [openStatusModal, setOpenStatusModal] = useState(false);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await apiClient.listPracticeTasks({
        clientId: initialClientId || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
      });
      setTasks(data || []);
    } catch (err: unknown) {
      console.error('Failed to load compliance tasks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [statusFilter, categoryFilter, initialClientId]);

  const columns: ColumnDef<TaskItem>[] = [
    {
      header: 'Task & Client',
      key: 'title',
      cell: (row) => (
        <div>
          <div className="font-bold text-primary">{row.title}</div>
          <div className="text-xs text-muted text-muted">
            {row.clientName} | Period: <span className="font-mono">{row.statutoryPeriod}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Category',
      key: 'category',
      cell: (row) => (
        <Badge variant="neutral" size="sm">
          {row.category}
        </Badge>
      ),
    },
    {
      header: 'Statutory Due Date',
      key: 'dueDate',
      cell: (row) => {
        const isPast = row.dueDate < new Date().toISOString().split('T')[0]! && row.status !== 'FILED';
        return (
          <div className="flex items-center gap-1.5">
            <span className={isPast ? 'text-status-danger-text text-status-danger-text font-bold' : ''}>
              <DateText date={row.dueDate} />
            </span>
            {isPast && <AlertCircle className="h-3.5 w-3.5 text-status-danger-text" />}
          </div>
        );
      },
    },
    {
      header: 'Priority',
      key: 'priority',
      cell: (row) => {
        const v = row.priority === 'CRITICAL' ? 'danger' : row.priority === 'HIGH' ? 'warning' : 'brand';
        return (
          <Badge variant={v} size="sm">
            {row.priority}
          </Badge>
        );
      },
    },
    {
      header: 'Status',
      key: 'status',
      cell: (row) => {
        const v = row.status === 'FILED' ? 'success' : row.status === 'IN_PROGRESS' ? 'brand' : 'neutral';
        return (
          <div className="flex flex-col gap-0.5">
            <Badge variant={v} size="sm">
              {row.status.replace('_', ' ')}
            </Badge>
            {row.filingAcknowledgmentNumber && (
              <span className="text-[10px] font-mono text-status-success-text text-status-success-text">
                ARN: {row.filingAcknowledgmentNumber}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Actions',
      key: 'id',
      cell: (row) => (
        <Button
          variant="outline"
          size="xs"
          onClick={() => {
            setSelectedTask(row);
            setOpenStatusModal(true);
          }}
        >
          Update Status
        </Button>
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
              Compliance & Statutory Tasks
            </h1>
            <Badge variant="brand" size="sm">Practice Workflow</Badge>
          </div>
          <p className="mt-1 text-sm text-muted text-muted">
            Track GST, TDS, ROC, and bookkeeping deliverables across client entities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadTasks}
            loading={loading}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setOpenCreateModal(true)}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            New Task
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border border-strong pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['ALL', 'NOT_STARTED', 'IN_PROGRESS', 'PENDING_REVIEW', 'FILED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === st
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-surface-sunken bg-surface-raised text-secondary text-muted hover:text-primary hover:text-primary'
              }`}
            >
              {st === 'ALL' ? 'All Tasks' : st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-surface-sunken p-0.5 border border-border text-xs">
            {(['table', 'kanban'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setViewMode(m)}
                className={`px-2.5 py-1 rounded-md font-medium capitalize transition ${
                  viewMode === m ? 'bg-surface text-primary shadow-xs' : 'text-muted hover:text-primary'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs rounded-lg border border-border bg-surface text-secondary px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-focus-ring"
          >
            <option value="ALL">All Categories</option>
            <option value="GST">GST</option>
            <option value="TDS">TDS / TCS</option>
            <option value="INCOME_TAX">Income Tax</option>
            <option value="ROC">ROC / MCA</option>
            <option value="ACCOUNTING">Bookkeeping</option>
          </select>
        </div>
      </div>

      {/* Tasks Table or Kanban Board */}
      {viewMode === 'table' ? (
        <DataTable
          columns={columns}
          data={tasks}
          loading={loading}
          stickyHeader
          emptyTitle="No tasks matching criteria"
          emptyDescription="Create statutory compliance tasks or switch filters to view deliverables."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { key: 'NOT_STARTED', label: 'Not Started' },
            { key: 'IN_PROGRESS', label: 'In Progress' },
            { key: 'PENDING_REVIEW', label: 'Pending Review' },
            { key: 'FILED', label: 'Filed / Done' },
          ].map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key);
            return (
              <div
                key={col.key}
                className="rounded-xl border border-border bg-surface-raised p-3 flex flex-col gap-2.5 min-h-[320px]"
              >
                <div className="flex items-center justify-between px-1 pb-1 border-b border-border-subtle">
                  <span className="text-xs font-semibold text-primary">{col.label}</span>
                  <Badge variant="neutral" size="xs">{colTasks.length}</Badge>
                </div>
                {colTasks.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedTask(t);
                      setOpenStatusModal(true);
                    }}
                    className="text-left rounded-lg border border-border bg-surface p-3 hover:border-focus transition space-y-1.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="brand" size="xs">{t.category}</Badge>
                      <span className="text-caption text-muted">{t.statutoryPeriod}</span>
                    </div>
                    <div className="text-xs font-semibold text-primary line-clamp-2">{t.title}</div>
                    <div className="flex items-center justify-between text-caption text-muted pt-1">
                      <span className="truncate">{t.clientName}</span>
                      <DateText date={t.dueDate} />
                    </div>
                  </button>
                ))}
                {colTasks.length === 0 && (
                  <div className="text-caption text-muted text-center py-8">No tasks</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <TaskDialog
        open={openCreateModal}
        onOpenChange={setOpenCreateModal}
        onSuccess={loadTasks}
        defaultClientId={initialClientId}
      />

      <TaskStatusDialog
        open={openStatusModal}
        onOpenChange={setOpenStatusModal}
        task={selectedTask}
        onSuccess={loadTasks}
      />
    </div>
  );
}

export default function ComplianceTasksPage() {
  return (
    <Suspense fallback={<LoadingState rows={5} />}>
      <ComplianceTasksContent />
    </Suspense>
  );
}
