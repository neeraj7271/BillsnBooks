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
  DataTable,
  formatDate,
  type ColumnDef,
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
import { useTablePagination } from '@/hooks/use-table-pagination';

export default function ImportsDashboardPage() {
  const { activeCompanyId } = useCompany();
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { page, pageSize, setPage, setPageSize } = useTablePagination({
    storageKey: 'imports',
    defaultPageSize: 25,
  });

  const loadBatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.listImportBatches(activeCompanyId);
      setBatches(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve batches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, [activeCompanyId]);

  const totalBatches = batches.length;
  const totalRows = batches.reduce((acc, b) => acc + (b.totalRows || 0), 0);
  const totalCompleted = batches.filter(
    (b) => b.status === 'POSTED' || b.status === 'COMPLETED'
  ).length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="warning" size="xs">Processing</Badge>;
      case 'PARSED':
        return <Badge variant="info" size="xs">Ready for Review</Badge>;
      case 'CLARIFICATION_NEEDED':
        return <Badge variant="danger" size="xs">Clarifications</Badge>;
      case 'POSTED':
      case 'COMPLETED':
        return <Badge variant="success" size="xs">Posted</Badge>;
      case 'FAILED':
        return <Badge variant="danger" size="xs">Failed</Badge>;
      default:
        return <Badge variant="neutral" size="xs">{status}</Badge>;
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      key: 'file',
      header: 'File / Session',
      cell: (batch) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-subtle text-brand-text border border-subtle shrink-0">
            <FileSpreadsheet className="h-4 w-4" />
          </div>
          <div>
            <span className="block font-semibold text-primary">{batch.fileName}</span>
            <span className="block text-[11px] font-mono text-muted">
              ID: {batch.id.substring(0, 8)}... | {Math.round(parseInt(batch.fileSizeBytes || '0') / 1024)} KB
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      width: '140px',
      cell: (batch) => (
        <span className="text-xs text-secondary font-medium">
          {batch.importType?.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '140px',
      cell: (batch) => getStatusBadge(batch.status),
    },
    {
      key: 'breakdown',
      header: 'Row Breakdown',
      cell: (batch) => (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs">
            <span className="h-2 w-2 rounded-full bg-status-success" />
            <span className="text-status-success-text font-semibold">{batch.validRows}</span>
          </div>
          {batch.clarificationRows > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <span className="h-2 w-2 rounded-full bg-status-warning" />
              <span className="text-status-warning-text font-semibold">{batch.clarificationRows}</span>
            </div>
          )}
          {batch.blockedRows > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <span className="h-2 w-2 rounded-full bg-status-danger" />
              <span className="text-status-danger-text font-semibold">{batch.blockedRows}</span>
            </div>
          )}
          <span className="text-xs text-muted">/ {batch.totalRows}</span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Uploaded At',
      width: '160px',
      cell: (batch) => (
        <span className="text-xs text-muted">
          {formatDate(batch.createdAt, 'short')}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      align: 'right',
      width: '150px',
      cell: (batch) => (
        <Link href={`/imports/${batch.id}/review`}>
          <Button variant="outline" size="sm" className="h-8 text-xs shadow-2xs">
            Review Cockpit
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">GST Import Verification Engine</h1>
          <p className="text-xs text-secondary mt-1">
            Reconcile external spreadsheets into validated canonical invoices with sub-penny GST parity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadBatches}
            loading={loading}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>
          <Link href="/imports/new">
            <Button variant="primary" size="sm" leftIcon={<UploadCloud className="h-4 w-4" />}>
              Upload Register
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-default bg-surface shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Total Batches</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-sunken text-muted">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-primary">{totalBatches}</span>
              <span className="text-xs text-muted">uploads</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-default bg-surface shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Rows Ingested</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-sunken text-muted">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-primary">{totalRows.toLocaleString('en-IN')}</span>
              <span className="text-xs text-muted">lines parsed</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-default bg-surface shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Completed Sessions</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-status-info-subtle text-status-info-text">
                <Server className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-status-info-text">{totalCompleted}</span>
              <span className="text-xs text-muted">posted</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Batches DataTable */}
      <DataTable
        columns={columns}
        data={batches}
        loading={loading}
        page={page}
        pageSize={pageSize}
        totalItems={batches.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        storageKey="imports"
        emptyTitle="No import batches"
        emptyDescription="Upload a Tally XML or CSV register to stage transactions."
        emptyAction={{ label: 'New Import', onClick: () => { window.location.href = '/imports/new'; } }}
      />
    </div>
  );
}
