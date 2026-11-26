'use client';

import React, { useState } from 'react';
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
import { Scale, CheckCircle2, AlertTriangle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { PaymentLinkProvider } from '@platform/shared-types';

interface ReconcileSettlementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ReconcileSettlementDialog({
  open,
  onOpenChange,
  onSuccess,
}: ReconcileSettlementDialogProps) {
  const [provider, setProvider] = useState<PaymentLinkProvider>(PaymentLinkProvider.RAZORPAY);
  const [settlementId, setSettlementId] = useState(`setld_${Date.now().toString().slice(-6)}`);
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split('T')[0]);
  const [grossAmount, setGrossAmount] = useState('50000.00');
  const [feeAmount, setFeeAmount] = useState('1000.00');
  const [taxOnFee, setTaxOnFee] = useState('180.00');
  const [netCreditAmount, setNetCreditAmount] = useState('48820.00');
  const [bankReference, setBankReference] = useState('UTR2026103100098');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const providerOptions: SelectOption[] = [
    { label: 'Razorpay Settlement Payout', value: PaymentLinkProvider.RAZORPAY },
    { label: 'Cashfree Auto-Settlement', value: PaymentLinkProvider.CASHFREE },
  ];

  // Dynamic live validation: Gross - Fee - Tax == Net
  const gross = parseFloat(grossAmount) || 0;
  const fee = parseFloat(feeAmount) || 0;
  const tax = parseFloat(taxOnFee) || 0;
  const net = parseFloat(netCreditAmount) || 0;
  const expectedNet = parseFloat((gross - fee - tax).toFixed(2));
  const isBalanced = Math.abs(expectedNet - net) < 0.001;

  const handleAutoCalculateTax = (feeVal: string) => {
    setFeeAmount(feeVal);
    const f = parseFloat(feeVal) || 0;
    const computedTax = (f * 0.18).toFixed(2);
    setTaxOnFee(computedTax);
    setNetCreditAmount((gross - f - parseFloat(computedTax)).toFixed(2));
  };

  const handleReconcile = async () => {
    if (!isBalanced) {
      setError(`Reconciliation out of balance: Expected Net Credit is ₹${expectedNet.toLocaleString('en-IN')}`);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await apiClient.reconcileGatewaySettlement(undefined, {
        provider,
        settlementId,
        settlementDate,
        grossAmount: parseFloat(grossAmount),
        feeAmount: parseFloat(feeAmount),
        taxOnFee: parseFloat(taxOnFee),
        netCreditAmount: parseFloat(netCreditAmount),
        bankReference,
      });

      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Settlement reconciliation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-surface border border-default rounded-xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-primary flex items-center gap-2">
            <Scale className="h-5 w-5 text-brand-text" />
            Reconcile Gateway Settlement
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="mt-3 p-2 bg-status-danger-subtle text-status-danger-text text-xs rounded-lg border border-status-danger">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-secondary">
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
            <div>
              <label className="text-xs font-semibold text-secondary">
                Settlement ID
              </label>
              <Input
                value={settlementId}
                onChange={(e) => setSettlementId(e.target.value)}
                className="mt-1 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-secondary">
                Settlement Date
              </label>
              <Input
                type="date"
                value={settlementDate}
                onChange={(e) => setSettlementDate(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">
                Bank UTR / Ref
              </label>
              <Input
                value={bankReference}
                onChange={(e) => setBankReference(e.target.value)}
                className="mt-1 text-xs font-mono"
              />
            </div>
          </div>

          <div className="p-3 bg-surface-sunken rounded-xl space-y-2 border border-subtle">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-muted">
                  Gross Collections (₹)
                </label>
                <Input
                  type="number"
                  value={grossAmount}
                  onChange={(e) => setGrossAmount(e.target.value)}
                  className="mt-1 text-xs bg-surface"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted">
                  Processing Fee (₹)
                </label>
                <Input
                  type="number"
                  value={feeAmount}
                  onChange={(e) => handleAutoCalculateTax(e.target.value)}
                  className="mt-1 text-xs bg-surface"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-muted">
                  GST on Fee (18%) (₹)
                </label>
                <Input
                  type="number"
                  value={taxOnFee}
                  onChange={(e) => setTaxOnFee(e.target.value)}
                  className="mt-1 text-xs bg-surface"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted">
                  Net Bank Credit (₹)
                </label>
                <Input
                  type="number"
                  value={netCreditAmount}
                  onChange={(e) => setNetCreditAmount(e.target.value)}
                  className="mt-1 text-xs bg-surface font-bold"
                />
              </div>
            </div>

            {/* Validation Indicator */}
            <div className={`mt-2 p-2 rounded-lg text-xs flex items-center gap-2 ${
              isBalanced
                ? 'bg-status-success-subtle text-status-success-text'
                : 'bg-status-warning-subtle text-status-warning-text'
            }`}>
              {isBalanced ? (
                <>
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-status-success-text" />
                  <span>Double-entry balanced: Gross = Fee + GST + Net Credit.</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 shrink-0 text-status-warning-text" />
                  <span>Imbalance: Gross - Fee - GST = ₹{expectedNet} (Diff: ₹{(expectedNet - net).toFixed(2)})</span>
                </>
              )}
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
            onClick={handleReconcile}
            loading={loading}
            disabled={!isBalanced}
            leftIcon={<Scale className="h-3.5 w-3.5" />}
          >
            Post Settlement Voucher
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

