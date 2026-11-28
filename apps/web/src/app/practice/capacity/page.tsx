'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, Button, Badge, EmptyState } from '@platform/ui';
import { Users, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function CapacityPlanningPage() {
  const [data, setData] = useState<any>({ staff: [], unassignedJobs: [] });
  const [loading, setLoading] = useState(true);
  const [reassignTarget, setReassignTarget] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getCapacityHeatmap();
      setData(res || { staff: [], unassignedJobs: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReassign = async (jobId: string, staffId: string) => {
    if (!staffId) return;
    await apiClient.reassignCapacityJob(jobId, staffId);
    setBanner('Job reassigned and notification dispatched to the new assignee.');
    await loadData();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Users className="h-6 w-6 text-brand-primary" />
          Staff Capacity Planning &amp; Compliance Heatmap
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Weekly capacity vs assigned compliance hours across Indian statutory peak weeks (TDS 7th, GST-1/PF 15th, GSTR-3B 20th, Close).
        </p>
      </div>

      {banner && (
        <div className="p-3 rounded-xl bg-status-success-subtle border border-subtle shadow-card text-xs text-status-success-text font-semibold">
          {banner}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-sm text-text-muted">Loading capacity heatmap...</div>
      ) : (data.staff || []).length === 0 ? (
        <Card>
          <CardContent className="p-5">
            <EmptyState
              icon={<Users className="h-6 w-6 text-muted" />}
              title="No team members in capacity plan"
              description="Add colleagues and set weekly capacity hours to balance compliance workloads."
              action={
                <Link href="/practice/team">
                  <Button size="sm" variant="primary">Manage Team</Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-5 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-default text-text-muted uppercase text-[11px]">
                  <th className="py-2.5 px-3">Staff Member</th>
                  <th className="py-2.5 px-3 text-right">Open Jobs</th>
                  <th className="py-2.5 px-3 text-right">Assigned / Cap</th>
                  <th className="py-2.5 px-3 text-center">W1 (TDS 7th)</th>
                  <th className="py-2.5 px-3 text-center">W2 (GST-1 / PF)</th>
                  <th className="py-2.5 px-3 text-center">W3 (GSTR-3B)</th>
                  <th className="py-2.5 px-3 text-center">W4 (Close)</th>
                  <th className="py-2.5 px-3 text-right">Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {data.staff.map((s: any) => (
                  <tr key={s.userId} className={s.isOverloaded ? 'bg-status-danger-subtle/30' : ''}>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-text-primary flex items-center gap-1.5">
                        <Link href={`/practice/jobs?assignedToUserId=${s.userId}`} className="hover:text-brand-text hover:underline">
                          {s.name}
                        </Link>
                        {s.isOverloaded && (
                          <Badge variant="danger" size="xs">
                            <AlertTriangle className="h-3 w-3 mr-0.5" /> Overloaded
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-text-muted">{s.role}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono">{s.openJobsCount}</td>
                    <td className="py-3 px-3 text-right font-mono">
                      <span className={s.isOverloaded ? 'text-status-danger-text font-bold' : ''}>
                        {s.assignedHours}h / {s.weeklyCapacityHours}h ({s.utilizationPct}%)
                      </span>
                    </td>
                    {(['w1_tds', 'w2_gst1_pf', 'w3_gstr3b', 'w4_close'] as const).map((bk) => {
                      const hrs = s.peakBuckets?.[bk] || 0;
                      const variant = hrs > 12 ? 'danger' : hrs > 6 ? 'warning' : hrs > 0 ? 'info' : 'neutral';
                      return (
                        <td key={bk} className="py-3 px-3 text-center">
                          <Badge variant={variant} size="xs">{hrs}h</Badge>
                        </td>
                      );
                    })}
                    <td className="py-3 px-3 text-right">
                      {s.overdueCount > 0 ? <Badge variant="danger" size="xs">{s.overdueCount}</Badge> : '0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {data.unassignedJobs?.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
              Unassigned Open Jobs ({data.unassignedJobs.length})
            </h2>
            <div className="space-y-2">
              {data.unassignedJobs.slice(0, 12).map((j: any) => (
                <div key={j.id} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-surface-sunken">
                  <div>
                    <div className="text-xs font-semibold text-text-primary">{j.title}</div>
                    <div className="text-[11px] text-text-secondary">{j.clientName} · Due {j.dueDate}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={reassignTarget[j.id] || ''}
                      onChange={(e) => setReassignTarget({ ...reassignTarget, [j.id]: e.target.value })}
                      className="rounded-xl border border-default bg-surface px-2.5 py-1.5 text-xs text-text-primary"
                    >
                      <option value="">Select staff...</option>
                      {data.staff.map((s: any) => (
                        <option key={s.userId} value={s.userId}>{s.name}</option>
                      ))}
                    </select>
                    <Button
                      size="xs"
                      variant="primary"
                      onClick={() => handleReassign(j.id, reassignTarget[j.id])}
                    >
                      <ArrowRightLeft className="h-3 w-3 mr-1" /> Assign
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
