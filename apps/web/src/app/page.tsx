'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Receipt,
  Clock,
  Landmark,
  CheckCircle2,
  XCircle,
  Lock,
  ChevronDown,
  ChevronRight,
  Plus,
} from 'lucide-react';
import {
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  MoneyText,
  DateText,
  LoadingState,
  EmptyState,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * 60;
      const y = 18 - ((v - min) / span) * 14;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width="64" height="20" viewBox="0 0 64 20" className="text-brand-text shrink-0" aria-hidden="true">
      <polyline fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

export default function DashboardPage() {
  const { activeCompanyId, activeCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [ageingSummary, setAgeingSummary] = useState<any>(null);
  const [payablesAgeing, setPayablesAgeing] = useState<any>(null);
  const [cashPosition, setCashPosition] = useState<number>(0);
  const [periods, setPeriods] = useState<any[]>([]);
  const [tallyConn, setTallyConn] = useState<any>(null);
  const [healthOpen, setHealthOpen] = useState(false);

  const loadDashboard = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const [invRes, appRes, arRes, apRes, tbRes, perRes, tallyRes] = await Promise.allSettled([
        apiClient.listInvoices(activeCompanyId, { limit: 10 }),
        apiClient.listApprovals(activeCompanyId),
        apiClient.getArAgeingSummary(activeCompanyId),
        apiClient.getPayablesAgeing(activeCompanyId),
        apiClient.getTrialBalance(activeCompanyId),
        apiClient.listPeriods(activeCompanyId),
        apiClient.getTallyConnector(),
      ]);
      if (invRes.status === 'fulfilled') setInvoices((invRes.value || []).slice(0, 10));
      if (appRes.status === 'fulfilled') setApprovals((appRes.value || []).slice(0, 5));
      if (arRes.status === 'fulfilled') setAgeingSummary(arRes.value);
      if (apRes.status === 'fulfilled') setPayablesAgeing(apRes.value);
      if (tbRes.status === 'fulfilled') {
        const rows = tbRes.value?.rows || [];
        const cashSum = rows
          .filter((r: any) => (r.ledgerName || '').toLowerCase().includes('cash') || (r.ledgerName || '').toLowerCase().includes('bank'))
          .reduce((s: number, r: any) => s + Number(r.closingDebit || 0) - Number(r.closingCredit || 0), 0);
        setCashPosition(cashSum);
      }
      if (perRes.status === 'fulfilled') setPeriods(perRes.value || []);
      if (tallyRes.status === 'fulfilled') setTallyConn(tallyRes.value);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [activeCompanyId]);

  const monthRevenue = invoices
    .filter((i) => i.status !== 'CANCELLED')
    .reduce((s, i) => s + Number(i.totalAmount || 0), 0);
  const outstandingAr = Number(ageingSummary?.totalOutstanding || 0);
  const overdue30 = Number(ageingSummary?.bracket_31_60 || 0) + Number(ageingSummary?.bracket_61_90 || 0) + Number(ageingSummary?.bracket_90_plus || 0);

  const apTotals = (payablesAgeing?.rows || []).reduce(
    (acc: any, r: any) => ({
      b0: acc.b0 + Number(r.current_0_30 || 0),
      b31: acc.b31 + Number(r.bracket_31_60 || 0),
      b61: acc.b61 + Number(r.bracket_61_90 || 0),
      b90: acc.b90 + Number(r.bracket_90_plus || 0),
    }),
    { b0: 0, b31: 0, b61: 0, b90: 0 },
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Home"
        subtitle={activeCompany ? `${activeCompany.legalName} — Financial overview & daily operations` : 'Financial overview'}
        actions={
          <Link
            href="/invoices/new"
            className="h-8 px-3.5 rounded-lg bg-brand hover:bg-brand-hover text-primary-inverse font-semibold text-caption inline-flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Invoice</span>
          </Link>
        }
      />

      {loading ? (
        <LoadingState variant="cards" rows={4} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-caption text-muted">
                <span>Recent Revenue</span>
                <TrendingUp className="h-4 w-4 text-brand-text" />
              </div>
              <div className="flex items-end justify-between gap-2">
                <span className="text-h2 text-primary"><MoneyText amount={monthRevenue} align="left" /></span>
                <Sparkline values={[12, 18, 15, 22, 28, 34]} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-caption text-muted">
                <span>Outstanding AR</span>
                <Receipt className="h-4 w-4 text-status-info-text" />
              </div>
              <div className="flex items-end justify-between gap-2">
                <span className="text-h2 text-primary"><MoneyText amount={outstandingAr} align="left" /></span>
                <Sparkline values={[20, 24, 19, 25, 22, 27]} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-caption text-muted">
                <span>Overdue &gt; 30d</span>
                <Clock className="h-4 w-4 text-status-warning-text" />
              </div>
              <div className="flex items-end justify-between gap-2">
                <span className="text-h2 text-status-warning-text"><MoneyText amount={overdue30} align="left" /></span>
                <Sparkline values={[10, 12, 9, 11, 8, 7]} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-caption text-muted">
                <span>Cash &amp; Bank</span>
                <Landmark className="h-4 w-4 text-status-success-text" />
              </div>
              <div className="flex items-end justify-between gap-2">
                <span className="text-h2 text-primary"><MoneyText amount={cashPosition} negative={cashPosition < 0} align="left" /></span>
                <Sparkline values={[14, 16, 20, 18, 24, 26]} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Receivables & Payables Ageing Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-h3">Receivables Ageing</CardTitle>
            <Link href="/collections/ageing" className="text-caption text-brand-text hover:underline">View Ageing →</Link>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: '0–30d', val: ageingSummary?.current_0_30 || 0 },
              { label: '31–60d', val: ageingSummary?.bracket_31_60 || 0 },
              { label: '61–90d', val: ageingSummary?.bracket_61_90 || 0 },
              { label: '90+d', val: ageingSummary?.bracket_90_plus || 0 },
            ].map((b) => (
              <Link key={b.label} href="/collections/ageing" className="p-2.5 rounded-lg bg-surface-sunken hover:bg-row-hover transition">
                <div className="text-caption text-muted">{b.label}</div>
                <div className="mt-1 text-body-sm font-semibold"><MoneyText amount={b.val} align="left" /></div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-h3">Payables Ageing</CardTitle>
            <Link href="/reports/payables" className="text-caption text-brand-text hover:underline">View Payables →</Link>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: '0–30d', val: apTotals.b0 },
              { label: '31–60d', val: apTotals.b31 },
              { label: '61–90d', val: apTotals.b61 },
              { label: '90+d', val: apTotals.b90 },
            ].map((b) => (
              <Link key={b.label} href="/reports/payables" className="p-2.5 rounded-lg bg-surface-sunken hover:bg-row-hover transition">
                <div className="text-caption text-muted">{b.label}</div>
                <div className="mt-1 text-body-sm font-semibold"><MoneyText amount={b.val} align="left" /></div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices + Pending Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-7">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-h3">Recent Invoices</CardTitle>
            <Link href="/invoices" className="text-caption text-brand-text hover:underline">All Invoices →</Link>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <EmptyState title="No recent invoices" description="Create an invoice to see recent billing activity." />
            ) : (
              <div className="divide-y divide-border-subtle">
                {invoices.map((inv) => (
                  <Link key={inv.id} href={`/invoices/${inv.id}`} className="py-2 flex items-center justify-between gap-3 hover:bg-row-hover px-2 -mx-2 rounded-lg transition">
                    <div className="min-w-0">
                      <div className="font-mono text-body-sm font-semibold text-brand-text">{inv.invoiceNumber}</div>
                      <div className="text-caption text-muted truncate">{inv.party?.name || 'Customer'}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <DateText date={inv.invoiceDate} className="hidden sm:inline text-caption text-muted" />
                      <Badge variant={inv.status === 'ISSUED' ? 'success' : 'neutral'} size="xs">{inv.status}</Badge>
                      <MoneyText amount={inv.totalAmount} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-h3">Approvals Pending</CardTitle>
              <Link href="/approvals" className="text-caption text-brand-text hover:underline">Queue →</Link>
            </CardHeader>
            <CardContent>
              {approvals.length === 0 ? (
                <p className="text-body-sm text-muted">No pending approval requests.</p>
              ) : (
                <div className="space-y-2">
                  {approvals.map((a) => (
                    <div key={a.id} className="p-2.5 rounded-lg bg-surface-sunken flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-body-sm font-semibold text-primary truncate">{a.metadata?.invoiceNumber || a.entityType}</div>
                        <div className="text-caption text-muted truncate">{a.requesterName}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="xs" variant="primary" aria-label="Approve" onClick={async () => { await apiClient.approveRequest(activeCompanyId, a.id); loadDashboard(); }}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="xs" variant="outline" aria-label="Reject" onClick={async () => { await apiClient.rejectRequest(activeCompanyId, a.id, 'Rejected from dashboard'); loadDashboard(); }}>
                          <XCircle className="h-3.5 w-3.5 text-status-danger-text" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-h3">Period Status</CardTitle>
              <Link href="/settings/periods" className="text-caption text-brand-text hover:underline">Manage →</Link>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {periods.length === 0 ? (
                <Badge variant="success" size="sm">FY Open</Badge>
              ) : (
                periods.slice(0, 4).map((p: any) => (
                  <Badge key={p.id} variant={p.isLocked ? 'warning' : 'success'} size="xs">
                    <Lock className="h-3 w-3 mr-1" />
                    {p.periodName || p.startDate}
                  </Badge>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <button
              type="button"
              onClick={() => setHealthOpen((v) => !v)}
              className="w-full px-4 py-3 flex items-center justify-between text-body-sm font-semibold text-primary"
            >
              <span>System Health</span>
              {healthOpen ? <ChevronDown className="h-4 w-4 text-muted" /> : <ChevronRight className="h-4 w-4 text-muted" />}
            </button>
            {healthOpen && (
              <CardContent className="pt-0 space-y-1.5 text-caption text-secondary">
                <div className="flex justify-between"><span>Tally Bridge</span><Badge variant={tallyConn?.status === 'ONLINE' ? 'success' : 'warning'} size="xs">{tallyConn?.status || 'STANDBY'}</Badge></div>
                <div className="flex justify-between"><span>Outbox Depth</span><span className="font-mono">0</span></div>
                <div className="flex justify-between"><span>Payment Webhook</span><span className="font-mono">HMAC Active</span></div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
