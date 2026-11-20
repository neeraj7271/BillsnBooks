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
import { Sparkles } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface ConversionDialogProps {
  open: boolean;
  ticket: any | null;
  ledgers: any[];
  onOpenChange: (open: boolean) => void;
  onSuccess: (msg: string) => void;
}

export function ConversionDialog({
  open,
  ticket,
  ledgers,
  onOpenChange,
  onSuccess,
}: ConversionDialogProps) {
  const [convertType, setConvertType] = useState<'ADVANCE_RECEIPT' | 'SALES_INVOICE'>('ADVANCE_RECEIPT');
  const [selectedPartyLedgerId, setSelectedPartyLedgerId] = useState<string>(ledgers[0]?.id || '');
  const [customNarration, setCustomNarration] = useState<string>('');
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (ticket) {
      setCustomNarration(
        `Advance received from ${ticket.transaction?.extractedPartyName || 'Customer'} via ${ticket.transaction?.paymentMode}`
      );
      if (ticket.transaction?.extractedPartyName) {
        const party = ticket.transaction.extractedPartyName.toLowerCase();
        const match = ledgers.find((l) => l.name.toLowerCase().includes(party));
        if (match) setSelectedPartyLedgerId(match.id);
      }
    }
  }, [ticket, ledgers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;

    setConverting(true);
    setError(null);

    try {
      const res = await apiClient.convertDiscoveryTicket(ticket.id, {
        targetType: convertType,
        partyLedgerId: selectedPartyLedgerId,
        narration: customNarration,
      });
      onOpenChange(false);
      onSuccess(`Ticket converted to canonical voucher #${res.voucherNumber || res.voucherId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Conversion failed';
      setError(msg);
    } finally {
      setConverting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Convert Unbilled Deposit to Voucher</DialogTitle>
          <DialogDescription>
            Post canonical double-entry accounting voucher linked directly to bank credit.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-xs text-rose-600 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Target Document Type" required>
            <Select
              value={convertType}
              onValueChange={(val: any) => setConvertType(val)}
              options={[
                { label: 'Advance Customer Receipt (Voucher)', value: 'ADVANCE_RECEIPT' },
                { label: 'Direct Sales Invoice / Revenue', value: 'SALES_INVOICE' },
              ]}
            />
          </FormField>

          <FormField label="Debtor / Party Ledger" required>
            <Select
              value={selectedPartyLedgerId}
              onValueChange={setSelectedPartyLedgerId}
              options={ledgers.map((l) => ({
                label: `${l.name} (${l.code})`,
                value: l.id,
              }))}
            />
          </FormField>

          <FormField label="Journal Narration" required id="conv-narration">
            <Input
              id="conv-narration"
              required
              value={customNarration}
              onChange={(e) => setCustomNarration(e.target.value)}
            />
          </FormField>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={converting}
              leftIcon={<Sparkles className="h-4 w-4" />}
            >
              Post Canonical Voucher
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
