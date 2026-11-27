import React from 'react';
import { DateText, Badge, MonoCopyable } from '@platform/ui';
import { formatPartyTaxIdentity, INDIAN_GST_STATES } from '@platform/shared-types';

interface InvoicePartyDetailsProps {
  invoice: any;
  company?: any;
}

export function InvoicePartyDetails({ invoice, company }: InvoicePartyDetailsProps) {
  const partyName = invoice.partyNameSnapshot || invoice.party?.name || 'Customer Name';
  const partyTradeName = invoice.partyTradeNameSnapshot || invoice.party?.tradeName;
  const partyRegType = invoice.partyRegistrationTypeSnapshot || invoice.party?.registrationType;
  const partyGstin = invoice.partyGstinSnapshot !== undefined ? invoice.partyGstinSnapshot : invoice.party?.gstin;
  const identity = formatPartyTaxIdentity(partyRegType, partyGstin);

  const billingAddr = invoice.billingAddressSnapshot?.addressLine1 || invoice.party?.billingAddressLine1 || 'Corporate Headquarters';
  const billingCity = invoice.billingAddressSnapshot?.city || invoice.party?.billingCity;
  const billingPincode = invoice.billingAddressSnapshot?.pincode || invoice.party?.billingPincode;
  const billingState = invoice.billingAddressSnapshot?.state || invoice.party?.billingState || 'India';

  const companyName = company?.legalName || 'Acme Global Technologies Pvt Ltd';
  const branch =
    company?.branches?.find((b: any) => b.id === invoice.branchId) ||
    company?.branches?.[0];

  const isCompanyGstRegistered = Boolean(branch?.gstin && branch.gstin.trim() !== '');
  const companyGstin = isCompanyGstRegistered ? branch.gstin.trim() : null;
  const companyPan = company?.pan || (companyGstin ? companyGstin.substring(2, 12) : null);
  const companyStateCode = branch?.stateCode || (companyGstin ? companyGstin.substring(0, 2) : '08');
  const companyStateName = branch?.state || INDIAN_GST_STATES[companyStateCode]?.name || 'Rajasthan';

  const companyAddr = branch?.addressLine1
    ? `${branch.addressLine1}${branch.city ? `, ${branch.city}` : ''}${branch.pincode ? ` - ${branch.pincode}` : ''}`
    : 'Registered Office Address';

  return (
    <>
      <div className="border-b border-default pb-6 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-brand-text print:text-black">
              {isCompanyGstRegistered ? 'TAX INVOICE' : 'INVOICE'}
            </span>
            <span className="text-[10px] text-muted print:text-black font-semibold">
              {isCompanyGstRegistered ? '(Original for Recipient — GST Rule 46)' : '(Commercial Invoice)'}
            </span>
          </div>
          <h2 className="text-xl font-black mt-1 text-primary print:text-black">
            {companyName}
          </h2>
          <p className="text-xs text-secondary print:text-black mt-0.5">
            {companyAddr}
          </p>
          <div className="mt-2 flex flex-wrap gap-4 text-xs font-mono text-secondary print:text-black">
            <div className="flex items-center gap-1">
              <span className="font-bold text-primary print:text-black">GSTIN:</span>{' '}
              {companyGstin ? (
                <MonoCopyable value={companyGstin} label="GSTIN" />
              ) : (
                <span className="italic font-sans text-muted">Unregistered</span>
              )}
            </div>
            {companyPan && (
              <div className="flex items-center gap-1">
                <span className="font-bold text-primary print:text-black">PAN:</span>{' '}
                <MonoCopyable value={companyPan} label="PAN" />
              </div>
            )}
            <div>
              <span className="font-bold text-primary print:text-black">State Code:</span> {companyStateCode} ({companyStateName})
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-muted print:text-black uppercase font-bold tracking-wider">
            Invoice Number
          </div>
          <div className="text-lg font-black font-mono text-primary print:text-black">
            {invoice.invoiceNumber}
          </div>
          <div className="mt-2 text-xs space-y-0.5 text-secondary print:text-black">
            <div>
              <span className="font-bold text-primary print:text-black">Invoice Date:</span> <DateText date={invoice.invoiceDate} />
            </div>
            <div>
              <span className="font-bold text-primary print:text-black">Payment Due:</span> <DateText date={invoice.dueDate} />
            </div>
            <div>
              <span className="font-bold text-primary print:text-black">Place of Supply:</span> State Code {invoice.placeOfSupplyStateCode}
            </div>
          </div>
        </div>
      </div>

      <div className="py-6 border-b border-default grid grid-cols-2 gap-8 text-xs">
        <div>
          <div className="font-bold uppercase tracking-wider text-muted print:text-black text-[10px] mb-1">
            Billed To (Customer):
          </div>
          <div className="text-sm font-bold text-primary print:text-black">
            {partyName}
          </div>
          {partyTradeName && (
            <div className="text-xs text-secondary print:text-black">
              Trade Name: {partyTradeName}
            </div>
          )}
          <div className="text-secondary print:text-black mt-1">
            {billingAddr}
            {billingCity && `, ${billingCity}`}
            {billingPincode && ` - ${billingPincode}`}
          </div>
          <div className="mt-2 font-mono text-primary print:text-black space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="font-bold">Tax Treatment:</span>
              <Badge variant={identity.badgeVariant} size="xs">
                {identity.badgeLabel}
              </Badge>
            </div>
            {identity.showGstin && partyGstin ? (
              <div className="flex items-center gap-1">
                <span className="font-bold">GSTIN:</span>{' '}
                <MonoCopyable value={partyGstin} label="Customer GSTIN" />
              </div>
            ) : null}
            <div>
              <span className="font-bold">State:</span> State Code {invoice.placeOfSupplyStateCode} ({billingState})
            </div>
          </div>
        </div>

        <div>
          <div className="font-bold uppercase tracking-wider text-muted print:text-black text-[10px] mb-1">
            Remittance Bank Details:
          </div>
          <div className="p-3 rounded-xl bg-surface-sunken print:bg-white border border-subtle text-xs space-y-1">
            <div className="font-bold text-primary print:text-black">HDFC Bank Limited</div>
            <div className="text-primary print:text-black">
              <span className="text-secondary print:text-black">Current A/c:</span>{' '}
              <span className="font-mono font-bold">50200012345678</span>
            </div>
            <div className="text-primary print:text-black">
              <span className="text-secondary print:text-black">IFSC Code:</span>{' '}
              <span className="font-mono font-bold">HDFC0000060</span>
            </div>
            <div className="text-primary print:text-black">
              <span className="text-secondary print:text-black">Branch:</span> Nariman Point Commercial Hub
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

