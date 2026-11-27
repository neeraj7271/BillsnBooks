'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, RefreshCw, AlertTriangle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button, Badge, Card, CardHeader, CardTitle, CardContent } from '@platform/ui';
import { apiClient } from '@/lib/api-client';

export default function StaffWorkloadPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadWorkload = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getPracticeWorkload();
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkload();
  }, []);

  const staff: any[] = data?.staff || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/practice"
            aria-label="Back to Practice Hub"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-default bg-surface text-secondary hover:text-primary transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-primary">Staff Workload & Capacity</h1>
              <Badge variant="info" size="sm">{staff.length} Team Members</Badge>
            </div>
            <p className="text-xs text-secondary mt-0.5">
              Weekly utilization heatmap, assigned jobs by pipeline stage, and overdue alerts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {data?.unassignedCount > 0 && (
            <Link href="/practice/jobs">
              <Badge variant="warning" size="sm">
                {data.unassignedCount} Unassigned Jobs
              </Badge>
            </Link>
          )}
          <Button variant="outline" size="sm" onClick={loadWorkload} loading={loading} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map((member) => (
          <Card key={member.userId}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{member.name}</CardTitle>
                  <p className="text-xs text-muted">{member.email} · {member.role}</p>
                </div>
                <Badge variant={member.utilizationPct > 85 ? 'danger' : member.utilizationPct > 50 ? 'warning' : 'success'} size="xs">
                  {member.utilizationPct}% Utilized
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-secondary mb-1">
                  <span>{member.assignedHours}h assigned</span>
                  <span>{member.capacityHours}h weekly cap</span>
                </div>
                <div className="h-2.5 rounded-full bg-surface-sunken overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      member.utilizationPct > 85 ? 'bg-status-danger' : 'bg-brand'
                    }`}
                    style={{ width: `${member.utilizationPct}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-surface-sunken/60 p-2">
                  <div className="text-lg font-black text-primary">{member.openJobCount}</div>
                  <div className="text-[10px] font-semibold uppercase text-muted">Open</div>
                </div>
                <div className="rounded-xl bg-status-danger-subtle/40 p-2">
                  <div className="text-lg font-black text-status-danger-text">{member.overdueCount}</div>
                  <div className="text-[10px] font-semibold uppercase text-muted">Overdue</div>
                </div>
                <div className="rounded-xl bg-status-success-subtle/40 p-2">
                  <div className="text-lg font-black text-status-success-text">{member.completedCount}</div>
                  <div className="text-[10px] font-semibold uppercase text-muted">Filed</div>
                </div>
              </div>

              <Link href={`/practice/jobs?assignedToUserId=${member.userId}`} className="block">
                <Button variant="outline" size="sm" className="w-full">
                  View Assigned Jobs
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
