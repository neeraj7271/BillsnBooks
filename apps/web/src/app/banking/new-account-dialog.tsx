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
  CurrencyInput,
  Select,
  Button,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';

interface NewAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (accName: string) => void;
  companyId?: string;
}

export function NewAccountDialog({
  open,
  onOpenChange,
  onSuccess,
  companyId,
}: NewAccountDialogProps) {
  const { activeCompanyId } = useCompany();
  const targetCompanyId = companyId || activeCompanyId;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountType: 'CURRENT',
    openingBalance: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiClient.createBankAccount({
        companyId: targetCompanyId,
        ...formData,
      });
      onOpenChange(false);
      onSuccess(formData.bankName);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to register account';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Register Bank Account</DialogTitle>
          <DialogDescription>
            Connect institutional bank account with auto-provisioned general ledger mapping.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-xs text-rose-600 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Bank Institution Name" required id="bank-inst">
            <Input
              id="bank-inst"
              required
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              placeholder="e.g. HDFC Bank Ltd"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Account Number" required id="bank-acc-no">
              <Input
                id="bank-acc-no"
                required
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                placeholder="50200012345678"
                className="font-mono"
              />
            </FormField>

            <FormField label="IFSC Code" required id="bank-ifsc">
              <Input
                id="bank-ifsc"
                required
                maxLength={11}
                value={formData.ifscCode}
                onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                placeholder="HDFC0000060"
                className="font-mono uppercase"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Account Type" required>
              <Select
                value={formData.accountType}
                onValueChange={(val) => setFormData({ ...formData, accountType: val })}
                options={[
                  { label: 'Current Account', value: 'CURRENT' },
                  { label: 'Savings Account', value: 'SAVINGS' },
                  { label: 'Overdraft (OD)', value: 'OVERDRAFT' },
                ]}
              />
            </FormField>

            <FormField label="Opening Balance" id="bank-open-bal">
              <CurrencyInput
                id="bank-open-bal"
                value={formData.openingBalance}
                onChange={(val) => setFormData({ ...formData, openingBalance: val })}
              />
            </FormField>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={loading}>
              Create Bank Account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
