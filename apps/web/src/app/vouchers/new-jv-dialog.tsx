'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Badge,
  Input,
  Select,
  FormField,
  DatePicker,
  MoneyText,
  toast,
} from '@platform/ui';
import { Plus, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface JvEntryRow {
  entryType: 'DEBIT' | 'CREDIT';
  ledgerId: string;
  amount: number;
  narration?: string;
}

interface NewJvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Array<{ id: string; name: string }>;
  financialYears: Array<{ id: string; name: string }>;
  ledgers: Array<{ id: string; code: string; name: string }>;
  companyId: string;
  onSuccess: () => void;
}

export function NewJvDialog({
  open,
  onOpenChange,
  branches,
  financialYears,
  ledgers,
  companyId,
  onSuccess,
}: NewJvDialogProps) {
  const [jvDate, setJvDate] = useState<string>(() => new Date().toISOString().split('T')[0]!);
  const [jvBranchId, setJvBranchId] = useState<string>('');
  const [jvFyId, setJvFyId] = useState<string>('');
  const [jvNarration, setJvNarration] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [jvEntries, setJvEntries] = useState<JvEntryRow[]>([
    { entryType: 'DEBIT', ledgerId: '', amount: 0 },
    { entryType: 'CREDIT', ledgerId: '', amount: 0 },
  ]);

  useEffect(() => {
    if (branches.length > 0 && !jvBranchId) {
      setJvBranchId(branches[0]?.id || '');
    }
  }, [branches, jvBranchId]);

  useEffect(() => {
    if (financialYears.length > 0 && !jvFyId) {
      setJvFyId(financialYears[0]?.id || '');
    }
  }, [financialYears, jvFyId]);

  const handleAddJvRow = () => {
    setJvEntries((prev) => [
      ...prev,
      { entryType: 'DEBIT', ledgerId: '', amount: 0 },
    ]);
  };

  const handleRemoveJvRow = (index: number) => {
    if (jvEntries.length <= 2) return;
    setJvEntries((prev) => prev.filter((_, idx) => idx !== index));
  };

  const totalJvDebit = jvEntries
    .filter((e) => e.entryType === 'DEBIT')
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const totalJvCredit = jvEntries
    .filter((e) => e.entryType === 'CREDIT')
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const jvDiff = Math.abs(totalJvDebit - totalJvCredit);
  const isJvBalanced = totalJvDebit > 0 && jvDiff < 0.01;

  const handleCreateJv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isJvBalanced) {
      toast.error('Cannot post unbalanced voucher: Total debits must equal credits exactly.');
      return;
    }

    const invalidRow = jvEntries.find((r) => !r.ledgerId || !r.amount);
    if (invalidRow) {
      toast.error('All journal lines must specify a valid ledger and an amount greater than zero.');
      return;
    }

    setActionLoading(true);
    try {
      await apiClient.createVoucher(companyId, {
        branchId: jvBranchId,
        financialYearId: jvFyId,
        voucherType: 'JOURNAL',
        voucherDate: jvDate,
        narration: jvNarration,
        entries: jvEntries.map((e) => ({
          ledgerId: e.ledgerId,
          entryType: e.entryType,
          amount: e.amount,
          narration: e.narration,
        })),
      });

      toast.success('Journal Voucher posted successfully with balanced double-entry invariance.');
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to post journal voucher');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>New Manual Journal Entry (JV)</DialogTitle>
          <DialogDescription className="text-xs">
            Post adjustments, opening balances, or depreciation entries with zero-variance balance enforcement.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateJv} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Voucher Date" required id="jv-date">
              <DatePicker
                id="jv-date"
                value={jvDate}
                onChange={setJvDate}
                required
              />
            </FormField>

            <FormField label="Branch / Location" required>
              <Select
                value={jvBranchId}
                onValueChange={setJvBranchId}
                options={branches.map((b) => ({ label: b.name, value: b.id }))}
              />
            </FormField>

            <FormField label="Financial Year" required>
              <Select
                value={jvFyId}
                onValueChange={setJvFyId}
                options={financialYears.map((fy) => ({ label: fy.name, value: fy.id }))}
              />
            </FormField>
          </div>

          {/* Entry Rows */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-secondary">
                Journal Legs (Debits & Credits)
              </label>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={handleAddJvRow}
                leftIcon={<Plus className="w-3 h-3" />}
              >
                Add Leg
              </Button>
            </div>

            <div className="border border-default rounded-xl overflow-hidden divide-y divide-subtle">
              {jvEntries.map((row, idx) => (
                <div key={idx} className="p-2.5 flex items-center gap-2 text-xs">
                  <div className="w-28 shrink-0">
                    <Select
                      className="w-full min-w-0"
                      value={row.entryType}
                      onValueChange={(val) => {
                        const updated = [...jvEntries];
                        updated[idx]!.entryType = val as 'DEBIT' | 'CREDIT';
                        setJvEntries(updated);
                      }}
                      options={[
                        { label: 'Dr (Debit)', value: 'DEBIT' },
                        { label: 'Cr (Credit)', value: 'CREDIT' },
                      ]}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <Select
                      className="w-full min-w-0"
                      value={row.ledgerId}
                      onValueChange={(val) => {
                        const updated = [...jvEntries];
                        updated[idx]!.ledgerId = val;
                        setJvEntries(updated);
                      }}
                      options={ledgers.map((l) => ({ label: `${l.code} - ${l.name}`, value: l.id }))}
                      placeholder="Select Account..."
                    />
                  </div>

                  <div className="w-32 shrink-0">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Amount ₹"
                      value={row.amount || ''}
                      onChange={(e) => {
                        const updated = [...jvEntries];
                        updated[idx]!.amount = parseFloat(e.target.value) || 0;
                        setJvEntries(updated);
                      }}
                      className="w-full min-w-0 font-mono text-right text-xs tabular-nums"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={jvEntries.length <= 2}
                    onClick={() => handleRemoveJvRow(idx)}
                    className="text-muted hover:text-status-danger-text disabled:opacity-30 disabled:cursor-not-allowed p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Zero-Variance Mathematical Bar */}
            <div className="p-3 rounded-xl bg-surface-sunken border border-default flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-secondary">Total Debit: </span>
                <span className="font-bold text-primary"><MoneyText amount={totalJvDebit} /></span>
              </div>
              <div>
                <span className="text-secondary">Total Credit: </span>
                <span className="font-bold text-primary"><MoneyText amount={totalJvCredit} /></span>
              </div>
              <div>
                {isJvBalanced ? (
                  <Badge variant="success" size="xs">
                    BALANCED (Δ ₹0.00)
                  </Badge>
                ) : (
                  <Badge variant="danger" size="xs">
                    UNBALANCED (Δ <MoneyText amount={jvDiff} />)
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <FormField label="Narration / Journal Remarks" id="jv-narration">
            <Input
              id="jv-narration"
              value={jvNarration}
              onChange={(e) => setJvNarration(e.target.value)}
              placeholder="e.g. Month-end depreciation adjustment / Accrual entry"
              className="text-xs"
            />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!isJvBalanced}
              loading={actionLoading}
            >
              Post Journal Voucher
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
