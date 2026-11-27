'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, Button, Badge, Input } from '@platform/ui';
import { Receipt, TrendingUp, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function PracticeBillingAndProfitabilityPage() {
  const [tab, setTab] = useState<'WIP' | 'BILLS' | 'PROFITABILITY'>('WIP');
  const [wip, setWip] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [profitability, setProfitability] = useState<any>({ byClient: [], byJob: [] });
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);
  const [retainerDrawdown, setRetainerDrawdown] = useState('0');
  const [writeOff, setWriteOff] = useState('0');

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

  const handleGenerateBill = async (clientId: string) => {
    const bill = await apiClient.createPracticeBillFromWip({
      clientId,
      includeRetainers: true,
      retainerDrawdown: Number(retainerDrawdown) || 0,
      writeOffAmount: Number(writeOff) || 0,
    });
    setBanner(`Generated Practice Bill ${bill.billNumber} (Total ₹${Number(bill.totalAmount).toLocaleString('en-IN')}).`);
    setTab('BILLS');
    await loadData();
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

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Receipt className="h-6 w-6 text-brand-primary" />
            Practice Billing, GST Invoices &amp; Profitability
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Convert unbilled WIP and retainer fee schedules into GST invoices, apply write-offs, and track client margin.
          </p>
        </div>
        <div className="flex gap-1.5 rounded-xl border border-default bg-surface p-1">
          {(['WIP', 'BILLS', 'PROFITABILITY'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                tab === t ? 'bg-brand-subtle text-brand-text' : 'text-text-secondary'
              }`}
            >
              {t === 'WIP' ? 'Unbilled WIP' : t === 'BILLS' ? `Bills (${bills.length})` : 'Profitability'}
            </button>
          ))}
        </div>
      </div>

      {banner && (
        <div className="p-3 rounded-xl bg-status-success-subtle border border-default text-xs text-status-success-text font-semibold flex items-center justify-between">
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> {banner}</span>
          <button type="button" onClick={() => setBanner(null)} className="underline">Dismiss</button>
        </div>
      )}

      {tab === 'WIP' && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Unbilled WIP &amp; Retainers by Client</h2>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-text-secondary">Retainer Draw-down (₹):</span>
                <Input className="w-24" type="number" value={retainerDrawdown} onChange={(e) => setRetainerDrawdown(e.target.value)} />
                <span className="text-text-secondary">Write-off (₹):</span>
                <Input className="w-24" type="number" value={writeOff} onChange={(e) => setWriteOff(e.target.value)} />
              </div>
            </div>

            {loading ? (
              <div className="text-xs text-text-muted py-6 text-center">Loading WIP...</div>
            ) : (
              <div className="space-y-2">
                {wip.map((row) => (
                  <div key={row.clientId} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-default bg-surface-muted">
                    <div>
                      <div className="text-sm font-semibold text-text-primary">{row.clientName}</div>
                      <div className="text-xs text-text-secondary">
                        Unbilled Time: <strong>{row.unbilledHours} hrs</strong> (₹{Number(row.unbilledTimeValue).toLocaleString('en-IN')}) · Retainer / Service Fees: <strong>₹{Number(row.retainerFeeValue).toLocaleString('en-IN')}</strong>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={row.unbilledHours === 0 && row.retainerFeeValue === 0}
                      onClick={() => handleGenerateBill(row.clientId)}
                    >
                      Generate Bill
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'BILLS' && (
        <Card>
          <CardContent className="p-5 space-y-3">
            {bills.length === 0 ? (
              <div className="text-xs text-text-muted py-6 text-center">No practice bills generated yet.</div>
            ) : (
              bills.map((b) => (
                <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-default">
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
              Client Realization &amp; Margin
            </h2>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
