'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@platform/ui';
import {
  FileSpreadsheet,
  ArrowRightLeft,
  Server,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Building2,
  TrendingUp,
  CreditCard,
  Compass,
  Landmark,
  Receipt,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';

export default function HomePage() {
  const { activeCompanyId, tallyEnabled } = useCompany();
  const [batches, setBatches] = useState<any[]>([]);
  const [connector, setConnector] = useState<any | null>(null);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [discoveryTickets, setDiscoveryTickets] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiClient.listImportBatches(activeCompanyId).catch(() => []),
      apiClient.getTallyConnector(activeCompanyId).catch(() => null),
      apiClient.listBankAccounts(activeCompanyId).catch(() => []),
      apiClient.listDiscoveryTickets().catch(() => []),
      apiClient.listInvoices(activeCompanyId).catch(() => []),
      apiClient.listVouchers(activeCompanyId).catch(() => []),
    ]).then(([b, c, ba, dt, invs, vchs]) => {
      setBatches(b || []);
      setConnector(c);
      setBankAccounts(ba || []);
      setDiscoveryTickets(dt || []);
      setInvoices(invs || []);
      setVouchers(vchs || []);
      setLoading(false);
    });
  }, [activeCompanyId]);

  const totalValid = batches.reduce((acc, b) => acc + (b.validRows || 0), 0);
  const totalBlocked = batches.reduce((acc, b) => acc + (b.blockedRows || 0), 0);
  const primaryBank = bankAccounts[0];
  const openTicketsCount = discoveryTickets.filter((t) => t.status === 'OPEN').length;

  const issuedInvoices = invoices.filter((i) => i.status === 'ISSUED');
  const totalInvoicedAmount = issuedInvoices.reduce(
    (acc, i) => acc + (parseFloat(i.totalAmount) || 0),
    0
  );
  const pendingApprovalCount = invoices.filter(
    (i) => i.status === 'PENDING_APPROVAL'
  ).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Operations Cockpit
            </h1>
            <Badge variant="success" dot>Live Operations</Badge>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Authoritative double-entry ledger, automated BRS reconciliation, unbilled sales discovery &amp; Tally Prime bridge.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/banking">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <CreditCard className="h-3.5 w-3.5 mr-1.5 text-blue-600 dark:text-blue-400" />
              Banking &amp; BRS
            </Button>
          </Link>
          <Link href="/imports/new">
            <Button
              variant="primary"
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/20 text-white text-xs font-semibold"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
              Bulk Import Register
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Bank Account
            </CardDescription>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white truncate">
              {primaryBank ? `${primaryBank.bankName} (${primaryBank.accountNumberMasked})` : 'HDFC Bank (•••• 5678)'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-mono font-medium">
              Balance: ₹{primaryBank ? Number(primaryBank.currentBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '12,50,000.00'}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Invoiced Revenue
              </CardDescription>
              <Link href="/invoices" className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline">
                View all
              </Link>
            </div>
            <CardTitle className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              ₹{totalInvoicedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {issuedInvoices.length} statutory tax invoices issued
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Posted Journal Vouchers
              </CardDescription>
              <Link href="/vouchers" className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline">
                View register
              </Link>
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
              {vouchers.length > 0 ? vouchers.length.toLocaleString() : totalValid.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              ✓ Double-Entry Balance Enforced
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Approvals &amp; Discovery
              </CardDescription>
              {pendingApprovalCount > 0 && (
                <Badge variant="warning" size="xs">
                  {pendingApprovalCount} Pending
                </Badge>
              )}
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
              {openTicketsCount + pendingApprovalCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              {pendingApprovalCount} invoices + {openTicketsCount} unbilled sales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Feature Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/banking" className="group">
          <Card className="h-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 hover:border-blue-500/50 hover:shadow-md transition-all duration-200">
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 mb-2 group-hover:scale-105 transition-transform">
                <CreditCard className="h-5 w-5" />
              </div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Banking &amp; BRS Engine
              </CardTitle>
              <CardDescription className="text-xs text-slate-600 dark:text-slate-400">
                Indian statement parser (HDFC, ICICI, SBI), balance continuity verification, and 1:1 / 1:Many ledger matching.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                Open BRS Cockpit <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/banking/discovery" className="group">
          <Card className="h-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 hover:border-indigo-500/50 hover:shadow-md transition-all duration-200">
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 mb-2 group-hover:scale-105 transition-transform">
                <Compass className="h-5 w-5" />
              </div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Unbilled Sales Discovery
              </CardTitle>
              <CardDescription className="text-xs text-slate-600 dark:text-slate-400">
                Identifies unbilled inbound customer credits, flags compliance tickets, and converts them to GST advance receipts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                Discover Unbilled Sales <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/imports/new" className="group">
          <Card className="h-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 hover:border-emerald-500/50 hover:shadow-md transition-all duration-200">
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 mb-2 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Universal Bulk Import
              </CardTitle>
              <CardDescription className="text-xs text-slate-600 dark:text-slate-400">
                5-step guided wizard: file upload, heuristic column mapping, statutory GST check, exception cockpit, and commit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                Launch Import Session <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </CardContent>
          </Card>
        </Link>

        {tallyEnabled ? (
          <Link href="/settings/tally" className="group">
            <Card className="h-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 hover:border-amber-500/50 hover:shadow-md transition-all duration-200">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900/50 text-amber-600 dark:text-amber-400 mb-2 group-hover:scale-105 transition-transform">
                  <Server className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  Tally Prime Bridge
                </CardTitle>
                <CardDescription className="text-xs text-slate-600 dark:text-slate-400">
                  Biometric agent telemetry, port 9000 heartbeat, XML Daybook generator, and zero-duplicate Read-Back protocol.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                  Inspect Bridge Status <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ) : (
          <Link href="/invoices" className="group">
            <Card className="h-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 hover:border-blue-500/50 hover:shadow-md transition-all duration-200">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 mb-2 group-hover:scale-105 transition-transform">
                  <Receipt className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Cloud Invoicing & Billing
                </CardTitle>
                <CardDescription className="text-xs text-slate-600 dark:text-slate-400">
                  GST Rule 46 Compliant Invoices, multi-template PDF exports, dynamic UPI QR codes, and instant payment settlement.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                  Manage Invoices <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* Accounting Intelligence Engine (AIE) Risk Matrix */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                Statutory Accounting Intelligence Engine (AIE)
              </CardTitle>
              <CardDescription className="text-xs text-slate-600 dark:text-slate-400">
                Deterministic statutory gates governing voucher ingestion, banking reconciliation, and ledger writes
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/60 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">GREEN</span>
                <Badge variant="success">READY</Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Passed checksum, Place of Supply rule, and debit-credit parity. Permitted to commit to database.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-950/20">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">YELLOW</span>
                <Badge variant="warning">CLARIFY</Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Party ledger missing or unmapped. In-place exception cockpit enables 1-click resolution.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-800/40 bg-rose-50/60 dark:bg-rose-950/20">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-rose-700 dark:text-rose-400">RED</span>
                <Badge variant="danger">BLOCKED</Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Math discrepancy or invalid GSTIN format. Database triggers strictly forbid posting.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800/40 bg-blue-50/60 dark:bg-blue-950/20">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-400">BLUE</span>
                <Badge variant="info">APPROVAL</Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                High-value vouchers exceeding ₹5,00,000 threshold requiring dual-control Maker-Checker sign-off.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
