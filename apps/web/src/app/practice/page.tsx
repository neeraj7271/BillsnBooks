'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  AlertTriangle,
  Clock,
  Users,
  Layers,
  Building2,
  RefreshCw,
  ShieldAlert,
  IndianRupee,
  CalendarClock,
  CheckCircle2,
  Circle,
  ArrowRight,
  HelpCircle,
  X,
  Plus,
} from 'lucide-react';
import { Button, Badge, Card, CardHeader, CardTitle, CardContent, DateText, Tooltip } from '@platform/ui';
import { apiClient } from '@/lib/api-client';

const GETTING_STARTED_DISMISSED_KEY = 'practice.gettingStarted.dismissed';
const MODE_EXPLAINER_DISMISSED_KEY = 'practice.modeExplainer.dismissed';

export default function PracticeCommandCenterPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [switchingMode, setSwitchingMode] = useState(false);
  const [checklistDismissed, setChecklistDismissed] = useState(false);
  const [modeExplainerDismissed, setModeExplainerDismissed] = useState(true);

  useEffect(() => {
    try {
      setChecklistDismissed(localStorage.getItem(GETTING_STARTED_DISMISSED_KEY) === 'true');
      setModeExplainerDismissed(localStorage.getItem(MODE_EXPLAINER_DISMISSED_KEY) === 'true');
    } catch {
      // ignore storage access errors
    }
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getCommandCenterDashboard();
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleToggleMode = async (mode: 'FIRM' | 'BUSINESS') => {
    setSwitchingMode(true);
    try {
      await apiClient.setWorkspaceMode(mode);
      window.dispatchEvent(new CustomEvent('practice-mode-changed', { detail: mode }));
      await loadDashboard();
    } finally {
      setSwitchingMode(false);
    }
  };

  const mode = data?.practiceMode || 'FIRM';
  const summary = data?.summary || {};
  const financials = data?.financials || {};
  const jobsByStage = data?.jobsByStage || {};
  const noticesByAuthority = data?.noticesByAuthority || {};
  const setupStatus = data?.setupStatus || {};

  const setupSteps = [
    {
      key: 'hasClients',
      done: Boolean(setupStatus.hasClients),
      title: 'Add your first client',
      why: 'Clients anchor proposals, jobs, documents, and billing.',
      href: '/practice/clients',
    },
    {
      key: 'hasServices',
      done: Boolean(setupStatus.hasServices),
      title: 'Set up your services & fees',
      why: 'Services define what you bill and drive recurring job creation.',
      href: '/practice/settings/services',
    },
    {
      key: 'hasTeam',
      done: Boolean(setupStatus.hasTeam),
      title: 'Add your team',
      why: 'Assign preparers and reviewers with hourly cost rates.',
      href: '/practice/team',
    },
    {
      key: 'hasJobs',
      done: Boolean(setupStatus.hasJobs),
      title: 'Send a proposal / create a job',
      why: 'Signed engagements auto-spawn jobs, or create one directly.',
      href: '/practice/proposals/new',
    },
    {
      key: 'hasTimeEntries',
      done: Boolean(setupStatus.hasTimeEntries),
      title: 'Log your first time entry',
      why: 'Billable hours flow directly into Unbilled WIP.',
      href: '/practice/timesheets',
    },
    {
      key: 'hasBills',
      done: Boolean(setupStatus.hasBills),
      title: 'Generate your first bill',
      why: 'Turn unbilled WIP and retainers into GST invoices.',
      href: '/practice/billing',
    },
  ];
  const doneCount = setupSteps.filter((s) => s.done).length;
  const showChecklist = mode === 'FIRM' && !loading && Boolean(data?.setupStatus) && doneCount < setupSteps.length && !checklistDismissed;

  const dismissChecklist = () => {
    setChecklistDismissed(true);
    try {
      localStorage.setItem(GETTING_STARTED_DISMISSED_KEY, 'true');
    } catch {
      // ignore
    }
  };

  const dismissModeExplainer = () => {
    setModeExplainerDismissed(true);
    try {
      localStorage.setItem(MODE_EXPLAINER_DISMISSED_KEY, 'true');
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-primary">
              {mode === 'BUSINESS' ? 'Business Compliance Hub' : 'Practice Command Center'}
            </h1>
            <Badge variant={mode === 'BUSINESS' ? 'info' : 'brand'} size="sm">
              {mode === 'BUSINESS' ? 'Business Mode' : 'Firm Mode'}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-secondary">
            {mode === 'BUSINESS'
              ? 'Single-entity statutory compliance, filings, documents, and tax notices.'
              : 'Firm-wide jobs pipeline, staff capacity, compliance risk, tax notices, and WIP/billing financials.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Tooltip content="Firm = manage many client businesses and staff. Business = compliance for a single entity.">
            <div className="inline-flex items-center rounded-xl bg-surface-sunken p-0.5">
              <button
                type="button"
                disabled={switchingMode}
                onClick={() => handleToggleMode('FIRM')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  mode === 'FIRM' ? 'bg-brand-subtle text-brand-text' : 'text-secondary'
                }`}
              >
                Firm Mode
              </button>
              <button
                type="button"
                disabled={switchingMode}
                onClick={() => handleToggleMode('BUSINESS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  mode === 'BUSINESS' ? 'bg-brand-subtle text-brand-text' : 'text-secondary'
                }`}
              >
                Business Mode
              </button>
              <span className="px-1.5 text-muted" aria-label="Mode help">
                <HelpCircle className="h-3.5 w-3.5" />
              </span>
            </div>
          </Tooltip>

          <Button variant="outline" size="sm" onClick={loadDashboard} loading={loading} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
            Refresh
          </Button>
          {mode === 'FIRM' && (
            <>
              <Link href="/practice/clients">
                <Button variant="outline" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>Add Client</Button>
              </Link>
              <Link href="/practice/jobs">
                <Button variant="outline" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>Create Job</Button>
              </Link>
              <Link href="/practice/proposals/new">
                <Button variant="primary" size="sm">New Proposal</Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* One-time Firm / Business mode explainer */}
      {!modeExplainerDismissed && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-subtle bg-surface px-4 py-2.5 text-xs text-secondary shadow-card">
          <span>
            <strong className="text-primary">Firm Mode</strong> turns on multi-client management, proposals, team capacity, timesheets &amp; WIP billing.{' '}
            <strong className="text-primary">Business Mode</strong> streamlines the nav to single-entity compliance, documents, calendar &amp; notices.
          </span>
          <button
            type="button"
            onClick={dismissModeExplainer}
            aria-label="Dismiss mode explanation"
            className="text-muted hover:text-primary shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Getting Started Checklist (Firm Mode) */}
      {showChecklist && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-primary">Getting Started with Practice Management</h2>
                  <Badge variant="brand" size="xs">{doneCount} of {setupSteps.length} done</Badge>
                </div>
                <p className="text-xs text-secondary mt-0.5">
                  Follow these 6 steps to connect clients, services, jobs, time tracking, and WIP billing.
                </p>
              </div>
              <button
                type="button"
                onClick={dismissChecklist}
                className="text-xs text-muted hover:text-primary flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" /> Dismiss
              </button>
            </div>

            <div className="h-1.5 w-full rounded-full bg-surface-sunken overflow-hidden">
              <div
                className="h-full rounded-full bg-brand transition-all duration-300"
                style={{ width: `${Math.round((doneCount / setupSteps.length) * 100)}%` }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {setupSteps.map((step, idx) => (
                <Link
                  key={step.key}
                  href={step.href}
                  className={`flex items-start gap-2.5 p-3 rounded-xl transition ${
                    step.done
                      ? 'bg-surface-sunken/50 opacity-75'
                      : 'bg-surface-sunken hover:bg-brand-subtle/30'
                  }`}
                >
                  {step.done ? (
                    <CheckCircle2 className="h-4 w-4 text-status-success shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className={`text-xs font-semibold flex items-center justify-between gap-1 ${step.done ? 'line-through text-muted' : 'text-primary'}`}>
                      <span>{idx + 1}. {step.title}</span>
                      {!step.done && <ArrowRight className="h-3 w-3 text-brand-text shrink-0" />}
                    </div>
                    <p className="text-[11px] text-secondary mt-0.5 leading-snug">{step.why}</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {mode === 'FIRM' && (
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-secondary flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Clients</div>
              <div className="text-2xl font-black text-primary mt-1">{summary.totalClients ?? 0}</div>
              <div className="text-[11px] text-status-danger-text mt-0.5">{summary.atRiskClients ?? 0} at risk</div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-secondary flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> Open Jobs</div>
            <div className="text-2xl font-black text-primary mt-1">{summary.openJobs ?? 0}</div>
            <div className="text-[11px] text-muted mt-0.5">{summary.dueThisWeek ?? 0} due this week</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-secondary flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-status-danger-text" /> Overdue Jobs</div>
            <div className="text-2xl font-black text-status-danger-text mt-1">{summary.overdueJobs ?? 0}</div>
            <div className="text-[11px] text-muted mt-0.5">Require immediate filing</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-secondary flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5" /> Open Notices</div>
            <div className="text-2xl font-black text-primary mt-1">{summary.openNotices ?? 0}</div>
            <div className="text-[11px] text-status-danger-text mt-0.5">{summary.overdueNotices ?? 0} overdue</div>
          </CardContent>
        </Card>
        {mode === 'FIRM' && (
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-secondary flex items-center gap-1.5"><IndianRupee className="h-3.5 w-3.5" /> Unbilled WIP</div>
              <div className="text-2xl font-black text-primary mt-1">₹{Number(financials.unbilledWip || 0).toLocaleString('en-IN')}</div>
              <div className="text-[11px] text-status-success-text mt-0.5">Collected ₹{Number(financials.collectedTotal || 0).toLocaleString('en-IN')}</div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Jobs by Stage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Jobs by Stage</span>
              <Link href="/practice/jobs" className="text-xs text-brand-text hover:underline">Open Pipeline →</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(jobsByStage).length === 0 ? (
              <p className="text-xs text-muted">No jobs created yet.</p>
            ) : (
              Object.entries(jobsByStage).map(([stage, count]) => (
                <div key={stage} className="flex items-center justify-between p-2.5 rounded-xl bg-surface-sunken/40 text-xs">
                  <span className="font-semibold text-primary">{stage}</span>
                  <Badge variant="brand" size="xs">{String(count)}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Notices & Compliance Risk */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Notices &amp; Risk</span>
              <Link href="/practice/notices" className="text-xs text-brand-text hover:underline">Notices Inbox →</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {Object.entries(noticesByAuthority).length === 0 ? (
                <span className="text-xs text-muted">No open notices.</span>
              ) : (
                Object.entries(noticesByAuthority).map(([auth, cnt]) => (
                  <Badge key={auth} variant="warning" size="sm">{auth}: {String(cnt)}</Badge>
                ))
              )}
            </div>
            {mode === 'FIRM' && (data?.atRiskClients || []).length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-default">
                <div className="text-[11px] font-bold uppercase text-muted">Clients at Statutory Risk</div>
                {data.atRiskClients.slice(0, 5).map((c: any) => (
                  <div key={c.clientId} className="flex items-center justify-between text-xs p-2 rounded-lg bg-status-danger-subtle/30">
                    <span className="font-semibold text-primary">{c.clientName}</span>
                    <Badge variant="danger" size="xs">{c.overdue} overdue · {c.notStartedNearDue} not started</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Capacity or Financials */}
        {mode === 'FIRM' ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Staff Capacity &amp; Financials</span>
                <Link href="/practice/capacity" className="text-xs text-brand-text hover:underline">Heatmap →</Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-xl bg-surface-sunken/50">
                <div><span className="text-muted">Billed:</span> <strong>₹{Number(financials.billedTotal || 0).toLocaleString('en-IN')}</strong></div>
                <div><span className="text-muted">Outstanding:</span> <strong>₹{Number(financials.outstandingTotal || 0).toLocaleString('en-IN')}</strong></div>
              </div>
              <div className="space-y-1.5">
                {(data?.staffSummary || []).slice(0, 5).map((s: any) => (
                  <div key={s.userId} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-surface-sunken/60">
                    <span className="font-medium text-primary flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-muted" /> {s.name}</span>
                    <Badge variant="neutral" size="xs">{s.openJobs} open · {s.capacityHours}h cap</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader><CardTitle className="text-base">Entity Quick Links</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs">
              <Link href="/practice/jobs" className="block p-3 rounded-xl bg-surface-sunken hover:bg-surface-sunken/80 font-semibold text-primary transition">My Compliance Deliverables →</Link>
              <Link href="/practice/documents" className="block p-3 rounded-xl bg-surface-sunken hover:bg-surface-sunken/80 font-semibold text-primary transition">Document Vault →</Link>
              <Link href="/practice/notices" className="block p-3 rounded-xl bg-surface-sunken hover:bg-surface-sunken/80 font-semibold text-primary transition">Statutory Notices →</Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Upcoming 14-day Statutory Calendar Strip */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-brand-text" />
            <span>Upcoming 14-Day Statutory Calendar</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(data?.upcoming14Days || []).length === 0 ? (
            <p className="text-xs text-muted">No upcoming deadlines in the next 14 days.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {data.upcoming14Days.map((j: any) => (
                <div key={j.id} className="p-3 rounded-xl bg-surface-sunken/60 flex items-center justify-between text-xs">
                  <div className="truncate mr-2">
                    <div className="font-semibold text-primary truncate">{j.title}</div>
                    <div className="text-[11px] text-secondary truncate">{mode === 'FIRM' ? `${j.clientName} · ` : ''}{j.stage}</div>
                  </div>
                  <Badge variant="warning" size="xs"><DateText date={j.dueDate} /></Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
