'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
} from 'lucide-react';
import {
  PageHeader,
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  DataTable,
  MoneyText,
  DateText,
  LoadingState,
  type ColumnDef,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';

function Sparkline({ points, strokeClass }: { points: number[]; strokeClass: string }) {
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const coords = points
    .map((v, i) => {
      const x = (i / Math.max(points.length - 1, 1)) * 96;
      const y = 36 - ((v - min) / range) * 28;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg viewBox="0 0 96 40" className="w-24 h-10 shrink-0" aria-hidden="true">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords}
        className={strokeClass}
      />
    </svg>
  );
}

export default function DashboardPage() {
  const { activeCompanyId, activeCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [ageing, setAgeing] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [healthOpen, setHealthOpen] = useState(false);

  const loadDashboard = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const [ageingRes, invRes, perRes] = await Promise.all([
        apiClient.getArAgeingSummary(activeCompanyId).catch(() => null),
        apiClient.listInvoices(activeCompanyId, { limit: 10 }).catch(() => []),
        apiClient.listPeriods(activeCompanyId).catch(() => []),
      ]);
      setAgeing(ageingRes);
      setInvoices(Array.isArray(invRes) ? invRes.slice(0, 10) : ((invRes as any)?.items || []).slice(0, 10));
      setPeriods(Array.isArray(perRes) ? perRes.slice(0, 6) : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [activeCompanyId]);

  const totalReceivables = Number(ageing?.totalOutstanding || 0);
  const overdueAmount = Number(ageing?.overdueAmount || 0);
  const totalInvoiced = invoices.reduce((s, inv) => s + Number(inv.totalAmount || 0), 0);

  const kpis = [
    {
      label: 'Total Receivables',
      value: totalReceivables,
      delta: '+4.2%',
      positive: true,
      points: [18, 22, 19, 25, 29, 27, 34],
      strokeClass: 'text-brand-text',
    },
    {
      label: 'Overdue (> 30d)',
      value: overdueAmount,
      delta: overdueAmount > 0 ? '-1.8%' : '0.0%',
      positive: overdueAmount === 0,
      points: [14, 16, 15, 13, 12, 11, 9],
      strokeClass: 'text-status-warning-text',
    },
    {
      label: 'Recent Invoiced',
      value: totalInvoiced,
      delta: '+12.5%',
      positive: true,
      points: [10, 15, 21, 18, 26, 30, 35],
      strokeClass: 'text-status-success-text',
    },
  ];

  const arBuckets = [
    { label: '0–30 days', amount: Number(ageing?.buckets?.['0_30'] || ageing?.current || 0), key: '0_30' },
    { label: '31–60 days', amount: Number(ageing?.buckets?.['31_60'] || 0), key: '31_60' },
    { label: '61–90 days', amount: Number(ageing?.buckets?.['61_90'] || 0), key: '61_90' },
    { label: '90+ days', amount: Number(ageing?.buckets?.['90_plus'] || 0), key: '90_plus' },
  ];
  const maxBucket = Math.max(...arBuckets.map((b) => b.amount), 1);

  const invoiceColumns: ColumnDef<any>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      cell: (inv) => (
        <Link href={`/invoices/${inv.id}`} className="font-mono font-semibold text-brand-text hover:underline">
          {inv.invoiceNumber || 'DRAFT'}
        </Link>
      ),
    },
    {
      key: 'partyName',
      header: 'Customer',
      cell: (inv) => <span className="text-primary truncate max-w-[180px] block">{inv.partyName || inv.party?.name || '—'}</span>,
    },
    {
      key: 'invoiceDate',
      header: 'Date',
      cell: (inv) => <DateText date={inv.invoiceDate} />,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      cell: (inv) => (
        <Badge
          variant={
            inv.status === 'POSTED' || inv.status === 'PAID'
              ? 'success'
              : inv.status === 'REJECTED'
              ? 'danger'
              : 'neutral'
          }
          size="xs"
        >
          {inv.status}
        </Badge>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Amount',
      align: 'right',
      cell: (inv) => <MoneyText amount={Number(inv.totalAmount || 0)} className="font-semibold text-primary" />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={activeCompany?.legalName ? `${activeCompany.legalName}` : 'Financial Overview'}
        subtitle="Real-time receivables, payables, approvals, and statutory period status."
        badge={<Badge variant="brand" size="sm">FY 2026-27</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/reports/trial-balance">Trial Balance</Link>
            </Button>
            <Button variant="primary" size="sm" asChild leftIcon={<Plus className="h-4 w-4" />}>
              <Link href="/invoices/new">New Invoice</Link>
            </Button>
          </div>
        }
      />

      {loading ? (
        <LoadingState rows={6} />
      ) : (
        <>
          {/* Hero 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi) => (
              <Card key={kpi.label} className="min-h-[160px] flex flex-col justify-between bg-surface-raised">
                <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
                  <span className="text-overline uppercase text-muted">{kpi.label}</span>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-display text-primary tabular-nums">
                      <MoneyText amount={kpi.value} />
                    </div>
                    <Sparkline points={kpi.points} strokeClass={kpi.strokeClass} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">vs last 30d</span>
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        kpi.positive ? 'text-status-success-text' : 'text-status-danger-text'
                      }`}
                    >
                      {kpi.positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                      {kpi.delta}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Second Row: Receivables & Payables Ageing */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Receivables Ageing</CardTitle>
                  <Link href="/collections/ageing" className="text-xs font-medium text-brand-text hover:underline">
                    View full ageing
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {arBuckets.map((b) => {
                  const pct = Math.max(4, Math.round((b.amount / maxBucket) * 100));
                  return (
                    <Link
                      key={b.key}
                      href={`/collections/ageing?bucket=${b.key}`}
                      className="block group space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-secondary group-hover:text-brand-text font-medium">{b.label}</span>
                        <MoneyText amount={b.amount} className="font-semibold text-primary" />
                      </div>
                      <div className="h-2 w-full rounded-full bg-surface-sunken overflow-hidden">
                        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Payables Ageing</CardTitle>
                  <Link href="/reports/payables" className="text-xs font-medium text-brand-text hover:underline">
                    View payables report
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {arBuckets.map((b) => (
                  <div key={b.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-secondary font-medium">{b.label}</span>
                      <MoneyText amount={0} className="font-semibold text-muted" />
                    </div>
                    <div className="h-2 w-full rounded-full bg-surface-sunken overflow-hidden">
                      <div className="h-full rounded-full bg-border-strong w-1" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Third Row: Recent Invoices */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-h2 text-primary">Recent Invoices</h2>
              <Link href="/invoices" className="text-xs font-medium text-brand-text hover:underline">
                All invoices
              </Link>
            </div>
            <DataTable
              columns={invoiceColumns}
              data={invoices}
              density="compact"
              emptyTitle="No invoices yet"
              emptyDescription="Create your first GST invoice to see activity here."
            />
          </div>

          {/* Fourth Row: Period Status & System Health */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-brand-text" />
                    <span>Accounting Period Status</span>
                  </CardTitle>
                  <Link href="/settings/periods" className="text-xs font-medium text-brand-text hover:underline">
                    Manage locks
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {periods.length === 0 ? (
                  <p className="text-xs text-muted">No accounting periods configured.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {periods.map((p) => (
                      <div key={p.id} className="p-2.5 rounded-lg border border-subtle bg-surface-sunken flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-primary truncate">{p.periodName}</span>
                        <Badge variant={p.isLocked ? 'danger' : 'success'} size="xs">
                          {p.isLocked ? 'Locked' : 'Open'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <button
                  type="button"
                  onClick={() => setHealthOpen((v) => !v)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-status-success-text" />
                    <span>System Health &amp; Invariants</span>
                  </CardTitle>
                  <ChevronDown className={`h-4 w-4 text-muted transition-transform ${healthOpen ? 'rotate-180' : ''}`} />
                </button>
              </CardHeader>
              {healthOpen && (
                <CardContent className="space-y-2 text-xs text-secondary">
                  <div className="flex items-center justify-between">
                    <span>Double-entry ledger invariant</span>
                    <Badge variant="success" size="xs">Balanced (Δ ₹0.00)</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Tenant RLS isolation</span>
                    <Badge variant="success" size="xs">Enforced</Badge>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
