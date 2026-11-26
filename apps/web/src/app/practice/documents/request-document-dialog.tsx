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

interface RequestDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultClientId?: string;
}

export function RequestDocumentDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultClientId,
}: RequestDocumentDialogProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    clientId: defaultClientId || '',
    title: '',
    description: '',
    documentType: 'BANK_STATEMENT',
    period: new Date().toISOString().slice(0, 7),
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]!,
  });

  useEffect(() => {
    if (open) {
      apiClient.listPracticeClients().then((data) => {
        setClients(data || []);
        if (data?.length > 0 && !formData.clientId) {
          setFormData((prev) => ({ ...prev, clientId: defaultClientId || data[0].id }));
        }
      });
    }
  }, [open, defaultClientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId || !formData.title) {
      setError('Please select client and provide request title.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiClient.createPracticeDocumentRequest(formData);
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create document request';
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
            <DialogTitle>Request Source Documents</DialogTitle>
            <DialogDescription>
              Prompt the client finance team to upload statements, registers, or vouchers.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="p-3 rounded-lg bg-status-danger-subtle border border-default text-xs text-status-danger-text font-medium">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <FormField label="Client" required>
              <Select
                value={formData.clientId}
                onValueChange={(val) => setFormData({ ...formData, clientId: val })}
                options={clients.map((c) => ({
                  value: c.id,
                  label: `${c.companyName} (${c.clientCode})`,
                }))}
              />
            </FormField>

            <FormField label="Request Title" required hint="e.g. Bank Statement (HDFC Current Account)">
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Document Description"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Document Type" required>
                <Select
                  value={formData.documentType}
                  onValueChange={(val) => setFormData({ ...formData, documentType: val })}
                  options={[
                    { value: 'BANK_STATEMENT', label: 'Bank Statement' },
                    { value: 'SALES_REGISTER', label: 'Sales Register (GSTR-1)' },
                    { value: 'PURCHASE_BILLS', label: 'Purchase Bills (ITC Verification)' },
                    { value: 'EXPENSE_VOUCHERS', label: 'Expense Vouchers' },
                    { value: 'CHALLAN', label: 'Tax Payment Challan' },
                    { value: 'OTHER', label: 'Other Compliance Document' },
                  ]}
                />
              </FormField>

              <FormField label="Statutory Period" required hint="e.g. 2026-10">
                <Input
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                  placeholder="2026-10"
                />
              </FormField>
            </div>

            <FormField label="Submission Deadline" required>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </FormField>

            <FormField label="Client Notes">
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Include password format, required months, or account specifics..."
              />
            </FormField>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              Send Document Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
