'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, Button, Badge, Input, FormField, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, EmptyState } from '@platform/ui';
import { ShieldAlert, Plus, X, AlertTriangle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function NoticesInboxPage() {
  const [notices, setNotices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [authFilter, setAuthFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [responseNotes, setResponseNotes] = useState('');

  const [form, setForm] = useState({
    clientId: '',
    authority: 'GST',
    noticeType: 'DRC-01 Show Cause Notice',
    noticeNo: '',
    section: 'Sec 73',
    receivedDate: new Date().toISOString().slice(0, 10),
    responseDueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    amountInvolved: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [n, c] = await Promise.all([
        apiClient.listPracticeNotices({
          authority: authFilter || undefined,
          status: statusFilter || undefined,
        }),
        apiClient.listPracticeClients(),
      ]);
      setNotices(n || []);
      setClients(c || []);
      if (!form.clientId && c?.length > 0) setForm((f) => ({ ...f, clientId: c[0].id }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [authFilter, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiClient.createPracticeNotice({
      ...form,
      amountInvolved: form.amountInvolved ? Number(form.amountInvolved) : null,
    });
    setCreateOpen(false);
    await loadData();
  };

  const handleUpdateSelected = async (status: string) => {
    if (!selected) return;
    const updated = await apiClient.updatePracticeNotice(selected.id, { status, responseNotes });
    setSelected({ ...selected, ...updated });
    await loadData();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-brand-primary" />
            Statutory Notices Inbox
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Track Income Tax, GST, ROC, and TDS notices, response deadlines, disputed amounts, and submissions.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Log Notice
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-subtle bg-surface p-3 shadow-card">
        <select value={authFilter} onChange={(e) => setAuthFilter(e.target.value)} className="rounded-xl border border-default bg-surface px-3 py-1.5 text-xs text-text-primary">
          <option value="">All Authorities</option>
          <option value="GST">GST</option>
          <option value="INCOME_TAX">Income Tax</option>
          <option value="TDS">TDS / TRACES</option>
          <option value="ROC">ROC / MCA</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-default bg-surface px-3 py-1.5 text-xs text-text-primary">
          <option value="">All Statuses</option>
          <option value="NEW">New</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESPONDED">Responded</option>
          <option value="CLOSED">Closed</option>
          <option value="ESCALATED">Escalated</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-4 space-y-2">
          {loading ? (
            <div className="text-xs text-text-muted py-6 text-center">Loading notices...</div>
          ) : notices.length === 0 ? (
            <EmptyState
              icon={<ShieldAlert className="h-6 w-6 text-muted" />}
              title="No statutory notices logged yet"
              description="Track GST, Income Tax, TDS, and ROC notices with response deadlines and reply notes."
              action={{ label: 'Log Notice', onClick: () => setCreateOpen(true) }}
            />
          ) : (
            notices.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  setSelected(n);
                  setResponseNotes(n.responseNotes || '');
                }}
                className={`cursor-pointer flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl transition ${
                  n.isOverdue ? 'border border-status-danger bg-status-danger-subtle/20' : 'bg-surface-sunken hover:bg-surface-sunken/80'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="brand" size="xs">{n.authority}</Badge>
                    <span className="text-sm font-semibold text-text-primary">{n.noticeType}</span>
                    <span className="text-xs font-mono text-text-muted">#{n.noticeNo}</span>
                    {n.isOverdue && (
                      <Badge variant="danger" size="xs">
                        <AlertTriangle className="h-3 w-3 mr-0.5" /> Overdue
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-text-secondary mt-0.5">
                    {n.clientName} · {n.section || 'General'} · Response Due: <strong>{n.responseDueDate}</strong>
                    {n.amountInvolved != null && ` · Amount: ₹${Number(n.amountInvolved).toLocaleString('en-IN')}`}
                  </div>
                </div>
                <Badge variant={n.status === 'CLOSED' || n.status === 'RESPONDED' ? 'success' : 'warning'}>
                  {n.status}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent size="md">
          <form onSubmit={handleCreate} className="space-y-3">
            <DialogHeader><DialogTitle>Log Statutory Notice</DialogTitle></DialogHeader>
            <FormField label="Client" required>
              <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className="w-full rounded-xl border border-default bg-surface px-3 py-2 text-xs text-text-primary">
                {clients.map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
              </select>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Authority">
                <select value={form.authority} onChange={(e) => setForm({ ...form, authority: e.target.value })} className="w-full rounded-xl border border-default bg-surface px-3 py-2 text-xs text-text-primary">
                  <option value="GST">GST</option>
                  <option value="INCOME_TAX">Income Tax</option>
                  <option value="TDS">TDS</option>
                  <option value="ROC">ROC</option>
                </select>
              </FormField>
              <FormField label="Notice Number" required>
                <Input value={form.noticeNo} onChange={(e) => setForm({ ...form, noticeNo: e.target.value })} placeholder="DIN / Reference No" required />
              </FormField>
              <FormField label="Notice Type" required>
                <Input value={form.noticeType} onChange={(e) => setForm({ ...form, noticeType: e.target.value })} required />
              </FormField>
              <FormField label="Section">
                <Input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
              </FormField>
              <FormField label="Response Due Date" required>
                <Input type="date" value={form.responseDueDate} onChange={(e) => setForm({ ...form, responseDueDate: e.target.value })} required />
              </FormField>
              <FormField label="Amount Involved (₹)">
                <Input type="number" value={form.amountInvolved} onChange={(e) => setForm({ ...form, amountInvolved: e.target.value })} />
              </FormField>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Save Notice</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {selected && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-surface border-l border-default shadow-2xl p-5 flex flex-col gap-4 overflow-y-auto">
          <div className="flex items-start justify-between border-b border-default pb-3">
            <div>
              <Badge variant="brand" size="xs">{selected.authority}</Badge>
              <h2 className="text-base font-bold text-text-primary mt-1">{selected.noticeType} (#{selected.noticeNo})</h2>
              <Link href={`/practice/clients/${selected.clientId}`} className="text-xs text-brand-text hover:underline">
                {selected.clientName} →
              </Link>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}><X className="h-4 w-4" /></Button>
          </div>
          <div className="text-xs space-y-1 text-text-secondary">
            <div>Section: <strong>{selected.section || '—'}</strong> · Received: {selected.receivedDate} · Due: <strong>{selected.responseDueDate}</strong></div>
            <div>Status: <strong>{selected.status}</strong></div>
          </div>
          <FormField label="Response Notes & Submission Summary">
            <textarea
              value={responseNotes}
              onChange={(e) => setResponseNotes(e.target.value)}
              rows={5}
              className="w-full rounded-xl border border-default bg-surface p-3 text-xs text-text-primary"
              placeholder="Draft reply, ARN/acknowledgement details..."
            />
          </FormField>
          <div className="flex flex-wrap gap-2">
            <Button size="xs" variant="outline" onClick={() => handleUpdateSelected('IN_PROGRESS')}>Mark In Progress</Button>
            <Button size="xs" variant="primary" onClick={() => handleUpdateSelected('RESPONDED')}>Mark Responded</Button>
            <Button size="xs" variant="outline" onClick={() => handleUpdateSelected('CLOSED')}>Close Notice</Button>
          </div>
        </div>
      )}
    </div>
  );
}
