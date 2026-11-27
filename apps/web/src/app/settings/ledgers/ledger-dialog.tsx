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
  Switch,
  Button,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';

interface LedgerDialogProps {
  open: boolean;
  groups: any[];
  onOpenChange: (open: boolean) => void;
  onSuccess: (ledgerName: string) => void;
  companyId?: string;
  defaultGroupId?: string;
}

export function LedgerDialog({
  open,
  groups,
  onOpenChange,
  onSuccess,
  companyId,
  defaultGroupId,
}: LedgerDialogProps) {
  const { activeCompanyId, tallyEnabled } = useCompany();
  const targetCompanyId = companyId || activeCompanyId;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ledgerData, setLedgerData] = useState({
    groupId: defaultGroupId || groups[0]?.id || '',
    code: '',
    name: '',
    openingBalance: 0,
    isBankOrCash: false,
    tallyLedgerName: '',
    scheduleIiiMapping: '',
    gstTaxType: '',
    gstRate: '',
  });

  // Sync defaultGroupId when modal opens
  React.useEffect(() => {
    if (defaultGroupId) {
      setLedgerData((prev) => ({ ...prev, groupId: defaultGroupId }));
    } else if (groups.length > 0 && !ledgerData.groupId) {
      setLedgerData((prev) => ({ ...prev, groupId: groups[0].id }));
    }
  }, [defaultGroupId, groups]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ledgerData.name.trim()) {
      setError('Please provide an account name.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiClient.createLedger(targetCompanyId, {
        groupId: ledgerData.groupId,
        code: ledgerData.code ? ledgerData.code.trim() : undefined,
        name: ledgerData.name.trim(),
        openingBalance: ledgerData.openingBalance,
        isBankOrCash: ledgerData.isBankOrCash,
        tallyLedgerName: ledgerData.tallyLedgerName || undefined,
        scheduleIiiMapping: ledgerData.scheduleIiiMapping || undefined,
        gstTaxType: ledgerData.gstTaxType || undefined,
        gstRate: ledgerData.gstRate ? parseFloat(ledgerData.gstRate) : undefined,
      });
      onOpenChange(false);
      onSuccess(ledgerData.name);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create ledger';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Create General Ledger Account</DialogTitle>
          <DialogDescription>
            Adds an account under the Chart of Accounts with auto-assigned 4-digit code.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-xl bg-status-danger-subtle border border-default text-xs text-status-danger-text font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Parent Ledger Group" required>
            <Select
              value={ledgerData.groupId || groups[0]?.id || ''}
              onValueChange={(val) => setLedgerData({ ...ledgerData, groupId: val })}
              options={groups.map((g) => ({
                label: `${g.code ? g.code + ' - ' : ''}${g.name} (${g.nature})`,
                value: g.id,
              }))}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Account Code (Auto-Assigned)" id="led-code">
              <Input
                id="led-code"
                value={ledgerData.code}
                onChange={(e) => setLedgerData({ ...ledgerData, code: e.target.value })}
                placeholder="Leave empty for auto-code"
                className="font-mono text-xs"
              />
            </FormField>

            <FormField label="Account Name" required id="led-name">
              <Input
                id="led-name"
                required
                value={ledgerData.name}
                onChange={(e) => setLedgerData({ ...ledgerData, name: e.target.value })}
                placeholder="e.g. ICICI Bank Current A/c"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Opening Balance (INR)" id="led-opening">
              <CurrencyInput
                id="led-opening"
                value={ledgerData.openingBalance}
                onChange={(val) => setLedgerData({ ...ledgerData, openingBalance: val })}
              />
            </FormField>

            {tallyEnabled && (
              <FormField label="Tally Ledger Alias" id="led-tally">
                <Input
                  id="led-tally"
                  value={ledgerData.tallyLedgerName}
                  onChange={(e) => setLedgerData({ ...ledgerData, tallyLedgerName: e.target.value })}
                  placeholder="For seamless Tally XML bridge"
                />
              </FormField>
            )}
          </div>

          <Switch
            id="led-is-bank"
            checked={ledgerData.isBankOrCash}
            onCheckedChange={(checked) => setLedgerData({ ...ledgerData, isBankOrCash: checked })}
            label="Designate as Bank or Cash Account"
            description="Enables automated statement parsing, BRS, and cash-in-hand rules"
          />

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submitting}>
              Create Ledger
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
