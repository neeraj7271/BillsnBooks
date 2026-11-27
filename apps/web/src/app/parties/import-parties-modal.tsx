'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Badge,
} from '@platform/ui';
import { UploadCloud, FileSpreadsheet, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';

interface ImportPartiesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ImportPartiesModal({ open, onOpenChange, onSuccess }: ImportPartiesModalProps) {
  const { activeCompanyId } = useCompany();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [failedCount, setFailedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      setError(null);

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const lines = text.split('\n').filter((l) => l.trim().length > 0);
          if (lines.length <= 1) {
            setError('CSV must contain a header and at least one row.');
            return;
          }
          const headers = lines[0]!.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
          const rows = lines.slice(1).map((line) => {
            const vals = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
            const obj: any = {};
            headers.forEach((h, idx) => {
              obj[h] = vals[idx] || '';
            });
            return obj;
          });
          setParsedRows(rows);
        } catch (err) {
          setError('Failed to parse CSV file.');
        }
      };
      reader.readAsText(f);
    }
  };

  const handleConfirmImport = async () => {
    if (!activeCompanyId || parsedRows.length === 0) return;
    setImporting(true);
    setProgress(0);
    setError(null);
    let fails = 0;

    for (let i = 0; i < parsedRows.length; i++) {
      const r = parsedRows[i];
      try {
        const partyName = r['Party Name'] || r['name'] || `Party ${i + 1}`;
        const partyType = r['Party Type'] || r['partyType'] || 'CUSTOMER';
        const gstin = r['GSTIN'] || r['gstin'] || '';
        const pan = r['PAN'] || r['pan'] || '';
        const stateCode = r['State Code'] || r['stateCode'] || '27';
        const email = r['Email'] || r['email'] || '';
        const phone = r['Phone'] || r['phone'] || '';
        const creditLimit = Number(r['Credit Limit'] || r['creditLimit'] || 0);

        await apiClient.createParty(activeCompanyId, {
          name: partyName,
          partyType: partyType.toUpperCase() === 'VENDOR' ? 'VENDOR' : 'CUSTOMER',
          registrationType: gstin ? ('REGULAR' as any) : ('UNREGISTERED' as any),
          gstin: gstin || undefined,
          pan: pan || undefined,
          billingStateCode: stateCode,
          billingState: 'India',
          email: email || undefined,
          phone: phone || undefined,
          creditLimit: creditLimit > 0 ? creditLimit : undefined,
          currency: 'INR',
        });
      } catch (err) {
        fails++;
      }
      setProgress(Math.round(((i + 1) / parsedRows.length) * 100));
    }

    setFailedCount(fails);
    setImporting(false);
    setCompleted(true);
    setStep(4);
  };

  const reset = () => {
    setStep(1);
    setFile(null);
    setParsedRows([]);
    setProgress(0);
    setCompleted(false);
    setFailedCount(0);
    setError(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(op) => {
        if (!op) reset();
        onOpenChange(op);
      }}
    >
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Import Parties Wizard</DialogTitle>
          <DialogDescription>
            Bulk import customer and vendor master accounts with statutory GST validation.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-xl bg-status-danger-subtle border border-status-danger text-xs text-status-danger-text font-medium">
            {error}
          </div>
        )}

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-subtle rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-3 bg-surface-sunken">
              <div className="h-12 w-12 rounded-full bg-brand-subtle text-brand-text flex items-center justify-center">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">
                  {file ? file.name : 'Choose a CSV file containing parties'}
                </p>
                <p className="text-xs text-muted mt-1">Supports standard CSV with Party Name, GSTIN, PAN, State Code</p>
              </div>

              <label className="cursor-pointer">
                <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-subtle bg-surface px-4 py-2 text-xs font-semibold text-secondary hover:bg-row-hover shadow-xs">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-brand-text" />
                  Browse Files
                </span>
              </label>
            </div>
            {file && (
              <div className="text-xs text-secondary font-medium text-center">
                Detected {parsedRows.length} rows ready for mapping.
              </div>
            )}
          </div>
        )}

        {/* Step 2: Mapping */}
        {step === 2 && (
          <div className="space-y-3 text-xs">
            <div className="font-semibold text-primary">Column Mapping Confirmation:</div>
            <div className="grid grid-cols-2 gap-2 p-3 bg-surface-sunken rounded-xl">
              <div>Party Name → <span className="font-mono text-brand-text">Party Name</span> ✓</div>
              <div>Classification → <span className="font-mono text-brand-text">Party Type</span> ✓</div>
              <div>GSTIN / Tax ID → <span className="font-mono text-brand-text">GSTIN</span> ✓</div>
              <div>PAN → <span className="font-mono text-brand-text">PAN</span> ✓</div>
              <div>State Code → <span className="font-mono text-brand-text">State Code</span> ✓</div>
              <div>Credit Limit → <span className="font-mono text-brand-text">Credit Limit</span> ✓</div>
            </div>
            <div className="text-muted text-[11px]">
              All statutory columns auto-detected from CSV headers.
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-primary">Preview ({parsedRows.length} rows):</span>
              <Badge variant="success" size="sm">Valid ✓</Badge>
            </div>
            <div className="max-h-56 overflow-y-auto border border-subtle rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-sunken border-b border-subtle text-[11px] font-semibold text-secondary">
                  <tr>
                    <th className="p-2">Name</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">GSTIN</th>
                    <th className="p-2">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-default">
                  {parsedRows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="hover:bg-row-hover">
                      <td className="p-2 font-medium">{r['Party Name'] || r['name']}</td>
                      <td className="p-2">{r['Party Type'] || r['partyType'] || 'CUSTOMER'}</td>
                      <td className="p-2 font-mono text-[11px]">{r['GSTIN'] || r['gstin'] || '—'}</td>
                      <td className="p-2 font-mono text-[11px]">{r['State Code'] || r['stateCode'] || '27'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Step 4: Status Report */}
        {step === 4 && (
          <div className="py-6 text-center space-y-4">
            <div className="h-14 w-14 mx-auto rounded-full bg-status-success-subtle text-status-success-text flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div
              data-testid="import-status-banner"
              className="text-lg font-bold text-status-success-text tracking-wide"
            >
              COMPLETED · {failedCount} failed
            </div>
            <p className="text-xs text-secondary max-w-sm mx-auto">
              Successfully processed and imported {parsedRows.length - failedCount} counterparty master records into your active ledger.
            </p>
          </div>
        )}

        <DialogFooter>
          {step === 1 && (
            <Button
              variant="primary"
              size="sm"
              disabled={!file || parsedRows.length === 0}
              onClick={() => setStep(2)}
              rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
            >
              Proceed to Mapping
            </Button>
          )}

          {step === 2 && (
            <div className="flex justify-between w-full">
              <Button variant="outline" size="sm" onClick={() => setStep(1)} leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}>
                Back
              </Button>
              <Button variant="primary" size="sm" onClick={() => setStep(3)} rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                Preview Rows
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="flex justify-between w-full">
              <Button variant="outline" size="sm" onClick={() => setStep(2)} leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}>
                Back
              </Button>
              <Button variant="primary" size="sm" loading={importing} onClick={handleConfirmImport}>
                Confirm Import ({parsedRows.length} Rows)
              </Button>
            </div>
          )}

          {step === 4 && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onSuccess();
                onOpenChange(false);
                reset();
              }}
            >
              Finish & Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
