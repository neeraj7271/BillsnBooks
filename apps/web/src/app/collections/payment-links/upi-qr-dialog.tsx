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
  QrCode,
  MoneyText,
  Badge,
} from '@platform/ui';
import { PaymentLinkDto } from '@platform/shared-types';
import { Check, Copy, QrCode as QrIcon, Smartphone } from 'lucide-react';

interface UpiQrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentLink?: PaymentLinkDto | null;
}

export function UpiQrDialog({ open, onOpenChange, paymentLink }: UpiQrDialogProps) {
  const [copied, setCopied] = React.useState(false);

  if (!paymentLink) return null;

  // Construct standard NPCI BHIM UPI Intent URL
  // pa: Payee VPA, pn: Payee Name, am: Amount, cu: Currency, tn: Transaction Note
  const vpa = 'accounting.merchant@okaxis';
  const payeeName = 'Accounting Platform Merchant';
  const amount = Number(paymentLink.amount || 0).toFixed(2);
  const note = `Invoice Payment ${paymentLink.invoiceNumber || paymentLink.id.slice(0, 8)}`;
  
  const upiIntentUrl = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(
    payeeName,
  )}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(paymentLink.shortUrl || upiIntentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-status-success-subtle text-status-success-text">
              <QrIcon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Instant UPI QR Code</DialogTitle>
              <DialogDescription>
                Scan with BHIM, Google Pay, PhonePe, or Paytm
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-4 text-center">
          {/* Card containing the white QR surface for maximum scanner contrast */}
          <div className="rounded-2xl bg-white p-4 shadow-md ring-1 ring-default">
            <QrCode
              value={upiIntentUrl}
              size={220}
              darkColor="#0f172a"
              lightColor="#ffffff"
              level="M"
            />
          </div>

          <div className="mt-4 flex flex-col items-center gap-1">
            <span className="text-xs uppercase tracking-wider text-muted font-semibold">
              Total Amount Payable
            </span>
            <div className="text-2xl font-bold tracking-tight text-primary">
              <MoneyText amount={paymentLink.amount} currency={paymentLink.currency || 'INR'} />
            </div>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="neutral" className="text-xs">
                Ref: {paymentLink.invoiceNumber || paymentLink.linkId}
              </Badge>
              {paymentLink.partyName && (
                <Badge variant="neutral" className="text-xs">
                  {paymentLink.partyName}
                </Badge>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-xs text-muted">
            <Smartphone className="h-4 w-4" />
            <span>VPA: <strong className="text-primary">{vpa}</strong></span>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto flex-1 gap-2"
            onClick={handleCopyLink}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-status-success-text" />
                Copied Link
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Payment Link
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
