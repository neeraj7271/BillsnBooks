import React from 'react';
import { DateText, MoneyText, QrCode } from '@platform/ui';
import { INDIAN_GST_STATES } from '@platform/shared-types';
import { CheckCircle2 } from 'lucide-react';
import type { InvoiceTemplateProps } from './types';

export function MinimalCompactTemplate({ invoice, company, settings }: InvoiceTemplateProps) {
  const isIntraState = invoice.supplyType === 'INTRA_STATE';
  const partyName = invoice.partyNameSnapshot || invoice.party?.name || 'Customer Name';
  const partyGstin = invoice.partyGstinSnapshot || invoice.party?.gstin || 'Unregistered';

  const billingAddr =
    invoice.billingAddressSnapshot?.addressLine1 ||
    invoice.party?.billingAddressLine1 ||
    'Client Address';
  const billingCity = invoice.billingAddressSnapshot?.city || invoice.party?.billingCity || '';
  const billingState = invoice.billingAddressSnapshot?.state || invoice.party?.billingState || 'India';

  const companyName = company?.legalName || 'Acme Global Technologies Pvt Ltd';
  const branch =
    company?.branches?.find((b: any) => b.id === invoice.branchId) ||
    company?.branches?.[0];

  const isCompanyGstRegistered = Boolean(branch?.gstin && branch.gstin.trim() !== '');
  const companyGstin = isCompanyGstRegistered ? branch.gstin.trim() : null;
  const companyPan = company?.pan || (companyGstin ? companyGstin.substring(2, 12) : null);
  const companyStateCode = branch?.stateCode || (companyGstin ? companyGstin.substring(0, 2) : '08');
  const companyState = branch?.state || INDIAN_GST_STATES[companyStateCode]?.name || 'Rajasthan';

  const companyAddr = branch?.addressLine1
    ? `${branch.addressLine1}${branch.city ? `, ${branch.city}` : ''}${branch.pincode ? ` - ${branch.pincode}` : ''}`
    : 'Registered Office Address';

  // Branding, Signature, QR, and Terms
  const logoUrl = settings?.['branding.logo_url'] || company?.logoUrl || null;
  const signatureUrl = settings?.['branding.signature_url'] || null;
  const signatureType = settings?.['branding.signature_type'] || (signatureUrl ? 'IMAGE' : 'IMAGE');
  const dscSignerName = settings?.['branding.dsc_signer_name'] || 'Authorised Signatory';
  const dscDesignation = settings?.['branding.dsc_designation'] || 'Authorised Signatory';
  const dscCertDetails = settings?.['branding.dsc_cert_details'] || 'Class-3 Digital Signature Certificate';
  const showSignature = settings?.['document.show_signature'] !== false;
  const showQrCode = settings?.['document.show_qr_code'] !== false;
  const upiId = settings?.['document.upi_id'] || 'acme@hdfcbank';
  const termsAndConditions =
    settings?.['document.terms_and_conditions'] ||
    invoice.notes ||
    '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if payment is overdue.\n3. Subject to local jurisdiction.';

  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(companyName)}&am=${encodeURIComponent(invoice.totalAmount)}&cu=INR&tn=${encodeURIComponent('Invoice ' + invoice.invoiceNumber)}`;

  return (
    <div className="w-full bg-surface text-primary font-sans text-[11px] select-text print:bg-white print:text-black">
      {/* Compact Header */}
      <div className="flex justify-between items-start pb-4 border-b border-strong">
        <div className="flex items-center gap-3">
          {logoUrl && (
            <img
              src={logoUrl}
              alt={companyName}
              className="h-16 w-16 max-h-[64px] max-w-[64px] object-contain shrink-0 self-center"
            />
          )}
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-secondary print:text-black">
              {isCompanyGstRegistered ? 'TAX INVOICE' : 'INVOICE'}
            </span>
            <h1 className="text-base font-black text-primary print:text-black">{companyName}</h1>
            <p className="text-[10px] text-secondary print:text-black">{companyAddr}</p>
            <div className="text-[10px] font-mono text-secondary print:text-black mt-0.5">
              GSTIN: {companyGstin || 'Unregistered'}
              {companyPan ? ` | PAN: ${companyPan}` : ''}
              {` | State: ${companyStateCode} (${companyState})`}
            </div>
          </div>
        </div>

        <div className="text-right space-y-0.5 shrink-0">
          <div className="text-sm font-mono font-black text-primary print:text-black whitespace-nowrap">{invoice.invoiceNumber}</div>
          <div className="text-[10px] text-secondary print:text-black font-medium">
            Date: <DateText date={invoice.invoiceDate} className="text-primary print:text-black font-bold" /> | Due: <DateText date={invoice.dueDate} className="text-primary print:text-black font-bold" />
          </div>
          <div className="text-[10px] text-secondary print:text-black font-medium">
            POS: State {invoice.placeOfSupplyStateCode} ({isIntraState ? 'Intra-State' : 'Inter-State'})
          </div>
        </div>
      </div>

      {/* Bill To & Dispatch Row */}
      <div className="grid grid-cols-2 gap-4 py-3 border-b border-strong text-[10px]">
        <div>
          <span className="font-bold text-secondary print:text-black uppercase block">Billed To:</span>
          <div className="font-bold text-xs text-primary print:text-black">{partyName}</div>
          <div className="text-secondary print:text-black">{billingAddr}, {billingCity} ({billingState})</div>
          <div className="font-mono text-secondary print:text-black mt-0.5">GSTIN: {partyGstin}</div>
        </div>

        <div className="text-right">
          <span className="font-bold text-secondary print:text-black uppercase block">Bank Remittance:</span>
          <div className="font-bold text-primary print:text-black">HDFC Bank • A/c 50200012345678</div>
          <div className="font-mono text-secondary print:text-black">IFSC: HDFC0000060</div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="py-3 border-b border-strong">
        <table className="w-full text-left text-[11px] border-collapse">
          <thead>
            <tr className="border-b-2 border-strong text-[10px] font-bold uppercase text-primary print:text-black">
              <th className="py-1 px-1.5 w-6">#</th>
              <th className="py-1 px-2">Item Description</th>
              <th className="py-1 px-1.5 w-16 text-center">HSN</th>
              <th className="py-1 px-1.5 w-20 text-right">Qty</th>
              <th className="py-1 px-2 w-20 text-right">Rate</th>
              <th className="py-1 px-1.5 w-12 text-right">Disc</th>
              <th className="py-1 px-2 w-20 text-right">Taxable</th>
              <th className="py-1 px-1.5 w-12 text-right">GST</th>
              <th className="py-1 px-2 w-20 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {invoice.items?.map((it: any, idx: number) => {
              const disc = parseFloat(it.discountPercent) || 0;
              return (
                <tr key={it.id || idx}>
                  <td className="py-1.5 px-1.5 text-secondary print:text-black">{idx + 1}</td>
                  <td className="py-1.5 px-2 font-semibold text-primary print:text-black">{it.description}</td>
                  <td className="py-1.5 px-1.5 font-mono text-center text-primary print:text-black">{it.hsnSacCode}</td>
                  <td className="py-1.5 px-1.5 text-right font-mono font-bold text-primary print:text-black whitespace-nowrap">
                    {parseFloat(it.quantity).toFixed(0)} {it.uom}
                  </td>
                  <td className="py-1.5 px-2 text-right text-primary print:text-black font-mono">
                    <MoneyText amount={it.unitPrice} />
                  </td>
                  <td className="py-1.5 px-1.5 text-right font-mono text-secondary print:text-black">
                    {disc > 0 ? `${disc.toFixed(0)}%` : '—'}
                  </td>
                  <td className="py-1.5 px-2 text-right font-semibold text-primary print:text-black font-mono">
                    <MoneyText amount={it.taxableAmount} />
                  </td>
                  <td className="py-1.5 px-1.5 text-right font-mono text-secondary print:text-black">
                    {parseFloat(it.gstRatePercent)}%
                  </td>
                  <td className="py-1.5 px-2 text-right font-bold text-primary print:text-black font-mono">
                    <MoneyText amount={it.totalAmount} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="pt-3 flex justify-between items-start text-[10px]">
        <div className="max-w-xs text-secondary print:text-black space-y-2">
          <div className="flex items-start gap-2.5">
            {showQrCode && (
              <div className="shrink-0 text-center">
                <QrCode value={upiUri} size={60} className="border border-default p-0.5 bg-white rounded" />
                <span className="text-[7.5px] font-bold text-secondary uppercase block mt-0.5">UPI Pay</span>
              </div>
            )}
            <div className="space-y-1">
              <div>
                <span className="font-bold">Terms & Conditions:</span>
                <p className="whitespace-pre-line text-secondary leading-tight mt-0.5 text-[9.5px]">
                  {termsAndConditions}
                </p>
              </div>
              <div className="italic text-[8.5px] text-muted pt-0.5">
                Declaration: This invoice shows the actual price of goods and all particulars are true.
              </div>
            </div>
          </div>
        </div>

        <div className="w-56 space-y-1 text-right">
          <div className="flex justify-between text-secondary print:text-black font-medium">
            <span>Subtotal:</span>
            <MoneyText amount={invoice.subtotalAmount} />
          </div>

          {isIntraState ? (
            <>
              <div className="flex justify-between text-secondary print:text-black font-medium">
                <span>CGST (9%):</span>
                <MoneyText amount={invoice.cgstAmount} />
              </div>
              <div className="flex justify-between text-secondary print:text-black font-medium">
                <span>SGST (9%):</span>
                <MoneyText amount={invoice.sgstAmount} />
              </div>
            </>
          ) : (
            <div className="flex justify-between text-secondary print:text-black font-medium">
              <span>IGST (18%):</span>
              <MoneyText amount={invoice.igstAmount} />
            </div>
          )}

          <div className="pt-1.5 border-t border-strong flex justify-between font-black text-xs text-primary print:text-black">
            <span>Total:</span>
            <span className="font-mono"><MoneyText amount={invoice.totalAmount} /></span>
          </div>

          <div className="pt-4 text-center flex flex-col items-center">
            <span className="font-bold block text-primary print:text-black mb-1">For {companyName}</span>

            {showSignature && signatureType === 'DSC' ? (
              <div className="inline-flex items-center gap-1 p-1 px-2 mb-1 rounded border border-status-success bg-status-success-subtle text-status-success-text text-[7.5px] text-left">
                <CheckCircle2 className="h-3 w-3 text-status-success-text shrink-0" />
                <div>
                  <div className="font-bold">Digitally Signed by {dscSignerName}</div>
                  <div className="text-[6.5px] text-status-success-text font-mono">
                    {dscDesignation} • {dscCertDetails || 'Valid DSC'}
                  </div>
                </div>
              </div>
            ) : showSignature && signatureUrl ? (
              <img
                src={signatureUrl}
                alt="Authorized Signature"
                className="h-8 max-w-[100px] object-contain mb-1"
              />
            ) : (
              <div className="h-6" />
            )}

            <div className="w-full border-t border-strong pt-0.5 text-[9px] text-secondary print:text-black uppercase font-bold">
              {settings?.['document.authorized_signatory_title'] || 'Authorised Signatory'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

