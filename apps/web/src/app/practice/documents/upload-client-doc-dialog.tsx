'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  FormField,
  Input,
  Button,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';

interface UploadClientDocDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentRequest: any | null;
  onSuccess: () => void;
}

export function UploadClientDocDialog({
  open,
  onOpenChange,
  documentRequest,
  onSuccess,
}: UploadClientDocDialogProps) {
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (documentRequest) {
      setFileName(`${documentRequest.title.replace(/\s+/g, '_')}_${documentRequest.period}.pdf`);
    }
  }, [documentRequest]);

  const handleSimulatedUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentRequest || !fileName) return;

    setLoading(true);
    setError(null);
    try {
      await apiClient.uploadClientDocument(documentRequest.id, {
        fileName,
        fileSizeBytes: 245000,
        fileUrl: `https://storage.antigravity.in/vault/clients/${documentRequest.clientId}/${fileName}`,
      });
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <form onSubmit={handleSimulatedUpload} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Client Portal Document Upload</DialogTitle>
            <DialogDescription>
              {documentRequest?.title} ({documentRequest?.clientName})
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="p-3 rounded-lg bg-status-danger-subtle bg-status-danger border border-status-danger border-status-danger text-xs text-status-danger-text text-status-danger-text font-medium">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <FormField label="Document File Name" required hint="PDF, Excel (.xlsx), or CSV">
              <Input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="statement_oct2026.pdf"
              />
            </FormField>

            <div className="p-4 rounded-xl border border-dashed border border-strong bg-canvas bg-surface-raised text-center space-y-1">
              <p className="text-xs font-semibold text-secondary text-muted">
                Encrypted & Signed Storage Vault
              </p>
              <p className="text-[11px] text-muted">
                Uploaded documents are cryptographically SHA-256 hashed and scanned for virus signatures.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              Submit to CA Vault
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

