'use client';

import React from 'react';
import { Card, formatMoney } from '@platform/ui';
import type { ArAgeingSummaryDto } from '@platform/shared-types';

interface AgeingDistributionBarProps {
  summary: ArAgeingSummaryDto | null;
}

export function AgeingDistributionBar({ summary }: AgeingDistributionBarProps) {
  const total = Number(summary?.totalOutstanding || 0);
  const c0_30 = Number(summary?.current0To30 || 0);
  const c31_60 = Number(summary?.days31To60 || 0);
  const c61_90 = Number(summary?.days61To90 || 0);
  const c90_plus = Number(summary?.days90Plus || 0);

  const p0_30 = total > 0 ? (c0_30 / total) * 100 : 0;
  const p31_60 = total > 0 ? (c31_60 / total) * 100 : 0;
  const p61_90 = total > 0 ? (c61_90 / total) * 100 : 0;
  const p90_plus = total > 0 ? (c90_plus / total) * 100 : 0;

  const formatInr = (n: number) => formatMoney(n);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-primary">
            Ageing Concentration & Exposure
          </h2>
          <p className="text-xs text-muted">
            Receivables distribution across payment delay horizons
          </p>
        </div>
        <div className="text-xs font-semibold text-secondary">
          As of {summary?.asOfDate || new Date().toISOString().split('T')[0]}
        </div>
      </div>

      {/* Stacked Progress Bar */}
      <div className="h-4 w-full rounded-full bg-surface-sunken flex overflow-hidden">
        {p0_30 > 0 && (
          <div
            style={{ width: `${p0_30}%` }}
            className="bg-status-success transition-all duration-300 hover:opacity-90"
            title={`0-30 Days: ${formatInr(c0_30)} (${p0_30.toFixed(1)}%)`}
          />
        )}
        {p31_60 > 0 && (
          <div
            style={{ width: `${p31_60}%` }}
            className="bg-status-warning transition-all duration-300 hover:opacity-90"
            title={`31-60 Days: ${formatInr(c31_60)} (${p31_60.toFixed(1)}%)`}
          />
        )}
        {p61_90 > 0 && (
          <div
            style={{ width: `${p61_90}%` }}
            className="bg-status-info transition-all duration-300 hover:opacity-90"
            title={`61-90 Days: ${formatInr(c61_90)} (${p61_90.toFixed(1)}%)`}
          />
        )}
        {p90_plus > 0 && (
          <div
            style={{ width: `${p90_plus}%` }}
            className="bg-status-danger transition-all duration-300 hover:opacity-90"
            title={`90+ Days: ${formatInr(c90_plus)} (${p90_plus.toFixed(1)}%)`}
          />
        )}
        {total === 0 && (
          <div className="w-full bg-surface-sunken flex items-center justify-center text-[10px] text-muted">
            No open receivables outstanding
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-subtle text-xs">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-status-success" />
          <span className="text-secondary">0–30 Days:</span>
          <span className="font-bold text-primary tabular-nums">
            {formatInr(c0_30)} ({p0_30.toFixed(0)}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-status-warning" />
          <span className="text-secondary">31–60 Days:</span>
          <span className="font-bold text-primary tabular-nums">
            {formatInr(c31_60)} ({p31_60.toFixed(0)}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-status-info" />
          <span className="text-secondary">61–90 Days:</span>
          <span className="font-bold text-primary tabular-nums">
            {formatInr(c61_90)} ({p61_90.toFixed(0)}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-status-danger" />
          <span className="text-secondary">90+ Days:</span>
          <span className="font-bold text-primary tabular-nums">
            {formatInr(c90_plus)} ({p90_plus.toFixed(0)}%)
          </span>
        </div>
      </div>
    </Card>
  );
}

