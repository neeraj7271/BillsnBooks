'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus,
  RefreshCw,
  Columns3,
  List,
  Calendar as CalendarIcon,
  CheckSquare,
  Square,
  MessageSquare,
  Repeat,
  X,
  Play,
  Tag,
  ShieldCheck,
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
import { ReviewInboxView } from '../reviews/review-inbox-view';
import { ComplianceTasksView } from '../tasks/tasks-view';

const DEFAULT_STAGES = [
  { key: 'BACKLOG', label: 'Backlog' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'REVIEW', label: 'Review' },
  { key: 'AWAITING_CLIENT', label: 'Awaiting Client' },
  { key: 'FILED', label: 'Filed' },
  { key: 'DONE', label: 'Done' },
];

function JobsPipelineContent() {
  const searchParams = useSearchParams();
  const initialStage = searchParams.get('stage') || '';
  const initialAssignee = searchParams.get('assignedToUserId') || '';

  const [view, setView] = useState<'KANBAN' | 'LIST' | 'CALENDAR'>('KANBAN');
  const [jobs, setJobs] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [customFieldsDef, setCustomFieldsDef] = useState<any[]>([]);
  const [labelsDef, setLabelsDef] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [spawning, setSpawning] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  // Filters
  const [searchFilter, setSearchFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState(initialAssignee);
  const [labelFilter, setLabelFilter] = useState('');

  // Drag state
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);

  // Create Job Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [newClientId, setNewClientId] = useState('');
  const [newServiceId, setNewServiceId] = useState('');
  const [newPeriod, setNewPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [creating, setCreating] = useState(false);

  // Inline custom service inside Create Job modal
  const [showInlineSvc, setShowInlineSvc] = useState(false);
  const [inlineSvcName, setInlineSvcName] = useState('');
  const [inlineSvcCategory, setInlineSvcCategory] = useState('Advisory');

  // Job Detail Drawer
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [commentText, setCommentText] = useState('');
  const [jobTimeEntries, setJobTimeEntries] = useState<any[]>([]);
  const [jobReviewHistory, setJobReviewHistory] = useState<any[]>([]);
  const [reviewMode, setReviewMode] = useState<'OFF' | 'SELF_SIGNOFF' | 'ENFORCED'>('ENFORCED');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null);
  const [timerJobId, setTimerJobId] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [manualMinutes, setManualMinutes] = useState('45');
  const [manualNote, setManualNote] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('practice_active_timer');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.jobId && parsed.startedAt) {
          setTimerJobId(parsed.jobId);
          setTimerStartedAt(parsed.startedAt);
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!timerStartedAt) {
      setElapsedSec(0);
      return;
    }
    const tick = () => setElapsedSec(Math.max(0, Math.floor((Date.now() - timerStartedAt) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timerStartedAt]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [jobsRes, svcRes, tplRes, clientRes, workloadRes, cfRes, lblRes] = await Promise.all([
        apiClient.listPracticeJobs({ stage: initialStage || undefined }),
        apiClient.listPracticeServices().catch(() => []),
        apiClient.listWorkflowTemplates().catch(() => []),
        apiClient.listPracticeClients().catch(() => []),
        apiClient.getPracticeWorkload().catch(() => ({ staff: [] })),
        apiClient.listCustomFields('JOB').catch(() => []),
        apiClient.listPracticeLabels('JOB').catch(() => []),
      ]);
      setJobs(jobsRes || []);
      setServices(svcRes || []);
      setTemplates(tplRes || []);
      setClients(clientRes || []);
      setStaff(workloadRes?.staff || []);
      setCustomFieldsDef(cfRes || []);
      setLabelsDef(lblRes || []);

      if (!newClientId && clientRes?.length > 0) setNewClientId(clientRes[0].id);
      if (!newServiceId && svcRes?.length > 0) setNewServiceId(svcRes[0].id);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [initialStage]);

  const categories = useMemo(
    () => Array.from(new Set(services.map((s) => s.category).filter(Boolean))).sort(),
    [services],
  );

  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (serviceFilter && j.serviceTypeId !== serviceFilter) return false;
      if (categoryFilter && j.serviceCategory !== categoryFilter) return false;
      if (clientFilter && j.clientId !== clientFilter) return false;
      if (assigneeFilter && j.assignedToUserId !== assigneeFilter) return false;
      if (labelFilter && !(j.labels || []).includes(labelFilter)) return false;
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        return (
          j.title?.toLowerCase().includes(q) ||
          j.clientName?.toLowerCase().includes(q) ||
          j.serviceName?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [jobs, serviceFilter, categoryFilter, clientFilter, assigneeFilter, labelFilter, searchFilter]);

  // Dynamic Kanban stages: if a service filter is active and that service defines custom stages, render those!
  // Otherwise, if filtered jobs share custom stages not in DEFAULT_STAGES, include them.
  const activeColumns = useMemo(() => {
    if (serviceFilter) {
      const svc = services.find((s) => s.id === serviceFilter);
      if (svc?.defaultStages?.length) {
        return svc.defaultStages.map((st: any) => ({ key: st.key, label: st.label }));
      }
    }
    const cols = [...DEFAULT_STAGES];
    const seen = new Set(cols.map((c) => c.key));
    for (const j of filteredJobs) {
      if (j.stage && !seen.has(j.stage)) {
        seen.add(j.stage);
        const match = (j.stages || []).find((s: any) => s.key === j.stage);
        cols.push({ key: j.stage, label: match?.label || j.stage.replace(/_/g, ' ') });
      }
    }
    return cols;
  }, [serviceFilter, services, filteredJobs]);

  const openJobDetail = async (jobId: string) => {
    setReviewError(null);
    setCurrentUserId(typeof window !== 'undefined' ? localStorage.getItem('antigravity_user_id') : null);
    const [detail, entries, reviews, revSettings] = await Promise.all([
      apiClient.getPracticeJob(jobId),
      apiClient.listTimeEntries({ jobId }).catch(() => []),
      apiClient.getJobReviewHistory(jobId).catch(() => []),
      apiClient.getReviewSettings().catch(() => ({ reviewMode: 'ENFORCED' })),
    ]);
    setSelectedJob(detail);
    setJobTimeEntries(entries || []);
    setJobReviewHistory(reviews || []);
    setReviewMode(revSettings?.reviewMode || 'ENFORCED');
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

  const handleSpawnDue = async () => {
    setSpawning(true);
    try {
      const res = await apiClient.spawnDuePracticeJobs();
      setBanner(`Recurrence Engine: spawned ${res.spawnedCount} job(s), skipped ${res.skippedCount} existing/one-time.`);
      await loadAll();
    } finally {
      setSpawning(false);
    }
  };

  const handleCreateInlineService = async () => {
    if (!inlineSvcName.trim()) return;
    const created = await apiClient.createPracticeService({
      name: inlineSvcName.trim(),
      category: inlineSvcCategory.trim() || 'General',
      frequency: 'MONTHLY',
    });
    setServices((prev) => [...prev, created]);
    setNewServiceId(created.id);
    setInlineSvcName('');
    setShowInlineSvc(false);
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientId) return;
    setCreating(true);
    try {
      await apiClient.createPracticeJob({
        clientId: newClientId,
        serviceTypeId: newServiceId || undefined,
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

  const handleSaveJobCustom = async (customFields: Record<string, any>, labels: string[]) => {
    if (!selectedJob) return;
    await apiClient.updateJobCustomData(selectedJob.id, { customFields, labels });
    await openJobDetail(selectedJob.id);
    await loadAll();
  };

  const drawerStages = useMemo(() => {
    if (selectedJob?.stages?.length) {
      return selectedJob.stages.map((s: any) => ({ key: s.key, label: s.label }));
    }
    return DEFAULT_STAGES;
  }, [selectedJob]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-primary">Practice Jobs &amp; Workflow Pipeline</h1>
            <Badge variant="brand" size="sm">{filteredJobs.length} Jobs</Badge>
          </div>
          <p className="mt-1 text-xs text-secondary">
            Configurable service pipelines, custom workflow stages, and automated client-subscription recurrence.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-xl bg-surface-sunken p-0.5">
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

          <Button
            variant="outline"
            size="sm"
            onClick={handleSpawnDue}
            loading={spawning}
            leftIcon={<Play className="h-3.5 w-3.5" />}
          >
            Spawn Due Jobs
          </Button>
          <Button variant="outline" size="sm" onClick={loadAll} loading={loading} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)} leftIcon={<Plus className="h-3.5 w-3.5" />}>
            New Job
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 rounded-xl border border-subtle bg-surface p-3 shadow-card">
        <Input
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder="Search jobs..."
        />
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="rounded-xl border border-default bg-surface px-2.5 py-1.5 text-xs text-primary"
          aria-label="Filter by service"
        >
          <option value="">All Services</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-default bg-surface px-2.5 py-1.5 text-xs text-primary"
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="rounded-xl border border-default bg-surface px-2.5 py-1.5 text-xs text-primary"
          aria-label="Filter by client"
        >
          <option value="">All Clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.companyName}</option>
          ))}
        </select>
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="rounded-xl border border-default bg-surface px-2.5 py-1.5 text-xs text-primary"
          aria-label="Filter by assignee"
        >
          <option value="">All Assignees</option>
          {staff.map((s) => (
            <option key={s.userId} value={s.userId}>{s.name}</option>
          ))}
        </select>
        <select
          value={labelFilter}
          onChange={(e) => setLabelFilter(e.target.value)}
          className="rounded-xl border border-default bg-surface px-2.5 py-1.5 text-xs text-primary"
          aria-label="Filter by label"
        >
          <option value="">All Labels</option>
          {labelsDef.map((l) => (
            <option key={l.id} value={l.name}>{l.name}</option>
          ))}
        </select>
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
          {activeColumns.map((stage: any) => {
            const stageJobs = filteredJobs.filter((j) => j.stage === stage.key);
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
                className="rounded-xl bg-surface-sunken/70 p-3 min-h-[380px] space-y-2.5"
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
                        className="cursor-pointer rounded-xl border border-subtle bg-surface p-3 shadow-card hover:shadow-card-hover transition-shadow space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-primary leading-snug">{job.title}</span>
                          {job.isRecurring && <Repeat className="h-3.5 w-3.5 text-brand-text shrink-0" />}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {job.serviceCategory && <Badge variant="neutral" size="xs">{job.serviceCategory}</Badge>}
                          {(job.labels || []).map((lbl: string) => (
                            <Badge key={lbl} variant="info" size="xs">{lbl}</Badge>
                          ))}
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
        <div className="rounded-xl border border-subtle bg-surface shadow-card overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-default bg-surface-sunken/50 text-[11px] font-bold uppercase text-muted">
                <th className="py-3 px-4">Job Title</th>
                <th className="py-3 px-3">Service</th>
                <th className="py-3 px-3">Client</th>
                <th className="py-3 px-3">Period</th>
                <th className="py-3 px-3">Stage</th>
                <th className="py-3 px-3">Assigned</th>
                <th className="py-3 px-3">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle">
              {filteredJobs.map((job) => (
                <tr key={job.id} onClick={() => openJobDetail(job.id)} className="cursor-pointer hover:bg-surface-sunken/40">
                  <td className="py-3 px-4 font-bold text-primary">{job.title}</td>
                  <td className="py-3 px-3 text-secondary">{job.serviceName || job.jobType}</td>
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
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              onClick={() => openJobDetail(job.id)}
              className="cursor-pointer rounded-xl border border-subtle bg-surface p-4 shadow-card hover:shadow-card-hover transition-shadow flex items-center justify-between"
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
              <DialogTitle>Create Job from Service Master</DialogTitle>
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-secondary">Service Type</label>
                  <button
                    type="button"
                    onClick={() => setShowInlineSvc((v) => !v)}
                    className="text-[11px] font-semibold text-brand-text hover:underline"
                  >
                    + Add custom service
                  </button>
                </div>
                <select
                  value={newServiceId}
                  onChange={(e) => setNewServiceId(e.target.value)}
                  className="w-full rounded-xl border border-default bg-surface px-3 py-2 text-xs text-primary"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.category} · {s.frequency})
                    </option>
                  ))}
                </select>
              </div>

              {showInlineSvc && (
                <div className="p-2.5 rounded-xl bg-surface-sunken space-y-2">
                  <div className="text-[11px] font-bold text-primary">New Custom Service</div>
                  <Input
                    value={inlineSvcName}
                    onChange={(e) => setInlineSvcName(e.target.value)}
                    placeholder="Service name (e.g. RERA Compliance)"
                  />
                  <Input
                    value={inlineSvcCategory}
                    onChange={(e) => setInlineSvcCategory(e.target.value)}
                    placeholder="Category (e.g. Real Estate)"
                  />
                  <div className="flex justify-end gap-1.5">
                    <Button type="button" size="xs" variant="ghost" onClick={() => setShowInlineSvc(false)}>Cancel</Button>
                    <Button type="button" size="xs" variant="primary" onClick={handleCreateInlineService}>Save</Button>
                  </div>
                </div>
              )}

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
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="brand" size="xs">{selectedJob.stage}</Badge>
                {selectedJob.serviceCategory && <Badge variant="neutral" size="xs">{selectedJob.serviceCategory}</Badge>}
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
            {/* Stage Switcher (with Enforced Maker-Checker Review Gate) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-bold uppercase text-muted">Move Pipeline Stage</label>
                {selectedJob.reviewStatus && selectedJob.reviewStatus !== 'NONE' && (
                  <Badge
                    variant={
                      selectedJob.reviewStatus === 'SIGNED_OFF' || selectedJob.reviewStatus === 'APPROVED'
                        ? 'success'
                        : selectedJob.reviewStatus === 'CHANGES_REQUESTED'
                          ? 'danger'
                          : 'warning'
                    }
                    size="xs"
                  >
                    {selectedJob.reviewStatus.replace(/_/g, ' ')}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {drawerStages.map((s: any) => {
                  const isPreparer = Boolean(currentUserId && selectedJob.preparerUserId === currentUserId);
                  const isGatedOrTerminal = s.key === 'FILED' || s.key === 'DONE' || selectedJob.stage.includes('REVIEW');
                  const notApproved = selectedJob.reviewStatus !== 'APPROVED' && selectedJob.reviewStatus !== 'SIGNED_OFF';
                  const disabledForPreparer = reviewMode === 'ENFORCED' && isPreparer && isGatedOrTerminal && notApproved && s.key !== selectedJob.stage;
                  return (
                    <Button
                      key={s.key}
                      variant={selectedJob.stage === s.key ? 'primary' : 'outline'}
                      size="xs"
                      disabled={disabledForPreparer}
                      title={disabledForPreparer ? 'Awaiting review by Reviewer/Partner' : undefined}
                      onClick={() => handleMoveStage(selectedJob.id, s.key)}
                    >
                      {s.label}
                    </Button>
                  );
                })}
              </div>
              {reviewMode === 'ENFORCED' && currentUserId && selectedJob.preparerUserId === currentUserId && selectedJob.reviewStatus === 'IN_REVIEW' && (
                <div className="mt-2 p-2 rounded-lg bg-status-warning-subtle text-[11px] text-status-warning-text font-medium">
                  Awaiting review by Reviewer — preparer cannot advance or mark Filed.
                </div>
              )}
              {selectedJob.reviewStatus === 'CHANGES_REQUESTED' && selectedJob.reviewNotes && (
                <div className="mt-2 p-2 rounded-lg bg-status-danger-subtle text-[11px] text-status-danger-text font-medium">
                  Changes Requested: {selectedJob.reviewNotes}
                </div>
              )}
            </div>

            {/* Maker-Checker Review & Sign-off Engine */}
            <div className="p-3 rounded-xl bg-surface-sunken space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-muted">Review &amp; Sign-off ({reviewMode})</span>
                {selectedJob.reviewStatus !== 'IN_REVIEW' && selectedJob.reviewStatus !== 'SIGNED_OFF' && (
                  <Button
                    type="button"
                    size="xs"
                    variant="primary"
                    onClick={async () => {
                      setReviewError(null);
                      await apiClient.submitJobForReview(selectedJob.id, reviewRemarks || undefined);
                      setReviewRemarks('');
                      await openJobDetail(selectedJob.id);
                      await loadAll();
                    }}
                  >
                    Submit for Review
                  </Button>
                )}
              </div>
              {reviewError && (
                <div className="text-[11px] text-status-danger-text font-medium">{reviewError}</div>
              )}
              <div className="flex gap-2">
                <Input
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  placeholder="Review remarks or rework notes..."
                />
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  disabled={selectedJob.reviewStatus !== 'IN_REVIEW'}
                  onClick={async () => {
                    setReviewError(null);
                    try {
                      await apiClient.returnJobForRework(selectedJob.id, reviewRemarks || 'Please revise working papers');
                      setReviewRemarks('');
                      await openJobDetail(selectedJob.id);
                      await loadAll();
                    } catch (err: any) {
                      setReviewError(err?.message || 'Return failed');
                    }
                  }}
                >
                  Return
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="primary"
                  disabled={
                    (reviewMode === 'ENFORCED' && currentUserId === selectedJob.preparerUserId) ||
                    selectedJob.reviewStatus === 'SIGNED_OFF'
                  }
                  onClick={async () => {
                    setReviewError(null);
                    try {
                      await apiClient.approveJobReview(selectedJob.id, { notes: reviewRemarks || undefined, isFinalSignoff: true });
                      setReviewRemarks('');
                      await openJobDetail(selectedJob.id);
                      await loadAll();
                    } catch (err: any) {
                      setReviewError(err?.message || 'Approval blocked');
                    }
                  }}
                >
                  {reviewMode === 'ENFORCED' ? 'Approve & Sign Off' : 'Self Sign-Off'}
                </Button>
              </div>
              {jobReviewHistory.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-subtle">
                  <div className="text-[10px] font-bold uppercase text-muted">Review Audit Timeline</div>
                  {jobReviewHistory.map((rh: any) => (
                    <div key={rh.id} className="text-[11px] flex justify-between gap-2 text-secondary">
                      <span>
                        <strong>{rh.actorName}</strong> ({rh.actorRole}) · <span className="font-semibold">{rh.action}</span>
                        {rh.notes ? ` — "${rh.notes}"` : ''}
                      </span>
                      <span className="font-mono text-[10px] text-muted shrink-0">
                        {new Date(rh.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
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

            {/* Labels */}
            {labelsDef.length > 0 && (
              <div>
                <div className="text-[11px] font-bold uppercase text-muted mb-1.5 flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Labels
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {labelsDef.map((l) => {
                    const active = (selectedJob.labels || []).includes(l.name);
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => {
                          const current = selectedJob.labels || [];
                          const next = active
                            ? current.filter((x: string) => x !== l.name)
                            : [...current, l.name];
                          handleSaveJobCustom(selectedJob.customFields || {}, next);
                        }}
                        className={`px-2.5 py-1 rounded-full text-xs border ${
                          active
                            ? 'bg-brand-subtle border-brand text-brand-text font-semibold'
                            : 'border-default text-secondary'
                        }`}
                      >
                        {l.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom Fields */}
            {customFieldsDef.length > 0 && (
              <div className="space-y-2 border-t border-default pt-3">
                <div className="text-[11px] font-bold uppercase text-muted">Custom Fields</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {customFieldsDef.map((cf) => (
                    <div key={cf.id}>
                      <label className="block text-[11px] font-medium text-secondary mb-1">{cf.label}</label>
                      <Input
                        value={String(selectedJob.customFields?.[cf.fieldKey] ?? '')}
                        onChange={(e) => {
                          const next = { ...(selectedJob.customFields || {}), [cf.fieldKey]: e.target.value };
                          setSelectedJob({ ...selectedJob, customFields: next });
                        }}
                        onBlur={() => handleSaveJobCustom(selectedJob.customFields || {}, selectedJob.labels || [])}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Checklist */}
            <div>
              <div className="text-[11px] font-bold uppercase text-muted mb-2">Workflow Checklist</div>
              <div className="space-y-1.5">
                {(selectedJob.checklist || []).map((item: any) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleToggleChecklist(selectedJob.id, item.id)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-surface-sunken/60 hover:bg-surface-sunken text-left"
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

            {/* Time Tracking (Timer + Manual Entry) */}
            <div className="space-y-3 pt-2 border-t border-default">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold uppercase text-muted">Time Tracking</div>
                {timerJobId === selectedJob.id && timerStartedAt ? (
                  <Button
                    type="button"
                    size="xs"
                    variant="danger"
                    onClick={async () => {
                      const mins = Math.max(1, Math.round((Date.now() - timerStartedAt) / 60000));
                      localStorage.removeItem('practice_active_timer');
                      setTimerStartedAt(null);
                      setTimerJobId(null);
                      await apiClient.logTimeEntry({
                        clientId: selectedJob.clientId,
                        jobId: selectedJob.id,
                        minutes: mins,
                        isBillable: true,
                        hourlyRate: 1500,
                        notes: `Timer session on ${selectedJob.title}`,
                      });
                      const entries = await apiClient.listTimeEntries({ jobId: selectedJob.id });
                      setJobTimeEntries(entries || []);
                    }}
                  >
                    Stop Timer ({Math.floor(elapsedSec / 60)}m {elapsedSec % 60}s)
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={() => {
                      const now = Date.now();
                      localStorage.setItem('practice_active_timer', JSON.stringify({ jobId: selectedJob.id, startedAt: now }));
                      setTimerJobId(selectedJob.id);
                      setTimerStartedAt(now);
                    }}
                  >
                    Start Timer
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  className="w-24"
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(e.target.value)}
                  placeholder="Mins"
                />
                <Input
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  placeholder="Manual time note..."
                />
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={async () => {
                    if (!Number(manualMinutes)) return;
                    await apiClient.logTimeEntry({
                      clientId: selectedJob.clientId,
                      jobId: selectedJob.id,
                      minutes: Number(manualMinutes),
                      isBillable: true,
                      hourlyRate: 1500,
                      notes: manualNote || `Work on ${selectedJob.title}`,
                    });
                    setManualNote('');
                    const entries = await apiClient.listTimeEntries({ jobId: selectedJob.id });
                    setJobTimeEntries(entries || []);
                  }}
                >
                  Log
                </Button>
              </div>
              {jobTimeEntries.length > 0 && (
                <div className="space-y-1">
                  {jobTimeEntries.slice(0, 4).map((te) => (
                    <div key={te.id} className="text-[11px] flex justify-between px-2 py-1 rounded bg-surface-sunken">
                      <span>{te.notes || 'Work'}</span>
                      <span className="font-mono">{te.minutes}m · ₹{te.amount}</span>
                    </div>
                  ))}
                </div>
              )}
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

function PracticeJobsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab: 'pipeline' | 'review' | 'tasks' =
    rawTab === 'review' ? 'review' : rawTab === 'tasks' ? 'tasks' : 'pipeline';

  const switchTab = (nextTab: 'pipeline' | 'review' | 'tasks') => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextTab === 'pipeline') {
      params.delete('tab');
    } else {
      params.set('tab', nextTab);
    }
    const qs = params.toString();
    router.replace(qs ? `/practice/jobs?${qs}` : '/practice/jobs');
  };

  return (
    <div className="space-y-5">
      {/* Top Workspace Tabs */}
      <div className="flex items-center justify-between gap-4 border-b border-subtle pb-3">
        <div className="inline-flex rounded-xl bg-surface-sunken p-1 gap-1">
          <button
            type="button"
            onClick={() => switchTab('pipeline')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'pipeline'
                ? 'bg-surface text-primary shadow-xs'
                : 'text-muted hover:text-primary'
            }`}
          >
            <Columns3 className="h-3.5 w-3.5" /> Pipeline
          </button>
          <button
            type="button"
            onClick={() => switchTab('review')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'review'
                ? 'bg-surface text-primary shadow-xs'
                : 'text-muted hover:text-primary'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Review queue
          </button>
          <button
            type="button"
            onClick={() => switchTab('tasks')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'tasks'
                ? 'bg-surface text-primary shadow-xs'
                : 'text-muted hover:text-primary'
            }`}
          >
            <CheckSquare className="h-3.5 w-3.5" /> Tasks
          </button>
        </div>
      </div>

      {activeTab === 'review' ? (
        <ReviewInboxView />
      ) : activeTab === 'tasks' ? (
        <ComplianceTasksView />
      ) : (
        <JobsPipelineContent />
      )}
    </div>
  );
}

export default function PracticeJobsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted">Loading jobs pipeline...</div>}>
      <PracticeJobsContent />
    </Suspense>
  );
}
