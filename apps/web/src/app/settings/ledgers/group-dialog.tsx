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
  Select,
  Button,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';

interface GroupDialogProps {
  open: boolean;
  groups?: any[];
  onOpenChange: (open: boolean) => void;
  onSuccess: (groupName: string) => void;
  companyId?: string;
  defaultParentGroupId?: string;
}

export function GroupDialog({
  open,
  groups = [],
  onOpenChange,
  onSuccess,
  companyId,
  defaultParentGroupId,
}: GroupDialogProps) {
  const { activeCompanyId, tallyEnabled } = useCompany();
  const targetCompanyId = companyId || activeCompanyId;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [groupData, setGroupData] = useState({
    parentGroupId: defaultParentGroupId || '',
    code: '',
    name: '',
    nature: 'ASSET',
    tallyGroupName: '',
  });

  React.useEffect(() => {
    if (defaultParentGroupId) {
      const parent = groups.find((g) => g.id === defaultParentGroupId);
      setGroupData((prev) => ({
        ...prev,
        parentGroupId: defaultParentGroupId,
        nature: parent?.nature || prev.nature,
      }));
    }
  }, [defaultParentGroupId, groups]);

  const handleParentChange = (parentId: string) => {
    const parent = groups.find((g) => g.id === parentId);
    setGroupData((prev) => ({
      ...prev,
      parentGroupId: parentId,
      nature: parent ? parent.nature : prev.nature,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupData.name.trim()) {
      setError('Please provide a group name.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiClient.createLedgerGroup(targetCompanyId, {
        parentGroupId: groupData.parentGroupId ? groupData.parentGroupId : undefined,
        code: groupData.code ? groupData.code.trim() : undefined,
        name: groupData.name.trim(),
        nature: groupData.nature,
        tallyGroupName: groupData.tallyGroupName ? groupData.tallyGroupName.trim() : undefined,
      });
      onOpenChange(false);
      onSuccess(groupData.name);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create group';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const parentOptions = [
    { label: 'None (Top-Level Primary Group)', value: '' },
    ...groups.map((g) => ({
      label: `${g.code ? g.code + ' - ' : ''}${g.name} (${g.nature})`,
      value: g.id,
    })),
  ];

  const isParentSelected = Boolean(groupData.parentGroupId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Add Ledger Classification Group</DialogTitle>
          <DialogDescription>
            Categorize accounts under Assets, Liabilities, Equity, Revenue, or Expense.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-xl bg-status-danger-subtle bg-status-danger border border-status-danger text-xs text-status-danger-text font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Parent Group (Hierarchy)">
            <Select
              value={groupData.parentGroupId}
              onValueChange={handleParentChange}
              options={parentOptions}
              placeholder="Select parent group or None"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Group Code (Auto-Assigned)" id="grp-code">
              <Input
                id="grp-code"
                value={groupData.code}
                onChange={(e) => setGroupData({ ...groupData, code: e.target.value })}
                placeholder="Leave empty for auto-code"
                className="font-mono text-xs"
              />
            </FormField>

            <FormField label="Group Name" required id="grp-name">
              <Input
                id="grp-name"
                required
                value={groupData.name}
                onChange={(e) => setGroupData({ ...groupData, name: e.target.value })}
                placeholder="e.g. Marketing Expenses"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label={isParentSelected ? 'Statutory Nature (Inherited)' : 'Statutory Nature'}
              required
            >
              <Select
                value={groupData.nature}
                onValueChange={(val) => setGroupData({ ...groupData, nature: val })}
                disabled={isParentSelected}
                options={[
                  { label: 'Asset (Debit Normal)', value: 'ASSET' },
                  { label: 'Liability (Credit Normal)', value: 'LIABILITY' },
                  { label: 'Equity (Credit Normal)', value: 'EQUITY' },
                  { label: 'Revenue / Income (Credit Normal)', value: 'INCOME' },
                  { label: 'Expense (Debit Normal)', value: 'EXPENSE' },
                ]}
              />
            </FormField>

            {tallyEnabled && (
              <FormField label="Tally Group Alias" id="grp-tally">
                <Input
                  id="grp-tally"
                  value={groupData.tallyGroupName}
                  onChange={(e) => setGroupData({ ...groupData, tallyGroupName: e.target.value })}
                  placeholder="e.g. Indirect Expenses"
                />
              </FormField>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submitting}>
              Create Group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
