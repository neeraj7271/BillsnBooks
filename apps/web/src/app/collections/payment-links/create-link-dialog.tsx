'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Select,
  type SelectOption,
} from '@platform/ui';
import { Link2, CreditCard } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { PaymentLinkProvider, InvoiceStatus } from '@platform/shared-types';

interface CreateLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateLinkDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateLinkDialogProps) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoiceId, setInvoiceId] = useState('');
  const [provider, setProvider] = useState<PaymentLinkProvider>(PaymentLinkProvider.RAZORPAY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      apiClient
        .listInvoices(undefined, { status: InvoiceStatus.ISSUED })
        .then((list) => {
          setInvoices(list || []);
          if (list?.[0]) setInvoiceId(list[0].id);
        })
        .catch(() => {});
    }
  }, [open]);

  const providerOptions: SelectOption[] = [
    { label: 'Razorpay Payment Gateway', value: PaymentLinkProvider.RAZORPAY },
    { label: 'Cashfree Payments', value: PaymentLinkProvider.CASHFREE },
  ];

  const invoiceOptions: SelectOption[] = invoices.map((inv) => ({
    label: `${inv.invoiceNumber} - ${inv.party?.name || 'Customer'} (₹${Number(inv.totalAmount).toLocaleString('en-IN')})`,
    value: inv.id,
  }));

  const handleCreate = async () => {
    if (!invoiceId) {
      setError('Please select an open invoice.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await apiClient.createPaymentLink(undefined, {
        invoiceId,
        provider,
        expiresInDays: 30,
      });

      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate payment link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Link2 className="h-5 w-5 text-blue-600" />
            Generate Instant Payment Link
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="mt-3 p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs rounded-lg border border-rose-200 dark:border-rose-900">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Select Outstanding Invoice
            </label>
            <div className="mt-1">
              <Select
                value={invoiceId}
                onValueChange={setInvoiceId}
                options={invoiceOptions.length > 0 ? invoiceOptions : [{ label: 'No open invoices available', value: '' }]}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Gateway Provider
            </label>
            <div className="mt-1">
              <Select
                value={provider}
                onValueChange={(val) => setProvider(val as PaymentLinkProvider)}
                options={providerOptions}
              />
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
            leftIcon={<CreditCard className="h-3.5 w-3.5" />}
          >
            Create Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

