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
  Switch,
  Button,
} from '@platform/ui';
import { INDIAN_GST_STATES_LIST } from '@platform/shared-types';
import { apiClient } from '@/lib/api-client';

interface BranchDialogProps {
  open: boolean;
  companyId: string | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: (branchName: string) => void;
}

const INITIAL_BRANCH_STATE = {
  branchName: '',
  gstin: '',
  stateCode: '27',
  addressLine1: '',
  pincode: '',
  isHeadOffice: false,
};

export function BranchDialog({ open, companyId, onOpenChange, onSuccess }: BranchDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branchData, setBranchData] = useState(INITIAL_BRANCH_STATE);

  useEffect(() => {
    if (open) {
      setBranchData(INITIAL_BRANCH_STATE);
      setError(null);
    }
  }, [open]);

  const stateOptions = INDIAN_GST_STATES_LIST.map((s) => ({
    label: s.label,
    value: s.code,
  }));

  const handleGstinChange = (val: string) => {
    const uppercase = val.toUpperCase().trim();
    if (uppercase.length >= 2) {
      const code = uppercase.substring(0, 2);
      const stateExists = INDIAN_GST_STATES_LIST.some((s) => s.code === code);
      if (stateExists) {
        setBranchData((prev) => ({ ...prev, gstin: uppercase, stateCode: code }));
        return;
      }
    }
    setBranchData((prev) => ({ ...prev, gstin: uppercase }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    setSubmitting(true);
    setError(null);

    try {
      await apiClient.addBranch(companyId, {
        branchName: branchData.branchName.trim(),
        gstin: branchData.gstin.trim().toUpperCase() || undefined,
        stateCode: branchData.stateCode,
        addressLine1: branchData.addressLine1.trim() || undefined,
        pincode: branchData.pincode.trim() || undefined,
        isHeadOffice: branchData.isHeadOffice,
      });
      setBranchData(INITIAL_BRANCH_STATE);
      onOpenChange(false);
      onSuccess(branchData.branchName);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add branch';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Add Branch / GSTIN Unit</DialogTitle>
          <DialogDescription>
            Register distinct state GSTIN operating unit for Place of Supply tax determination and billing.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-xl bg-status-danger-subtle border border-default text-xs text-status-danger-text font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Branch Name" required id="br-name">
            <Input
              id="br-name"
              required
              value={branchData.branchName}
              onChange={(e) => setBranchData({ ...branchData, branchName: e.target.value })}
              placeholder="e.g. Karnataka Tech Park Office"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Branch GSTIN (Optional for Unregistered)" id="br-gstin">
              <Input
                id="br-gstin"
                maxLength={15}
                value={branchData.gstin}
                onChange={(e) => handleGstinChange(e.target.value)}
                placeholder="29AABCA1234F1Z5"
                className="font-mono uppercase"
              />
            </FormField>

            <FormField label="Operating State / Jurisdiction" required>
              <Select
                value={branchData.stateCode}
                onValueChange={(val) => setBranchData({ ...branchData, stateCode: val })}
                options={stateOptions}
                placeholder="Select State"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <FormField label="Address Line" id="br-address">
                <Input
                  id="br-address"
                  value={branchData.addressLine1}
                  onChange={(e) => setBranchData({ ...branchData, addressLine1: e.target.value })}
                  placeholder="Building 4, Electronic City, Bengaluru"
                />
              </FormField>
            </div>

            <div>
              <FormField label="PIN Code" id="br-pin">
                <Input
                  id="br-pin"
                  maxLength={6}
                  value={branchData.pincode}
                  onChange={(e) =>
                    setBranchData({
                      ...branchData,
                      pincode: e.target.value.replace(/\D/g, ''),
                    })
                  }
                  placeholder="560025"
                  className="font-mono text-xs"
                />
              </FormField>
            </div>
          </div>

          <Switch
            id="br-is-ho"
            checked={branchData.isHeadOffice}
            onCheckedChange={(checked) => setBranchData({ ...branchData, isHeadOffice: checked })}
            label="Designate as Head Office"
            description="Default billing address for statutory company-wide correspondence"
          />

          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setBranchData(INITIAL_BRANCH_STATE);
                setError(null);
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submitting}>
              Add Branch
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
