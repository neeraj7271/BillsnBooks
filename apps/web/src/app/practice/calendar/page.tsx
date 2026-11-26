'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, RefreshCw, AlertCircle, CheckCircle2, ChevronRight, FileText } from 'lucide-react';
import { Button, Badge, Card, CardContent, CardHeader, CardTitle, DateText } from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { CalendarHeader } from './calendar-header';

export default function StatutoryCalendarPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCalendar = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getPracticeCalendar(selectedMonth);
      setData(res);
    } catch (err: unknown) {
      console.error('Failed to load compliance calendar', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendar();
  }, [selectedMonth]);

  const today = new Date().toISOString().split('T')[0]!;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-primary dark:text-white">
              Statutory Compliance Calendar
            </h1>
            <Badge variant="brand" size="sm">Automated Schedule</Badge>
          </div>
          <p className="mt-1 text-sm text-muted text-muted">
            Real-time statutory tax and corporate filing deadlines across all client entities.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadCalendar}
          loading={loading}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          Refresh Schedule
        </Button>
      </div>

      {/* KPI Header */}
      <CalendarHeader
        data={data}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
      />

      {/* Timeline Feed */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted text-muted">
          Deadlines & Filing Milestones
        </h3>

        {(!data?.upcomingDeadlines || data.upcomingDeadlines.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-10 w-10 text-muted text-secondary mx-auto mb-2" />
              <p className="text-sm font-semibold text-secondary text-muted">
                No statutory deadlines recorded for this month
              </p>
              <p className="text-xs text-muted mt-1">
                Tasks created in the practice manager will automatically plot onto this timeline.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {data?.upcomingDeadlines?.map((group: any) => {
            const isPast = group.date < today;
            const isToday = group.date === today;

            return (
              <div
                key={group.date}
                className="p-4 rounded-2xl border border border-strong bg-white bg-surface shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-subtle border-strong">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-primary dark:text-white text-sm">
                      <DateText date={group.date} />
                    </span>
                    {isToday && <Badge variant="brand" size="xs">Due Today</Badge>}
                    {isPast && <Badge variant="danger" size="xs">Due Date Elapsed</Badge>}
                  </div>
                  <span className="text-xs text-muted font-medium">
                    {group.tasks?.length} filing(s)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {group.tasks?.map((t: any) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl border border border-strong bg-canvas bg-surface flex items-center justify-between shadow-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-primary dark:text-white">
                            {t.title}
                          </span>
                          <Badge variant="neutral" size="xs">{t.category}</Badge>
                        </div>
                        <div className="text-[11px] text-muted text-muted mt-0.5">
                          Client: <span className="font-semibold">{t.clientName}</span>
                        </div>
                        {t.filingAcknowledgmentNumber && (
                          <div className="text-[10px] font-mono text-status-success-text text-status-success-text">
                            ARN: {t.filingAcknowledgmentNumber}
                          </div>
                        )}
                      </div>

                      <Badge
                        variant={t.status === 'FILED' ? 'success' : isPast ? 'danger' : 'warning'}
                        size="xs"
                      >
                        {t.status === 'FILED' ? 'Filed' : isPast ? 'Overdue' : 'Pending'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

