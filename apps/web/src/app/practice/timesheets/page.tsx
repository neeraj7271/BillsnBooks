'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, Button, Badge, Input, FormField } from '@platform/ui';
import { Clock, CheckCircle2, Plus } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function PracticeTimesheetsPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [clientId, setClientId] = useState('');
  const [jobId, setJobId] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [minutes, setMinutes] = useState('60');
  const [hourlyRate, setHourlyRate] = useState('1500');
  const [isBillable, setIsBillable] = useState(true);
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [e, c, j] = await Promise.all([
        apiClient.listTimeEntries(),
        apiClient.listPracticeClients(),
        apiClient.listPracticeJobs(),
      ]);
      setEntries(e || []);
      setClients(c || []);
      setJobs(j || []);
      if (!clientId && c?.length > 0) setClientId(c[0].id);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const summary = useMemo(() => {
    let billableMin = 0;
    let nonBillableMin = 0;
    for (const e of entries) {
      if (e.isBillable) billableMin += e.minutes;
      else nonBillableMin += e.minutes;
    }
    return {
      billableHours: (billableMin / 60).toFixed(2),
      nonBillableHours: (nonBillableMin / 60).toFixed(2),
      totalHours: ((billableMin + nonBillableMin) / 60).toFixed(2),
    };
  }, [entries]);

  const handleLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !minutes) return;
    await apiClient.logTimeEntry({
      clientId,
      jobId: jobId || null,
      entryDate,
      minutes: Number(minutes),
      hourlyRate: Number(hourlyRate),
      isBillable,
      notes,
    });
    setNotes('');
    await loadData();
  };

  const handleApproveAllDrafts = async () => {
    const ids = entries.filter((e) => e.approvalStatus !== 'APPROVED').map((e) => e.id);
    if (ids.length === 0) return;
    await apiClient.approveTimesheet(ids, 'APPROVED');
    await loadData();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Clock className="h-6 w-6 text-brand-primary" />
            Timesheets &amp; Time Tracking
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Weekly time entries, billable vs non-billable split, and partner approval for WIP billing.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={handleApproveAllDrafts}>
          <CheckCircle2 className="h-4 w-4 mr-1.5" /> Partner Approve Pending
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="text-xs text-text-muted">Total Logged</div><div className="text-2xl font-bold text-text-primary">{summary.totalHours} hrs</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-text-muted">Billable Hours</div><div className="text-2xl font-bold text-status-success-text">{summary.billableHours} hrs</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-text-muted">Non-Billable</div><div className="text-2xl font-bold text-text-secondary">{summary.nonBillableHours} hrs</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleLog} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <FormField label="Client">
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full rounded-xl border border-default bg-surface px-2.5 py-2 text-xs text-text-primary">
                {clients.map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
              </select>
            </FormField>
            <FormField label="Job (Optional)">
              <select value={jobId} onChange={(e) => setJobId(e.target.value)} className="w-full rounded-xl border border-default bg-surface px-2.5 py-2 text-xs text-text-primary">
                <option value="">General</option>
                {jobs.filter((j) => !clientId || j.clientId === clientId).map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
            </FormField>
            <FormField label="Date"><Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} /></FormField>
            <FormField label="Minutes"><Input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></FormField>
            <FormField label="Rate (₹/hr)"><Input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} /></FormField>
            <Button type="submit" variant="primary" size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Log Time</Button>
            <div className="md:col-span-4"><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Work description / notes..." /></div>
            <label className="md:col-span-2 flex items-center gap-2 text-xs text-text-primary cursor-pointer">
              <input type="checkbox" checked={isBillable} onChange={(e) => setIsBillable(e.target.checked)} /> Billable to client
            </label>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          {loading ? (
            <div className="text-xs text-text-muted py-6 text-center">Loading timesheet...</div>
          ) : entries.length === 0 ? (
            <div className="text-xs text-text-muted py-6 text-center">No time entries logged yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-default text-text-muted uppercase text-[11px]">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Staff</th>
                    <th className="py-2 px-3">Client / Job</th>
                    <th className="py-2 px-3">Notes</th>
                    <th className="py-2 px-3 text-right">Hours</th>
                    <th className="py-2 px-3 text-right">Value</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td className="py-2 px-3 font-mono">{e.entryDate}</td>
                      <td className="py-2 px-3">{e.staffName}</td>
                      <td className="py-2 px-3 font-medium text-text-primary">{e.clientName}{e.jobTitle ? ` · ${e.jobTitle}` : ''}</td>
                      <td className="py-2 px-3 text-text-secondary">{e.notes || '—'}</td>
                      <td className="py-2 px-3 text-right font-mono">{e.hours}</td>
                      <td className="py-2 px-3 text-right font-mono">₹{Number(e.amount).toLocaleString('en-IN')}</td>
                      <td className="py-2 px-3">
                        <Badge variant={e.billId ? 'info' : e.approvalStatus === 'APPROVED' ? 'success' : 'neutral'} size="xs">
                          {e.billId ? 'BILLED' : e.approvalStatus}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
