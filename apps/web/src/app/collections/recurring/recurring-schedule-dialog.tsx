'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Select,
  type SelectOption,
} from '@platform/ui';
import { CalendarClock, Plus, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { RecurringFrequency } from '@platform/shared-types';

interface RecurringScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RecurringScheduleDialog({
  open,
  onOpenChange,
  onSuccess,
}: RecurringScheduleDialogProps) {
  const [parties, setParties] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [partyId, setPartyId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [frequency, setFrequency] = useState<RecurringFrequency>(RecurringFrequency.MONTHLY);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [maxRuns, setMaxRuns] = useState<string>('12');
  const [description, setDescription] = useState('Monthly Retainer Cloud Accounting & Bookkeeping');
  const [hsnSacCode, setHsnSacCode] = useState('998222');
  const [unitPrice, setUnitPrice] = useState('25000');
  const [gstRatePercent, setGstRatePercent] = useState('18');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      Promise.all([apiClient.listParties(), apiClient.listCompanies()])
        .then(([pList, cList]) => {
          const customers = (pList || []).filter((p: any) => p.partyType === 'CUSTOMER' || p.partyType === 'BOTH');
          setParties(customers);
          if (customers[0]) setPartyId(customers[0].id);

          const branch = cList?.[0]?.branches?.[0];
          if (branch) setBranchId(branch.id);
        })
        .catch(() => {});
    }
  }, [open]);

  const frequencyOptions: SelectOption[] = [
    { label: 'Weekly Schedule', value: RecurringFrequency.WEEKLY },
    { label: 'Monthly Schedule (Recommended)', value: RecurringFrequency.MONTHLY },
    { label: 'Quarterly Retainer', value: RecurringFrequency.QUARTERLY },
    { label: 'Annual Subscription', value: RecurringFrequency.ANNUAL },
  ];

  const partyOptions: SelectOption[] = parties.map((p) => ({
    label: `${p.name} (${p.gstin || 'Unregistered'})`,
    value: p.id,
  }));

  const handleCreate = async () => {
    if (!partyId) {
      setError('Please select a customer.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const selectedParty = parties.find((p) => p.id === partyId);
      const posCode = selectedParty?.billingStateCode || '27';

      await apiClient.createRecurringSchedule(undefined, {
        branchId: branchId || 'd0000000-0000-4000-8000-000000000001',
        partyId,
        frequency,
        startDate,
        endDate: endDate ? endDate : undefined,
        maxRuns: maxRuns ? parseInt(maxRuns, 10) : undefined,
        template: {
          items: [
            {
              description,
              hsnSacCode,
              quantity: 1,
              uom: 'NOS',
              unitPrice: parseFloat(unitPrice) || 0,
              discountPercent: 0,
              gstRatePercent: parseFloat(gstRatePercent) || 18,
            },
          ],
          placeOfSupplyStateCode: posCode,
          notes: 'Auto-recurring billing agreement',
        },
      });

      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create recurring schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white bg-surface border border border-strong rounded-xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-primary dark:text-white flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-brand-text" />
            Create Recurring Invoicing Schedule
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="mt-3 p-2 bg-status-danger-subtle bg-status-danger text-status-danger-text text-status-danger-text text-xs rounded-lg border border-status-danger border-status-danger">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-secondary text-muted">
              Customer Account
            </label>
            <div className="mt-1">
              <Select
                value={partyId}
                onValueChange={setPartyId}
                options={partyOptions.length > 0 ? partyOptions : [{ label: 'Loading customers...', value: '' }]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-secondary text-muted">
                Frequency
              </label>
              <div className="mt-1">
                <Select
                  value={frequency}
                  onValueChange={(val) => setFrequency(val as RecurringFrequency)}
                  options={frequencyOptions}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-secondary text-muted">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-secondary text-muted">
                Max Invoices to Generate
              </label>
              <Input
                type="number"
                placeholder="12"
                value={maxRuns}
                onChange={(e) => setMaxRuns(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary text-muted">
                End Date (Optional)
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          {/* Line Item Template */}
          <div className="p-3 bg-canvas bg-surface-raised rounded-xl space-y-2 border border-subtle border-strong">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted text-muted">
              Template Line Item
            </span>
            <div className="space-y-2">
              <Input
                placeholder="Item / Service description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-xs bg-white bg-surface"
              />
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="SAC / HSN"
                  value={hsnSacCode}
                  onChange={(e) => setHsnSacCode(e.target.value)}
                  className="text-xs bg-white bg-surface"
                />
                <Input
                  placeholder="Unit Price"
                  type="number"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="text-xs bg-white bg-surface"
                />
                <Input
                  placeholder="GST %"
                  type="number"
                  value={gstRatePercent}
                  onChange={(e) => setGstRatePercent(e.target.value)}
                  className="text-xs bg-white bg-surface"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleCreate}
            loading={loading}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            Activate Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

