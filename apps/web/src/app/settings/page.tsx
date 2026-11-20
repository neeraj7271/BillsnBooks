'use client';

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
      console.error('Failed to toggle Tally integration', err);
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/20">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Global System Configuration & Governance</span>
                <Badge variant="info" size="xs">
                  Central Registry
                </Badge>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
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
            className="whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
          >
            Quick Edit Branding & QR
          </Button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Active Operating Entity
          </div>
          <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
            {activeCompany?.legalName || 'Acme Global Pvt Ltd'}
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
            PAN: {activeCompany?.pan || 'AABCA1234F'}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Statutory Invoicing
          </div>
          <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            Rule 46 Compliant
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Original for Recipient Layout
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Ledger & Accounting
          </div>
          <div className="font-bold text-sm text-slate-900 dark:text-white">
            Accrual (Strict 0-Var)
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Base: INR (₹) • 2 Decimals
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            System Modules
          </div>
          <div className="font-bold text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" />
            6/6 Modules Active
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Branding, COA, BRS, Tally Bridge
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
            activeTab === 'overview'
              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Visual Module Cards
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('all_keys')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
            activeTab === 'all_keys'
              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
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
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400">
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
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Company Logo:</span>
                {logoUrl ? (
                  <div className="flex items-center gap-2">
                    <img src={logoUrl} alt="Logo" className="h-6 w-auto max-w-[80px] object-contain" />
                    <span className="text-emerald-600 font-semibold text-[11px]">Configured</span>
                  </div>
                ) : (
                  <span className="text-slate-400 font-medium">Default Monogram</span>
                )}
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Signature Block:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {showSignature
                    ? signatureType === 'DSC'
                      ? `DSC: ${dscSignerName}`
                      : signatureUrl
                      ? 'Handwritten Image Active'
                      : 'Physical Sign Line'
                    : 'Disabled'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Dynamic Payment QR:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 font-bold">
                    {upiId}
                  </span>
                  <Badge variant={showQrCode ? 'success' : 'neutral'} size="xs">
                    {showQrCode ? 'Active' : 'Off'}
                  </Badge>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 block mb-1">Terms & Conditions:</span>
                <p className="text-[11px] text-slate-700 dark:text-slate-300 line-clamp-2 italic">
                  "{terms}"
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <Link
                  href="/settings/invoice-branding"
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
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
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400">
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
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {s.docType.replace('_', ' ')}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Format: {s.prefix}&#123;seq&#125;{s.suffix || ''}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                        Next: {s.nextSequence}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-slate-400 text-xs">
                    Standard `INV-0000X-26-27` Active
                  </div>
                )}
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                Strict sequential numbering enforced. Gaps and resets are blocked for GST compliance.
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <Link
                  href="/settings/numbering"
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
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
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400">
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
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Accounting Basis:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Accrual Basis (Statutory Standard)
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Operating Currency:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {settingsMap['financial.base_currency'] || 'INR'} (₹ Indian Rupee)
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Period Lock Cutoff Date:</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {settingsMap['financial.fy_lock_date'] || 'No Cutoff (All Periods Open)'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Double-Entry Enforcement:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Strict Zero-Variance
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <Link
                  href="/settings/periods"
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
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
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-600 dark:text-amber-400">
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
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">E-Invoice Turnover Threshold:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  ₹5,00,00,000 (5 Cr Rule 48(4))
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">E-Way Bill Mandatory Limit:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  ₹50,000 (Rule 138)
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Default Place of Supply:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  State Code {settingsMap['tax.default_place_of_supply'] || '27'} (Maharashtra)
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Reverse Charge (RCM):</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {settingsMap['tax.rcm_applicable'] ? 'Enabled' : 'Disabled (Standard)'}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-400">
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
                  <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400">
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
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Architecture Template:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Standard Indian Statutory COA
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Template Version:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {(activeCompany as any)?.coaSeedVersion || 'v1.0.0'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Core Ledger Classifications:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Assets, Liabilities, Equity, Revenue, Expense
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <Link
                  href="/settings/ledgers"
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
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
                    className={`p-2 rounded-xl border ${
                      Boolean(settingsMap['integration.tally_enabled'])
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900 text-amber-600 dark:text-amber-400'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
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
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Tally Prime Synchronization</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
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
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Gateway URL:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      http://localhost:9000
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Sync Pipeline:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Zero-Variance Canonical Sales Voucher Mapping
                    </span>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                    <Link
                      href="/settings/tally"
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      Open Tally Console <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </>
              ) : (
                <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 text-[11px] leading-relaxed">
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
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Setting Key</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Resolved Value</th>
                    <th className="py-2.5 px-3">Scope</th>
                    <th className="py-2.5 px-3">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                  {filteredResolved.length > 0 ? (
                    filteredResolved.map((s) => (
                      <tr key={s.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                        <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                          <div>{s.key}</div>
                          {s.definition?.description && (
                            <div className="font-sans font-normal text-[10px] text-slate-400 line-clamp-1">
                              {s.definition.description}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-sans text-[10px]">
                            {s.definition?.category || 'SYSTEM'}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-bold text-blue-600 dark:text-blue-400 max-w-xs truncate">
                          {s.value === null || s.value === undefined
                            ? '<null>'
                            : typeof s.value === 'boolean'
                            ? s.value ? 'true' : 'false'
                            : typeof s.value === 'object'
                            ? JSON.stringify(s.value)
                            : String(s.value)}
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-500">
                          {s.resolvedScope}
                        </td>
                        <td className="py-2 px-3">
                          <Badge variant={s.isOverridden ? 'success' : 'neutral'} size="xs">
                            {s.isOverridden ? 'Overridden' : 'Default'}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 font-sans">
                        No settings matching "{searchQuery}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
