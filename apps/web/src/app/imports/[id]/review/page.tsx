'use client';
import { logger } from '@/lib/logger';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Input,
  MoneyText,
  LoadingState,
  Tooltip,
} from '@platform/ui';
import {
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Users,
  Edit3,
  Save,
  X,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { BackButton } from '@/components/back-button';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { MissingMastersModal } from '@/app/imports/new/missing-masters-modal';

export default function BatchReviewCockpitPage() {
  const params = useParams();
  const batchId = params.id as string;
  const { activeCompanyId } = useCompany();

  const [batch, setBatch] = useState<any | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'GREEN' | 'YELLOW' | 'RED' | 'BLUE'>('ALL');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [scanData, setScanData] = useState<any | null>(null);
  const [missingMastersOpen, setMissingMastersOpen] = useState(false);
  const [postResult, setPostResult] = useState<{ postedCount: number; failedCount?: number } | null>(null);

  // Inline row editor state
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Record<string, string>>({});
  const [savingRow, setSavingRow] = useState(false);

  const fetchAllRows = async () => {
    const first = await apiClient.getImportRows(activeCompanyId, batchId, undefined, 1, 200);
    const collected = [...(first?.rows || [])];
    const total = first?.total ?? collected.length;
    let nextPage = 2;
    while (collected.length < total && nextPage <= 25) {
      const res = await apiClient.getImportRows(activeCompanyId, batchId, undefined, nextPage, 200);
      if (!res?.rows?.length) break;
      collected.push(...res.rows);
      nextPage += 1;
    }
    return collected;
  };

  const loadBatchDetails = async () => {
    setLoading(true);
    try {
      const [batchRes, allRows] = await Promise.all([
        apiClient.getImportBatch(activeCompanyId, batchId),
        fetchAllRows(),
      ]);
      setBatch(batchRes);
      setRows(allRows);

      try {
        const scan = await apiClient.scanImportMasters(activeCompanyId, batchId);
        setScanData(scan);
      } catch {
        // Ignore master scan error on non-GST batches
      }
    } catch (err: unknown) {
      logger.error(err);
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to load batch details',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatchDetails();
  }, [batchId, activeCompanyId]);

  // Derive all summary counts directly from loaded rows so cards, tabs, and post button always reconcile
  const counts = useMemo(() => {
    const total = rows.length;
    const green = rows.filter((r) => r.validationState === 'GREEN').length;
    const yellow = rows.filter((r) => r.validationState === 'YELLOW').length;
    const red = rows.filter((r) => r.validationState === 'RED').length;
    const blue = rows.filter((r) => r.validationState === 'BLUE').length;
    return { total, green, yellow, red, blue };
  }, [rows]);

  const missingMastersCount =
    (scanData?.missingParties?.length || 0) + (scanData?.missingItems?.length || 0);

  const isPosted = batch?.status === 'POSTED' || batch?.status === 'COMPLETED';

  const handleAutoFixGst = async () => {
    setProcessing(true);
    setMessage(null);
    try {
      const res = await apiClient.autoFixImportGst(activeCompanyId, batchId);
      const allRows = await fetchAllRows();
      const updatedBatch = await apiClient.getImportBatch(activeCompanyId, batchId);
      setRows(allRows);
      setBatch(updatedBatch);
      const remainingRed = allRows.filter((r) => r.validationState === 'RED').length;
      setMessage({
        type: 'success',
        text: `Fixed ${res.fixedCount} row(s) (converted CGST+SGST ↔ IGST by Place of Supply). ${remainingRed} blocked row(s) still need attention.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'GST auto-fix failed';
      setMessage({ type: 'error', text: `GST auto-fix failed: ${msg}` });
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkMap = async (ledgerId: string) => {
    setProcessing(true);
    setMessage(null);
    try {
      await apiClient.bulkFixRows(activeCompanyId, batchId, {
        targetField: 'matchedLedgerId',
        fixValue: ledgerId,
      });
      await loadBatchDetails();
      setMessage({ type: 'success', text: 'Quick mapping applied to ambiguous rows.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bulk fix failed';
      setMessage({ type: 'error', text: `Bulk fix failed: ${msg}` });
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveAndPost = async () => {
    setProcessing(true);
    setMessage(null);
    try {
      if (counts.red > 0) {
        // Only GREEN rows are posted; if backend blocks approve while RED rows exist, surface clear message
      }
      await apiClient.approveBatch(activeCompanyId, batchId);
      const res = await apiClient.postBatchToLedger(activeCompanyId, batchId);
      setPostResult({ postedCount: res.postedCount, failedCount: res.failedCount });
      await loadBatchDetails();
      setMessage({
        type: 'success',
        text: `Posted ${res.postedCount} voucher(s) to the General Ledger!${
          res.failedCount ? ` (${res.failedCount} failed)` : ''
        }`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Posting error';
      setMessage({ type: 'error', text: `Posting error: ${msg}` });
    } finally {
      setProcessing(false);
    }
  };

  const startEditRow = (row: any) => {
    setEditingRowId(row.id);
    setEditDraft({
      voucherNumber: row.parsedData?.voucherNumber || '',
      date: row.parsedData?.date || '',
      partyName: row.parsedData?.partyName || '',
      partyGstin: row.parsedData?.partyGstin || '',
      placeOfSupply: row.parsedData?.placeOfSupply || '',
      taxableAmount: String(row.parsedData?.taxableAmount ?? 0),
      cgstAmount: String(row.parsedData?.cgstAmount ?? 0),
      sgstAmount: String(row.parsedData?.sgstAmount ?? 0),
      igstAmount: String(row.parsedData?.igstAmount ?? 0),
      totalAmount: String(row.parsedData?.totalAmount ?? 0),
    });
  };

  const saveEditRow = async (rowId: string) => {
    setSavingRow(true);
    setMessage(null);
    try {
      await apiClient.updateImportRow(activeCompanyId, batchId, rowId, editDraft);
      setEditingRowId(null);
      await loadBatchDetails();
      setMessage({ type: 'success', text: 'Row updated and re-validated.' });
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update row',
      });
    } finally {
      setSavingRow(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-12 pt-4">
        <LoadingState rows={8} />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="p-8 text-center text-xs text-status-danger-text font-semibold">
        Batch #{batchId} not found.
      </div>
    );
  }

  const visibleTabs: Array<'ALL' | 'GREEN' | 'YELLOW' | 'RED' | 'BLUE'> = [
    'ALL',
    'GREEN',
    'YELLOW',
    'RED',
    ...(counts.blue > 0 ? (['BLUE'] as const) : []),
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <BackButton variant="link" fallbackUrl="/imports" label="Back to imports" />
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-black text-primary">
              Batch Resolution: {batch.fileName}
            </h1>
            <Badge variant={isPosted ? 'success' : 'brand'} size="sm">
              {isPosted ? 'POSTED' : batch.status}
            </Badge>
          </div>
          <p className="text-xs text-muted mt-1">
            Review validation exceptions, resolve missing masters, and post clean vouchers to the General Ledger.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {missingMastersCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMissingMastersOpen(true)}
              leftIcon={<Users className="h-3.5 w-3.5 text-brand-text" />}
            >
              Resolve Missing Masters ({missingMastersCount})
            </Button>
          )}

          {counts.red > 0 && !isPosted && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoFixGst}
              loading={processing}
              leftIcon={<Sparkles className="h-3.5 w-3.5 text-status-info-text" />}
            >
              Auto-Fix Tax Splits
            </Button>
          )}

          <Tooltip
            content={
              counts.red > 0
                ? 'Resolve or auto-fix blocked RED rows before approving and posting.'
                : counts.green === 0
                ? 'No GREEN rows ready to post.'
                : 'Posts only GREEN rows; any unfixed rows remain in the batch for later review.'
            }
          >
            <span className="inline-block">
              <Button
                variant="primary"
                size="sm"
                onClick={handleApproveAndPost}
                loading={processing}
                disabled={isPosted || counts.green === 0 || counts.red > 0}
                leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
              >
                {isPosted ? 'Posted to Books' : `Approve & Post (${counts.green} Vouchers)`}
              </Button>
            </span>
          </Tooltip>
        </div>
      </div>

      {/* Post Success Card */}
      {(isPosted || postResult) && (
        <Card className="border-status-success/40 bg-status-success-subtle/30">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-status-success shrink-0" />
              <div>
                <div className="text-sm font-bold text-primary">
                  Batch Posted to General Ledger ({postResult?.postedCount ?? counts.green} Voucher(s))
                </div>
                <p className="text-xs text-secondary">
                  Double-entry vouchers and GST ledger entries have been committed.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/vouchers">
                <Button variant="primary" size="sm" rightIcon={<ExternalLink className="h-3.5 w-3.5" />}>
                  View Vouchers
                </Button>
              </Link>
              <Link href="/invoices">
                <Button variant="outline" size="sm">View Invoices</Button>
              </Link>
              <Link href="/imports">
                <Button variant="outline" size="sm">Back to Imports</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {message && (
        <div
          role="alert"
          className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-status-success-subtle border-status-success text-status-success-text'
              : 'bg-status-danger-subtle border-status-danger text-status-danger-text'
          }`}
        >
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} className="underline ml-3">Dismiss</button>
        </div>
      )}

      {/* Guided Resolution Banners */}
      {!isPosted && counts.red > 0 && (
        <div className="rounded-xl border border-subtle bg-status-danger-subtle/40 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs">
            <AlertTriangle className="h-4 w-4 text-status-danger-text shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-primary">
                {counts.red} row(s) are blocked by statutory or math errors.
              </span>{' '}
              <span className="text-secondary">
                Click <strong>Auto-Fix Tax Splits</strong> to correct inter/intra-state CGST+SGST ↔ IGST automatically, or click <strong>Edit</strong> on any row below to fix fields inline.
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoFixGst}
            loading={processing}
            leftIcon={<Sparkles className="h-3.5 w-3.5 text-status-info-text" />}
          >
            Auto-Fix Tax Splits
          </Button>
        </div>
      )}

      {!isPosted && missingMastersCount > 0 && (
        <div className="rounded-xl border border-subtle bg-status-warning-subtle/40 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs">
            <Users className="h-4 w-4 text-status-warning-text shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-primary">
                {missingMastersCount} party/item master(s) aren&apos;t in your ledger yet.
              </span>{' '}
              <span className="text-secondary">
                Map or auto-create them in one click to turn YELLOW rows GREEN.
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMissingMastersOpen(true)}
            leftIcon={<Users className="h-3.5 w-3.5 text-brand-text" />}
          >
            Resolve Missing Masters ({missingMastersCount})
          </Button>
        </div>
      )}

      {/* KPI Cards (derived from loaded rows so they always reconcile with tabs) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-muted">Total Staged</span>
            <div className="text-xl font-black mt-1 text-primary">{counts.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-status-success-text">Clean / Ready (GREEN)</span>
            <div className="text-xl font-black text-status-success-text mt-1">{counts.green}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-status-warning-text">Needs Mapping (YELLOW)</span>
            <div className="text-xl font-black text-status-warning-text mt-1">{counts.yellow + counts.blue}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-status-danger-text">Blocked / Errors (RED)</span>
            <div className="text-xl font-black text-status-danger-text mt-1">{counts.red}</div>
          </CardContent>
        </Card>
      </div>

      {/* State Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-subtle bg-surface px-4 py-2.5 text-[11px] text-secondary shadow-card">
        <div className="flex flex-wrap items-center gap-4">
          <Tooltip content="All GST, arithmetic, and ledger checks passed. Ready to post.">
            <span className="inline-flex items-center gap-1.5 cursor-help">
              <span className="h-2 w-2 rounded-full bg-status-success" />
              <strong>GREEN</strong> = Ready to post
              <HelpCircle className="h-3 w-3 text-muted" />
            </span>
          </Tooltip>
          <Tooltip content="Party or ledger not matched yet. Resolve missing masters or map ledger.">
            <span className="inline-flex items-center gap-1.5 cursor-help">
              <span className="h-2 w-2 rounded-full bg-status-warning" />
              <strong>YELLOW</strong> = Needs mapping
              <HelpCircle className="h-3 w-3 text-muted" />
            </span>
          </Tooltip>
          <Tooltip content="Statutory GSTIN, Place of Supply, tax split, or math error.">
            <span className="inline-flex items-center gap-1.5 cursor-help">
              <span className="h-2 w-2 rounded-full bg-status-danger" />
              <strong>RED</strong> = Statutory/math error
              <HelpCircle className="h-3 w-3 text-muted" />
            </span>
          </Tooltip>
          <Tooltip content="High-value transaction (> ₹5,00,000) requiring partner maker-checker approval.">
            <span className="inline-flex items-center gap-1.5 cursor-help">
              <span className="h-2 w-2 rounded-full bg-status-info" />
              <strong>BLUE</strong> = Maker-checker (&gt; ₹5,00,000)
              <HelpCircle className="h-3 w-3 text-muted" />
            </span>
          </Tooltip>
        </div>
        <span className="text-muted">
          Approve &amp; Post commits only GREEN rows; unfixed rows remain staged.
        </span>
      </div>

      {/* Main Ledger Staging Table */}
      <Card>
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-subtle">
          <CardTitle className="text-sm">Line Exception Resolver</CardTitle>
          <div className="flex items-center gap-1 bg-surface-sunken p-1 rounded-xl text-xs">
            {visibleTabs.map((tab) => {
              const count =
                tab === 'ALL'
                  ? counts.total
                  : tab === 'GREEN'
                  ? counts.green
                  : tab === 'YELLOW'
                  ? counts.yellow
                  : tab === 'RED'
                  ? counts.red
                  : counts.blue;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    activeTab === tab
                      ? 'bg-surface text-primary shadow-xs'
                      : 'text-muted hover:text-primary'
                  }`}
                >
                  {tab} ({count})
                </button>
              );
            })}
          </div>
        </CardHeader>

        {counts.yellow > 0 && !isPosted && (
          <div className="border-b border-subtle bg-surface-sunken px-4 py-2.5 flex items-center justify-between text-xs">
            <span className="font-semibold text-secondary">Quick-Map Ambiguous Party Ledgers:</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="xs"
                onClick={() => handleBulkMap('10000000-0000-4000-8000-000000000005')}
              >
                Map to Default Customer
              </Button>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setMissingMastersOpen(true)}
              >
                Open Master Resolver
              </Button>
            </div>
          </div>
        )}

        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[560px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-sunken border-b border-default font-semibold text-muted sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Invoice &amp; Date</th>
                  <th className="py-2.5 px-3">Party &amp; GSTIN</th>
                  <th className="py-2.5 px-3 text-right">Taxable</th>
                  <th className="py-2.5 px-3 text-right">Total Amount</th>
                  <th className="py-2.5 px-3">Audit / Error Reasons</th>
                  <th className="py-2.5 px-3 text-center">State</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {rows
                  .filter((r) => activeTab === 'ALL' || r.validationState === activeTab)
                  .map((row) => {
                    const isEditing = editingRowId === row.id;
                    const reasons: string[] = Array.isArray(row.errorReasons) ? row.errorReasons : [];
                    return (
                      <React.Fragment key={row.id}>
                        <tr className="hover:bg-row-hover">
                          <td className="py-2.5 px-3 font-mono text-muted">{row.rowIndex}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-primary">
                              {row.parsedData?.voucherNumber || 'Missing Inv No'}
                            </span>
                            <span className="block text-[11px] text-muted">{row.parsedData?.date || 'N/A'}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-primary">
                              {row.parsedData?.partyName || 'Unknown Party'}
                            </span>
                            <span className="block font-mono text-[10px] text-muted">
                              {row.parsedData?.partyGstin || 'No GSTIN'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <MoneyText amount={row.parsedData?.taxableAmount || 0} />
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold">
                            <MoneyText amount={row.parsedData?.totalAmount || 0} />
                          </td>
                          <td className="py-2.5 px-3 max-w-xs">
                            {reasons.length > 0 ? (
                              <div className="space-y-0.5 text-[11px]">
                                {reasons.map((err, i) => (
                                  <span
                                    key={i}
                                    className={`block font-medium ${
                                      row.validationState === 'RED'
                                        ? 'text-status-danger-text'
                                        : 'text-status-warning-text'
                                    }`}
                                  >
                                    • {err}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-status-success-text">Passed audit</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge
                              variant={
                                row.validationState === 'GREEN'
                                  ? 'success'
                                  : row.validationState === 'YELLOW'
                                  ? 'warning'
                                  : row.validationState === 'BLUE'
                                  ? 'info'
                                  : 'danger'
                              }
                              size="xs"
                              dot
                            >
                              {row.validationState}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {!isPosted && row.validationState !== 'GREEN' && (
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => (isEditing ? setEditingRowId(null) : startEditRow(row))}
                                leftIcon={<Edit3 className="h-3 w-3" />}
                              >
                                {isEditing ? 'Cancel' : 'Edit'}
                              </Button>
                            )}
                          </td>
                        </tr>
                        {isEditing && (
                          <tr className="bg-surface-sunken">
                            <td colSpan={8} className="p-3">
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                                <div>
                                  <label className="text-[10px] text-muted block mb-1">Invoice / Ref No</label>
                                  <Input
                                    size="sm"
                                    value={editDraft.voucherNumber}
                                    onChange={(e) => setEditDraft({ ...editDraft, voucherNumber: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-muted block mb-1">Date (YYYY-MM-DD)</label>
                                  <Input
                                    size="sm"
                                    value={editDraft.date}
                                    onChange={(e) => setEditDraft({ ...editDraft, date: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-muted block mb-1">Party Name</label>
                                  <Input
                                    size="sm"
                                    value={editDraft.partyName}
                                    onChange={(e) => setEditDraft({ ...editDraft, partyName: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-muted block mb-1">GSTIN</label>
                                  <Input
                                    size="sm"
                                    value={editDraft.partyGstin}
                                    onChange={(e) => setEditDraft({ ...editDraft, partyGstin: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-muted block mb-1">POS State (e.g. 07)</label>
                                  <Input
                                    size="sm"
                                    value={editDraft.placeOfSupply}
                                    onChange={(e) => setEditDraft({ ...editDraft, placeOfSupply: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-muted block mb-1">Taxable (₹)</label>
                                  <Input
                                    size="sm"
                                    type="number"
                                    value={editDraft.taxableAmount}
                                    onChange={(e) => setEditDraft({ ...editDraft, taxableAmount: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-muted block mb-1">CGST (₹)</label>
                                  <Input
                                    size="sm"
                                    type="number"
                                    value={editDraft.cgstAmount}
                                    onChange={(e) => setEditDraft({ ...editDraft, cgstAmount: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-muted block mb-1">SGST (₹)</label>
                                  <Input
                                    size="sm"
                                    type="number"
                                    value={editDraft.sgstAmount}
                                    onChange={(e) => setEditDraft({ ...editDraft, sgstAmount: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-muted block mb-1">IGST (₹)</label>
                                  <Input
                                    size="sm"
                                    type="number"
                                    value={editDraft.igstAmount}
                                    onChange={(e) => setEditDraft({ ...editDraft, igstAmount: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-muted block mb-1">Total (₹)</label>
                                  <Input
                                    size="sm"
                                    type="number"
                                    value={editDraft.totalAmount}
                                    onChange={(e) => setEditDraft({ ...editDraft, totalAmount: e.target.value })}
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 mt-3">
                                <Button
                                  size="xs"
                                  variant="outline"
                                  onClick={() => setEditingRowId(null)}
                                  leftIcon={<X className="h-3 w-3" />}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="xs"
                                  variant="primary"
                                  loading={savingRow}
                                  onClick={() => saveEditRow(row.id)}
                                  leftIcon={<Save className="h-3 w-3" />}
                                >
                                  Save &amp; Re-validate
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <MissingMastersModal
        open={missingMastersOpen}
        companyId={activeCompanyId}
        batchId={batchId}
        scanData={scanData}
        onOpenChange={setMissingMastersOpen}
        onResolved={loadBatchDetails}
      />
    </div>
  );
}
