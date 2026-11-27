'use client';

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
} from '@platform/ui';
import { INDIAN_GST_STATES_LIST } from '@platform/shared-types';
import { apiClient } from '@/lib/api-client';

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ClientDialog({ open, onOpenChange, onSuccess }: ClientDialogProps) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'new' | 'existing'>('new');

  const [formData, setFormData] = useState({
    companyId: '',
    legalName: '',
    pan: '',
    gstin: '',
    stateCode: '27',
    clientCode: '',
    primaryContactName: '',
    primaryContactEmail: '',
    primaryContactPhone: '',
    engagementType: 'RETAINER',
    serviceTier: 'STANDARD',
  });

  useEffect(() => {
    if (open) {
      apiClient.listCompanies().then((data) => {
        setCompanies(data || []);
        if (data?.length > 0 && !formData.companyId) {
          const first = data[0];
          setFormData((prev) => ({
            ...prev,
            companyId: first.id,
          }));
        }
      });
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientCode || !formData.primaryContactName || !formData.primaryContactEmail) {
      setError('Please fill in all required fields.');
      return;
    }

    if (mode === 'new' && !formData.legalName) {
      setError('Legal Name is required for a new client entity.');
      return;
    }

    if (mode === 'existing' && !formData.companyId) {
      setError('Please select an existing legal entity.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let targetCompanyId = formData.companyId;

      if (mode === 'new') {
        const createdComp = await apiClient.createCompany({
          legalName: formData.legalName.trim(),
          pan: formData.pan?.trim() || undefined,
          gstin: formData.gstin?.trim() || undefined,
          stateCode: formData.stateCode,
          defaultCurrency: 'INR',
        });
        targetCompanyId = createdComp.id;
      }

      await apiClient.createPracticeClient({
        companyId: targetCompanyId,
        clientCode: formData.clientCode.trim().toUpperCase(),
        primaryContactName: formData.primaryContactName.trim(),
        primaryContactEmail: formData.primaryContactEmail.trim().toLowerCase(),
        primaryContactPhone: formData.primaryContactPhone?.trim() || undefined,
        engagementType: formData.engagementType,
        serviceTier: formData.serviceTier,
      });

      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to onboard client';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const stateOptions = INDIAN_GST_STATES_LIST.map((s) => ({
    label: s.label,
    value: s.code,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Onboard Practice Client</DialogTitle>
            <DialogDescription>
              Assign or register an enterprise legal entity into your CA firm practice portfolio.
            </DialogDescription>
          </DialogHeader>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2 border-b border-default pb-2">
            <button
              type="button"
              className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
                mode === 'new'
                  ? 'bg-brand text-brand-inverse font-bold'
                  : 'text-secondary hover:text-primary hover:bg-surface-hover'
              }`}
              onClick={() => setMode('new')}
            >
              + Register New Entity
            </button>
            <button
              type="button"
              className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
                mode === 'existing'
                  ? 'bg-brand text-brand-inverse font-bold'
                  : 'text-secondary hover:text-primary hover:bg-surface-hover'
              }`}
              onClick={() => setMode('existing')}
            >
              Link Existing Company
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-status-danger-subtle border border-default text-xs text-status-danger-text font-medium">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {mode === 'new' ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Legal Name" required>
                    <Input
                      value={formData.legalName}
                      onChange={(e) => {
                        const val = e.target.value;
                        const code = val.length >= 3 ? `CL-${val.slice(0, 3).toUpperCase()}-01` : formData.clientCode;
                        setFormData({ ...formData, legalName: val, clientCode: code });
                      }}
                      placeholder="e.g. Acme Industries Ltd"
                    />
                  </FormField>

                  <FormField label="State" required>
                    <Select
                      value={formData.stateCode}
                      onValueChange={(val) => setFormData({ ...formData, stateCode: val })}
                      options={stateOptions}
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField label="PAN">
                    <Input
                      value={formData.pan}
                      onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                      placeholder="e.g. AABTH1201D"
                    />
                  </FormField>

                  <FormField label="GSTIN">
                    <Input
                      value={formData.gstin}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                      placeholder="e.g. 27AABTH1201D1ZG"
                    />
                  </FormField>
                </div>
              </>
            ) : (
              <FormField label="Select Existing Legal Entity" required>
                <Select
                  value={formData.companyId}
                  onValueChange={(cId) => {
                    const comp = companies.find((c) => c.id === cId);
                    setFormData((prev) => ({
                      ...prev,
                      companyId: cId,
                      clientCode: comp ? `CL-${comp.legalName.slice(0, 3).toUpperCase()}-01` : prev.clientCode,
                    }));
                  }}
                  options={companies.map((c) => ({
                    value: c.id,
                    label: `${c.legalName} (${c.pan || 'No PAN'})`,
                  }))}
                />
              </FormField>
            )}

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Client Code" required hint="e.g. CL-TEC-01">
                <Input
                  value={formData.clientCode}
                  onChange={(e) => setFormData({ ...formData, clientCode: e.target.value.toUpperCase() })}
                  placeholder="CL-001"
                />
              </FormField>

              <FormField label="Service Tier" required>
                <Select
                  value={formData.serviceTier}
                  onValueChange={(val) => setFormData({ ...formData, serviceTier: val })}
                  options={[
                    { value: 'STANDARD', label: 'Standard' },
                    { value: 'ENTERPRISE', label: 'Enterprise' },
                    { value: 'PRIORITY', label: 'Priority / VIP' },
                  ]}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Primary Contact Name" required>
                <Input
                  value={formData.primaryContactName}
                  onChange={(e) => setFormData({ ...formData, primaryContactName: e.target.value })}
                  placeholder="e.g. Ramesh Sharma"
                />
              </FormField>

              <FormField label="Primary Contact Email" required>
                <Input
                  type="email"
                  value={formData.primaryContactEmail}
                  onChange={(e) => setFormData({ ...formData, primaryContactEmail: e.target.value })}
                  placeholder="finance@client.com"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Phone Number">
                <Input
                  value={formData.primaryContactPhone}
                  onChange={(e) => setFormData({ ...formData, primaryContactPhone: e.target.value })}
                  placeholder="+91 98765 43210"
                />
              </FormField>

              <FormField label="Engagement Model" required>
                <Select
                  value={formData.engagementType}
                  onValueChange={(val) => setFormData({ ...formData, engagementType: val })}
                  options={[
                    { value: 'RETAINER', label: 'Monthly Retainer' },
                    { value: 'AUDIT', label: 'Statutory Audit' },
                    { value: 'BOOKKEEPING', label: 'Full Bookkeeping' },
                    { value: 'GST_COMPLIANCE', label: 'GST Compliance' },
                    { value: 'TAX_FILING', label: 'Tax Filing Only' },
                  ]}
                />
              </FormField>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={loading} aria-label="Save · Onboard Client">
              Save Client
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
