'use client';

import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from '@platform/ui';
import { UploadCloud, FileText, X } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface UploadClientDocDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentRequest: any | null;
  onSuccess: () => void;
}

const MAX_BYTES = 25 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function UploadClientDocDialog({
  open,
  onOpenChange,
  documentRequest,
  onSuccess,
}: UploadClientDocDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setSelectedFile(null);
      setError(null);
    }
  }, [open, documentRequest]);

  const handlePickFile = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (file.size > MAX_BYTES) {
      setError(`File exceeds 25 MB limit (${formatBytes(file.size)}).`);
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentRequest) return;
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiClient.uploadClientDocument(documentRequest.id, selectedFile);
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
        <form onSubmit={handleUpload} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Upload Requested Document</DialogTitle>
            <DialogDescription>
              {documentRequest?.title} ({documentRequest?.clientName})
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="p-3 rounded-lg bg-status-danger-subtle border border-default text-xs text-status-danger-text font-medium">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.docx,.doc,.csv,.zip"
              className="hidden"
              onChange={(e) => handlePickFile(e.target.files?.[0])}
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                handlePickFile(e.dataTransfer.files?.[0]);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer p-6 rounded-xl border-2 border-dashed text-center transition ${
                dragging
                  ? 'border-brand bg-brand-subtle/40'
                  : 'border-strong bg-surface-sunken hover:border-brand'
              }`}
            >
              <UploadCloud className="h-8 w-8 mx-auto text-brand-text mb-2" />
              <p className="text-xs font-semibold text-primary">
                Drag and drop file here, or click to browse
              </p>
              <p className="text-[11px] text-muted mt-1">
                PDF, JPG, PNG, XLSX, DOCX, CSV, ZIP · Max 25 MB · SHA-256 verified
              </p>
            </div>

            {selectedFile && (
              <div className="flex items-center justify-between p-3 rounded-xl border border-default bg-surface">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="h-4 w-4 text-brand-text shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-primary truncate">{selectedFile.name}</p>
                    <p className="text-[11px] text-muted">{formatBytes(selectedFile.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Remove selected file"
                  onClick={() => setSelectedFile(null)}
                  className="p-1 text-muted hover:text-primary"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={loading} disabled={!selectedFile}>
              Upload to Vault
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
