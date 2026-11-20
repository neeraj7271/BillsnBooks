'use client';

import React from 'react';
import { Card } from '@platform/ui';
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

  const formatInr = (n: number) =>
    n.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

  return (
    <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Ageing Concentration & Exposure
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Receivables distribution across payment delay horizons
          </p>
        </div>
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          As of {summary?.asOfDate || new Date().toISOString().split('T')[0]}
        </div>
      </div>

      {/* Stacked Progress Bar */}
      <div className="h-4 w-full rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden">
        {p0_30 > 0 && (
          <div
            style={{ width: `${p0_30}%` }}
            className="bg-emerald-500 transition-all duration-300 hover:opacity-90"
            title={`0-30 Days: ${formatInr(c0_30)} (${p0_30.toFixed(1)}%)`}
          />
        )}
        {p31_60 > 0 && (
          <div
            style={{ width: `${p31_60}%` }}
            className="bg-amber-500 transition-all duration-300 hover:opacity-90"
            title={`31-60 Days: ${formatInr(c31_60)} (${p31_60.toFixed(1)}%)`}
          />
        )}
        {p61_90 > 0 && (
          <div
            style={{ width: `${p61_90}%` }}
            className="bg-orange-500 transition-all duration-300 hover:opacity-90"
            title={`61-90 Days: ${formatInr(c61_90)} (${p61_90.toFixed(1)}%)`}
          />
        )}
        {p90_plus > 0 && (
          <div
            style={{ width: `${p90_plus}%` }}
            className="bg-rose-500 transition-all duration-300 hover:opacity-90"
            title={`90+ Days: ${formatInr(c90_plus)} (${p90_plus.toFixed(1)}%)`}
          />
        )}
        {total === 0 && (
          <div className="w-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] text-slate-500">
            No open receivables outstanding
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-slate-600 dark:text-slate-400">0–30 Days:</span>
          <span className="font-bold text-slate-900 dark:text-white tabular-nums">
            {formatInr(c0_30)} ({p0_30.toFixed(0)}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          <span className="text-slate-600 dark:text-slate-400">31–60 Days:</span>
          <span className="font-bold text-slate-900 dark:text-white tabular-nums">
            {formatInr(c31_60)} ({p31_60.toFixed(0)}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
          <span className="text-slate-600 dark:text-slate-400">61–90 Days:</span>
          <span className="font-bold text-slate-900 dark:text-white tabular-nums">
            {formatInr(c61_90)} ({p61_90.toFixed(0)}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
          <span className="text-slate-600 dark:text-slate-400">90+ Days:</span>
          <span className="font-bold text-slate-900 dark:text-white tabular-nums">
            {formatInr(c90_plus)} ({p90_plus.toFixed(0)}%)
          </span>
        </div>
      </div>
    </Card>
  );
}

