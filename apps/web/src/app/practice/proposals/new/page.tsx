'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, Button, Input, FormField } from '@platform/ui';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

interface ProposalLineDraft {
  serviceTypeId: string;
  description: string;
  feeType: 'FIXED' | 'RECURRING' | 'HOURLY';
  feeAmount: number;
  recurrenceFrequency: string;
  estimatedHours: number;
  hourlyRate: number;
  gstRate: number;
}

export default function NewProposalPage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [clientId, setClientId] = useState('');
  const [prospectName, setProspectName] = useState('');
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<ProposalLineDraft[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([apiClient.listPracticeClients(), apiClient.listPracticeServices()]).then(
      ([c, s]) => {
        setClients(c || []);
        setServices(s || []);
        if (c?.length > 0) setClientId(c[0].id);
        if (s?.length > 0) {
          setLines([
            {
              serviceTypeId: s[0].id,
              description: s[0].name,
              feeType: 'RECURRING',
              feeAmount: 5000,
              recurrenceFrequency: s[0].frequency || 'MONTHLY',
              estimatedHours: Number(s[0].estimatedHours || 2),
              hourlyRate: 1500,
              gstRate: 18,
            },
          ]);
        }
      },
    );
  }, []);

  const addLine = () => {
    const svc = services[lines.length % Math.max(1, services.length)];
    setLines([
      ...lines,
      {
        serviceTypeId: svc?.id || '',
        description: svc?.name || 'Custom Advisory Service',
        feeType: 'FIXED',
        feeAmount: 7500,
        recurrenceFrequency: svc?.frequency || 'ONE_TIME',
        estimatedHours: Number(svc?.estimatedHours || 3),
        hourlyRate: 1500,
        gstRate: 18,
      },
    ]);
  };

  const totals = useMemo(() => {
    let subtotal = 0;
    let gst = 0;
    for (const l of lines) {
      const amt = l.feeType === 'HOURLY' ? l.estimatedHours * l.hourlyRate : Number(l.feeAmount || 0);
      subtotal += amt;
      gst += (amt * Number(l.gstRate || 18)) / 100;
    }
    return { subtotal, gst, total: subtotal + gst };
  }, [lines]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.createProposal({
        clientId: clientId || null,
        prospectName: clientId ? null : prospectName,
        validUntil,
        notes,
        lines,
      });
      router.push('/practice/proposals');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/practice/proposals">
          <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Proposal Builder</h1>
          <p className="text-xs text-text-secondary">Assemble a multi-service proposal from the Service Master with mixed pricing and GST.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <Card>
          <CardContent className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Client (or leave blank for Prospect)">
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-xl border border-default bg-surface px-3 py-2 text-xs text-text-primary"
              >
                <option value="">-- New Prospect --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.companyName} ({c.clientCode})</option>
                ))}
              </select>
            </FormField>
            {!clientId && (
              <FormField label="Prospect Name" required>
                <Input value={prospectName} onChange={(e) => setProspectName(e.target.value)} placeholder="Acme Holdings Pvt Ltd" />
              </FormField>
            )}
            <FormField label="Valid Until" required>
              <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Service Lines ({lines.length})</h2>
              <Button type="button" size="sm" variant="outline" onClick={addLine}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Service Line
              </Button>
            </div>

            <div className="space-y-3">
              {lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 rounded-xl bg-surface-sunken">
                  <div className="col-span-4">
                    <label className="block text-[11px] font-medium text-text-secondary mb-1">Service</label>
                    <select
                      value={line.serviceTypeId}
                      onChange={(e) => {
                        const svc = services.find((s) => s.id === e.target.value);
                        const next = [...lines];
                        next[idx] = {
                          ...line,
                          serviceTypeId: e.target.value,
                          description: svc?.name || line.description,
                          recurrenceFrequency: svc?.frequency || line.recurrenceFrequency,
                        };
                        setLines(next);
                      }}
                      className="w-full rounded-xl border border-default bg-surface px-2.5 py-2 text-xs text-text-primary"
                    >
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="block text-[11px] font-medium text-text-secondary mb-1">Pricing Model</label>
                    <select
                      value={line.feeType}
                      onChange={(e) => {
                        const next = [...lines];
                        next[idx] = { ...line, feeType: e.target.value as any };
                        setLines(next);
                      }}
                      className="w-full rounded-xl border border-default bg-surface px-2.5 py-2 text-xs text-text-primary"
                    >
                      <option value="RECURRING">Recurring</option>
                      <option value="FIXED">Fixed</option>
                      <option value="HOURLY">Hourly</option>
                    </select>
                  </div>
                  {line.feeType === 'HOURLY' ? (
                    <>
                      <div className="col-span-2">
                        <label className="block text-[11px] font-medium text-text-secondary mb-1">Hours</label>
                        <Input
                          type="number"
                          value={String(line.estimatedHours)}
                          onChange={(e) => {
                            const next = [...lines];
                            next[idx] = { ...line, estimatedHours: Number(e.target.value) || 0 };
                            setLines(next);
                          }}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[11px] font-medium text-text-secondary mb-1">Rate (₹/hr)</label>
                        <Input
                          type="number"
                          value={String(line.hourlyRate)}
                          onChange={(e) => {
                            const next = [...lines];
                            next[idx] = { ...line, hourlyRate: Number(e.target.value) || 0 };
                            setLines(next);
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="col-span-4">
                      <label className="block text-[11px] font-medium text-text-secondary mb-1">Fee Amount (₹)</label>
                      <Input
                        type="number"
                        value={String(line.feeAmount)}
                        onChange={(e) => {
                          const next = [...lines];
                          next[idx] = { ...line, feeAmount: Number(e.target.value) || 0 };
                          setLines(next);
                        }}
                      />
                    </div>
                  )}
                  <div className="col-span-1 flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={lines.length <= 1}
                      onClick={() => setLines(lines.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-status-danger-text" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-end gap-1 pt-3 border-t border-default text-xs">
              <div className="text-text-secondary">Subtotal: <strong>₹{totals.subtotal.toLocaleString('en-IN')}</strong></div>
              <div className="text-text-secondary">GST (18%): <strong>₹{totals.gst.toLocaleString('en-IN')}</strong></div>
              <div className="text-base font-bold text-text-primary">Grand Total: ₹{totals.total.toLocaleString('en-IN')}</div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Link href="/practice/proposals">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" variant="primary" loading={saving}>Save Draft Proposal</Button>
        </div>
      </form>
    </div>
  );
}
