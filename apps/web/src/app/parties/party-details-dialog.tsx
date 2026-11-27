import React from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Badge,
  MoneyText,
  formatMoney,
} from '@platform/ui';
import { formatPartyTaxIdentity } from '@platform/shared-types';
import {
  Building2,
  MapPin,
  CreditCard,
  Mail,
  Phone,
  Edit,
  Trash2,
  FileText,
  Globe,
  Clock,
} from 'lucide-react';

interface PartyDetailsProps {
  party: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (party: any) => void;
  onDelete: (party: any) => void;
}

export function PartyDetailsDialog({
  party,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: PartyDetailsProps) {
  if (!party) return null;

  const identity = formatPartyTaxIdentity(party.registrationType, party.gstin);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="overflow-hidden p-0 gap-0">
        {/* Header Banner */}
        <div className="p-6 bg-surface-sunken border-b border-subtle">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-status-info-subtle text-status-info-text font-semibold">
                  {party.partyCode || 'PRTY-MASTER'}
                </span>
                <Badge
                  variant={
                    party.partyType === 'CUSTOMER'
                      ? 'brand'
                      : party.partyType === 'VENDOR'
                      ? 'warning'
                      : 'neutral'
                  }
                  size="xs"
                >
                  {party.partyType === 'CUSTOMER'
                    ? 'Customer (Sundry Debtor)'
                    : party.partyType === 'VENDOR'
                    ? 'Vendor (Sundry Creditor)'
                    : 'Customer & Vendor'}
                </Badge>
                <Badge variant={party.isActive !== false ? 'success' : 'neutral'} size="xs">
                  {party.isActive !== false ? 'Active' : 'Deactivated'}
                </Badge>
              </div>

              <h2 className="text-xl font-bold text-primary mt-1">
                {party.name}
              </h2>
              {party.tradeName && (
                <p className="text-xs text-muted">
                  Trade Name / DBA: <span className="font-medium text-secondary">{party.tradeName}</span>
                </p>
              )}
            </div>

            <div className="text-right">
              <span className="text-[11px] font-medium text-muted uppercase tracking-wider block">
                Current Balance
              </span>
              <div className="text-lg font-bold">
                <MoneyText amount={party.currentBalance || 0} showDrCr colorCode="dr-cr" />
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Statutory & Tax Profile */}
          <div className="rounded-xl p-4 bg-surface-sunken space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary">
              <FileText className="w-4 h-4 text-status-info-text" />
              Statutory Tax & GST Profile
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div>
                <span className="text-[11px] text-muted block">Registration Type</span>
                <div className="mt-1">
                  <Badge variant={identity.badgeVariant} size="xs">
                    {identity.badgeLabel}
                  </Badge>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-muted block">Goods & Services Tax (GSTIN)</span>
                <span className="font-mono text-xs font-semibold text-primary mt-0.5 block">
                  {identity.showGstin && party.gstin ? party.gstin : 'None (Unregistered / Exempt)'}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-muted block">Permanent Account Number (PAN)</span>
                <span className="font-mono text-xs font-semibold text-primary mt-0.5 block">
                  {party.pan || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Address & Jurisdiction */}
          <div className="rounded-xl p-4 bg-surface-sunken space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary">
              <MapPin className="w-4 h-4 text-status-success-text" />
              Registered Billing Address & Jurisdiction
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 text-xs">
              <div className="space-y-1">
                <span className="text-[11px] text-muted block">Address Line</span>
                <p className="text-primary font-medium">
                  {party.billingAddressLine1 || 'No address line specified'}
                  {party.billingAddressLine2 ? `, ${party.billingAddressLine2}` : ''}
                </p>
                <p className="text-muted">
                  {party.billingCity ? `${party.billingCity}, ` : ''}
                  {party.billingState || 'Maharashtra'} - {party.billingPincode || '—'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-surface p-3 rounded-lg">
                <div>
                  <span className="text-[10px] text-muted uppercase tracking-wider block">GST State Code</span>
                  <span className="font-mono text-xs font-bold text-primary">
                    {party.billingStateCode || '27'} ({party.billingState || 'Maharashtra'})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase tracking-wider block">Currency</span>
                  <span className="font-mono text-xs font-bold text-primary">
                    {party.currency || 'INR'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Credit & Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl p-4 bg-surface-sunken space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary">
                <CreditCard className="w-4 h-4 text-brand-text" />
                Credit & Payment Terms
              </div>
              <div className="pt-1 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[11px] text-muted block">Credit Limit</span>
                  <span className="font-semibold text-primary">
                    {Number(party.creditLimit || 0) > 0
                      ? formatMoney(party.creditLimit)
                      : 'None (No limit set)'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted block">Payment Due Cadence</span>
                  <span className="font-semibold text-primary flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-muted" />
                    {party.paymentTermsDays && Number(party.paymentTermsDays) > 0
                      ? `${party.paymentTermsDays} Days Net`
                      : 'Immediate / Due on Receipt'}
                  </span>
                </div>
              </div>
            </div>

            {/* Communication */}
            <div className="rounded-xl p-4 bg-surface-sunken space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary">
                <Mail className="w-4 h-4 text-status-warning-text" />
                Contact Info
              </div>
              <div className="pt-1 text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-muted" />
                  <span className="text-secondary">
                    {party.email || 'No email specified'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-muted" />
                  <span className="text-secondary font-mono">
                    {party.phone || 'No phone specified'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-surface-sunken border-t border-subtle flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              onDelete(party);
            }}
            className="text-status-danger-text hover:text-status-danger-text hover:bg-status-danger-subtle"
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Deactivate / Delete
          </Button>

          <div className="flex items-center gap-2">
            <Link
              href={
                party.ledgerId
                  ? `/reports/general-ledger?ledgerId=${party.ledgerId}`
                  : `/reports/general-ledger?partyName=${encodeURIComponent(party.name)}`
              }
            >
              <Button
                variant="outline"
                size="sm"
                leftIcon={<FileText className="w-4 h-4 text-brand-text" />}
              >
                Statement of Account
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onEdit(party);
              }}
              leftIcon={<Edit className="w-4 h-4" />}
            >
              Edit Counterparty
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

