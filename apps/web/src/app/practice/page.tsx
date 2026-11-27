'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  AlertTriangle,
  Clock,
  Users,
  CheckCircle2,
  ArrowRight,
  Layers,
  Building2,
  FileCheck2,
  RefreshCw,
} from 'lucide-react';
import { Button, Badge, Card, CardHeader, CardTitle, CardContent, DateText } from '@platform/ui';
import { apiClient } from '@/lib/api-client';

const STAGE_LABELS: Record<string, string> = {
  BACKLOG: 'Backlog',
  IN_PROGRESS: 'In Progress',
  REVIEW: 'Review',
  AWAITING_CLIENT: 'Awaiting Client',
  FILED: 'Filed',
  DONE: 'Done',
};

export default function PracticeDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getPracticeDashboard();
      setData(res);
    } catch {
      // Handled gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const summary = data?.summary || {};
  const jobsByStage = data?.jobsByStage || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-primary">Firm Practice Hub</h1>
            <Badge variant="brand" size="sm">CA Operations</Badge>
          </div>
          <p className="mt-1 text-sm text-secondary">
            Real-time firm visibility: active engagement pipelines, statutory deadlines, staff capacity, and client health.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadDashboard} loading={loading} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
            Refresh
          </Button>
          <Link href="/practice/jobs">
            <Button variant="primary" size="sm" leftIcon={<Layers className="h-3.5 w-3.5" />}>
              Open Jobs Kanban
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-default bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-muted">
            <span>Active Clients</span>
            <Building2 className="h-4 w-4 text-brand-text" />
          </div>
          <div className="text-2xl font-black text-primary mt-2">{summary.totalClients ?? 0}</div>
          <Link href="/practice/clients" className="text-[11px] text-brand-text hover:underline mt-1 inline-flex items-center gap-1">
            Client Directory <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="rounded-2xl border border-default bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-muted">
            <span>Open Jobs</span>
            <Briefcase className="h-4 w-4 text-status-info-text" />
          </div>
          <div className="text-2xl font-black text-primary mt-2">{summary.openJobs ?? 0}</div>
          <Link href="/practice/jobs" className="text-[11px] text-brand-text hover:underline mt-1 inline-flex items-center gap-1">
            View Pipeline <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="rounded-2xl border border-default bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-muted">
            <span>Overdue Jobs</span>
            <AlertTriangle className="h-4 w-4 text-status-danger-text" />
          </div>
          <div className="text-2xl font-black text-status-danger-text mt-2">{summary.overdueJobs ?? 0}</div>
          <span className="text-[11px] text-muted mt-1 block">Requires immediate review</span>
        </div>

        <div className="rounded-2xl border border-default bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-muted">
            <span>Due This Week</span>
            <Clock className="h-4 w-4 text-status-warning-text" />
          </div>
          <div className="text-2xl font-black text-primary mt-2">{summary.dueThisWeek ?? 0}</div>
          <span className="text-[11px] text-muted mt-1 block">Next 7 days</span>
        </div>

        <div className="rounded-2xl border border-default bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-muted">
            <span>Pending Client Docs</span>
            <FileCheck2 className="h-4 w-4 text-status-success-text" />
          </div>
          <div className="text-2xl font-black text-primary mt-2">{summary.pendingDocRequests ?? 0}</div>
          <Link href="/practice/documents" className="text-[11px] text-brand-text hover:underline mt-1 inline-flex items-center gap-1">
            Document Vault <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Pipeline Stage Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Jobs by Pipeline Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(STAGE_LABELS).map(([key, label]) => (
              <Link
                key={key}
                href={`/practice/jobs?stage=${key}`}
                className="rounded-xl border border-default bg-surface-sunken/50 p-3 hover:border-brand transition"
              >
                <div className="text-[11px] font-bold uppercase text-muted">{label}</div>
                <div className="text-xl font-black text-primary mt-1">{jobsByStage[key] ?? 0}</div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Two Column: Overdue & Due This Week + Staff Capacity & Client Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Priority Deadlines (Overdue & Due Soon)</span>
              <Link href="/practice/jobs" className="text-xs font-semibold text-brand-text hover:underline">
                All Jobs
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.overdueList || []).map((j: any) => (
              <div key={j.id} className="flex items-center justify-between p-3 rounded-xl border border-default bg-status-danger-subtle/30">
                <div>
                  <div className="text-xs font-bold text-primary">{j.title}</div>
                  <div className="text-[11px] text-secondary">{j.clientName} · {STAGE_LABELS[j.stage] || j.stage}</div>
                </div>
                <Badge variant="danger" size="xs">
                  Overdue · <DateText date={j.dueDate} />
                </Badge>
              </div>
            ))}
            {(data?.dueThisWeekList || []).map((j: any) => (
              <div key={j.id} className="flex items-center justify-between p-3 rounded-xl border border-default bg-surface-sunken/40">
                <div>
                  <div className="text-xs font-bold text-primary">{j.title}</div>
                  <div className="text-[11px] text-secondary">{j.clientName} · {STAGE_LABELS[j.stage] || j.stage}</div>
                </div>
                <Badge variant="warning" size="xs">
                  Due <DateText date={j.dueDate} />
                </Badge>
              </div>
            ))}
            {(data?.overdueList?.length || 0) === 0 && (data?.dueThisWeekList?.length || 0) === 0 && (
              <p className="text-xs text-muted py-6 text-center">No overdue or imminent jobs. Create jobs from templates in Jobs Pipeline.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Team Capacity & Client Compliance Health</span>
              <Link href="/practice/workload" className="text-xs font-semibold text-brand-text hover:underline">
                Staff Workload
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {(data?.staffCapacity || []).map((s: any) => (
                <div key={s.userId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-primary">{s.name}</span>
                    <span className="text-muted">{s.openJobCount} open · {s.utilizationPct}% cap</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-sunken overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.utilizationPct > 85 ? 'bg-status-danger' : 'bg-brand'}`}
                      style={{ width: `${s.utilizationPct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-default space-y-2">
              <div className="text-xs font-bold uppercase text-muted">Client Risk Summary</div>
              {(data?.clientHealth || []).slice(0, 5).map((c: any) => (
                <Link
                  key={c.clientId}
                  href={`/practice/clients/${c.clientId}`}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-default hover:bg-surface-sunken/50 transition"
                >
                  <span className="text-xs font-semibold text-primary">{c.companyName}</span>
                  <Badge variant={c.riskLevel === 'AT_RISK' ? 'danger' : 'success'} size="xs">
                    {c.riskLevel === 'AT_RISK' ? `${c.overdueJobs} Overdue` : 'On Track'}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
