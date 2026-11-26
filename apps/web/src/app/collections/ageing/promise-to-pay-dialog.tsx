'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  FormField,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { Calendar, Clock } from 'lucide-react';

interface PromiseToPayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any | null;
  onSuccess: () => void;
}

export function PromiseToPayDialog({
  open,
  onOpenChange,
  invoice,
  onSuccess,
}: PromiseToPayDialogProps) {
  const [promiseDate, setPromiseDate] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (invoice) {
      setPromiseDate(invoice.promiseToPayDate || '');
      setNotes(invoice.promiseToPayNotes || '');
    }
  }, [invoice]);

  if (!invoice) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promiseDate) return;

    setLoading(true);
    try {
      await apiClient.setCollectionsPromiseToPay(
        undefined,
        invoice.id,
        promiseDate,
        notes,
      );
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to update promise to pay', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setLoading(true);
    try {
      await apiClient.setCollectionsPromiseToPay(
        undefined,
        invoice.id,
        undefined,
        undefined,
      );
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to clear promise to pay', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand-text text-brand">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Record Promise-to-Pay</DialogTitle>
              <DialogDescription>
                Track customer commitment for {invoice.invoiceNumber} ({invoice.partyName})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-2">
          <FormField label="Promised Payment Date" required id="promise-date">
            <Input
              id="promise-date"
              type="date"
              value={promiseDate}
              onChange={(e) => setPromiseDate(e.target.value)}
              required
            />
          </FormField>

          <FormField label="Follow-up Notes / Terms" id="promise-notes">
            <Input
              id="promise-notes"
              placeholder="e.g. Director signed off, RTGS promised by next Monday"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </FormField>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            {invoice.promiseToPayDate && (
              <Button
                type="button"
                variant="outline"
                className="text-status-danger-text border-status-danger hover:bg-status-danger-subtle"
                onClick={handleClear}
                disabled={loading}
              >
                Clear Promise
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                disabled={!promiseDate}
              >
                Save Commitment
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

