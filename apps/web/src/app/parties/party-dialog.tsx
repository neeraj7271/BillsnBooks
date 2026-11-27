import React, { useState, useEffect } from 'react';
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
import {
  INDIAN_GST_STATES_LIST,
  WORLD_CURRENCIES,
  PartyRegistrationType,
} from '@platform/shared-types';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';

interface PartyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  companyId?: string;
  initialData?: any | null;
}

const INITIAL_FORM_STATE = {
  name: '',
  tradeName: '',
  partyType: 'CUSTOMER',
  registrationType: PartyRegistrationType.REGULAR,
  gstin: '',
  pan: '',
  currency: 'INR',
  email: '',
  phone: '',
  billingAddressLine1: '',
  billingCity: '',
  billingState: 'Maharashtra',
  billingStateCode: '27',
  billingPincode: '',
  creditLimit: '',
  paymentTermsDays: '',
};

export function PartyDialog({ open, onOpenChange, onSuccess, companyId, initialData }: PartyDialogProps) {
  const { activeCompanyId } = useCompany();
  const targetCompanyId = companyId || activeCompanyId;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // Automatically reset or populate form inputs whenever modal opens
  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          tradeName: initialData.tradeName || '',
          partyType: initialData.partyType || 'CUSTOMER',
          registrationType:
            initialData.registrationType ||
            (initialData.gstin ? PartyRegistrationType.REGULAR : PartyRegistrationType.UNREGISTERED),
          gstin: initialData.gstin || '',
          pan: initialData.pan || '',
          currency: initialData.currency || 'INR',
          email: initialData.email || '',
          phone: initialData.phone || '',
          billingAddressLine1: initialData.billingAddressLine1 || '',
          billingCity: initialData.billingCity || '',
          billingState: initialData.billingState || 'Maharashtra',
          billingStateCode: initialData.billingStateCode || '27',
          billingPincode: initialData.billingPincode || '',
          creditLimit:
            initialData.creditLimit && Number(initialData.creditLimit) > 0
              ? String(initialData.creditLimit)
              : '',
          paymentTermsDays:
            initialData.paymentTermsDays && Number(initialData.paymentTermsDays) > 0
              ? String(initialData.paymentTermsDays)
              : '',
        });
      } else {
        setFormData(INITIAL_FORM_STATE);
      }
      setError(null);
    }
  }, [open, initialData]);

  const stateOptions = INDIAN_GST_STATES_LIST.map((s) => ({
    label: s.label,
    value: s.code,
  }));

  const currencyOptions = WORLD_CURRENCIES.map((c) => ({
    label: c.label,
    value: c.code,
  }));

  const registrationTypeOptions = [
    { label: 'Regular Taxpayer (Standard B2B GSTIN)', value: PartyRegistrationType.REGULAR },
    { label: 'Unregistered / Retail Consumer (B2C — No GSTIN)', value: PartyRegistrationType.UNREGISTERED },
    { label: 'Composition Dealer (Section 10)', value: PartyRegistrationType.COMPOSITION },
    { label: 'SEZ Unit (Deemed Inter-State)', value: PartyRegistrationType.SEZ_UNIT },
    { label: 'SEZ Developer', value: PartyRegistrationType.SEZ_DEVELOPER },
    { label: 'Deemed Export (EOU / EPCG)', value: PartyRegistrationType.DEEMED_EXPORT },
    { label: 'Overseas / Foreign Client (Cross-Border Export)', value: PartyRegistrationType.OVERSEAS },
    { label: 'UIN Entity (Diplomatic / UN Body)', value: PartyRegistrationType.UIN_HOLDER },
  ];

  const isUnregistered = formData.registrationType === PartyRegistrationType.UNREGISTERED;
  const isOverseas = formData.registrationType === PartyRegistrationType.OVERSEAS;
  const isGstinForbidden = isUnregistered || isOverseas;

  const handleRegistrationTypeChange = (val: string) => {
    const regType = val as PartyRegistrationType;
    setFormData((prev) => ({
      ...prev,
      registrationType: regType,
      // Strictly clear GSTIN if switching to an unregistered or overseas type
      gstin: regType === PartyRegistrationType.UNREGISTERED || regType === PartyRegistrationType.OVERSEAS ? '' : prev.gstin,
    }));
  };

  const handleGstinChange = (gstinVal: string) => {
    const clean = gstinVal.trim().toUpperCase();
    let updatedPan = formData.pan;
    let updatedState = formData.billingStateCode;

    if (clean.length >= 2) {
      const code = clean.substring(0, 2);
      const stateExists = INDIAN_GST_STATES_LIST.some((s) => s.code === code);
      if (stateExists) updatedState = code;
    }
    if (clean.length >= 12) updatedPan = clean.substring(2, 12);

    setFormData((prev) => ({
      ...prev,
      gstin: clean,
      pan: updatedPan,
      billingStateCode: updatedState,
    }));
  };

  const handleStateChange = (stateCode: string) => {
    const match = INDIAN_GST_STATES_LIST.find((s) => s.code === stateCode);
    setFormData((prev) => ({
      ...prev,
      billingStateCode: stateCode,
      billingState: match?.name || stateCode,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        creditLimit: formData.creditLimit ? formData.creditLimit : '0',
        paymentTermsDays: formData.paymentTermsDays ? Number(formData.paymentTermsDays) : 0,
        // Guarantee GSTIN is omitted if unregistered or overseas
        gstin: isGstinForbidden ? undefined : (formData.gstin.trim() || undefined),
      };

      if (initialData?.id) {
        await apiClient.updateParty(targetCompanyId, initialData.id, payload);
      } else {
        await apiClient.createParty(targetCompanyId, payload);
      }

      setFormData(INITIAL_FORM_STATE);
      setError(null);
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      let msg = initialData ? 'Failed to update party' : 'Failed to create party';
      if (err instanceof Error) {
        msg = err.message;
      } else if (typeof err === 'object' && err !== null) {
        msg = (err as any).message || (err as any).error || JSON.stringify(err);
      } else if (typeof err === 'string') {
        msg = err;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Counterparty' : 'Add New Customer / Vendor'}</DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Update counterparty details, statutory GST registration, and billing parameters.'
              : 'Register counterparty master record with statutory GST registration type and billing details.'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-xl bg-status-danger-subtle text-xs text-status-danger-text font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Legal Name" required id="party-name">
              <Input
                id="party-name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Acme Corp India Pvt Ltd"
              />
            </FormField>

            <FormField label="Trade / Brand Name" id="party-tradename">
              <Input
                id="party-tradename"
                value={formData.tradeName}
                onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                placeholder="e.g. Acme Cloud"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Party Classification" required>
              <Select
                value={formData.partyType}
                onValueChange={(val) => setFormData({ ...formData, partyType: val })}
                options={[
                  { label: 'Customer (Debtor)', value: 'CUSTOMER' },
                  { label: 'Vendor (Creditor)', value: 'VENDOR' },
                  { label: 'Both (Customer & Vendor)', value: 'BOTH' },
                ]}
              />
            </FormField>

            <FormField label="GST Registration Type" required>
              <Select
                value={formData.registrationType}
                onValueChange={handleRegistrationTypeChange}
                options={registrationTypeOptions}
              />
            </FormField>
          </div>

          {/* Conditional GSTIN Section Based on Statutory Policy */}
          {isGstinForbidden ? (
            <div className="p-3.5 rounded-xl bg-status-info-subtle text-xs flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-semibold text-status-info-text">
                  {isOverseas ? 'Cross-Border / Foreign Client' : 'Unregistered Retail Consumer / Client'}
                </span>
                <p className="text-secondary">
                  {isOverseas
                    ? 'Overseas client for zero-rated export supplies. GSTIN is disabled.'
                    : 'B2C vouchers and invoices will be issued without input tax credit. GSTIN is disabled.'}
                </p>
              </div>
              <div className="w-48">
                <FormField label="Billing Currency">
                  <Select
                    value={formData.currency}
                    onValueChange={(val) => setFormData({ ...formData, currency: val })}
                    options={currencyOptions}
                  />
                </FormField>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <FormField label="GSTIN (15 Chars)" required id="party-gstin">
                <Input
                  id="party-gstin"
                  maxLength={15}
                  value={formData.gstin}
                  onChange={(e) => handleGstinChange(e.target.value)}
                  placeholder="27AAPFU0939F1ZV"
                  className="font-mono uppercase"
                />
              </FormField>

              <FormField label="Permanent Account Number (PAN)" id="party-pan">
                <Input
                  id="party-pan"
                  maxLength={10}
                  value={formData.pan}
                  onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                  placeholder="AAPFU0939F"
                  className="font-mono uppercase"
                />
              </FormField>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Contact Email" id="party-email">
              <Input
                id="party-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="accounts@acme.com"
              />
            </FormField>

            <FormField label="Contact Phone / Mobile" id="party-phone">
              <Input
                id="party-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </FormField>
          </div>

          <FormField label="Billing Address Line" id="party-addr">
            <Input
              id="party-addr"
              value={formData.billingAddressLine1}
              onChange={(e) => setFormData({ ...formData, billingAddressLine1: e.target.value })}
              placeholder="e.g. Unit 402, Trade Center, Nariman Point"
            />
          </FormField>

          <div className="grid grid-cols-3 gap-4">
            <FormField label="City" id="party-city">
              <Input
                id="party-city"
                value={formData.billingCity}
                onChange={(e) => setFormData({ ...formData, billingCity: e.target.value })}
                placeholder="Mumbai"
              />
            </FormField>

            <FormField label="State / Jurisdiction" required>
              <Select
                value={formData.billingStateCode}
                onValueChange={handleStateChange}
                options={stateOptions}
                placeholder="Select State"
              />
            </FormField>

            <FormField label="PIN / Postal Code" id="party-pin">
              <Input
                id="party-pin"
                maxLength={10}
                value={formData.billingPincode}
                onChange={(e) => setFormData({ ...formData, billingPincode: e.target.value })}
                placeholder="400021"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1 border-t border-subtle">
            <FormField label="Credit Limit (₹) (Optional)" id="party-credit-limit">
              <Input
                id="party-credit-limit"
                type="number"
                min="0"
                step="1000"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                placeholder="Leave blank for no limit"
              />
            </FormField>

            <FormField label="Payment Terms Cadence (Days) (Optional)" id="party-payment-terms">
              <Input
                id="party-payment-terms"
                type="number"
                min="0"
                max="365"
                value={formData.paymentTermsDays}
                onChange={(e) => setFormData({ ...formData, paymentTermsDays: e.target.value })}
                placeholder="Leave blank for immediate / 0 days"
              />
            </FormField>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setFormData(INITIAL_FORM_STATE);
                setError(null);
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={loading}>
              {initialData ? 'Save Changes' : 'Create Counterparty'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
