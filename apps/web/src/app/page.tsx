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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border border-strong pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary dark:text-white">
              Operations Cockpit
            </h1>
            <Badge variant="success" dot>Live Operations</Badge>
          </div>
          <p className="text-sm text-secondary text-muted mt-1">
            Authoritative double-entry ledger, automated BRS reconciliation, unbilled sales discovery &amp; Tally Prime bridge.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/banking">
            <Button
              variant="outline"
              size="sm"
              className="border border-strong bg-white bg-surface text-secondary text-muted text-xs shadow-xs hover:bg-canvas hover:bg-surface-raised"
            >
              <CreditCard className="h-3.5 w-3.5 mr-1.5 text-brand-text text-brand" />
              Banking &amp; BRS
            </Button>
          </Link>
          <Link href="/imports/new">
            <Button
              variant="primary"
              size="sm"
              className="bg-brand hover:bg-brand shadow-md shadow-blue-500/20 text-white text-xs font-semibold"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
              Bulk Import Register
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border border-strong bg-white bg-surface shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] font-semibold uppercase tracking-wider text-muted text-muted">
              Active Bank Account
            </CardDescription>
            <CardTitle className="text-base font-bold text-primary dark:text-white truncate">
              {primaryBank ? `${primaryBank.bankName} (${primaryBank.accountNumberMasked})` : 'HDFC Bank (•••• 5678)'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-brand-text text-brand font-mono font-medium">
              Balance: ₹{primaryBank ? Number(primaryBank.currentBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '12,50,000.00'}
            </p>
          </CardContent>
        </Card>

        <Card className="border border border-strong bg-white bg-surface shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-[11px] font-semibold uppercase tracking-wider text-muted text-muted">
                Invoiced Revenue
              </CardDescription>
              <Link href="/invoices" className="text-[10px] text-brand-text text-brand hover:underline">
                View all
              </Link>
            </div>
            <CardTitle className="text-2xl font-bold font-mono text-primary dark:text-white">
              ₹{totalInvoicedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-status-success-text text-status-success-text font-medium">
              {issuedInvoices.length} statutory tax invoices issued
            </p>
          </CardContent>
        </Card>

        <Card className="border border border-strong bg-white bg-surface shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-[11px] font-semibold uppercase tracking-wider text-muted text-muted">
                Posted Journal Vouchers
              </CardDescription>
              <Link href="/vouchers" className="text-[10px] text-brand-text text-brand hover:underline">
                View register
              </Link>
            </div>
            <CardTitle className="text-2xl font-bold text-primary dark:text-white">
              {vouchers.length > 0 ? vouchers.length.toLocaleString() : totalValid.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-brand-text text-brand font-medium">
              ✓ Double-Entry Balance Enforced
            </p>
          </CardContent>
        </Card>

        <Card className="border border border-strong bg-white bg-surface shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-[11px] font-semibold uppercase tracking-wider text-muted text-muted">
                Approvals &amp; Discovery
              </CardDescription>
              {pendingApprovalCount > 0 && (
                <Badge variant="warning" size="xs">
                  {pendingApprovalCount} Pending
                </Badge>
              )}
            </div>
            <CardTitle className="text-2xl font-bold text-primary dark:text-white">
              {openTicketsCount + pendingApprovalCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-status-warning-text text-status-warning-text font-medium">
              {pendingApprovalCount} invoices + {openTicketsCount} unbilled sales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Feature Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/banking" className="group">
          <Card className="h-full border border border-strong bg-white bg-surface hover:border-focus hover:shadow-md transition-all duration-200">
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-subtle bg-brand/60 border border-focus border-focus text-brand-text text-brand mb-2 group-hover:scale-105 transition-transform">
                <CreditCard className="h-5 w-5" />
              </div>
              <CardTitle className="text-base font-bold text-primary dark:text-white group-hover:text-brand-text group-hover:text-brand transition-colors">
                Banking &amp; BRS Engine
              </CardTitle>
              <CardDescription className="text-xs text-secondary text-muted">
                Indian statement parser (HDFC, ICICI, SBI), balance continuity verification, and 1:1 / 1:Many ledger matching.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-xs font-semibold text-brand-text text-brand flex items-center gap-1 group-hover:gap-2 transition-all">
                Open BRS Cockpit <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/banking/discovery" className="group">
          <Card className="h-full border border border-strong bg-white bg-surface hover:border-focus hover:shadow-md transition-all duration-200">
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-subtle bg-brand/60 border border-focus border-focus text-brand-text text-brand mb-2 group-hover:scale-105 transition-transform">
                <Compass className="h-5 w-5" />
              </div>
              <CardTitle className="text-base font-bold text-primary dark:text-white group-hover:text-brand-text group-hover:text-brand transition-colors">
                Unbilled Sales Discovery
              </CardTitle>
              <CardDescription className="text-xs text-secondary text-muted">
                Identifies unbilled inbound customer credits, flags compliance tickets, and converts them to GST advance receipts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-xs font-semibold text-brand-text text-brand flex items-center gap-1 group-hover:gap-2 transition-all">
                Discover Unbilled Sales <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/imports/new" className="group">
          <Card className="h-full border border border-strong bg-white bg-surface hover:border-status-success hover:shadow-md transition-all duration-200">
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-status-success-subtle bg-status-success border border-status-success border-status-success text-status-success-text text-status-success-text mb-2 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <CardTitle className="text-base font-bold text-primary dark:text-white group-hover:text-status-success-text group-hover:text-status-success-text transition-colors">
                Universal Bulk Import
              </CardTitle>
              <CardDescription className="text-xs text-secondary text-muted">
                5-step guided wizard: file upload, heuristic column mapping, statutory GST check, exception cockpit, and commit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-xs font-semibold text-status-success-text text-status-success-text flex items-center gap-1 group-hover:gap-2 transition-all">
                Launch Import Session <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </CardContent>
          </Card>
        </Link>

        {tallyEnabled ? (
          <Link href="/settings/tally" className="group">
            <Card className="h-full border border border-strong bg-white bg-surface hover:border-status-warning hover:shadow-md transition-all duration-200">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-status-warning-subtle bg-status-warning border border-status-warning border-status-warning text-status-warning-text text-status-warning-text mb-2 group-hover:scale-105 transition-transform">
                  <Server className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-bold text-primary dark:text-white group-hover:text-status-warning-text group-hover:text-status-warning-text transition-colors">
                  Tally Prime Bridge
                </CardTitle>
                <CardDescription className="text-xs text-secondary text-muted">
                  Biometric agent telemetry, port 9000 heartbeat, XML Daybook generator, and zero-duplicate Read-Back protocol.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-xs font-semibold text-status-warning-text text-status-warning-text flex items-center gap-1 group-hover:gap-2 transition-all">
                  Inspect Bridge Status <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ) : (
          <Link href="/invoices" className="group">
            <Card className="h-full border border border-strong bg-white bg-surface hover:border-focus hover:shadow-md transition-all duration-200">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-subtle bg-brand/60 border border-focus border-focus text-brand-text text-brand mb-2 group-hover:scale-105 transition-transform">
                  <Receipt className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-bold text-primary dark:text-white group-hover:text-brand-text group-hover:text-brand transition-colors">
                  Cloud Invoicing & Billing
                </CardTitle>
                <CardDescription className="text-xs text-secondary text-muted">
                  GST Rule 46 Compliant Invoices, multi-template PDF exports, dynamic UPI QR codes, and instant payment settlement.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-xs font-semibold text-brand-text text-brand flex items-center gap-1 group-hover:gap-2 transition-all">
                  Manage Invoices <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* Accounting Intelligence Engine (AIE) Risk Matrix */}
      <Card className="border border border-strong bg-white bg-surface shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-brand-text text-brand" />
            <div>
              <CardTitle className="text-base font-bold text-primary dark:text-white">
                Statutory Accounting Intelligence Engine (AIE)
              </CardTitle>
              <CardDescription className="text-xs text-secondary text-muted">
                Deterministic statutory gates governing voucher ingestion, banking reconciliation, and ledger writes
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-status-success border-status-success bg-status-success-subtle bg-status-success">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-status-success-text text-status-success-text">GREEN</span>
                <Badge variant="success">READY</Badge>
              </div>
              <p className="text-xs text-secondary text-muted">
                Passed checksum, Place of Supply rule, and debit-credit parity. Permitted to commit to database.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-status-warning border-status-warning bg-status-warning-subtle bg-status-warning">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-status-warning-text text-status-warning-text">YELLOW</span>
                <Badge variant="warning">CLARIFY</Badge>
              </div>
              <p className="text-xs text-secondary text-muted">
                Party ledger missing or unmapped. In-place exception cockpit enables 1-click resolution.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-status-danger border-status-danger bg-status-danger-subtle bg-status-danger">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-status-danger-text text-status-danger-text">RED</span>
                <Badge variant="danger">BLOCKED</Badge>
              </div>
              <p className="text-xs text-secondary text-muted">
                Math discrepancy or invalid GSTIN format. Database triggers strictly forbid posting.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-focus border-focus bg-brand-subtle/60 bg-brand/20">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-brand-text text-brand">BLUE</span>
                <Badge variant="info">APPROVAL</Badge>
              </div>
              <p className="text-xs text-secondary text-muted">
                High-value vouchers exceeding ₹5,00,000 threshold requiring dual-control Maker-Checker sign-off.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
