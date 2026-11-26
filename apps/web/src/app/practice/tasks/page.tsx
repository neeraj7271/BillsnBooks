'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckSquare, Plus, RefreshCw, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Button,
  Badge,
  DataTable,
  DateText,
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
          <div className="text-xs text-secondary">
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
            <span className={isPast ? 'text-status-danger-text font-bold' : ''}>
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
              <span className="text-[10px] font-mono text-status-success-text">
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
          <p className="mt-1 text-sm text-secondary">
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-default pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['ALL', 'NOT_STARTED', 'IN_PROGRESS', 'PENDING_REVIEW', 'FILED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === st
                  ? 'bg-brand text-inverse shadow-xs'
                  : 'bg-surface-sunken text-secondary hover:text-primary'
              }`}
            >
              {st === 'ALL' ? 'All Tasks' : st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs rounded-lg border border-default bg-surface text-primary px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-focus-ring"
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

      {/* Tasks Table */}
      <DataTable
        columns={columns}
        data={tasks}
        loading={loading}
        emptyTitle="No tasks matching criteria"
        emptyDescription="Create statutory compliance tasks or switch filters to view deliverables."
      />

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
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted">Loading compliance tasks...</div>}>
      <ComplianceTasksContent />
    </Suspense>
  );
}
