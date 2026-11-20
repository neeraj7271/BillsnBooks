'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  MoneyText,
} from '@platform/ui';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RotateCw,
  Sparkles,
  Users,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { MissingMastersModal } from '@/app/imports/new/missing-masters-modal';

export default function BatchReviewPage() {
  const params = useParams();
  const batchId = params.id as string;
  const { activeCompanyId } = useCompany();

  const [batch, setBatch] = useState<any | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'GREEN' | 'YELLOW' | 'RED'>('ALL');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [scanData, setScanData] = useState<any | null>(null);
  const [missingMastersOpen, setMissingMastersOpen] = useState(false);

  const loadBatchDetails = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getImportBatch(activeCompanyId, batchId);
      setBatch(data);
      setRows(data?.rows || []);

      // Check missing masters in background
      try {
        const scan = await apiClient.scanImportMasters(activeCompanyId, batchId);
        setScanData(scan);
      } catch (e) {
        // Ignore
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFixGst = async () => {
    setProcessing(true);
    setMessage(null);
    try {
      const res = await apiClient.autoFixImportGst(activeCompanyId, batchId);
      await loadBatchDetails();
      setMessage({ type: 'success', text: `Auto-fixed GST tax splits for ${res.fixedCount} row(s).` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'GST auto-fix failed';
      setMessage({ type: 'error', text: `GST auto-fix failed: ${msg}` });
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    loadBatchDetails();
  }, [batchId, activeCompanyId]);

  const handleBulkMap = async (ledgerId: string) => {
    setProcessing(true);
    setMessage(null);
    try {
      await apiClient.bulkFixRows(undefined, batchId, {
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
      await apiClient.approveBatch(undefined, batchId);
      await apiClient.postBatchToLedger(undefined, batchId);
      await loadBatchDetails();
      setMessage({ type: 'success', text: 'Batch successfully posted to canonical general ledger!' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Posting error';
      setMessage({ type: 'error', text: `Posting error: ${msg}` });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        Loading batch audit details...
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="p-8 text-center text-xs text-rose-500 font-semibold">
        Batch #{batchId} not found.
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-sm" asChild aria-label="Back to imports">
              <Link href="/imports">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">
              Batch Resolution: {batch.fileName}
            </h1>
            <Badge variant="brand" size="sm">{batch.status}</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Reconcile unmapped party ledgers and review statutory GST calculations prior to ledger posting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {scanData?.hasMissingMasters && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMissingMastersOpen(true)}
              leftIcon={<Users className="h-3.5 w-3.5 text-blue-500" />}
            >
              Missing Masters ({scanData.missingParties.length + scanData.missingItems.length})
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoFixGst}
            loading={processing}
            disabled={batch.status === 'POSTED'}
            leftIcon={<Sparkles className="h-3.5 w-3.5 text-indigo-500" />}
          >
            Auto-Fix Tax Splits
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleApproveAndPost}
            loading={processing}
            disabled={batch.status === 'POSTED' || batch.validRows === 0}
            leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
          >
            {batch.status === 'POSTED' ? 'Posted to Books' : `Approve & Post (${batch.validRows} Vouchers)`}
          </Button>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl border text-xs font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 text-rose-700 dark:text-rose-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-slate-500">Total Staged</span>
            <div className="text-xl font-black mt-1">{batch.totalRows}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-emerald-600">Clean / Ready</span>
            <div className="text-xl font-black text-emerald-600 mt-1">{batch.validRows}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-amber-600">Needs Mapping</span>
            <div className="text-xl font-black text-amber-600 mt-1">{batch.clarificationRows}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-rose-600">Blocked / Errors</span>
            <div className="text-xl font-black text-rose-600 mt-1">{batch.blockedRows}</div>
          </CardContent>
        </Card>
      </div>

      {/* Cockpit Card */}
      <Card>
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-sm">Line Exception Resolver</CardTitle>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
            {(['ALL', 'GREEN', 'YELLOW', 'RED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  activeTab === tab
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </CardHeader>

        {batch.clarificationRows > 0 && (
          <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 px-4 py-2.5 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Quick-Map Party Ledgers:</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="xs"
                onClick={() => handleBulkMap('10000000-0000-4000-8000-000000000005')}
              >
                Map to Tata Motors
              </Button>
              <Button
                variant="outline"
                size="xs"
                onClick={() => handleBulkMap('10000000-0000-4000-8000-000000000006')}
              >
                Map to Reliance Retail
              </Button>
            </div>
          </div>
        )}

        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-500 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Invoice &amp; Date</th>
                  <th className="py-2.5 px-3">Party &amp; GSTIN</th>
                  <th className="py-2.5 px-3 text-right">Taxable</th>
                  <th className="py-2.5 px-3 text-right">Total Amount</th>
                  <th className="py-2.5 px-3 text-center">Integrity State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows
                  .filter((r) => activeTab === 'ALL' || r.validationState === activeTab)
                  .map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="py-2.5 px-3 font-mono text-slate-400">{row.rowIndex}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {row.parsedData.voucherNumber || 'Missing Inv No'}
                        </span>
                        <span className="block text-[11px] text-slate-400">{row.parsedData.date || 'N/A'}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {row.parsedData.partyName || 'Unknown Party'}
                        </span>
                        <span className="block font-mono text-[10px] text-slate-400">
                          {row.parsedData.partyGstin || 'No GSTIN'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <MoneyText amount={row.parsedData.taxableAmount || 0} />
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold">
                        <MoneyText amount={row.parsedData.totalAmount || 0} />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          variant={row.validationState === 'GREEN' ? 'success' : row.validationState === 'YELLOW' ? 'warning' : 'danger'}
                          size="xs"
                          dot
                        >
                          {row.validationState}
                        </Badge>
                      </td>
                    </tr>
                  ))}
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
