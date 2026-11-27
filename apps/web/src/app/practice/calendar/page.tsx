'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  List,
  Grid,
  X,
  Clock,
  Building2,
  FileText,
} from 'lucide-react';
import { Button, Badge, Card, CardContent, DateText, LoadingState } from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { CalendarHeader } from './calendar-header';

interface TaskItem {
  id: string;
  title: string;
  category: string;
  status: string;
  clientName: string;
  dueDate: string;
  filingAcknowledgmentNumber?: string;
}

interface DeadlineGroup {
  date: string;
  tasks: TaskItem[];
}

export default function StatutoryCalendarPage() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [data, setData] = useState<{
    period: string;
    totalTasks: number;
    pendingCount: number;
    filedCount: number;
    overdueCount: number;
    upcomingDeadlines: DeadlineGroup[];
  } | null>(null);
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

  const today = useMemo(() => new Date().toISOString().split('T')[0]!, []);

  // Map deadlines by date string (YYYY-MM-DD)
  const deadlinesByDate = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    if (data?.upcomingDeadlines) {
      for (const group of data.upcomingDeadlines) {
        map.set(group.date, group.tasks || []);
      }
    }
    return map;
  }, [data]);

  // Compute month grid days
  const calendarDays = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr || '2026', 10);
    const month = parseInt(monthStr || '1', 10) - 1; // 0-indexed

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Monday is index 0 in our grid (0 = Mon, 6 = Sun)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday is 6

    const days: Array<{
      date: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, d);
      const iso = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        date: iso,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: iso === today,
      });
    }

    // Current month days
    for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        date: iso,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: iso === today,
      });
    }

    // Next month padding to fill complete rows of 7
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      const iso = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        date: iso,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: iso === today,
      });
    }

    return days;
  }, [selectedMonth, today]);

  const monthLabel = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const date = new Date(parseInt(yearStr || '2026', 10), parseInt(monthStr || '1', 10) - 1, 1);
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  }, [selectedMonth]);

  const handlePrevMonth = () => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    let y = parseInt(yearStr || '2026', 10);
    let m = parseInt(monthStr || '1', 10) - 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    let y = parseInt(yearStr || '2026', 10);
    let m = parseInt(monthStr || '1', 10) + 1;
    if (m === 13) {
      m = 1;
      y += 1;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  };

  // Helper for dot colors by compliance category
  const getCategoryDotColor = (category: string) => {
    const c = (category || '').toUpperCase();
    if (c.includes('GST')) return 'bg-red-500';
    if (c.includes('TDS') || c.includes('TAX_PAYMENT')) return 'bg-amber-500';
    if (c.includes('ROC') || c.includes('MCA')) return 'bg-blue-500';
    if (c.includes('INCOME') || c.includes('ITR') || c.includes('AUDIT')) return 'bg-purple-500';
    return 'bg-emerald-500';
  };

  const selectedDayTasks = selectedDate ? deadlinesByDate.get(selectedDate) || [] : [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-primary">
              Statutory Compliance Calendar
            </h1>
            <Badge variant="brand" size="sm">Automated Schedule</Badge>
          </div>
          <p className="mt-1 text-sm text-secondary">
            Real-time statutory tax and corporate filing deadlines across all client entities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl border border-default bg-surface-sunken p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                viewMode === 'grid'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-muted hover:text-primary'
              }`}
            >
              <Grid className="h-3.5 w-3.5" />
              Month
            </button>
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                viewMode === 'timeline'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-muted hover:text-primary'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Timeline
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadCalendar}
            loading={loading}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Header */}
      <CalendarHeader
        data={data}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
      />

      {/* Main Calendar View Area */}
      {loading ? (
        <LoadingState rows={8} />
      ) : viewMode === 'grid' ? (
        /* Month Grid View */
        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className={selectedDate ? 'lg:col-span-8' : 'lg:col-span-12'}>
            <Card className="overflow-hidden border border-default shadow-xs">
              {/* Month Grid Toolbar */}
              <div className="flex items-center justify-between p-4 border-b border-default bg-surface-subtle">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-primary">{monthLabel}</h3>
                  <button
                    type="button"
                    onClick={handleCurrentMonth}
                    className="ml-2 text-xs font-semibold text-brand-text hover:underline"
                  >
                    Today
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    aria-label="Previous Month"
                    className="p-1.5 rounded-lg border border-default bg-surface hover:bg-surface-sunken text-muted hover:text-primary transition"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    aria-label="Next Month"
                    className="p-1.5 rounded-lg border border-default bg-surface hover:bg-surface-sunken text-muted hover:text-primary transition"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Compliance Category Legend */}
              <div className="flex flex-wrap items-center gap-4 px-4 py-2.5 bg-surface border-b border-subtle text-xs text-secondary">
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0" />
                  GST Filings (GSTR-1, 3B)
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                  TDS Payments & Returns
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" />
                  ROC Compliance (AOC-4, MGT-7)
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="h-2.5 w-2.5 rounded-full bg-purple-500 shrink-0" />
                  Advance Tax & ITR
                </div>
              </div>

              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 border-b border-default bg-surface-sunken/40 text-center text-xs font-bold text-muted py-2">
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
                <div>Sun</div>
              </div>

              {/* Calendar Grid Cells */}
              <div className="grid grid-cols-7 divide-x divide-y divide-default bg-surface">
                {calendarDays.map((cell) => {
                  const tasks = deadlinesByDate.get(cell.date) || [];
                  const isSelected = selectedDate === cell.date;
                  const hasTasks = tasks.length > 0;

                  return (
                    <button
                      key={cell.date}
                      type="button"
                      onClick={() => setSelectedDate(isSelected ? null : cell.date)}
                      className={`relative min-h-[96px] p-2 text-left transition flex flex-col justify-between group focus:outline-none ${
                        !cell.isCurrentMonth
                          ? 'bg-surface-sunken/30 text-muted/40'
                          : isSelected
                          ? 'bg-brand-subtle/40 ring-2 ring-brand ring-inset'
                          : cell.isToday
                          ? 'bg-surface-subtle font-bold'
                          : 'bg-surface hover:bg-surface-sunken/50'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center ${
                            cell.isToday
                              ? 'bg-brand text-inverse'
                              : isSelected
                              ? 'bg-primary text-inverse'
                              : 'text-primary'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>
                        {hasTasks && (
                          <span className="text-[10px] font-bold text-secondary bg-surface-sunken px-1.5 py-0.5 rounded-md">
                            {tasks.length}
                          </span>
                        )}
                      </div>

                      {/* Compliance Dots / Pills */}
                      <div className="mt-1 space-y-1 w-full">
                        {tasks.slice(0, 2).map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-surface-sunken/80 border border-default/40 text-[10px] font-medium text-primary truncate"
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full shrink-0 ${getCategoryDotColor(t.category)}`}
                            />
                            <span className="truncate">{t.title}</span>
                          </div>
                        ))}
                        {tasks.length > 2 && (
                          <div className="flex items-center gap-1 pl-1">
                            {tasks.slice(2, 6).map((t, idx) => (
                              <span
                                key={idx}
                                className={`h-1.5 w-1.5 rounded-full ${getCategoryDotColor(t.category)}`}
                              />
                            ))}
                            <span className="text-[9px] text-muted font-bold ml-0.5">
                              +{tasks.length - 2}
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Side Drawer: Tasks for selected date */}
          {selectedDate && (
            <div className="lg:col-span-4 sticky top-6">
              <Card className="border border-default shadow-md">
                <div className="flex items-center justify-between p-4 border-b border-default bg-surface-subtle">
                  <div>
                    <h4 className="text-sm font-bold text-primary">
                      <DateText date={selectedDate} />
                    </h4>
                    <p className="text-xs text-muted mt-0.5">
                      {selectedDayTasks.length} statutory milestone(s)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(null)}
                    aria-label="Close details"
                    className="p-1 rounded-lg hover:bg-surface-sunken text-muted hover:text-primary transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                  {selectedDayTasks.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted">
                      No statutory tasks scheduled for this date.
                    </div>
                  ) : (
                    selectedDayTasks.map((task) => {
                      const isPast = task.dueDate < today;
                      return (
                        <div
                          key={task.id}
                          className="p-3 rounded-xl border border-default bg-surface-sunken space-y-2 shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`h-2 w-2 rounded-full shrink-0 ${getCategoryDotColor(task.category)}`}
                              />
                              <span className="font-bold text-xs text-primary">
                                {task.title}
                              </span>
                            </div>
                            <Badge
                              variant={task.status === 'FILED' ? 'success' : isPast ? 'danger' : 'warning'}
                              size="xs"
                            >
                              {task.status === 'FILED' ? 'Filed' : isPast ? 'Overdue' : 'Pending'}
                            </Badge>
                          </div>

                          <div className="text-xs text-secondary flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted shrink-0" />
                            <span className="font-medium text-primary truncate">{task.clientName}</span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-muted pt-1 border-t border-default/40">
                            <Badge variant="neutral" size="xs">
                              {task.category}
                            </Badge>
                            {task.filingAcknowledgmentNumber && (
                              <span className="font-mono text-[10px] text-status-success-text font-semibold">
                                ARN: {task.filingAcknowledgmentNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      ) : (
        /* Timeline Feed View */
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-secondary">
            Deadlines & Filing Milestones
          </h3>

          {(!data?.upcomingDeadlines || data.upcomingDeadlines.length === 0) ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarIcon className="h-10 w-10 text-muted mx-auto mb-2" />
                <p className="text-sm font-semibold text-primary">
                  No statutory deadlines recorded for this month
                </p>
                <p className="text-xs text-muted mt-1">
                  Tasks created in the practice manager will automatically plot onto this timeline.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {data.upcomingDeadlines.map((group: any) => {
                const isPast = group.date < today;
                const isToday = group.date === today;

                return (
                  <div
                    key={group.date}
                    className="p-4 rounded-2xl border border-default bg-surface shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-subtle">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-primary text-sm">
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
                          className="p-3 rounded-xl border border-default bg-surface-sunken flex items-center justify-between shadow-xs"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`h-2 w-2 rounded-full shrink-0 ${getCategoryDotColor(t.category)}`}
                              />
                              <span className="font-bold text-xs text-primary">
                                {t.title}
                              </span>
                              <Badge variant="neutral" size="xs">{t.category}</Badge>
                            </div>
                            <div className="text-[11px] text-secondary mt-0.5">
                              Client: <span className="font-semibold">{t.clientName}</span>
                            </div>
                            {t.filingAcknowledgmentNumber && (
                              <div className="text-[10px] font-mono text-status-success-text">
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
          )}
        </div>
      )}
    </div>
  );
}
