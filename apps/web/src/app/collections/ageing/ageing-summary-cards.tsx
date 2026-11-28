'use client';

import React from 'react';
import { Card, formatMoney } from '@platform/ui';
import { Clock, Users, ArrowUpRight, AlertTriangle } from 'lucide-react';
import type { ArAgeingSummaryDto } from '@platform/shared-types';

interface AgeingSummaryCardsProps {
  summary: ArAgeingSummaryDto | null;
  loading: boolean;
}

type Tone = 'brand' | 'success' | 'warning' | 'danger';

const TONES: Record<Tone, { chip: string; icon: string; badge: string }> = {
  brand: {
    chip: 'bg-brand-subtle',
    icon: 'text-brand',
    badge: 'bg-brand-subtle text-brand-text',
  },
  success: {
    chip: 'bg-status-success-subtle',
    icon: 'text-status-success',
    badge: 'bg-status-success-subtle text-status-success-text',
  },
  warning: {
    chip: 'bg-status-warning-subtle',
    icon: 'text-status-warning',
    badge: 'bg-status-warning-subtle text-status-warning-text',
  },
  danger: {
    chip: 'bg-status-danger-subtle',
    icon: 'text-status-danger',
    badge: 'bg-status-danger-subtle text-status-danger-text',
  },
};

export function AgeingSummaryCards({ summary, loading }: AgeingSummaryCardsProps) {
  const formatInr = (val: string | number | undefined) => formatMoney(val);

  const cards: {
    title: string;
    value: string;
    sub: string;
    badge: string;
    tone: Tone;
    icon: React.ElementType;
  }[] = [
    {
      title: 'Total Outstanding',
      value: formatInr(summary?.totalOutstanding),
      sub: `${summary?.partiesCount || 0} active debtors`,
      badge: 'Total AR',
      tone: 'brand',
      icon: Users,
    },
    {
      title: 'Current (0–30 Days)',
      value: formatInr(summary?.current0To30),
      sub: 'Within regular payment terms',
      badge: 'Healthy',
      tone: 'success',
      icon: ArrowUpRight,
    },
    {
      title: 'Due (31–60 Days)',
      value: formatInr(summary?.days31To60),
      sub: 'Follow-up recommended',
      badge: 'Moderate',
      tone: 'warning',
      icon: Clock,
    },
    {
      title: 'Critical (> 60 Days)',
      value: formatInr(
        Number(summary?.days61To90 || 0) + Number(summary?.days90Plus || 0),
      ),
      sub: `DSO: ${summary?.dsoDays || 0} days avg`,
      badge: 'Attention',
      tone: 'danger',
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, i) => {
        const tone = TONES[c.tone];
        const Icon = c.icon;
        return (
          <Card key={i} className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone.chip}`}
                >
                  <Icon className={`h-[18px] w-[18px] ${tone.icon}`} />
                </div>
                <span className="text-sm font-medium text-secondary">
                  {c.title}
                </span>
              </div>
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${tone.badge}`}
              >
                {c.badge}
              </span>
            </div>
            <div className="mt-4 text-[26px] leading-none font-bold tracking-tight text-primary tabular-nums">
              {loading ? '—' : c.value}
            </div>
            <div className="mt-2 text-xs text-muted">{c.sub}</div>
          </Card>
        );
      })}
    </div>
  );
}
