'use client';

import React from 'react';
import { FormField, Select, Input, Badge } from '@platform/ui';
import { INDIAN_GST_STATES_LIST, formatPartyTaxIdentity } from '@platform/shared-types';
import { Settings, Hash } from 'lucide-react';

interface InvoiceHeaderFieldsProps {
  parties: any[];
  branches: any[];
  financialYears: any[];
  selectedPartyId: string;
  selectedBranchId: string;
  selectedFyId: string;
  invoiceDate: string;
  dueDate: string;
  posStateCode: string;
  isIntraState: boolean;
  documentType: string;
  taxClassification: string;
  isRcm: boolean;
  customInvoiceNumber?: string;
  autoInvoiceNumber?: string;
  fetchingNumber?: boolean;
  onOpenSettings?: () => void;
  onPartyChange: (partyId: string) => void;
  onBranchChange: (branchId: string) => void;
  onFyChange: (fyId: string) => void;
  onInvoiceDateChange: (date: string) => void;
  onDueDateChange: (date: string) => void;
  onPosChange: (pos: string) => void;
  onDocumentTypeChange: (docType: string) => void;
  onTaxClassificationChange: (taxClass: string) => void;
  onRcmChange: (isRcm: boolean) => void;
}

export function InvoiceHeaderFields({
  parties,
  branches,
  financialYears,
  selectedPartyId,
  selectedBranchId,
  selectedFyId,
  invoiceDate,
  dueDate,
  posStateCode,
  isIntraState,
  documentType,
  taxClassification,
  isRcm,
  customInvoiceNumber,
  autoInvoiceNumber,
  fetchingNumber,
  onOpenSettings,
  onPartyChange,
  onBranchChange,
  onFyChange,
  onInvoiceDateChange,
  onDueDateChange,
  onPosChange,
  onDocumentTypeChange,
  onTaxClassificationChange,
  onRcmChange,
}: InvoiceHeaderFieldsProps) {
  const selectedParty = parties.find((p) => p.id === selectedPartyId);

  return (
    <div className="space-y-6">
      {/* Fieldset 1 — Document */}
      <fieldset className="p-5 rounded-2xl bg-surface-sunken border border-default space-y-4">
        <legend className="px-2 text-xs font-bold uppercase tracking-wider text-secondary">
          1. Document Configuration
        </legend>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <FormField label="Document Type" required>
            <Select
              value={documentType}
              onValueChange={onDocumentTypeChange}
              options={[
                { label: 'Tax Invoice (Standard GST)', value: 'TAX_INVOICE' },
                { label: 'Credit Note (Section 34)', value: 'CREDIT_NOTE' },
                { label: 'Debit Note (Section 34)', value: 'DEBIT_NOTE' },
                { label: 'Proforma Invoice (Estimate)', value: 'PROFORMA_INVOICE' },
                { label: 'Delivery Challan (Jobwork/Logistics)', value: 'DELIVERY_CHALLAN' },
              ]}
            />
          </FormField>

          <FormField label="Billing Branch" required>
            <Select
              value={selectedBranchId}
              onValueChange={onBranchChange}
              options={branches.map((b) => ({
                label: `${b.name} (${b.stateCode})`,
                value: b.id,
              }))}
              placeholder="Select branch..."
            />
          </FormField>

          <FormField label="Financial Year" required>
            <Select
              value={selectedFyId}
              onValueChange={onFyChange}
              options={financialYears.map((fy) => ({
                label: fy.name,
                value: fy.id,
              }))}
              placeholder="Select financial year..."
            />
          </FormField>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold text-primary">
                  Invoice Number
                </label>
                {customInvoiceNumber ? (
                  <Badge variant="brand" size="xs">Custom</Badge>
                ) : (
                  <Badge variant="success" size="xs">Auto</Badge>
                )}
              </div>
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="text-[11px] text-brand-text hover:opacity-80 font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Settings className="w-3 h-3" />
                  <span>Series</span>
                </button>
              )}
            </div>
            <div
              onClick={onOpenSettings}
              className="h-9 px-3 rounded-xl border border-default bg-surface flex items-center justify-between text-xs cursor-pointer hover:border-focus transition-colors shadow-2xs group"
              title={
                customInvoiceNumber
                  ? `Custom number specified: ${customInvoiceNumber}`
                  : `Will be saved as: ${autoInvoiceNumber || 'Allocating...'}`
              }
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Hash className="w-3.5 h-3.5 text-muted group-hover:text-brand-text transition-colors shrink-0" />
                {customInvoiceNumber ? (
                  <span className="font-mono font-bold text-xs text-brand-text tracking-wider truncate">
                    {customInvoiceNumber}
                  </span>
                ) : fetchingNumber && !autoInvoiceNumber ? (
                  <span className="text-muted italic font-sans text-xs">
                    Allocating...
                  </span>
                ) : (
                  <span className="font-mono font-bold text-xs text-primary tracking-wider truncate">
                    {autoInvoiceNumber || 'INV-00001'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Statutory Reverse Charge Mechanism (RCM) Bar */}
        <div className="pt-3 border-t border-subtle flex flex-wrap items-center justify-between gap-3 text-xs">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              id="rcm-checkbox"
              checked={isRcm}
              onChange={(e) => onRcmChange(e.target.checked)}
              className="h-4 w-4 rounded border-default text-brand focus:ring-focus-ring cursor-pointer"
            />
            <span className="font-semibold text-primary">
              Reverse Charge Mechanism (RCM)
            </span>
            <span className="text-[11px] text-secondary hidden sm:inline">
              — Recipient discharges GST under Section 9(3)/9(4)
            </span>
          </label>
          {isRcm && (
            <Badge variant="warning" size="xs">
              RCM Active
            </Badge>
          )}
        </div>
      </fieldset>

      {/* Fieldset 2 — Party & Dates */}
      <fieldset className="p-5 rounded-2xl bg-surface border border-default space-y-4">
        <legend className="px-2 text-xs font-bold uppercase tracking-wider text-secondary">
          2. Customer & Transaction Dates
        </legend>

        <div className="space-y-4">
          <FormField label="Customer (Billed To)" required>
            <Select
              value={selectedPartyId}
              onValueChange={onPartyChange}
              options={parties.map((p) => ({
                label: `${p.name} ${p.tradeName ? `(${p.tradeName})` : ''}`,
                value: p.id,
              }))}
              placeholder="Select a customer..."
            />
          </FormField>

          {selectedParty && (() => {
            const identity = formatPartyTaxIdentity(selectedParty.registrationType, selectedParty.gstin);
            return (
              <div className="p-3 rounded-xl bg-surface-sunken border border-subtle text-xs flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold">Tax Treatment:</span>
                  <Badge variant={identity.badgeVariant} size="xs">
                    {identity.badgeLabel}
                  </Badge>
                </div>
                {identity.showGstin && selectedParty.gstin ? (
                  <div>
                    <span className="font-bold">GSTIN:</span>{' '}
                    <span className="font-mono text-brand-text font-bold">{selectedParty.gstin}</span>
                  </div>
                ) : null}
                {selectedParty.pan ? (
                  <div>
                    <span className="font-bold">PAN:</span>{' '}
                    <span className="font-mono">{selectedParty.pan}</span>
                  </div>
                ) : null}
                <div>
                  <span className="font-bold">City:</span> {selectedParty.billingCity || '—'}
                </div>
                <div>
                  <span className="font-bold">State:</span> {selectedParty.billingState || 'India'}
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Invoice Date" required id="inv-date">
              <Input
                id="inv-date"
                type="date"
                value={invoiceDate}
                onChange={(e) => onInvoiceDateChange(e.target.value)}
              />
            </FormField>

            <FormField label="Payment Due Date" required id="inv-due-date">
              <Input
                id="inv-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => onDueDateChange(e.target.value)}
              />
            </FormField>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-primary">
                  Place of Supply (POS) <span className="text-status-danger-text">*</span>
                </label>
                <Badge variant={isIntraState ? 'brand' : 'info'} size="xs">
                  {isIntraState ? 'Intra-State (CGST+SGST)' : 'Inter-State (IGST)'}
                </Badge>
              </div>
              <Select
                value={posStateCode}
                onValueChange={onPosChange}
                options={INDIAN_GST_STATES_LIST.map((s) => ({
                  label: s.label,
                  value: s.code,
                }))}
                placeholder="Select Place of Supply..."
              />
            </div>
          </div>
        </div>
      </fieldset>
    </div>
  );
}

