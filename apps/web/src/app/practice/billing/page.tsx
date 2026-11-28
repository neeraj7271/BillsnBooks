'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  Button,
  Badge,
  Input,
  EmptyState,
  Tooltip,
} from '@platform/ui';
import {
  Receipt,
  TrendingUp,
  CheckCircle2,
  FileSpreadsheet,
  HelpCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

function TermHelp({ label, tip }: { label: string; tip: string }) {
  return (
    <Tooltip content={tip}>
      <span className="inline-flex items-center gap-1 cursor-help border-b border-dotted border-default">
        <span>{label}</span>
        <HelpCircle className="h-3 w-3 text-muted" />
      </span>
    </Tooltip>
  );
}

export default function PracticeBillingAndProfitabilityPage() {
  const [tab, setTab] = useState<'WIP' | 'BILLS' | 'PROFITABILITY'>('WIP');
  const [wip, setWip] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [profitability, setProfitability] = useState<any>({ byClient: [], byJob: [] });
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);
  const [showAllClients, setShowAllClients] = useState(false);

  // Per-client Generate Bill drawer/popover state
  const [billingClientId, setBillingClientId] = useState<string | null>(null);
  const [retainerDrawdown, setRetainerDrawdown] = useState('0');
  const [writeOff, setWriteOff] = useState('0');
  const [generating, setGenerating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [w, b, p] = await Promise.all([
        apiClient.getUnbilledWip(),
        apiClient.listPracticeBills(),
        apiClient.getProfitabilityReport(),
      ]);
      setWip(w || []);
      setBills(b || []);
      setProfitability(p || { byClient: [], byJob: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openBillConfig = (clientId: string) => {
    setBillingClientId(clientId);
    setRetainerDrawdown('0');
    setWriteOff('0');
  };

  const handleGenerateBill = async (clientId: string) => {
    setGenerating(true);
    try {
      const bill = await apiClient.createPracticeBillFromWip({
        clientId,
        includeRetainers: true,
        retainerDrawdown: Number(retainerDrawdown) || 0,
        writeOffAmount: Number(writeOff) || 0,
      });
      setBanner(`Generated Practice Bill ${bill.billNumber} (Total ₹${Number(bill.totalAmount).toLocaleString('en-IN')}).`);
      setBillingClientId(null);
      setTab('BILLS');
      await loadData();
    } finally {
      setGenerating(false);
    }
  };

  const handleConvertInvoice = async (billId: string) => {
    const res = await apiClient.convertBillToGstInvoice(billId);
    setBanner(`Converted to GST Invoice ${res.invoiceNumber || res.invoiceId}!`);
    await loadData();
  };

  const handleMarkPaid = async (billId: string) => {
    await apiClient.markPracticeBillPaid(billId);
    setBanner('Bill & linked GST invoice marked PAID.');
    await loadData();
  };

  const readyToBill = wip.filter((r) => Number(r.unbilledHours) > 0 || Number(r.retainerFeeValue) > 0);
  const visibleWip = showAllClients ? wip : readyToBill;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Receipt className="h-6 w-6 text-brand-primary" />
            Practice Billing, GST Invoices &amp; Profitability
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Convert unbilled <TermHelp label="WIP" tip="Work In Progress: billable hours logged in Timesheets plus retainer/service fees not yet billed." /> and retainer fee schedules into GST invoices, apply adjustments, and track client margin.
          </p>
          <p className="text-xs text-muted mt-1">
            WIP = unbilled time (
            <Link href="/practice/timesheets" className="text-brand-text hover:underline font-medium">
              Timesheets
            </Link>
            ) + retainer/service fees (
            <Link href="/practice/proposals" className="text-brand-text hover:underline font-medium">
              Engagements
            </Link>
            ).
          </p>
        </div>
        <div className="flex gap-1.5 rounded-xl bg-surface-sunken p-1">
          {(['WIP', 'BILLS', 'PROFITABILITY'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                tab === t ? 'bg-brand-subtle text-brand-text' : 'text-text-secondary'
              }`}
            >
              {t === 'WIP' ? `Unbilled WIP (${readyToBill.length})` : t === 'BILLS' ? `Bills (${bills.length})` : 'Profitability'}
            </button>
          ))}
        </div>
      </div>

      {/* 4-step Billing Flow Legend */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-subtle bg-surface px-4 py-2.5 text-xs shadow-card">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted mr-1">Billing Flow:</span>
        {[
          { step: '1. Unbilled WIP', active: tab === 'WIP' },
          { step: '2. Bill', active: tab === 'BILLS' },
          { step: '3. GST Invoice', active: tab === 'BILLS' },
          { step: '4. Paid', active: tab === 'PROFITABILITY' },
        ].map((item, idx) => (
          <React.Fragment key={item.step}>
            <span
              className={`px-2.5 py-0.5 rounded-lg font-semibold ${
                item.active ? 'bg-brand-subtle text-brand-text' : 'bg-surface-sunken text-secondary'
              }`}
            >
              {item.step}
            </span>
            {idx < 3 && <ArrowRight className="h-3.5 w-3.5 text-muted" />}
          </React.Fragment>
        ))}
      </div>

      {banner && (
        <div className="p-3 rounded-xl bg-status-success-subtle border border-subtle shadow-card text-xs text-status-success-text font-semibold flex items-center justify-between">
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> {banner}</span>
          <button type="button" onClick={() => setBanner(null)} className="underline">Dismiss</button>
        </div>
      )}

      {tab === 'WIP' && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                  Unbilled WIP &amp; Retainers by Client
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Showing {visibleWip.length} of {wip.length} client{wip.length === 1 ? '' : 's'}
                  {!showAllClients && wip.length > readyToBill.length ? ' with ready-to-bill WIP' : ''}.
                </p>
              </div>
              {wip.length > 0 && (
                <label className="inline-flex items-center gap-2 text-xs text-secondary cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showAllClients}
                    onChange={(e) => setShowAllClients(e.target.checked)}
                    className="rounded border-default"
                  />
                  <span>Show all clients ({wip.length})</span>
                </label>
              )}
            </div>

            {loading ? (
              <div className="text-xs text-text-muted py-6 text-center">Loading WIP...</div>
            ) : visibleWip.length === 0 ? (
              <EmptyState
                icon={<Clock className="h-6 w-6 text-muted" />}
                title="No unbilled work yet"
                description="WIP comes from time you log in Timesheets and retainer fees on signed engagements."
                action={
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Link href="/practice/timesheets">
                      <Button variant="primary" size="sm">Log time</Button>
                    </Link>
                    <Link href="/practice/proposals">
                      <Button variant="outline" size="sm">View engagements</Button>
                    </Link>
                  </div>
                }
              />
            ) : (
              <div className="space-y-2">
                {visibleWip.map((row) => {
                  const hasWip = Number(row.unbilledHours) > 0 || Number(row.retainerFeeValue) > 0;
                  const isConfiguring = billingClientId === row.clientId;
                  return (
                    <div key={row.clientId} className="p-3 rounded-xl bg-surface-sunken space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-text-primary">{row.clientName}</div>
                          <div className="text-xs text-text-secondary">
                            Unbilled Time: <strong>{row.unbilledHours} hrs</strong> (₹{Number(row.unbilledTimeValue).toLocaleString('en-IN')}) · Retainer / Service Fees: <strong>₹{Number(row.retainerFeeValue).toLocaleString('en-IN')}</strong>
                          </div>
                        </div>
                        {!hasWip ? (
                          <Tooltip content="Nothing to bill — log time or add a retainer fee">
                            <span className="inline-block">
                              <Button size="sm" variant="primary" disabled>
                                Generate Bill
                              </Button>
                            </span>
                          </Tooltip>
                        ) : (
                          <Button
                            size="sm"
                            variant={isConfiguring ? 'outline' : 'primary'}
                            onClick={() => (isConfiguring ? setBillingClientId(null) : openBillConfig(row.clientId))}
                          >
                            {isConfiguring ? 'Cancel' : 'Generate Bill'}
                          </Button>
                        )}
                      </div>

                      {isConfiguring && (
                        <div className="rounded-xl bg-surface border border-subtle p-3.5 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="space-y-1">
                              <label className="font-semibold text-primary block">
                                <TermHelp
                                  label="Retainer Draw-down (₹)"
                                  tip="Amount of a client's prepaid retainer balance applied to reduce this bill."
                                />
                              </label>
                              <Input
                                type="number"
                                min="0"
                                value={retainerDrawdown}
                                onChange={(e) => setRetainerDrawdown(e.target.value)}
                              />
                              <p className="text-[11px] text-muted">
                                Amount of prepaid retainer to apply to this bill.
                              </p>
                            </div>
                            <div className="space-y-1">
                              <label className="font-semibold text-primary block">
                                <TermHelp
                                  label="Write-off (₹)"
                                  tip="Unbillable hours or fee discount waived and excluded from this bill."
                                />
                              </label>
                              <Input
                                type="number"
                                min="0"
                                value={writeOff}
                                onChange={(e) => setWriteOff(e.target.value)}
                              />
                              <p className="text-[11px] text-muted">
                                Discount or non-billable time to waive on this bill.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setBillingClientId(null)}
                              disabled={generating}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              loading={generating}
                              onClick={() => handleGenerateBill(row.clientId)}
                            >
                              Confirm &amp; Generate Bill
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'BILLS' && (
        <Card>
          <CardContent className="p-5 space-y-3">
            {bills.length === 0 ? (
              <EmptyState
                icon={<Receipt className="h-6 w-6 text-muted" />}
                title="No practice bills generated yet"
                description="Generate a bill from the Unbilled WIP tab, then convert it into a GST invoice."
                action={{ label: 'Go to Unbilled WIP', onClick: () => setTab('WIP') }}
              />
            ) : (
              bills.map((b) => (
                <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-surface-sunken">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-text-primary font-mono">{b.billNumber}</span>
                      <span className="text-sm font-semibold text-text-primary">· {b.clientName}</span>
                      <Badge variant={b.status === 'PAID' ? 'success' : b.status === 'INVOICED' ? 'info' : 'neutral'}>
                        {b.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5">
                      Subtotal ₹{Number(b.subtotal).toLocaleString('en-IN')} + GST ₹{Number(b.gstAmount).toLocaleString('en-IN')} = <strong>₹{Number(b.totalAmount).toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!b.invoiceId && (
                      <Button size="sm" variant="primary" onClick={() => handleConvertInvoice(b.id)}>
                        <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Convert to GST Invoice
                      </Button>
                    )}
                    {b.invoiceId && (
                      <Link href={`/invoices/${b.invoiceId}`}>
                        <Button size="sm" variant="outline">View GST Invoice</Button>
                      </Link>
                    )}
                    {b.status !== 'PAID' && (
                      <Button size="sm" variant="outline" onClick={() => handleMarkPaid(b.id)}>
                        Mark Paid
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'PROFITABILITY' && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand-primary" />
              Client{' '}
              <TermHelp
                label="Realization"
                tip="Percentage of standard time and fee value actually billed to the client."
              />{' '}
              &amp;{' '}
              <TermHelp
                label="Margin"
                tip="Billed revenue minus internal staff time cost."
              />
            </h2>
            {(profitability.byClient || []).length === 0 ? (
              <EmptyState
                icon={<TrendingUp className="h-6 w-6 text-muted" />}
                title="No profitability data yet"
                description="Log billable hours in Timesheets and generate client bills to measure realization and margin."
                action={
                  <Link href="/practice/timesheets">
                    <Button variant="primary" size="sm">Log Time</Button>
                  </Link>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-default text-text-muted uppercase text-[11px]">
                      <th className="py-2 px-3">Client</th>
                      <th className="py-2 px-3 text-right">Hours</th>
                      <th className="py-2 px-3 text-right">Time Cost</th>
                      <th className="py-2 px-3 text-right">Billed</th>
                      <th className="py-2 px-3 text-right">Collected</th>
                      <th className="py-2 px-3 text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subtle">
                    {(profitability.byClient || []).map((c: any) => (
                      <tr key={c.clientId}>
                        <td className="py-2 px-3 font-semibold text-text-primary">{c.clientName}</td>
                        <td className="py-2 px-3 text-right font-mono">{c.totalHours}</td>
                        <td className="py-2 px-3 text-right font-mono">₹{Number(c.timeCost).toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 text-right font-mono">₹{Number(c.billed).toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 text-right font-mono">₹{Number(c.collected).toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 text-right font-mono">
                          <Badge variant={c.margin >= 0 ? 'success' : 'danger'} size="xs">
                            ₹{Number(c.margin).toLocaleString('en-IN')} ({c.marginPct}%)
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
      )}
    </div>
  );
}
