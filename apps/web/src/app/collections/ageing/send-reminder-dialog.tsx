'use client';

import React, { useState } from 'react';
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
import { MessageSquare, Mail, Send } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { ReminderChannel, ReminderCadence, type PartyAgeingDto } from '@platform/shared-types';

interface SendReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  party: PartyAgeingDto | null;
  onSuccess: () => void;
}

export function SendReminderDialog({
  open,
  onOpenChange,
  party,
  onSuccess,
}: SendReminderDialogProps) {
  const [channel, setChannel] = useState<ReminderChannel>(ReminderChannel.WHATSAPP);
  const [cadence, setCadence] = useState<ReminderCadence>(ReminderCadence.DUE_DATE);
  const [customMessage, setCustomMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelOptions: SelectOption[] = [
    { label: 'WhatsApp Messenger', value: ReminderChannel.WHATSAPP },
    { label: 'Email Notification', value: ReminderChannel.EMAIL },
    { label: 'SMS Short Message', value: ReminderChannel.SMS },
  ];

  const cadenceOptions: SelectOption[] = [
    { label: 'Standard Reminder (Due Date)', value: ReminderCadence.DUE_DATE },
    { label: 'Gentle Notice (Upcoming 3 Days)', value: ReminderCadence.UPCOMING_3_DAYS },
    { label: 'Overdue Notice (7 Days Overdue)', value: ReminderCadence.OVERDUE_7_DAYS },
    { label: 'Urgent Demanding (15+ Days Overdue)', value: ReminderCadence.OVERDUE_15_DAYS },
  ];

  const handleSend = async () => {
    if (!party) return;
    setLoading(true);
    setError(null);

    try {
      // Find invoices for this party to link reminder
      const invoices = await apiClient.listInvoices(undefined, { partyId: party.partyId, limit: 1 });
      const invoiceId = invoices?.[0]?.id;

      if (!invoiceId) {
        throw new Error('No open invoice found for this party to attach reminder.');
      }

      await apiClient.sendCollectionReminder(undefined, {
        invoiceId,
        channel,
        cadence,
        customMessage: customMessage.trim() || undefined,
      });

      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send collection reminder');
    } finally {
      setLoading(false);
    }
  };

  const formattedDue = Number(party?.totalDue || 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white bg-surface border border border-strong rounded-xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-primary flex items-center gap-2">
            <Send className="h-5 w-5 text-brand-text" />
            Send Collection Follow-Up
          </DialogTitle>
        </DialogHeader>

        {party && (
          <div className="mt-2 p-3 bg-canvas bg-surface-raised rounded-lg text-xs space-y-1">
            <div className="font-semibold text-primary">{party.partyName}</div>
            <div className="text-muted text-muted">
              Outstanding Balance: <span className="font-bold text-status-danger-text text-status-danger-text">{formattedDue}</span>
            </div>
            <div className="text-muted text-muted">
              Recipient: {channel === ReminderChannel.EMAIL ? party.email || 'Email missing' : party.phone || 'Phone missing'}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 p-2 bg-status-danger-subtle bg-status-danger text-status-danger-text text-status-danger-text text-xs rounded-lg border border-status-danger border-status-danger">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-secondary text-muted">
              Delivery Channel
            </label>
            <div className="mt-1">
              <Select
                value={channel}
                onValueChange={(val) => setChannel(val as ReminderChannel)}
                options={channelOptions}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-secondary text-muted">
              Reminder Cadence & Tone
            </label>
            <div className="mt-1">
              <Select
                value={cadence}
                onValueChange={(val) => setCadence(val as ReminderCadence)}
                options={cadenceOptions}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-secondary text-muted">
              Custom Note (Optional)
            </label>
            <div className="mt-1">
              <textarea
                placeholder="Leave blank to use pre-approved statutory reminder template..."
                value={customMessage}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomMessage(e.target.value)}
                rows={3}
                className="w-full text-xs rounded-lg border border border-strong bg-white bg-surface p-2 text-primary focus:outline-hidden focus:ring-2 focus:ring-focus-ring"
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
            onClick={handleSend}
            loading={loading}
            leftIcon={<Send className="h-3.5 w-3.5" />}
          >
            Dispatch Reminder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
