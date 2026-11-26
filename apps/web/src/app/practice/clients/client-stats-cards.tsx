'use client';

import React from 'react';
import { Building2, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { Card, CardContent } from '@platform/ui';

interface ClientStatsCardsProps {
  clients: any[];
}

export function ClientStatsCards({ clients }: ClientStatsCardsProps) {
  const total = clients.length;
  const healthy = clients.filter((c) => c.healthStatus === 'HEALTHY').length;
  const actionRequired = clients.filter((c) => c.healthStatus === 'ACTION_REQUIRED').length;
  const totalOpenTasks = clients.reduce((acc, c) => acc + (c.openTaskCount || 0), 0);

  const stats = [
    {
      label: 'Managed Clients',
      value: total,
      sub: 'Active Engagements',
      icon: Building2,
      color: 'text-brand-text text-brand',
      bg: 'bg-brand-subtle bg-brand/40',
    },
    {
      label: 'Healthy Standing',
      value: healthy,
      sub: 'Zero Pending Overdues',
      icon: CheckCircle2,
      color: 'text-status-success-text text-status-success-text',
      bg: 'bg-status-success-subtle bg-status-success',
    },
    {
      label: 'Action Required',
      value: actionRequired,
      sub: 'Pending Documentation',
      icon: AlertTriangle,
      color: 'text-status-warning-text text-status-warning-text',
      bg: 'bg-status-warning-subtle bg-status-warning',
    },
    {
      label: 'Open Compliance Tasks',
      value: totalOpenTasks,
      sub: 'Across Client Entities',
      icon: Clock,
      color: 'text-brand-text text-brand',
      bg: 'bg-brand-subtle bg-brand/40',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s, idx) => {
        const Icon = s.icon;
        return (
          <Card key={idx}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted text-muted">
                  {s.label}
                </p>
                <p className="text-2xl font-black text-primary mt-1">
                  {s.value}
                </p>
                <p className="text-[11px] text-muted text-muted mt-0.5 font-medium">
                  {s.sub}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${s.bg} ${s.color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

