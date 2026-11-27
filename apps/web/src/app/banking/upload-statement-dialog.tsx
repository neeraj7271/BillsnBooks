import { logger } from '@/lib/logger';
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
import { UploadCloud, Download } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface UploadStatementDialogProps {
  open: boolean;
  accountId: string;
  onOpenChange: (open: boolean) => void;
  onSuccess: (result: any) => void;
}

export function UploadStatementDialog({
  open,
  accountId,
  onOpenChange,
  onSuccess,
}: UploadStatementDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadTemplate = async () => {
    try {
      setDownloading(true);
      await apiClient.downloadImportTemplate('bank-statement');
    } catch (err: unknown) {
      logger.error(err);
    } finally {
      setDownloading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !accountId) return;

    setUploading(true);
    setError(null);

    try {
      const res = await apiClient.uploadBankStatement(accountId, file);
      onOpenChange(false);
      onSuccess(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Import Bank Statement</DialogTitle>
              <DialogDescription>
                Upload raw net-banking statements (HDFC, SBI, ICICI, Kotak, Axis, etc.) or our standard template.
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="xs"
              type="button"
              loading={downloading}
              onClick={handleDownloadTemplate}
              leftIcon={<Download className="h-3.5 w-3.5" />}
            >
              Excel Template
            </Button>
          </div>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-xl bg-status-danger-subtle border border-subtle text-xs text-status-danger-text font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Bank Statement File (.xlsx, .xls, .csv, .txt, .ofx)" required>
            <Input
              type="file"
              accept=".xlsx,.xls,.csv,.txt,.ofx,.mt940"
              required
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </FormField>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={uploading}
              leftIcon={<UploadCloud className="h-4 w-4" />}
            >
              Parse & Ingest Feed
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

