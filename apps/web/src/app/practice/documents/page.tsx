'use client';
import { logger } from '@/lib/logger';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Plus,
  RefreshCw,
  UploadCloud,
  CheckCircle2,
  XCircle,
  Download,
  FolderOpen,
  FileCheck2,
  ExternalLink,
} from 'lucide-react';
import {
  Button,
  Badge,
  DataTable,
  DateText,
  type ColumnDef,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { RequestDocumentDialog } from './request-document-dialog';
import { UploadClientDocDialog } from './upload-client-doc-dialog';
import { DocumentVaultView } from './document-vault-view';

interface DocItem {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  documentType: string;
  period: string;
  status: string;
  dueDate?: string;
  fileName?: string;
  fileSizeBytes?: number;
  rejectionReason?: string;
  createdAt: string;
}

function ClientDocumentsPortalContent() {
  const searchParams = useSearchParams();
  const initialClientId = searchParams.get('clientId') || '';

  const [activeTab, setActiveTab] = useState<'REQUESTS' | 'VAULT'>('REQUESTS');
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedVaultClientId, setSelectedVaultClientId] = useState<string>(initialClientId);
  const [loading, setLoading] = useState(true);
  const [openRequestModal, setOpenRequestModal] = useState(false);

  const { page, pageSize, setPage, setPageSize } = useTablePagination({
    storageKey: 'practice_documents',
    defaultPageSize: 25,
  });

  const [selectedDoc, setSelectedDoc] = useState<DocItem | null>(null);
  const [openUploadModal, setOpenUploadModal] = useState(false);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const [data, clientList] = await Promise.all([
        apiClient.listPracticeDocuments(initialClientId || undefined),
        apiClient.listPracticeClients().catch(() => []),
      ]);
      setDocs(data || []);
      setClients(clientList || []);
      if (!selectedVaultClientId && clientList && clientList.length > 0) {
        setSelectedVaultClientId(clientList[0].id);
      }
    } catch (err: unknown) {
      logger.error('Failed to load document requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [initialClientId]);

  const handleReview = async (id: string, status: 'ACCEPTED' | 'REJECTED') => {
    try {
      await apiClient.reviewClientDocument(id, status);
      await loadDocuments();
    } catch (err: unknown) {
      logger.error('Failed to review document', err);
    }
  };

  const handleDownloadRequestFile = async (row: DocItem) => {
    try {
      const { blob } = await apiClient.fetchProtectedBlob(`/v1/practice/documents/${row.id}/download`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = row.fileName || 'document';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: unknown) {
      logger.error('Failed to download file', err);
    }
  };

  const columns: ColumnDef<DocItem>[] = [
    {
      header: 'Requested Document & Client',
      key: 'title',
      cell: (row) => (
        <div>
          <div className="font-bold text-primary">{row.title}</div>
          <div className="text-xs text-secondary flex items-center gap-2">
            <span>{row.clientName}</span>
            <span>|</span>
            <span>Period: <span className="font-mono">{row.period}</span></span>
            <Link
              href={`/practice/clients/${row.clientId}/vault`}
              className="text-brand-text hover:underline inline-flex items-center gap-0.5 ml-1"
            >
              Vault <ExternalLink className="h-2.5 w-2.5" />
            </Link>
          </div>
        </div>
      ),
    },
    {
      header: 'Type',
      key: 'documentType',
      cell: (row) => (
        <Badge variant="neutral" size="sm">
          {row.documentType.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      header: 'Due Date',
      key: 'dueDate',
      cell: (row) => (row.dueDate ? <DateText date={row.dueDate} /> : <span className="text-muted">—</span>),
    },
    {
      header: 'Status',
      key: 'status',
      cell: (row) => {
        const v =
          row.status === 'ACCEPTED'
            ? 'success'
            : row.status === 'UPLOADED'
            ? 'brand'
            : row.status === 'REJECTED'
            ? 'danger'
            : 'warning';
        return (
          <div className="flex flex-col gap-0.5">
            <Badge variant={v} size="sm">
              {row.status}
            </Badge>
            {row.fileName && (
              <span className="text-[10px] font-mono text-secondary truncate max-w-[140px]">
                {row.fileName}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Actions',
      key: 'id',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          {(row.status === 'REQUESTED' || row.status === 'REJECTED') && (
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                setSelectedDoc(row);
                setOpenUploadModal(true);
              }}
              leftIcon={<UploadCloud className="h-3 w-3" />}
            >
              Upload
            </Button>
          )}

          {(row.status === 'UPLOADED' || row.status === 'ACCEPTED') && row.fileName && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleDownloadRequestFile(row)}
              leftIcon={<Download className="h-3 w-3" />}
            >
              Download
            </Button>
          )}

          {row.status === 'UPLOADED' && (
            <>
              <Button
                variant="outline"
                size="xs"
                onClick={() => handleReview(row.id, 'ACCEPTED')}
                leftIcon={<CheckCircle2 className="h-3 w-3 text-status-success-text" />}
              >
                Accept
              </Button>
              <Button
                variant="danger"
                size="xs"
                onClick={() => handleReview(row.id, 'REJECTED')}
                leftIcon={<XCircle className="h-3 w-3" />}
              >
                Reject
              </Button>
            </>
          )}

          {row.status === 'ACCEPTED' && (
            <span className="text-xs font-semibold text-status-success-text flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Filed in Vault
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-primary">
              Document Requests
            </h1>
            <Badge variant="brand" size="sm">Client Portal</Badge>
          </div>
          <p className="mt-1 text-sm text-secondary">
            Request bank statements, purchase bills, and statutory records from clients, or switch to the Client Vault tab.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDocuments}
            loading={loading}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setOpenRequestModal(true)}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            Request Document
          </Button>
        </div>
      </div>

      {/* Mode Switch Tabs */}
      <div className="flex items-center gap-2 border-b border-default pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('REQUESTS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'REQUESTS'
              ? 'bg-brand-subtle text-brand-text shadow-xs'
              : 'text-muted hover:text-primary'
          }`}
        >
          <FileCheck2 className="h-4 w-4" />
          <span>Document Requests ({docs.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('VAULT')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'VAULT'
              ? 'bg-brand-subtle text-brand-text shadow-xs'
              : 'text-muted hover:text-primary'
          }`}
        >
          <FolderOpen className="h-4 w-4" />
          <span>Client Document Vault</span>
        </button>
      </div>

      {activeTab === 'REQUESTS' ? (
        <DataTable
          columns={columns}
          data={docs}
          loading={loading}
          page={page}
          pageSize={pageSize}
          totalItems={docs.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          storageKey="practice_documents"
          emptyTitle="No document requests"
          emptyDescription="Request bank statements, purchase bills, or certificates from clients."
          emptyAction={{ label: 'Request Document', onClick: () => setOpenRequestModal(true) }}
        />
      ) : (
        <div className="space-y-4">
          {clients.length > 0 && (
            <div className="flex items-center gap-3">
              <label htmlFor="vault-client-select" className="text-xs font-semibold text-secondary">
                Select Client Vault:
              </label>
              <select
                id="vault-client-select"
                value={selectedVaultClientId}
                onChange={(e) => setSelectedVaultClientId(e.target.value)}
                className="rounded-xl border border-default bg-surface px-3 py-2 text-xs font-medium text-primary min-w-[260px]"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName} ({c.clientCode})
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedVaultClientId ? (
            <DocumentVaultView clientId={selectedVaultClientId} />
          ) : (
            <div className="p-8 rounded-xl border border-subtle bg-surface shadow-card text-center text-xs text-muted">
              Create a practice client first to open their document vault.
            </div>
          )}
        </div>
      )}

      <RequestDocumentDialog
        open={openRequestModal}
        onOpenChange={setOpenRequestModal}
        onSuccess={loadDocuments}
        defaultClientId={initialClientId}
      />

      <UploadClientDocDialog
        open={openUploadModal}
        onOpenChange={setOpenUploadModal}
        documentRequest={selectedDoc}
        onSuccess={loadDocuments}
      />
    </div>
  );
}

export default function ClientDocumentsPortalPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted">Loading document requests...</div>}>
      <ClientDocumentsPortalContent />
    </Suspense>
  );
}
