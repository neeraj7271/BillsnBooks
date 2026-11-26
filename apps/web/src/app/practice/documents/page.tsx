'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileSpreadsheet, Plus, RefreshCw, UploadCloud, CheckCircle2, XCircle } from 'lucide-react';
import {
  Button,
  Badge,
  DataTable,
  DateText,
  type ColumnDef,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { RequestDocumentDialog } from './request-document-dialog';
import { UploadClientDocDialog } from './upload-client-doc-dialog';

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

  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openRequestModal, setOpenRequestModal] = useState(false);

  // Upload simulation modal
  const [selectedDoc, setSelectedDoc] = useState<DocItem | null>(null);
  const [openUploadModal, setOpenUploadModal] = useState(false);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const data = await apiClient.listPracticeDocuments(initialClientId || undefined);
      setDocs(data || []);
    } catch (err: unknown) {
      console.error('Failed to load document requests', err);
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
      console.error('Failed to review document', err);
    }
  };

  const columns: ColumnDef<DocItem>[] = [
    {
      header: 'Requested Document & Client',
      key: 'title',
      cell: (row) => (
        <div>
          <div className="font-bold text-primary">{row.title}</div>
          <div className="text-xs text-secondary">
            {row.clientName} | Period: <span className="font-mono">{row.period}</span>
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
              <span className="text-[10px] font-mono text-secondary truncate max-w-[120px]">
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
          {row.status === 'REQUESTED' && (
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

          {row.status === 'UPLOADED' && (
            <>
              <Button
                variant="primary"
                size="xs"
                onClick={() => handleReview(row.id, 'ACCEPTED')}
                leftIcon={<CheckCircle2 className="h-3 w-3" />}
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
              Verified in Vault
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
              Client Document Vault & Requests
            </h1>
            <Badge variant="brand" size="sm">Client Portal</Badge>
          </div>
          <p className="mt-1 text-sm text-secondary">
            Request, collect, and verify monthly statements, sales registers, and tax challans.
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

      {/* Table */}
      <DataTable
        columns={columns}
        data={docs}
        loading={loading}
        emptyTitle="No document requests active"
        emptyDescription="Request bank statements or sales registers from client finance teams."
      />

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
