'use client';

import React from 'react';
import { CalendarClock, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent } from '@platform/ui';

interface CalendarHeaderProps {
  data: {
    period: string;
    totalTasks: number;
    pendingCount: number;
    filedCount: number;
    overdueCount: number;
  } | null;
  selectedMonth: string;
  onMonthChange: (m: string) => void;
}

export function CalendarHeader({ data, selectedMonth, onMonthChange }: CalendarHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Statutory Filing Schedule
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Government deadlines for GST (11th & 20th), TDS (7th), and Advance Tax.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-1.5 font-medium outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Total Filings</p>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{data?.totalTasks || 0}</p>
            </div>
            <CalendarClock className="h-4 w-4 text-blue-500" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Pending</p>
              <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{data?.pendingCount || 0}</p>
            </div>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Filed / On Time</p>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{data?.filedCount || 0}</p>
            </div>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Overdue Risk</p>
              <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{data?.overdueCount || 0}</p>
            </div>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

