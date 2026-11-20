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
    <div className="space-y-4">
      {/* Document Type, Numbering, and Tax Classification (Spacious 3-column layout) */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Invoice Number
                </label>
                {customInvoiceNumber ? (
                  <Badge variant="brand" size="xs">Custom Override</Badge>
                ) : (
                  <Badge variant="success" size="xs">Auto-Assigned</Badge>
                )}
              </div>
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400 font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Configure</span>
                </button>
              )}
            </div>
            <div
              onClick={onOpenSettings}
              className="h-10 px-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between text-xs cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors shadow-2xs group"
              title={
                customInvoiceNumber
                  ? `Custom number specified: ${customInvoiceNumber}`
                  : `Will be saved as: ${autoInvoiceNumber || 'Allocating...'}`
              }
            >
              <div className="flex items-center gap-2 min-w-0">
                <Hash className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
                {customInvoiceNumber ? (
                  <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 tracking-wider">
                    {customInvoiceNumber}
                  </span>
                ) : fetchingNumber && !autoInvoiceNumber ? (
                  <span className="text-slate-400 dark:text-slate-500 italic font-sans text-xs">
                    Allocating sequence...
                  </span>
                ) : (
                  <span className="font-mono font-bold text-sm text-slate-900 dark:text-white tracking-wider">
                    {autoInvoiceNumber || 'INV-00001'}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium text-slate-400 group-hover:text-blue-500 transition-colors shrink-0">
                Edit Series &rarr;
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {customInvoiceNumber ? (
                <span>Custom number active. Click Configure to revert to auto.</span>
              ) : (
                <span>Next statutory sequence: <strong className="font-mono text-slate-700 dark:text-slate-200">{autoInvoiceNumber || 'next sequence'}</strong></span>
              )}
            </p>
          </div>

          <FormField label="Tax Classification" required>
            <Select
              value={taxClassification}
              onValueChange={onTaxClassificationChange}
              options={[
                { label: 'Taxable Supply (Regular GST)', value: 'TAXABLE' },
                { label: 'Nil-Rated Supply (0%)', value: 'NIL_RATED' },
                { label: 'Exempted Supply', value: 'EXEMPT' },
                { label: 'Non-GST Supply', value: 'NON_GST' },
              ]}
            />
          </FormField>
        </div>

        {/* Statutory Reverse Charge Mechanism (RCM) Footer Bar */}
        <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              id="rcm-checkbox"
              checked={isRcm}
              onChange={(e) => onRcmChange(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Reverse Charge Mechanism (RCM)
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
              — Tax liability discharged directly by recipient under GST Section 9(3) / 9(4)
            </span>
          </label>
          {isRcm && (
            <Badge variant="warning" size="xs">
              RCM Active: Recipient will discharge GST liability
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        <FormField label="Billing Branch / Location" required>
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
      </div>

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
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Place of Supply (POS) <span className="text-rose-500">*</span>
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

      {selectedParty && (() => {
        const identity = formatPartyTaxIdentity(selectedParty.registrationType, selectedParty.gstin);
        return (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-1.5">
              <span className="font-bold">Tax Treatment:</span>
              <Badge variant={identity.badgeVariant} size="xs">
                {identity.badgeLabel}
              </Badge>
            </div>
            {identity.showGstin && selectedParty.gstin ? (
              <div>
                <span className="font-bold">GSTIN:</span>{' '}
                <span className="font-mono">{selectedParty.gstin}</span>
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
    </div>
  );
}

