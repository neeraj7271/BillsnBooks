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

  const [formData, setFormData] = useState({
    companyId: '',
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
            clientCode: `CL-${first.legalName.slice(0, 3).toUpperCase()}-01`,
          }));
        }
      });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyId || !formData.clientCode || !formData.primaryContactName || !formData.primaryContactEmail) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiClient.createPracticeClient(formData);
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to onboard client';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Onboard Practice Client</DialogTitle>
            <DialogDescription>
              Assign an enterprise legal entity to your CA firm practice portfolio.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-600 dark:text-rose-400 font-medium">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <FormField label="Legal Entity (Company)" required>
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
            <Button type="submit" variant="primary" loading={loading}>
              Onboard Client
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
