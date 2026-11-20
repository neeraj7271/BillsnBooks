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
      console.error(e);
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
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50 py-1.5 text-xs">
                <div className="px-3 py-1 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                  Standard Templates (.xlsx)
                </div>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between"
                  onClick={() => handleDownloadTemplate('sales-invoices')}
                >
                  <span className="font-medium text-slate-700 dark:text-slate-200">Sales Invoices</span>
                  <span className="text-[10px] text-blue-500 font-mono">GST B2B/B2C</span>
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between"
                  onClick={() => handleDownloadTemplate('purchase-bills')}
                >
                  <span className="font-medium text-slate-700 dark:text-slate-200">Purchase Bills</span>
                  <span className="text-[10px] text-slate-400 font-mono">Vendor</span>
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between"
                  onClick={() => handleDownloadTemplate('bank-statement')}
                >
                  <span className="font-medium text-slate-700 dark:text-slate-200">Bank Statement</span>
                  <span className="text-[10px] text-emerald-500 font-mono">Universal</span>
                </button>
                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                <div className="px-3 py-1 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                  Master Records
                </div>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                  onClick={() => handleDownloadTemplate('parties-master')}
                >
                  <span className="font-medium text-slate-700 dark:text-slate-200">Parties Master (Customers/Vendors)</span>
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                  onClick={() => handleDownloadTemplate('items-master')}
                >
                  <span className="font-medium text-slate-700 dark:text-slate-200">Items Master (Products/Services)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {uploadError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-xs text-rose-600 font-medium">
            {uploadError}
          </div>
        )}

        <div className="flex gap-3">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Register Type:</label>
          <div className="flex gap-4 text-xs">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="importType"
                value="SALES_REGISTER"
                checked={importType === 'SALES_REGISTER'}
                onChange={(e) => onImportTypeChange(e.target.value)}
                className="text-blue-600"
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
                className="text-blue-600"
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
                className="text-blue-600"
              />
              <span>Bank Statement (Multi-Bank)</span>
            </label>
          </div>
        </div>

        <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="h-12 w-12 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
            <UploadCloud className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {file ? file.name : 'Choose an Excel or CSV file to import'}
            </p>
            <p className="text-xs text-slate-400 mt-1">Supports .xlsx, .xls, .csv from net-banking or standard templates</p>
          </div>

          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={onFileChange}
              className="hidden"
            />
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-xs">
              <FileSpreadsheet className="h-3.5 w-3.5 text-blue-500" />
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

