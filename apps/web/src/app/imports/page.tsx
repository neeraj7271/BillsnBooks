'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Skeleton,
} from '@platform/ui';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Plus,
  Server,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';

export default function ImportsDashboardPage() {
  const { activeCompanyId } = useCompany();
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.listImportBatches(activeCompanyId);
      setBatches(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load import batches from backend API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, [activeCompanyId]);

  const totalRows = batches.reduce((acc, b) => acc + (b.totalRows || 0), 0);
  const totalValid = batches.reduce((acc, b) => acc + (b.validRows || 0), 0);
  const totalBlocked = batches.reduce((acc, b) => acc + (b.blockedRows || 0), 0);
  const totalCompleted = batches.filter((b) => b.status === 'COMPLETED').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success">Completed &amp; Posted</Badge>;
      case 'APPROVED':
        return <Badge variant="info">Approved for Posting</Badge>;
      case 'READY_FOR_APPROVAL':
        return <Badge variant="info">Ready for Approval</Badge>;
      case 'MAPPING':
      case 'VALIDATING':
        return <Badge variant="warning">Needs Resolution</Badge>;
      case 'FAILED':
        return <Badge variant="danger">Failed</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary">
              Bulk Import Registers
            </h1>
            <Badge variant="info">GST Register Wizard</Badge>
          </div>
          <p className="text-sm text-secondary text-muted mt-1">
            Ingest high-volume Excel &amp; CSV registers with automated GST rule verification &amp; zero-duplicate Tally bridge.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadBatches}
            disabled={loading}
            className="border border-strong bg-white bg-surface text-secondary text-muted text-xs shadow-sm hover:bg-canvas hover:bg-surface-raised"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Link href="/imports/new">
            <Button
              variant="primary"
              size="sm"
              className="bg-brand hover:bg-brand shadow-md shadow-blue-500/20 text-white text-xs font-semibold"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New Import Session
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border border-strong bg-white bg-surface shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted text-muted uppercase tracking-wider">
                Total Sessions
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-subtle bg-brand/60 text-brand-text text-brand">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-primary">{batches.length}</span>
              <span className="text-xs text-muted text-muted">batches</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border border-strong bg-white bg-surface shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted text-muted uppercase tracking-wider">
                Clean Vouchers
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-status-success-subtle bg-status-success text-status-success-text text-status-success-text">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-status-success-text text-status-success-text">{totalValid.toLocaleString()}</span>
              <span className="text-xs text-muted text-muted">of {totalRows.toLocaleString()} rows</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border border-strong bg-white bg-surface shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted text-muted uppercase tracking-wider">
                Blocked Rows
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-status-danger-subtle bg-status-danger text-status-danger-text text-status-danger-text">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-status-danger-text text-status-danger-text">{totalBlocked.toLocaleString()}</span>
              <span className="text-xs text-muted text-muted">exceptions</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border border-strong bg-white bg-surface shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted text-muted uppercase tracking-wider">
                Tally Synced
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-subtle bg-brand/60 text-brand-text text-brand">
                <Server className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-brand-text text-brand">{totalCompleted}</span>
              <span className="text-xs text-muted text-muted">posted</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Batches Table */}
      <Card className="border border border-strong bg-white bg-surface shadow-sm overflow-hidden">
        <CardHeader className="border-b border border-strong px-6 py-4 bg-canvas bg-surface">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-primary">Import Ingestion History</CardTitle>
              <CardDescription className="text-xs text-secondary text-muted">
                Audited ingestion sessions with SHA-256 deduplication and line-level verification
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full bg-surface-sunken bg-surface-raised" />
              <Skeleton className="h-10 w-full bg-surface-sunken bg-surface-raised" />
              <Skeleton className="h-10 w-full bg-surface-sunken bg-surface-raised" />
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <AlertTriangle className="h-8 w-8 text-status-warning-text mx-auto mb-2" />
              <p className="text-sm text-primary text-primary-inverse font-medium">{error}</p>
              <Button variant="outline" size="sm" onClick={loadBatches} className="mt-4">
                Retry Fetching Batches
              </Button>
            </div>
          ) : batches.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-subtle bg-surface-raised text-brand-text text-brand mb-4 shadow-sm">
                <UploadCloud className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-primary">No import batches uploaded yet</h3>
              <p className="text-sm text-secondary text-muted mt-1 max-w-sm mx-auto">
                Begin verification by uploading your first Excel or CSV sales register.
              </p>
              <div className="mt-6">
                <Link href="/imports/new">
                  <Button variant="primary" size="sm" className="bg-brand hover:bg-brand shadow-md shadow-blue-500/20 text-white font-semibold">
                    <Plus className="h-4 w-4 mr-1.5" />
                    Launch Import Wizard
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border border-strong bg-canvas bg-surface hover:bg-transparent">
                    <TableHead className="text-secondary text-muted font-semibold text-xs">File / Session</TableHead>
                    <TableHead className="text-secondary text-muted font-semibold text-xs">Type</TableHead>
                    <TableHead className="text-secondary text-muted font-semibold text-xs">Status</TableHead>
                    <TableHead className="text-secondary text-muted font-semibold text-xs">Row Breakdown</TableHead>
                    <TableHead className="text-secondary text-muted font-semibold text-xs">Uploaded At</TableHead>
                    <TableHead className="text-right text-secondary text-muted font-semibold text-xs">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => (
                    <TableRow key={batch.id} className="border-b border-subtle border-strong hover:bg-canvas hover:bg-surface-raised transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-subtle bg-brand/60 text-brand-text text-brand border border-focus border-focus shrink-0">
                            <FileSpreadsheet className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="block font-semibold text-primary text-primary-inverse">{batch.fileName}</span>
                            <span className="block text-[11px] font-mono text-muted text-muted">
                              ID: {batch.id.substring(0, 8)}... | {Math.round(parseInt(batch.fileSizeBytes || '0') / 1024)} KB
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-secondary text-muted font-medium">
                        {batch.importType.replace('_', ' ')}
                      </TableCell>

                      <TableCell>{getStatusBadge(batch.status)}</TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-xs">
                            <span className="h-2 w-2 rounded-full bg-status-success" />
                            <span className="text-status-success-text text-status-success-text font-semibold">{batch.validRows}</span>
                          </div>
                          {batch.clarificationRows > 0 && (
                            <div className="flex items-center gap-1 text-xs">
                              <span className="h-2 w-2 rounded-full bg-status-warning" />
                              <span className="text-status-warning-text text-status-warning-text font-semibold">{batch.clarificationRows}</span>
                            </div>
                          )}
                          {batch.blockedRows > 0 && (
                            <div className="flex items-center gap-1 text-xs">
                              <span className="h-2 w-2 rounded-full bg-status-danger" />
                              <span className="text-status-danger-text text-status-danger-text font-semibold">{batch.blockedRows}</span>
                            </div>
                          )}
                          <span className="text-xs text-muted">/ {batch.totalRows}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-muted text-muted">
                        {new Date(batch.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>

                      <TableCell className="text-right">
                        <Link href={`/imports/${batch.id}/review`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs border border-strong bg-white bg-surface-raised text-primary text-primary-inverse hover:bg-canvas hover:bg-surface-raised shadow-sm"
                          >
                            Review Cockpit
                            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
