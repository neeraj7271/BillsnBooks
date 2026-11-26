import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  FormField,
  Input,
  Select,
  Button,
  Badge,
} from '@platform/ui';
import { INDIAN_GST_STATES_LIST, WORLD_CURRENCIES } from '@platform/shared-types';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { Cloud, Server, Receipt, Check } from 'lucide-react';

interface CompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (legalName: string) => void;
  initialData?: any | null;
}

export type AccountingMode = 'STANDALONE' | 'TALLY_SYNC' | 'INVOICING_ONLY';

const INITIAL_FORM_STATE = {
  legalName: '',
  tradeName: '',
  pan: '',
  gstin: '',
  stateCode: '27',
  defaultCurrency: 'INR',
  addressLine1: '',
  pincode: '',
  accountingMode: 'STANDALONE' as AccountingMode,
};

export function CompanyDialog({ open, onOpenChange, onSuccess, initialData }: CompanyDialogProps) {
  const { refreshSettings } = useCompany();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  useEffect(() => {
    if (open) {
      if (initialData) {
        const headOffice =
          initialData.branches?.find((b: any) => b.isHeadOffice) ||
          initialData.branches?.[0] ||
          null;

        setFormData({
          legalName: initialData.legalName || '',
          tradeName: initialData.tradeName || '',
          pan: initialData.pan || initialData.panEncrypted || '',
          gstin: headOffice?.gstin || '',
          stateCode: headOffice?.stateCode || '27',
          defaultCurrency: initialData.defaultCurrency || 'INR',
          addressLine1: headOffice?.addressLine1 || '',
          pincode: headOffice?.pincode || '',
          accountingMode: 'STANDALONE',
        });

        // Load existing mode setting
        if (initialData.id) {
          apiClient
            .getCompanySettings(initialData.id)
            .then((settings) => {
              if (settings?.['integration.tally_enabled']) {
                setFormData((prev) => ({ ...prev, accountingMode: 'TALLY_SYNC' }));
              } else if (settings?.['portal.invoicing_only']) {
                setFormData((prev) => ({ ...prev, accountingMode: 'INVOICING_ONLY' }));
              } else {
                setFormData((prev) => ({ ...prev, accountingMode: 'STANDALONE' }));
              }
            })
            .catch(() => {});
        }
      } else {
        setFormData(INITIAL_FORM_STATE);
      }
      setError(null);
    }
  }, [open, initialData]);

  const stateOptions = INDIAN_GST_STATES_LIST.map((s) => ({
    label: s.label,
    value: s.code,
  }));

  const currencyOptions = WORLD_CURRENCIES.map((c) => ({
    label: c.label,
    value: c.code,
  }));

  const handleGstinChange = (val: string) => {
    const uppercase = val.toUpperCase().trim();
    // Auto-detect and sync State Code from the first 2 digits of GSTIN
    if (uppercase.length >= 2) {
      const code = uppercase.substring(0, 2);
      const stateExists = INDIAN_GST_STATES_LIST.some((s) => s.code === code);
      if (stateExists) {
        setFormData((prev) => ({ ...prev, gstin: uppercase, stateCode: code }));
        return;
      }
    }
    setFormData((prev) => ({ ...prev, gstin: uppercase }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Validation for PAN
    if (formData.pan) {
      const panClean = formData.pan.trim().toUpperCase();
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(panClean)) {
        setError(`Invalid PAN format '${panClean}'. PAN must be 10 characters (e.g. AABCA1234F: 5 letters, 4 digits, 1 letter).`);
        setSubmitting(false);
        return;
      }
    }

    try {
      let targetId: string;
      let finalLegalName = formData.legalName;

      if (initialData?.id) {
        // Edit existing company
        targetId = initialData.id;
        const res = await apiClient.updateCompany(initialData.id, {
          legalName: formData.legalName.trim(),
          tradeName: formData.tradeName.trim() || undefined,
          pan: formData.pan.trim().toUpperCase() || undefined,
          gstin: formData.gstin.trim().toUpperCase() || undefined,
          stateCode: formData.stateCode,
          defaultCurrency: formData.defaultCurrency,
          addressLine1: formData.addressLine1.trim() || undefined,
          pincode: formData.pincode.trim() || undefined,
        });
        finalLegalName = res.legalName || formData.legalName;
      } else {
        // Register new company
        const res = await apiClient.createCompany({
          legalName: formData.legalName.trim(),
          tradeName: formData.tradeName.trim() || undefined,
          pan: formData.pan.trim().toUpperCase() || undefined,
          gstin: formData.gstin.trim().toUpperCase() || undefined,
          stateCode: formData.stateCode,
          defaultCurrency: formData.defaultCurrency,
        });
        targetId = res.id;
        finalLegalName = res.legalName;
      }

      // Persist chosen Accounting & Integration Mode settings
      if (targetId) {
        try {
          await apiClient.setCompanySetting(
            targetId,
            'integration.tally_enabled',
            formData.accountingMode === 'TALLY_SYNC'
          );
          await apiClient.setCompanySetting(
            targetId,
            'portal.invoicing_only',
            formData.accountingMode === 'INVOICING_ONLY'
          );
          await refreshSettings();
        } catch (settingsErr) {
          console.error('Failed to save integration mode settings', settingsErr);
        }
      }

      onOpenChange(false);
      onSuccess(finalLegalName);
    } catch (err: unknown) {
      let msg = initialData ? 'Failed to update company' : 'Failed to register company';
      if (err instanceof Error) {
        msg = err.message;
      } else if (typeof err === 'object' && err !== null) {
        msg = (err as any).message || (err as any).error || JSON.stringify(err);
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Company Profile' : 'Register New Company'}</DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Update enterprise legal entity credentials, PAN, currency, and Tally integration mode.'
              : 'Creates an isolated multi-tenant company with customized accounting and Tally integration profile.'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-xl bg-status-danger-subtle border border-default text-xs text-status-danger-text font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Operating Mode Selector */}
          <div>
            <label className="text-xs font-bold text-primary block mb-2">
              Accounting & Integration Mode:
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {/* Option 1: Standalone Cloud */}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, accountingMode: 'STANDALONE' })}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  formData.accountingMode === 'STANDALONE'
                    ? 'border-focus bg-brand-subtle ring-2 ring-focus-ring/20'
                    : 'border-default hover:border-strong bg-surface'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Cloud className="h-4 w-4 text-brand-text" />
                      <span className="font-bold text-xs text-primary">
                        Standalone Cloud
                      </span>
                    </div>
                    {formData.accountingMode === 'STANDALONE' && (
                      <Check className="h-3.5 w-3.5 text-brand-text" />
                    )}
                  </div>
                  <p className="text-[11px] text-secondary leading-snug">
                    Zero Tally overhead. Complete cloud accounting, BRS, invoicing & GST.
                  </p>
                </div>
                <Badge variant="neutral" size="xs" className="mt-2.5 w-fit">
                  No Tally Sync
                </Badge>
              </button>

              {/* Option 2: Tally Prime Connected */}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, accountingMode: 'TALLY_SYNC' })}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  formData.accountingMode === 'TALLY_SYNC'
                    ? 'border-status-warning bg-status-warning-subtle ring-2 ring-status-warning/20'
                    : 'border-default hover:border-strong bg-surface'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-status-warning-text" />
                      <span className="font-bold text-xs text-primary">
                        Tally Prime Sync
                      </span>
                    </div>
                    {formData.accountingMode === 'TALLY_SYNC' && (
                      <Check className="h-3.5 w-3.5 text-status-warning-text" />
                    )}
                  </div>
                  <p className="text-[11px] text-secondary leading-snug">
                    For CAs & Tally users. 2-way XML gateway, live connector & ledger aliases.
                  </p>
                </div>
                <Badge variant="warning" size="xs" className="mt-2.5 w-fit">
                  Tally Prime Gateway
                </Badge>
              </button>

              {/* Option 3: Invoicing Only */}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, accountingMode: 'INVOICING_ONLY' })}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  formData.accountingMode === 'INVOICING_ONLY'
                    ? 'border-status-success bg-status-success-subtle ring-2 ring-status-success/20'
                    : 'border-default hover:border-strong bg-surface'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-status-success-text" />
                      <span className="font-bold text-xs text-primary">
                        Invoicing Only
                      </span>
                    </div>
                    {formData.accountingMode === 'INVOICING_ONLY' && (
                      <Check className="h-3.5 w-3.5 text-status-success-text" />
                    )}
                  </div>
                  <p className="text-[11px] text-secondary leading-snug">
                    Streamlined sales billing, WhatsApp/PDF delivery, UPI QR & GST summaries.
                  </p>
                </div>
                <Badge variant="success" size="xs" className="mt-2.5 w-fit">
                  Simple Billing
                </Badge>
              </button>
            </div>
          </div>

          <FormField label="Legal Name" required id="comp-legal-name">
            <Input
              id="comp-legal-name"
              required
              value={formData.legalName}
              onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
              placeholder="e.g. Acme Global Technologies Pvt Ltd"
            />
          </FormField>

          <FormField label="Trade Name" id="comp-trade-name">
            <Input
              id="comp-trade-name"
              value={formData.tradeName}
              onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
              placeholder="e.g. Acme Cloud Solutions"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="PAN (10 Chars)" required id="comp-pan">
              <Input
                id="comp-pan"
                required
                maxLength={10}
                value={formData.pan}
                onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                placeholder="AABCA1234F"
                className="font-mono uppercase"
              />
            </FormField>

            <FormField label="GSTIN (Optional for Unregistered)" id="comp-gstin">
              <Input
                id="comp-gstin"
                maxLength={15}
                value={formData.gstin}
                onChange={(e) => handleGstinChange(e.target.value)}
                placeholder="27AABCA1234F1Z5"
                className="font-mono uppercase"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Operating State / Jurisdiction" required>
              <Select
                value={formData.stateCode}
                onValueChange={(val) => setFormData({ ...formData, stateCode: val })}
                options={stateOptions}
                placeholder="Select State / Jurisdiction"
              />
            </FormField>

            <FormField label="Operating Base Currency" required>
              <Select
                value={formData.defaultCurrency}
                onValueChange={(val) => setFormData({ ...formData, defaultCurrency: val })}
                options={currencyOptions}
                placeholder="Select Currency"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1 border-t border-subtle">
            <div className="col-span-2">
              <FormField label="Head Office Address (Optional)" id="comp-addr">
                <Input
                  id="comp-addr"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  placeholder="e.g. 402 Business Point, Andheri East"
                  className="text-xs"
                />
              </FormField>
            </div>

            <div>
              <FormField label="PIN Code" id="comp-pin">
                <Input
                  id="comp-pin"
                  maxLength={6}
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '') })}
                  placeholder="400069"
                  className="font-mono text-xs"
                />
              </FormField>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setFormData(INITIAL_FORM_STATE);
                setError(null);
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submitting}>
              {initialData ? 'Save Changes' : 'Register Company'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
