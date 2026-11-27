'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Plus,
  RefreshCw,
  Columns3,
  List,
  Calendar as CalendarIcon,
  CheckSquare,
  Square,
  MessageSquare,
  ArrowRight,
  Repeat,
  X,
  UserCheck,
} from 'lucide-react';
import {
  Button,
  Badge,
  Input,
  DateText,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';

const STAGES = [
  { key: 'BACKLOG', label: 'Backlog' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'REVIEW', label: 'Review' },
  { key: 'AWAITING_CLIENT', label: 'Awaiting Client' },
  { key: 'FILED', label: 'Filed' },
  { key: 'DONE', label: 'Done' },
] as const;

function JobsPipelineContent() {
  const searchParams = useSearchParams();
  const initialStage = searchParams.get('stage') || '';
  const initialAssignee = searchParams.get('assignedToUserId') || '';

  const [view, setView] = useState<'KANBAN' | 'LIST' | 'CALENDAR'>('KANBAN');
  const [jobs, setJobs] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);

  // Drag state
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);

  // Create Job Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [newClientId, setNewClientId] = useState('');
  const [newTemplateId, setNewTemplateId] = useState('');
  const [newPeriod, setNewPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [creating, setCreating] = useState(false);

  // Job Detail Drawer
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [commentText, setCommentText] = useState('');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [jobsRes, tplRes, clientRes, workloadRes] = await Promise.all([
        apiClient.listPracticeJobs({
          stage: initialStage || undefined,
          assignedToUserId: initialAssignee || undefined,
        }),
        apiClient.listWorkflowTemplates(),
        apiClient.listPracticeClients(),
        apiClient.getPracticeWorkload().catch(() => ({ staff: [] })),
      ]);
      setJobs(jobsRes || []);
      setTemplates(tplRes || []);
      setClients(clientRes || []);
      setStaff(workloadRes?.staff || []);

      if (!newClientId && clientRes?.length > 0) setNewClientId(clientRes[0].id);
      if (!newTemplateId && tplRes?.length > 0) setNewTemplateId(tplRes[0].id);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [initialStage, initialAssignee]);

  const openJobDetail = async (jobId: string) => {
    const detail = await apiClient.getPracticeJob(jobId);
    setSelectedJob(detail);
  };

  const handleMoveStage = async (jobId: string, stage: string) => {
    const res = await apiClient.movePracticeJobStage(jobId, stage);
    if (res?.spawnedNextJob) {
      setBanner(`Recurring job filed! Auto-spawned next period job: ${res.spawnedNextJob.title}`);
    }
    await loadAll();
    if (selectedJob?.id === jobId) {
      await openJobDetail(jobId);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientId) return;
    setCreating(true);
    try {
      await apiClient.createPracticeJob({
        clientId: newClientId,
        templateId: newTemplateId || undefined,
        period: newPeriod,
        assignedToUserId: newAssigneeId || undefined,
      });
      setCreateOpen(false);
      await loadAll();
    } finally {
      setCreating(false);
    }
  };

  const handleToggleChecklist = async (jobId: string, itemId: string) => {
    await apiClient.toggleJobChecklist(jobId, itemId);
    await openJobDetail(jobId);
    await loadAll();
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob || !commentText.trim()) return;
    await apiClient.addJobComment(selectedJob.id, commentText.trim());
    setCommentText('');
    await openJobDetail(selectedJob.id);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-primary">Practice Jobs & Workflow Pipeline</h1>
            <Badge variant="brand" size="sm">{jobs.length} Jobs</Badge>
          </div>
          <p className="mt-1 text-xs text-secondary">
            Manage GST, TDS, ITR, Tax Audit, and ROC deliverables across stages with recurring auto-spawning.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-xl border border-default bg-surface p-0.5">
            <button
              type="button"
              onClick={() => setView('KANBAN')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                view === 'KANBAN' ? 'bg-brand-subtle text-brand-text' : 'text-secondary'
              }`}
            >
              <Columns3 className="h-3.5 w-3.5" /> Kanban
            </button>
            <button
              type="button"
              onClick={() => setView('LIST')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                view === 'LIST' ? 'bg-brand-subtle text-brand-text' : 'text-secondary'
              }`}
            >
              <List className="h-3.5 w-3.5" /> List
            </button>
            <button
              type="button"
              onClick={() => setView('CALENDAR')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                view === 'CALENDAR' ? 'bg-brand-subtle text-brand-text' : 'text-secondary'
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5" /> Due Dates
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={loadAll} loading={loading} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)} leftIcon={<Plus className="h-3.5 w-3.5" />}>
            New Job from Template
          </Button>
        </div>
      </div>

      {banner && (
        <div className="p-3 rounded-xl bg-status-success-subtle border border-status-success text-xs text-status-success-text font-semibold flex items-center justify-between">
          <span>{banner}</span>
          <button type="button" onClick={() => setBanner(null)} aria-label="Dismiss banner">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* KANBAN BOARD */}
      {view === 'KANBAN' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 items-start">
          {STAGES.map((stage) => {
            const stageJobs = jobs.filter((j) => j.stage === stage.key);
            return (
              <div
                key={stage.key}
                data-testid={`kanban-col-${stage.key}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={async () => {
                  if (draggedJobId) {
                    await handleMoveStage(draggedJobId, stage.key);
                    setDraggedJobId(null);
                  }
                }}
                className="rounded-2xl border border-default bg-surface-sunken/50 p-3 min-h-[380px] space-y-2.5"
              >
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">{stage.label}</span>
                  <Badge variant="neutral" size="xs">{stageJobs.length}</Badge>
                </div>

                <div className="space-y-2">
                  {stageJobs.map((job) => {
                    const doneCount = (job.checklist || []).filter((c: any) => c.completed).length;
                    const totalCount = (job.checklist || []).length;
                    return (
                      <div
                        key={job.id}
                        draggable
                        onDragStart={() => setDraggedJobId(job.id)}
                        onClick={() => openJobDetail(job.id)}
                        className="cursor-pointer rounded-xl border border-default bg-surface p-3 shadow-2xs hover:border-brand transition space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-primary leading-snug">{job.title}</span>
                          {job.isRecurring && <Repeat className="h-3.5 w-3.5 text-brand-text shrink-0" />}
                        </div>
                        <div className="text-[11px] text-secondary truncate">{job.clientName}</div>
                        <div className="flex items-center justify-between text-[10px] text-muted pt-1 border-t border-subtle">
                          <span>{job.assignedToName}</span>
                          <span>
                            {totalCount > 0 ? `${doneCount}/${totalCount} tasks` : <DateText date={job.dueDate} />}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LIST VIEW */}
      {view === 'LIST' && (
        <div className="rounded-2xl border border-default bg-surface overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-default bg-surface-sunken/50 text-[11px] font-bold uppercase text-muted">
                <th className="py-3 px-4">Job Title</th>
                <th className="py-3 px-3">Client</th>
                <th className="py-3 px-3">Period</th>
                <th className="py-3 px-3">Stage</th>
                <th className="py-3 px-3">Assigned</th>
                <th className="py-3 px-3">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle">
              {jobs.map((job) => (
                <tr key={job.id} onClick={() => openJobDetail(job.id)} className="cursor-pointer hover:bg-surface-sunken/40">
                  <td className="py-3 px-4 font-bold text-primary">{job.title}</td>
                  <td className="py-3 px-3 text-secondary">{job.clientName}</td>
                  <td className="py-3 px-3 font-mono">{job.period}</td>
                  <td className="py-3 px-3"><Badge variant="brand" size="xs">{job.stage}</Badge></td>
                  <td className="py-3 px-3">{job.assignedToName}</td>
                  <td className="py-3 px-3"><DateText date={job.dueDate} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DUE DATES VIEW */}
      {view === 'CALENDAR' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              onClick={() => openJobDetail(job.id)}
              className="cursor-pointer rounded-xl border border-default bg-surface p-4 flex items-center justify-between hover:border-brand"
            >
              <div>
                <div className="text-xs font-bold text-primary">{job.title}</div>
                <div className="text-[11px] text-secondary mt-0.5">{job.clientName} · {job.stage}</div>
              </div>
              <Badge variant="warning" size="xs"><DateText date={job.dueDate} /></Badge>
            </div>
          ))}
        </div>
      )}

      {/* Create Job Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent size="sm">
          <form onSubmit={handleCreateJob} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Create Job from Workflow Template</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">Client</label>
                <select
                  value={newClientId}
                  onChange={(e) => setNewClientId(e.target.value)}
                  className="w-full rounded-xl border border-default bg-surface px-3 py-2 text-xs text-primary"
                  required
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} ({c.clientCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">Workflow Template</label>
                <select
                  value={newTemplateId}
                  onChange={(e) => setNewTemplateId(e.target.value)}
                  className="w-full rounded-xl border border-default bg-surface px-3 py-2 text-xs text-primary"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.isRecurring ? `(${t.recurrenceFrequency})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">Period (YYYY-MM)</label>
                <Input value={newPeriod} onChange={(e) => setNewPeriod(e.target.value)} placeholder="2026-11" required />
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">Assign To Staff</label>
                <select
                  value={newAssigneeId}
                  onChange={(e) => setNewAssigneeId(e.target.value)}
                  className="w-full rounded-xl border border-default bg-surface px-3 py-2 text-xs text-primary"
                >
                  <option value="">Unassigned</option>
                  {staff.map((s) => (
                    <option key={s.userId} value={s.userId}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={creating}>
                Create Job
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Job Detail Drawer */}
      {selectedJob && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-surface border-l border-default shadow-2xl flex flex-col">
          <div className="flex items-start justify-between p-5 border-b border-default">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="brand" size="xs">{selectedJob.stage}</Badge>
                {selectedJob.isRecurring && (
                  <Badge variant="info" size="xs">
                    <Repeat className="h-3 w-3 mr-1" />
                    Recurring ({selectedJob.recurrenceFrequency})
                  </Badge>
                )}
              </div>
              <h2 className="text-base font-black text-primary mt-1.5">{selectedJob.title}</h2>
              <Link href={`/practice/clients/${selectedJob.clientId}`} className="text-xs text-brand-text hover:underline">
                {selectedJob.clientName} · Client 360 →
              </Link>
            </div>
            <Button variant="ghost" size="sm" aria-label="Close job detail" onClick={() => setSelectedJob(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Stage Switcher */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-muted mb-2">Move Pipeline Stage</label>
              <div className="flex flex-wrap gap-1.5">
                {STAGES.map((s) => (
                  <Button
                    key={s.key}
                    variant={selectedJob.stage === s.key ? 'primary' : 'outline'}
                    size="xs"
                    onClick={() => handleMoveStage(selectedJob.id, s.key)}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Staff Assignment */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-muted mb-1.5">Assigned Team Member</label>
              <select
                value={selectedJob.assignedToUserId || ''}
                onChange={async (e) => {
                  await apiClient.assignPracticeJob(selectedJob.id, e.target.value || null);
                  await openJobDetail(selectedJob.id);
                  await loadAll();
                }}
                className="w-full rounded-xl border border-default bg-surface px-3 py-2 text-xs text-primary"
              >
                <option value="">Unassigned</option>
                {staff.map((s) => (
                  <option key={s.userId} value={s.userId}>
                    {s.name} ({s.openJobCount} open)
                  </option>
                ))}
              </select>
            </div>

            {/* Checklist */}
            <div>
              <div className="text-[11px] font-bold uppercase text-muted mb-2">Workflow Checklist</div>
              <div className="space-y-1.5">
                {(selectedJob.checklist || []).map((item: any) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleToggleChecklist(selectedJob.id, item.id)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl border border-default bg-surface-sunken/40 hover:bg-surface-sunken text-left"
                  >
                    <span className="flex items-center gap-2 text-xs">
                      {item.completed ? (
                        <CheckSquare className="h-4 w-4 text-status-success-text shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-muted shrink-0" />
                      )}
                      <span className={item.completed ? 'line-through text-muted' : 'text-primary font-medium'}>
                        {item.title}
                      </span>
                    </span>
                    <Badge variant="neutral" size="xs">{item.stage}</Badge>
                  </button>
                ))}
              </div>
            </div>

            {/* Comments */}
            <div className="space-y-3 pt-2 border-t border-default">
              <div className="text-[11px] font-bold uppercase text-muted flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" /> Team Comments
              </div>
              <div className="space-y-2">
                {(selectedJob.comments || []).map((c: any) => (
                  <div key={c.id} className="p-2.5 rounded-xl bg-surface-sunken/50 border border-subtle text-xs">
                    <div className="flex justify-between text-[11px] text-muted mb-1">
                      <strong className="text-primary">{c.authorName}</strong>
                      <span>{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-secondary">{c.comment}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddComment} className="flex gap-2">
                <Input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a note or filing update..."
                />
                <Button type="submit" variant="primary" size="sm">
                  Post
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PracticeJobsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted">Loading jobs pipeline...</div>}>
      <JobsPipelineContent />
    </Suspense>
  );
}
