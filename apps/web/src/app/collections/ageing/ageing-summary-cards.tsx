'use client';

import React from 'react';
import { Card, formatMoney } from '@platform/ui';
import { Clock, Users, ArrowUpRight } from 'lucide-react';
import type { ArAgeingSummaryDto } from '@platform/shared-types';

interface AgeingSummaryCardsProps {
  summary: ArAgeingSummaryDto | null;
  loading: boolean;
}

export function AgeingSummaryCards({ summary, loading }: AgeingSummaryCardsProps) {
  const formatInr = (val: string | number | undefined) => formatMoney(val);

  const cards = [
    {
      title: 'Total Outstanding',
      value: formatInr(summary?.totalOutstanding),
      sub: `${summary?.partiesCount || 0} active debtors`,
      badge: 'Total AR',
      border: 'border-l-4 border-l-brand',
      icon: Users,
    },
    {
      title: 'Current (0–30 Days)',
      value: formatInr(summary?.current0To30),
      sub: 'Within regular payment terms',
      badge: 'Healthy',
      border: 'border-l-4 border-l-status-success',
      icon: ArrowUpRight,
    },
    {
      title: 'Due (31–60 Days)',
      value: formatInr(summary?.days31To60),
      sub: 'Follow-up recommended',
      badge: 'Moderate',
      border: 'border-l-4 border-l-status-warning',
      icon: Clock,
    },
    {
      title: 'Critical (> 60 Days)',
      value: formatInr(
        Number(summary?.days61To90 || 0) + Number(summary?.days90Plus || 0),
      ),
      sub: `DSO: ${summary?.dsoDays || 0} days avg`,
      badge: 'Attention',
      border: 'border-l-4 border-l-status-danger',
      icon: Clock,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, i) => (
        <Card
          key={i}
          className={`p-4 border-l-[3px] ${c.border.replace('border-l-4 ', '')}`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-muted">
            <span>{c.title}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-sunken text-secondary">
              {c.badge}
            </span>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-primary tabular-nums">
            {loading ? '...' : c.value}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
            <c.icon className="h-3.5 w-3.5 text-muted" />
            <span>{c.sub}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}

