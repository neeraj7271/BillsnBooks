'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Badge,
  DateText,
  MoneyText,
} from '@platform/ui';

export interface VoucherEntry {
  id: string;
  entryType: 'DEBIT' | 'CREDIT';
  amount: number;
  narration?: string;
  ledger?: {
    id: string;
    code: string;
    name: string;
  };
}

export interface VoucherDetail {
  id: string;
  voucherNumber: string;
  voucherType: string;
  voucherDate: string;
  narration?: string;
  status: string;
  entries?: VoucherEntry[];
}

interface VoucherDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voucher: VoucherDetail | null;
}

export function VoucherDetailsDialog({
  open,
  onOpenChange,
  voucher,
}: VoucherDetailsDialogProps) {
  if (!voucher) return null;

  const totalDebit = voucher.entries
    ?.filter((e) => e.entryType === 'DEBIT')
    .reduce((s, e) => s + (parseFloat(String(e.amount)) || 0), 0) || 0;

  const totalCredit = voucher.entries
    ?.filter((e) => e.entryType === 'CREDIT')
    .reduce((s, e) => s + (parseFloat(String(e.amount)) || 0), 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-black font-mono">
                Voucher #{voucher.voucherNumber}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {voucher.voucherType} • Date: <DateText date={voucher.voucherDate} />
              </DialogDescription>
            </div>
            <Badge
              variant={voucher.status === 'POSTED' ? 'success' : 'danger'}
              size="sm"
              dot
            >
              {voucher.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {voucher.narration && (
            <div className="p-3 rounded-xl bg-surface-sunken text-xs text-secondary">
              <span className="font-bold text-primary">Narration: </span>
              {voucher.narration}
            </div>
          )}

          <div className="border border-subtle rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface-sunken border-b border-subtle text-[11px] font-bold text-secondary uppercase">
                <tr>
                  <th className="p-2.5">Account Code</th>
                  <th className="p-2.5">Ledger Name</th>
                  <th className="p-2.5 text-right w-28">Debit (₹)</th>
                  <th className="p-2.5 text-right w-28">Credit (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {voucher.entries?.map((e, idx) => (
                  <tr key={e.id || idx}>
                    <td className="p-2.5 font-mono text-secondary">{e.ledger?.code || '—'}</td>
                    <td className="p-2.5 font-semibold text-primary">
                      {e.ledger?.name || 'Account'}
                      {e.narration && (
                        <span className="block text-[10px] text-muted font-normal">
                          {e.narration}
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-primary">
                      {e.entryType === 'DEBIT' ? <MoneyText amount={e.amount} /> : '—'}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-primary">
                      {e.entryType === 'CREDIT' ? <MoneyText amount={e.amount} /> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-sunken font-black border-t border-subtle">
                  <td colSpan={2} className="p-2.5 uppercase text-right text-xs">
                    Total Balance:
                  </td>
                  <td className="p-2.5 text-right font-mono text-xs">
                    <MoneyText amount={totalDebit} />
                  </td>
                  <td className="p-2.5 text-right font-mono text-xs">
                    <MoneyText amount={totalCredit} />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
