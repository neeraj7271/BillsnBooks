'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  FolderPlus,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  UploadCloud,
  Search,
  Eye,
  Download,
  RefreshCw,
  History,
  Trash2,
  Edit3,
  ShieldCheck,
  X,
  RotateCcw,
  FolderInput,
} from 'lucide-react';
import { Button, Badge, Input, DateText, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@platform/ui';
import { apiClient } from '@/lib/api-client';

export interface VaultFolder {
  id: string;
  name: string;
  isSystem: boolean;
  fileCount: number;
}

export interface VaultFile {
  id: string;
  clientId: string;
  clientName?: string;
  folderId: string | null;
  folderName: string | null;
  fileGroupId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  uploadedByName: string;
  version: number;
  createdAt: string;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function FileTypeIcon({ mime }: { mime: string }) {
  if (mime.startsWith('image/')) return <ImageIcon className="h-4 w-4 text-status-info-text shrink-0" />;
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) {
    return <FileSpreadsheet className="h-4 w-4 text-status-success-text shrink-0" />;
  }
  return <FileText className="h-4 w-4 text-brand-text shrink-0" />;
}

interface DocumentVaultViewProps {
  clientId: string;
}

export function DocumentVaultView({ clientId }: DocumentVaultViewProps) {
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [folders, setFolders] = useState<VaultFolder[]>([]);
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replaceTarget, setReplaceTarget] = useState<VaultFile | null>(null);

  // Folder create/rename
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderNameInput, setFolderNameInput] = useState('');
  const [renamingFolder, setRenamingFolder] = useState<VaultFolder | null>(null);

  // Preview side drawer
  const [previewFile, setPreviewFile] = useState<VaultFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Version history modal
  const [versionsFile, setVersionsFile] = useState<VaultFile | null>(null);
  const [versions, setVersions] = useState<VaultFile[]>([]);

  // Audit trail drawer/modal
  const [auditFile, setAuditFile] = useState<VaultFile | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Rename / Move file modal
  const [editingFile, setEditingFile] = useState<VaultFile | null>(null);
  const [editFileName, setEditFileName] = useState('');
  const [editFileFolderId, setEditFileFolderId] = useState('');

  // Delete confirm modal
  const [deletingFile, setDeletingFile] = useState<VaultFile | null>(null);

  const loadVault = async () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getClientVault(clientId, {
        folderId: selectedFolderId || undefined,
        q: searchQuery || undefined,
      });
      setClientInfo(res.client);
      setFolders(res.folders || []);
      setFiles(res.files || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load client vault');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVault();
  }, [clientId, selectedFolderId, searchQuery]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setError(null);
    const items = Array.from(fileList);
    try {
      for (let i = 0; i < items.length; i++) {
        setUploadProgress(`Uploading ${i + 1} of ${items.length}: ${items[i].name}`);
        await apiClient.uploadToVault(clientId, items[i], {
          folderId: selectedFolderId || undefined,
        });
      }
      await loadVault();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleReplaceFile = async (file: File | undefined) => {
    if (!file || !replaceTarget) return;
    setUploading(true);
    setError(null);
    try {
      setUploadProgress(`Uploading v${replaceTarget.version + 1} of ${replaceTarget.fileName}...`);
      await apiClient.uploadToVault(clientId, file, {
        folderId: replaceTarget.folderId || undefined,
        replaceFileGroupId: replaceTarget.fileGroupId,
      });
      setReplaceTarget(null);
      await loadVault();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Replace upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleDownload = async (file: VaultFile) => {
    try {
      const { blob } = await apiClient.fetchProtectedBlob(`/v1/practice/documents/files/${file.id}/download`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  };

  const handleOpenPreview = async (file: VaultFile) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewFile(file);
    if (file.mimeType === 'application/pdf' || file.mimeType.startsWith('image/')) {
      setPreviewLoading(true);
      try {
        const { blob } = await apiClient.fetchProtectedBlob(
          `/v1/practice/documents/files/${file.id}/download?inline=1`,
        );
        setPreviewUrl(URL.createObjectURL(blob));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Preview failed');
      } finally {
        setPreviewLoading(false);
      }
    }
  };

  const handleOpenVersions = async (file: VaultFile) => {
    setVersionsFile(file);
    try {
      const list = await apiClient.listVaultFileVersions(file.id);
      setVersions(list || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load versions');
    }
  };

  const handleRestoreVersion = async (versionFile: VaultFile) => {
    try {
      await apiClient.restoreVaultFileVersion(versionFile.id);
      setVersionsFile(null);
      await loadVault();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to restore version');
    }
  };

  const handleOpenAudit = async (file: VaultFile) => {
    setAuditFile(file);
    try {
      const logs = await apiClient.getVaultFileAudit(file.id);
      setAuditLogs(logs || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load audit trail');
    }
  };

  const handleSaveFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderNameInput.trim()) return;
    try {
      if (renamingFolder) {
        await apiClient.renameVaultFolder(renamingFolder.id, folderNameInput.trim());
      } else {
        await apiClient.createVaultFolder(clientId, folderNameInput.trim());
      }
      setFolderModalOpen(false);
      setRenamingFolder(null);
      setFolderNameInput('');
      await loadVault();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Folder action failed');
    }
  };

  const handleSaveFileMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFile) return;
    try {
      await apiClient.updateVaultFile(editingFile.id, {
        fileName: editFileName.trim() || undefined,
        folderId: editFileFolderId || null,
      });
      setEditingFile(null);
      await loadVault();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update file');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingFile) return;
    try {
      await apiClient.deleteVaultFile(deletingFile.id);
      setDeletingFile(null);
      if (previewFile?.id === deletingFile.id) setPreviewFile(null);
      await loadVault();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-xl bg-status-danger-subtle border border-subtle shadow-card text-xs text-status-danger-text font-medium flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="p-1">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Folder Tree */}
        <aside className="lg:col-span-3 rounded-xl border border-subtle bg-surface p-4 shadow-card space-y-3 h-fit">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
              Folders {clientInfo ? `· ${clientInfo.clientCode}` : ''}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              aria-label="New Folder"
              onClick={() => {
                setRenamingFolder(null);
                setFolderNameInput('');
                setFolderModalOpen(true);
              }}
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setSelectedFolderId('')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                selectedFolderId === ''
                  ? 'bg-brand-subtle text-brand-text'
                  : 'text-secondary hover:bg-surface-sunken'
              }`}
            >
              <span className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                <span>All Documents</span>
              </span>
              <Badge variant="neutral" size="xs">
                {folders.reduce((acc, f) => acc + (f.fileCount || 0), 0)}
              </Badge>
            </button>

            {folders.map((folder) => (
              <div key={folder.id} className="group flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={`flex-1 flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                    selectedFolderId === folder.id
                      ? 'bg-brand-subtle text-brand-text font-semibold'
                      : 'text-secondary hover:bg-surface-sunken'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Folder className="h-4 w-4 shrink-0" />
                    <span className="truncate">{folder.name}</span>
                  </span>
                  <span className="text-[11px] text-muted">{folder.fileCount}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Rename ${folder.name}`}
                  onClick={() => {
                    setRenamingFolder(folder);
                    setFolderNameInput(folder.name);
                    setFolderModalOpen(true);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted hover:text-primary"
                >
                  <Edit3 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Vault Area */}
        <div className="lg:col-span-9 space-y-4">
          {/* Toolbar + Search */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files by name..."
                leftAddon={<Search className="h-4 w-4" />}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadVault}
                leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              >
                Refresh
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                loading={uploading}
                leftIcon={<UploadCloud className="h-4 w-4" />}
              >
                Upload Files
              </Button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.docx,.doc,.csv,.zip"
            className="hidden"
            onChange={(e) => {
              handleUploadFiles(e.target.files);
              e.target.value = '';
            }}
          />

          <input
            ref={replaceInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.docx,.doc,.csv,.zip"
            className="hidden"
            onChange={(e) => {
              handleReplaceFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />

          {/* Drag-and-Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleUploadFiles(e.dataTransfer.files);
            }}
            className={`p-4 rounded-2xl border-2 border-dashed transition text-center ${
              dragging
                ? 'border-brand bg-brand-subtle/40'
                : 'border-default bg-surface-sunken/60'
            }`}
          >
            <p className="text-xs font-medium text-secondary">
              {uploadProgress ||
                'Drag & drop PDF, Excel, Word, CSV, JPG/PNG, or ZIP files here to upload to the selected folder (max 25 MB each).'}
            </p>
          </div>

          {/* File Table */}
          <div className="rounded-xl border border-subtle bg-surface shadow-card overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-default bg-surface-sunken/50 text-[11px] font-bold uppercase tracking-wider text-muted">
                  <th className="py-3 px-4">File</th>
                  <th className="py-3 px-3">Folder</th>
                  <th className="py-3 px-3">Size</th>
                  <th className="py-3 px-3">Ver</th>
                  <th className="py-3 px-3">Uploaded By</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted">
                      Loading vault files...
                    </td>
                  </tr>
                ) : files.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted">
                      No documents in this folder yet. Drop files above to upload.
                    </td>
                  </tr>
                ) : (
                  files.map((file) => (
                    <tr key={file.id} className="hover:bg-surface-sunken/40 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <FileTypeIcon mime={file.mimeType} />
                          <div>
                            <button
                              type="button"
                              onClick={() => handleOpenPreview(file)}
                              className="font-semibold text-primary hover:text-brand-text text-left"
                            >
                              {file.fileName}
                            </button>
                            <div className="text-[10px] text-muted font-mono">
                              SHA256: {file.sha256.slice(0, 12)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="neutral" size="xs">
                          {file.folderName || 'Misc'}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 font-mono text-secondary">{formatBytes(file.sizeBytes)}</td>
                      <td className="py-3 px-3">
                        <Badge variant="brand" size="xs">
                          v{file.version}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-secondary">{file.uploadedByName}</td>
                      <td className="py-3 px-3 text-secondary">
                        <DateText date={file.createdAt} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Preview ${file.fileName}`}
                            title="Preview"
                            onClick={() => handleOpenPreview(file)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Download ${file.fileName}`}
                            title="Download"
                            onClick={() => handleDownload(file)}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Replace ${file.fileName}`}
                            title="Upload New Version"
                            onClick={() => {
                              setReplaceTarget(file);
                              replaceInputRef.current?.click();
                            }}
                          >
                            <UploadCloud className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Version History ${file.fileName}`}
                            title="Version History"
                            onClick={() => handleOpenVersions(file)}
                          >
                            <History className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Audit Trail ${file.fileName}`}
                            title="Audit Trail"
                            onClick={() => handleOpenAudit(file)}
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Rename or Move ${file.fileName}`}
                            title="Rename / Move"
                            onClick={() => {
                              setEditingFile(file);
                              setEditFileName(file.fileName);
                              setEditFileFolderId(file.folderId || '');
                            }}
                          >
                            <FolderInput className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Delete ${file.fileName}`}
                            title="Delete"
                            onClick={() => setDeletingFile(file)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-status-danger-text" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Inline Preview Drawer */}
      {previewFile && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-surface border-l border-default shadow-2xl flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-default">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-primary truncate">{previewFile.fileName}</h3>
              <p className="text-xs text-muted">
                v{previewFile.version} · {formatBytes(previewFile.sizeBytes)} · SHA-256: {previewFile.sha256.slice(0, 16)}...
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleDownload(previewFile)} leftIcon={<Download className="h-3.5 w-3.5" />}>
                Download
              </Button>
              <Button variant="ghost" size="sm" aria-label="Close preview" onClick={() => setPreviewFile(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 bg-surface-sunken flex items-center justify-center">
            {previewLoading ? (
              <p className="text-xs text-muted">Loading preview...</p>
            ) : previewUrl && previewFile.mimeType === 'application/pdf' ? (
              <iframe src={previewUrl} title={previewFile.fileName} className="w-full h-full min-h-[75vh] rounded-xl border border-default bg-white" />
            ) : previewUrl && previewFile.mimeType.startsWith('image/') ? (
              <img src={previewUrl} alt={previewFile.fileName} className="max-w-full max-h-[75vh] rounded-xl shadow-md object-contain" />
            ) : (
              <div className="p-8 rounded-xl border border-subtle bg-surface shadow-card text-center space-y-3 max-w-sm">
                <FileText className="h-10 w-10 mx-auto text-muted" />
                <p className="text-sm font-semibold text-primary">Preview unavailable for this file type</p>
                <p className="text-xs text-muted">Download the file to open it in Excel, Word, or your local application.</p>
                <Button variant="primary" size="sm" onClick={() => handleDownload(previewFile)} leftIcon={<Download className="h-4 w-4" />}>
                  Download to View
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Folder Create / Rename Dialog */}
      <Dialog open={folderModalOpen} onOpenChange={setFolderModalOpen}>
        <DialogContent size="xs">
          <form onSubmit={handleSaveFolder} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{renamingFolder ? 'Rename Folder' : 'New Vault Folder'}</DialogTitle>
            </DialogHeader>
            <Input
              value={folderNameInput}
              onChange={(e) => setFolderNameInput(e.target.value)}
              placeholder="e.g. FY 2026-27 Working Papers"
              autoFocus
              required
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFolderModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Save Folder
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={Boolean(versionsFile)} onOpenChange={(o) => !o && setVersionsFile(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Version History · {versionsFile?.fileName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-sunken">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="brand" size="xs">v{v.version}</Badge>
                    <span className="text-xs font-semibold text-primary">{v.fileName}</span>
                    {v.version === versionsFile?.version && (
                      <Badge variant="success" size="xs">Current</Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted mt-0.5">
                    {formatBytes(v.sizeBytes)} · Uploaded by {v.uploadedByName} · SHA256 {v.sha256.slice(0, 10)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => handleDownload(v)} leftIcon={<Download className="h-3 w-3" />}>
                    Download
                  </Button>
                  {v.version !== versionsFile?.version && (
                    <Button variant="secondary" size="sm" onClick={() => handleRestoreVersion(v)} leftIcon={<RotateCcw className="h-3 w-3" />}>
                      Restore
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Audit Trail Dialog */}
      <Dialog open={Boolean(auditFile)} onOpenChange={(o) => !o && setAuditFile(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Compliance Audit Trail · {auditFile?.fileName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-muted py-4 text-center">No audit events recorded.</p>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-sunken text-xs">
                  <div>
                    <Badge variant="neutral" size="xs">{log.action}</Badge>
                    <span className="ml-2 font-semibold text-primary">{log.actorName}</span>
                  </div>
                  <span className="text-muted font-mono text-[11px]">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename / Move File Dialog */}
      <Dialog open={Boolean(editingFile)} onOpenChange={(o) => !o && setEditingFile(null)}>
        <DialogContent size="xs">
          <form onSubmit={handleSaveFileMeta} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Rename or Move File</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                value={editFileName}
                onChange={(e) => setEditFileName(e.target.value)}
                placeholder="File name"
                required
              />
              <select
                value={editFileFolderId}
                onChange={(e) => setEditFileFolderId(e.target.value)}
                className="w-full rounded-xl border border-default bg-surface px-3 py-2 text-xs text-primary"
              >
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingFile(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={Boolean(deletingFile)} onOpenChange={(o) => !o && setDeletingFile(null)}>
        <DialogContent size="xs">
          <DialogHeader>
            <DialogTitle>Archive / Delete Document?</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-secondary">
            <strong>{deletingFile?.fileName}</strong> will be removed from the active vault and archived in compliance storage (<code className="font-mono">deleted/</code>). Audit logs remain intact.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeletingFile(null)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={handleConfirmDelete}>
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
