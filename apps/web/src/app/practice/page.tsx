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
} from 'lucide-react';
import { Button, Badge, Card, CardHeader, CardTitle, CardContent, DateText } from '@platform/ui';
import { apiClient } from '@/lib/api-client';

export default function PracticeCommandCenterPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [switchingMode, setSwitchingMode] = useState(false);

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
          <div className="inline-flex rounded-xl border border-default bg-surface p-0.5">
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
          </div>

          <Button variant="outline" size="sm" onClick={loadDashboard} loading={loading} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
            Refresh
          </Button>
          {mode === 'FIRM' && (
            <Link href="/practice/proposals/new">
              <Button variant="primary" size="sm">New Proposal</Button>
            </Link>
          )}
        </div>
      </div>

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
              <Link href="/practice/jobs" className="block p-3 rounded-xl border border-default hover:border-brand font-semibold text-primary">My Compliance Deliverables →</Link>
              <Link href="/practice/documents" className="block p-3 rounded-xl border border-default hover:border-brand font-semibold text-primary">Document Vault →</Link>
              <Link href="/practice/notices" className="block p-3 rounded-xl border border-default hover:border-brand font-semibold text-primary">Statutory Notices →</Link>
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
