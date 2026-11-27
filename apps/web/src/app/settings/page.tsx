'use client';
import { logger } from '@/lib/logger';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sliders,
  Building2,
  Hash,
  CalendarClock,
  Server,
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  Image as ImageIcon,
  QrCode as QrIcon,
  FileSignature,
  FileText,
  Sparkles,
  ExternalLink,
  Search,
  Check,
  Layers,
  ArrowRight,
  Filter,
  RefreshCw,
  Landmark,
} from 'lucide-react';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  QrCode,
  toast,
  confirmDialog,
  MonoCopyable,
  DataTable,
  ColumnDef,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { InvoiceCustomizerDialog } from '../invoices/[id]/invoice-customizer-dialog';

export default function GlobalSettingsPage() {
  const { activeCompanyId, companies, refreshSettings } = useCompany();
  const [loading, setLoading] = useState(true);
  const [updatingMode, setUpdatingMode] = useState(false);
  const [settingsMap, setSettingsMap] = useState<Record<string, any>>({});
  const [resolvedList, setResolvedList] = useState<any[]>([]);
  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'all_keys'>('overview');
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [replayLoading, setReplayLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  const handleReplayJourneys = async () => {
    setReplayLoading(true);
    try {
      const res = await apiClient.replayJourneys();
      toast.success(res.message || 'Demo journeys replay runner launched.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to trigger replay journeys');
    } finally {
      setReplayLoading(false);
    }
  };

  const handleClearTenant = async () => {
    const confirmed = await confirmDialog({
      title: 'Purge Tenant Operational Data?',
      description: 'This will delete all transactions, invoices, bank records, compliance tasks, and master items for your current tenant. Your company and user accounts will remain intact.',
      confirmLabel: 'Purge Data',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) return;

    setClearLoading(true);
    try {
      const res = await apiClient.clearTenant();
      toast.success(res.message || 'Tenant operational records cleared successfully.');
      await loadGlobalSettings();
    } catch (err: any) {
      toast.error(err.message || 'Failed to clear tenant data');
    } finally {
      setClearLoading(false);
    }
  };

  const activeCompany = companies.find((c) => c.id === activeCompanyId) || companies[0];

  useEffect(() => {
    loadGlobalSettings();
  }, [activeCompanyId]);

  const loadGlobalSettings = async () => {
    setLoading(true);
    try {
      const [map, rawList, series] = await Promise.all([
        apiClient.getCompanySettings(activeCompanyId).catch(() => ({})),
        apiClient.listResolvedSettings(activeCompanyId).catch(() => []),
        apiClient.listNumberingSeries(activeCompanyId).catch(() => []),
      ]);
      setSettingsMap(map || {});
      setResolvedList(rawList || []);
      setSeriesList(series || []);
    } catch {
      // Fallback gracefully
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTally = async () => {
    setUpdatingMode(true);
    try {
      const nextVal = !Boolean(settingsMap['integration.tally_enabled']);
      await apiClient.setCompanySetting(activeCompanyId, 'integration.tally_enabled', nextVal);
      setSettingsMap((prev) => ({ ...prev, 'integration.tally_enabled': nextVal }));
      await refreshSettings();
      await loadGlobalSettings();
    } catch (err) {
      logger.error('Failed to toggle Tally integration', err);
    } finally {
      setUpdatingMode(false);
    }
  };

  const filteredResolved = resolvedList.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.key.toLowerCase().includes(q) ||
      (s.definition?.description && s.definition.description.toLowerCase().includes(q)) ||
      (s.definition?.category && s.definition.category.toLowerCase().includes(q)) ||
      String(s.value).toLowerCase().includes(q)
    );
  });

  const resolvedColumns: ColumnDef<any>[] = [
    {
      key: 'key',
      header: 'Setting Key',
      cell: (s) => (
        <div>
          <div className="font-mono text-primary font-semibold">{s.key}</div>
          {s.definition?.description && (
            <div className="font-sans font-normal text-[10px] text-muted line-clamp-1">
              {s.definition.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      cell: (s) => (
        <span className="px-2 py-0.5 rounded bg-surface-sunken text-secondary font-sans text-[10px]">
          {s.definition?.category || 'SYSTEM'}
        </span>
      ),
    },
    {
      key: 'value',
      header: 'Resolved Value',
      cell: (s) => (
        <span className="font-mono font-bold text-brand-text max-w-xs truncate block">
          {s.value === null || s.value === undefined
            ? '<null>'
            : typeof s.value === 'boolean'
            ? s.value ? 'true' : 'false'
            : typeof s.value === 'object'
            ? JSON.stringify(s.value)
            : String(s.value)}
        </span>
      ),
    },
    {
      key: 'scope',
      header: 'Scope',
      cell: (s) => <span className="font-sans text-secondary">{s.resolvedScope}</span>,
    },
    {
      key: 'state',
      header: 'State',
      cell: (s) => (
        <Badge variant={s.isOverridden ? 'success' : 'neutral'} size="xs">
          {s.isOverridden ? 'Overridden' : 'Default'}
        </Badge>
      ),
    },
  ];

  const logoUrl = settingsMap['branding.logo_url'];
  const showSignature = settingsMap['document.show_signature'] !== false;
  const signatureType = settingsMap['branding.signature_type'] || 'IMAGE';
  const signatureUrl = settingsMap['branding.signature_url'];
  const dscSignerName = settingsMap['branding.dsc_signer_name'] || 'Authorised Signatory';
  const dscDesignation = settingsMap['branding.dsc_designation'] || 'Authorised Signatory';
  const dscCertDetails = settingsMap['branding.dsc_cert_details'] || 'Class-3 Digital Signature Certificate';
  const showQrCode = settingsMap['document.show_qr_code'] !== false;
  const upiId = settingsMap['document.upi_id'] || 'acme@hdfcbank';
  const terms = settingsMap['document.terms_and_conditions'] || '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. charged on overdue bills.\n3. Subject to local jurisdiction.';

  const demoUpiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(activeCompany?.legalName || 'Company')}&am=50000.00&cu=INR&tn=Invoice%20Payment`;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-inverse font-bold shadow-md">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-primary flex items-center gap-2">
                <span>Global System Configuration & Governance</span>
                <Badge variant="info" size="xs">
                  Central Registry
                </Badge>
              </h1>
              <p className="text-xs text-secondary">
                Single pane of glass summarizing all system-wide parameters, invoice branding, numbering series, and statutory controls.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={loadGlobalSettings}
            leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />}
            className="whitespace-nowrap"
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCustomizerOpen(true)}
            leftIcon={<Sliders className="h-3.5 w-3.5" />}
            className="whitespace-nowrap bg-brand hover:bg-brand-hover text-inverse font-semibold shadow-xs"
          >
            Quick Edit Branding & QR
          </Button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-3.5 rounded-xl bg-surface border border-subtle shadow-card">
          <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">
            Active Operating Entity
          </div>
          <div className="font-bold text-sm text-primary truncate">
            {activeCompany?.legalName || 'Acme Global Pvt Ltd'}
          </div>
          <div className="text-[11px] font-mono text-secondary mt-0.5 flex items-center gap-1">
            <span>PAN:</span>
            <MonoCopyable value={activeCompany?.pan || 'AABCA1234F'} label="Company PAN" className="text-[11px] p-0" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-surface border border-subtle shadow-card">
          <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">
            Statutory Invoicing
          </div>
          <div className="font-bold text-sm text-status-success-text flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            Rule 46 Compliant
          </div>
          <div className="text-[11px] text-secondary mt-0.5">
            Original for Recipient Layout
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-surface border border-subtle shadow-card">
          <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">
            Ledger & Accounting
          </div>
          <div className="font-bold text-sm text-primary">
            Accrual (Strict 0-Var)
          </div>
          <div className="text-[11px] text-secondary mt-0.5">
            Base: INR (₹) • 2 Decimals
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-surface border border-subtle shadow-card">
          <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">
            System Modules
          </div>
          <div className="font-bold text-sm text-brand-text flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" />
            6/6 Modules Active
          </div>
          <div className="text-[11px] text-secondary mt-0.5">
            Branding, COA, BRS, Tally Bridge
          </div>
        </div>
      </div>

      {/* Dev-Tool Panel (Gated by NEXT_PUBLIC_DEV_TOOLS) */}
      {(process.env.NEXT_PUBLIC_DEV_TOOLS === 'true' || process.env.NODE_ENV !== 'production') && (
        <Card className="border-status-warning/40 bg-surface shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-status-warning" />
                <CardTitle className="text-sm font-bold text-primary">
                  Developer Operations & Journey Runner
                </CardTitle>
                <Badge variant="warning" size="xs">
                  DEV TOOLS
                </Badge>
              </div>
            </div>
            <CardDescription className="text-xs text-secondary">
              Control sandbox tenant state, replay automated UI journeys, or purge operational records for fresh runs.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              data-testid="dev-replay-journeys-btn"
              disabled={replayLoading}
              onClick={handleReplayJourneys}
              className="text-xs"
            >
              {replayLoading ? 'Replaying...' : 'Replay demo journeys'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              data-testid="dev-clear-tenant-btn"
              disabled={clearLoading}
              onClick={handleClearTenant}
              className="text-xs"
            >
              {clearLoading ? 'Clearing...' : 'Clear my tenant'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* View Toggle */}
      <div className="flex items-center gap-2 border-b border-default pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
            activeTab === 'overview'
              ? 'bg-brand-subtle text-brand-text'
              : 'text-secondary hover:text-primary'
          }`}
        >
          Visual Module Cards
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('all_keys')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
            activeTab === 'all_keys'
              ? 'bg-brand-subtle text-brand-text'
              : 'text-secondary hover:text-primary'
          }`}
        >
          All System Keys & Audit ({resolvedList.length})
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Invoice Branding, Signature & QR */}
          <Card className="flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-status-info-subtle text-status-info-text">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">Invoice Branding, Signature & QR</CardTitle>
                    <CardDescription className="text-xs">
                      Visual identity, e-Sign DSC credentials, and UPI payment codes.
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={logoUrl || signatureUrl ? 'success' : 'neutral'} size="xs">
                  {logoUrl ? 'Branded' : 'Standard'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-sunken border border-subtle">
                <span className="text-secondary">Company Logo:</span>
                {logoUrl ? (
                  <div className="flex items-center gap-2">
                    <img src={logoUrl} alt="Logo" className="h-6 w-auto max-w-[80px] object-contain" />
                    <span className="text-status-success-text font-semibold text-[11px]">Configured</span>
                  </div>
                ) : (
                  <span className="text-muted font-medium">Default Monogram</span>
                )}
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-sunken border border-subtle">
                <span className="text-secondary">Signature Block:</span>
                <span className="font-semibold text-primary">
                  {showSignature
                    ? signatureType === 'DSC'
                      ? `DSC: ${dscSignerName}`
                      : signatureUrl
                      ? 'Handwritten Image Active'
                      : 'Physical Sign Line'
                    : 'Disabled'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-sunken border border-subtle">
                <span className="text-secondary">Dynamic Payment QR:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-brand-text font-bold">
                    {upiId}
                  </span>
                  <Badge variant={showQrCode ? 'success' : 'neutral'} size="xs">
                    {showQrCode ? 'Active' : 'Off'}
                  </Badge>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-surface-sunken border border-subtle">
                <span className="text-secondary block mb-1">Terms & Conditions:</span>
                <p className="text-[11px] text-primary line-clamp-2 italic">
                  "{terms}"
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-subtle">
                <Link
                  href="/settings/invoice-branding"
                  className="text-xs font-semibold text-brand-text hover:underline flex items-center gap-1"
                >
                  Manage Dedicated Page <ArrowRight className="h-3 w-3" />
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomizerOpen(true)}
                  className="h-7 text-xs"
                >
                  Quick Edit
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Document Numbering Series */}
          <Card className="flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-brand-subtle text-brand-text">
                    <Hash className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">Document Numbering Series</CardTitle>
                    <CardDescription className="text-xs">
                      Sequential GST Rule 46 series across all transaction vouchers.
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="success" size="xs">
                  Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs">
              <div className="space-y-2">
                {seriesList.length > 0 ? (
                  seriesList.slice(0, 3).map((s: any) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-surface-sunken border border-subtle"
                    >
                      <div>
                        <div className="font-semibold text-primary">
                          {s.docType.replace('_', ' ')}
                        </div>
                        <div className="text-[10px] text-muted font-mono">
                          Format: {s.prefix}&#123;seq&#125;{s.suffix || ''}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-brand-text text-xs">
                        Next: {s.nextSequence}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-muted text-xs">
                    Standard `INV-0000X-26-27` Active
                  </div>
                )}
              </div>

              <div className="p-2.5 rounded-xl bg-surface-sunken border border-subtle text-[11px] text-secondary">
                Strict sequential numbering enforced. Gaps and resets are blocked for GST compliance.
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-subtle">
                <Link
                  href="/settings/numbering"
                  className="text-xs font-semibold text-brand-text hover:underline flex items-center gap-1"
                >
                  Manage All Series <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Financial & Currency Controls */}
          <Card className="flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-status-success-subtle text-status-success-text">
                    <CalendarClock className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">Financial & Period Lock Controls</CardTitle>
                    <CardDescription className="text-xs">
                      Accounting basis, period closing locks, and rounding rules.
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="info" size="xs">
                  Accrual
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-sunken border border-subtle">
                <span className="text-secondary">Accounting Basis:</span>
                <span className="font-bold text-primary">
                  Accrual Basis (Statutory Standard)
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-sunken border border-subtle">
                <span className="text-secondary">Operating Currency:</span>
                <span className="font-mono font-bold text-primary">
                  {settingsMap['financial.base_currency'] || 'INR'} (₹ Indian Rupee)
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-sunken border border-subtle">
                <span className="text-secondary">Period Lock Cutoff Date:</span>
                <span className="font-mono font-semibold text-primary">
                  {settingsMap['financial.fy_lock_date'] || 'No Cutoff (All Periods Open)'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-sunken border border-subtle">
                <span className="text-secondary">Double-Entry Enforcement:</span>
                <span className="font-semibold text-status-success-text flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Strict Zero-Variance
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-subtle">
                <Link
                  href="/settings/periods"
                  className="text-xs font-semibold text-brand-text hover:underline flex items-center gap-1"
                >
                  Manage Period Locks <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Statutory GST & Tax Rules */}
          <Card className="flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-status-warning-subtle text-status-warning-text">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">GST & Statutory Compliance</CardTitle>
                    <CardDescription className="text-xs">
                      Thresholds for E-Invoice, E-Way Bill, and Place of Supply.
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="success" size="xs">
                  GSTIN Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-sunken border border-subtle">
                <span className="text-secondary">E-Invoice Turnover Threshold:</span>
                <span className="font-mono font-bold text-primary">
                  ₹5,00,00,000 (5 Cr Rule 48(4))
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-sunken border border-subtle">
                <span className="text-secondary">E-Way Bill Mandatory Limit:</span>
                <span className="font-mono font-bold text-primary">
                  ₹50,000 (Rule 138)
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-sunken border border-subtle">
                <span className="text-secondary">Default Place of Supply:</span>
                <span className="font-mono font-bold text-primary">
                  State Code {settingsMap['tax.default_place_of_supply'] || '27'} (Maharashtra)
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-sunken border border-subtle">
                <span className="text-secondary">Reverse Charge (RCM):</span>
                <span className="font-semibold text-primary">
                  {settingsMap['tax.rcm_applicable'] ? 'Enabled' : 'Disabled (Standard)'}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-subtle">
                <span className="text-[11px] text-muted">
                  Enforced on all invoice creation pipelines
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card 5: Master Chart of Accounts (COA) */}
          <Card className="flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-status-danger-subtle text-status-danger-text">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">Chart of Accounts (COA)</CardTitle>
                    <CardDescription className="text-xs">
                      Pre-seeded statutory accounting groups and ledger structure.
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="info" size="xs">
                  Seeded
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-sunken border border-subtle">
                <span className="text-secondary">Architecture Template:</span>
                <span className="font-semibold text-primary">
                  Standard Indian Statutory COA
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-sunken border border-subtle">
                <span className="text-secondary">Template Version:</span>
                <span className="font-mono font-bold text-primary">
                  {(activeCompany as any)?.coaSeedVersion || 'v1.0.0'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-sunken border border-subtle">
                <span className="text-secondary">Core Ledger Classifications:</span>
                <span className="font-semibold text-primary">
                  Assets, Liabilities, Equity, Revenue, Expense
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-subtle">
                <Link
                  href="/settings/ledgers"
                  className="text-xs font-semibold text-brand-text hover:underline flex items-center gap-1"
                >
                  View Ledgers Directory <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Card 6: ERP & Tally Prime Bridge */}
          <Card className="flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-2 rounded-xl ${
                      Boolean(settingsMap['integration.tally_enabled'])
                        ? 'bg-status-warning-subtle text-status-warning-text'
                        : 'bg-surface-sunken text-secondary'
                    }`}
                  >
                    <Server className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">Accounting & Tally Prime Mode</CardTitle>
                    <CardDescription className="text-xs">
                      Configure whether this business synchronizes with Tally Prime or operates standalone.
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  variant={Boolean(settingsMap['integration.tally_enabled']) ? 'warning' : 'neutral'}
                  size="xs"
                >
                  {Boolean(settingsMap['integration.tally_enabled']) ? 'Tally Hybrid Active' : 'Standalone Cloud'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-sunken">
                <div>
                  <div className="font-bold text-primary">Tally Prime Synchronization</div>
                  <div className="text-[11px] text-secondary">
                    {Boolean(settingsMap['integration.tally_enabled'])
                      ? 'Tally bridge, XML push/pull & ledger alias inputs are active.'
                      : 'Tally UI, connectors & technical aliases are hidden from view.'}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={Boolean(settingsMap['integration.tally_enabled']) ? 'primary' : 'outline'}
                  loading={updatingMode}
                  onClick={handleToggleTally}
                >
                  {Boolean(settingsMap['integration.tally_enabled']) ? 'Enabled' : 'Enable Tally'}
                </Button>
              </div>

              {Boolean(settingsMap['integration.tally_enabled']) ? (
                <>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-sunken border border-subtle">
                    <span className="text-secondary">Gateway URL:</span>
                    <span className="font-mono text-primary">
                      http://localhost:9000
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-sunken border border-subtle">
                    <span className="text-secondary">Sync Pipeline:</span>
                    <span className="font-semibold text-primary">
                      Zero-Variance Canonical Sales Voucher Mapping
                    </span>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-subtle">
                    <Link
                      href="/settings/tally"
                      className="text-xs font-semibold text-brand-text hover:underline flex items-center gap-1"
                    >
                      Open Tally Console <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </>
              ) : (
                <div className="p-3 rounded-xl bg-status-info-subtle text-status-info-text text-[11px] leading-relaxed">
                  ✨ Operating in <strong>Standalone Cloud Mode</strong>. All invoices, GST reports, and double-entry accounts run smoothly without any Tally dependencies or desktop agents.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 2: Raw Registered System Settings Inspector */}
      {activeTab === 'all_keys' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold">All Registered System Setting Keys</CardTitle>
                <CardDescription className="text-xs">
                  Full registry schema, scope resolution hierarchy, and current effective values.
                </CardDescription>
              </div>
              <div className="w-full sm:w-72">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search keys, categories, values..."
                  className="text-xs"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={resolvedColumns}
              data={filteredResolved}
              density="compact"
              emptyTitle="No settings found"
              emptyDescription={searchQuery ? `No system settings matching "${searchQuery}"` : 'No settings registered.'}
              pageSize={25}
            />
          </CardContent>
        </Card>
      )}

      {/* In-Page Handy Dialog for Seamless Real-Time Updates */}
      <InvoiceCustomizerDialog
        open={customizerOpen}
        onOpenChange={setCustomizerOpen}
        companyId={activeCompanyId}
        initialSettings={settingsMap}
        onSaved={loadGlobalSettings}
      />
    </div>
  );
}
