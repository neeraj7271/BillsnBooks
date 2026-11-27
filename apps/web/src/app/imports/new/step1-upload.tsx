import { logger } from '@/lib/logger';
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button } from '@platform/ui';
import { UploadCloud, FileSpreadsheet, Download, ChevronDown } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface Step1UploadProps {
  file: File | null;
  uploading: boolean;
  uploadError: string | null;
  importType: string;
  onImportTypeChange: (type: string) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
}

export function Step1Upload({
  file,
  uploading,
  uploadError,
  importType,
  onImportTypeChange,
  onFileChange,
  onUpload,
}: Step1UploadProps) {
  const [downloading, setDownloading] = useState(false);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);

  const handleDownloadTemplate = async (type: string) => {
    try {
      setDownloading(true);
      setTemplateMenuOpen(false);
      await apiClient.downloadImportTemplate(type);
    } catch (e) {
      logger.error(e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Step 1: Upload Bank, Sales, or Purchase Register</CardTitle>
            <CardDescription>
              Upload your Excel or CSV file. We support statutory GST validation, missing master resolution, and multi-bank formats.
            </CardDescription>
          </div>

          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              loading={downloading}
              onClick={() => setTemplateMenuOpen(!templateMenuOpen)}
              leftIcon={<Download className="h-3.5 w-3.5" />}
              rightIcon={<ChevronDown className="h-3.5 w-3.5 ml-1" />}
            >
              Download Excel Template
            </Button>

            {templateMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-subtle bg-surface-raised shadow-popover z-50 py-1.5 text-xs">
                <div className="px-3 py-1 font-semibold text-muted uppercase tracking-wider text-[10px]">
                  Standard Templates (.xlsx)
                </div>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-row-hover flex items-center justify-between"
                  onClick={() => handleDownloadTemplate('sales-invoices')}
                >
                  <span className="font-medium text-primary">Sales Invoices</span>
                  <span className="text-[10px] text-brand-text font-mono">GST B2B/B2C</span>
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-row-hover flex items-center justify-between"
                  onClick={() => handleDownloadTemplate('purchase-bills')}
                >
                  <span className="font-medium text-primary">Purchase Bills</span>
                  <span className="text-[10px] text-muted font-mono">Vendor</span>
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-row-hover flex items-center justify-between"
                  onClick={() => handleDownloadTemplate('bank-statement')}
                >
                  <span className="font-medium text-primary">Bank Statement</span>
                  <span className="text-[10px] text-status-success-text font-mono">Universal</span>
                </button>
                <div className="border-t border-subtle my-1" />
                <div className="px-3 py-1 font-semibold text-muted uppercase tracking-wider text-[10px]">
                  Master Records
                </div>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-row-hover"
                  onClick={() => handleDownloadTemplate('parties-master')}
                >
                  <span className="font-medium text-primary">Parties Master (Customers/Vendors)</span>
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-row-hover"
                  onClick={() => handleDownloadTemplate('items-master')}
                >
                  <span className="font-medium text-primary">Items Master (Products/Services)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {uploadError && (
          <div className="p-3 rounded-xl bg-status-danger-subtle border border-status-danger text-xs text-status-danger-text font-medium">
            {uploadError}
          </div>
        )}

        <div className="flex gap-3">
          <label className="text-xs font-semibold text-secondary">Register Type:</label>
          <div className="flex gap-4 text-xs">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="importType"
                value="SALES_REGISTER"
                checked={importType === 'SALES_REGISTER'}
                onChange={(e) => onImportTypeChange(e.target.value)}
                className="text-brand"
              />
              <span>Sales Invoices</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="importType"
                value="PURCHASE_REGISTER"
                checked={importType === 'PURCHASE_REGISTER'}
                onChange={(e) => onImportTypeChange(e.target.value)}
                className="text-brand"
              />
              <span>Purchase Bills</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="importType"
                value="BANK_STATEMENT"
                checked={importType === 'BANK_STATEMENT'}
                onChange={(e) => onImportTypeChange(e.target.value)}
                className="text-brand"
              />
              <span>Bank Statement (Multi-Bank)</span>
            </label>
          </div>
        </div>

        <div className="border-2 border-dashed border-default rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-3 bg-surface-sunken">
          <div className="h-12 w-12 rounded-full bg-brand-subtle text-brand-text flex items-center justify-center">
            <UploadCloud className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary">
              {file ? file.name : 'Choose an Excel or CSV file to import'}
            </p>
            <p className="text-xs text-muted mt-1">Supports .xlsx, .xls, .csv from net-banking or standard templates</p>
          </div>

          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={onFileChange}
              className="hidden"
            />
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-default bg-surface px-4 py-2 text-xs font-semibold text-secondary hover:bg-row-hover shadow-xs">
              <FileSpreadsheet className="h-3.5 w-3.5 text-brand-text" />
              Browse Files
            </span>
          </label>
        </div>
      </CardContent>

      <CardFooter className="justify-end">
        <Button
          variant="primary"
          size="md"
          disabled={!file}
          loading={uploading}
          onClick={onUpload}
        >
          Proceed to Header Mapping
        </Button>
      </CardFooter>
    </Card>
  );
}

