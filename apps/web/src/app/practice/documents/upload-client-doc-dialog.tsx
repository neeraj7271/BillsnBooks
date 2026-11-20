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
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-600 dark:text-rose-400 font-medium">
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

            <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-center space-y-1">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Encrypted & Signed Storage Vault
              </p>
              <p className="text-[11px] text-slate-400">
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

