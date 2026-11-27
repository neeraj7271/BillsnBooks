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
          <h2 className="text-lg font-bold text-primary">
            Statutory Filing Schedule
          </h2>
          <p className="text-xs text-secondary">
            Government deadlines for GST (11th & 20th), TDS (7th), and Advance Tax.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="text-xs rounded-lg border border-default bg-surface text-primary px-3 py-1.5 font-medium outline-none focus:ring-1 focus:ring-focus-ring"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-muted">Total Filings</p>
              <p className="text-xl font-black text-primary mt-0.5">{data?.totalTasks || 0}</p>
            </div>
            <CalendarClock className="h-4 w-4 text-status-info-text" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-muted">Pending</p>
              <p className="text-xl font-black text-status-warning-text mt-0.5">{data?.pendingCount || 0}</p>
            </div>
            <Clock className="h-4 w-4 text-status-warning-text" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-muted">Filed / On Time</p>
              <p className="text-xl font-black text-status-success-text mt-0.5">{data?.filedCount || 0}</p>
            </div>
            <CheckCircle2 className="h-4 w-4 text-status-success-text" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-muted">Overdue Risk</p>
              <p className="text-xl font-black text-status-danger-text mt-0.5">{data?.overdueCount || 0}</p>
            </div>
            <AlertTriangle className="h-4 w-4 text-status-danger-text" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

