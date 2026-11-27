import React from 'react';
import { DateText, MoneyText, QrCode } from '@platform/ui';
import { CheckCircle2 } from 'lucide-react';
import { numberToIndianWords } from '@/lib/number-to-words';
import { INDIAN_GST_STATES } from '@platform/shared-types';
import type { InvoiceTemplateProps } from './types';
import '@/app/invoices/print.css';

export function TallyClassicTemplate({ invoice, company, settings }: InvoiceTemplateProps) {
  const isIntraState = invoice.supplyType === 'INTRA_STATE';
  const partyName = invoice.partyNameSnapshot || invoice.party?.name || 'Customer Name';
  const partyTradeName = invoice.partyTradeNameSnapshot || invoice.party?.tradeName;
  const partyGstin = invoice.partyGstinSnapshot || invoice.party?.gstin || 'Unregistered / Consumer';

  const billingAddr =
    invoice.billingAddressSnapshot?.addressLine1 ||
    invoice.party?.billingAddressLine1 ||
    'Client Registered Address';
  const billingCity = invoice.billingAddressSnapshot?.city || invoice.party?.billingCity || '';
  const billingPincode = invoice.billingAddressSnapshot?.pincode || invoice.party?.billingPincode || '';
  const billingState = invoice.billingAddressSnapshot?.state || invoice.party?.billingState || 'India';
  const billingStateCode = invoice.placeOfSupplyStateCode || '27';

  const companyName = company?.legalName || invoice.companyLegalNameSnapshot || 'Acme Global Technologies Pvt Ltd';
  const branch =
    company?.branches?.find((b: any) => b.id === invoice.branchId) ||
    company?.branches?.[0];

  const isCompanyGstRegistered = Boolean(branch?.gstin && branch.gstin.trim() !== '');
  const companyGstin = isCompanyGstRegistered ? branch.gstin.trim() : null;
  const companyPan = company?.pan || invoice.companyPanSnapshot || (companyGstin ? companyGstin.substring(2, 12) : null);
  const companyStateCode = branch?.stateCode || (companyGstin ? companyGstin.substring(0, 2) : '08');
  const companyState = branch?.state || INDIAN_GST_STATES[companyStateCode]?.name || 'Rajasthan';

  const companyAddr = branch?.addressLine1
    ? `${branch.addressLine1}${branch.city ? `, ${branch.city}` : ''}${branch.pincode ? ` - ${branch.pincode}` : ''}`
    : 'Registered Office Address';

  // Branding, Signature, QR and Terms Settings
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
    '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if payment is overdue.\n3. Subject to local jurisdiction.';

  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(companyName)}&am=${encodeURIComponent(invoice.totalAmount)}&cu=INR&tn=${encodeURIComponent('Invoice ' + invoice.invoiceNumber)}`;

  const totalTax =
    (parseFloat(invoice.cgstAmount) || 0) +
    (parseFloat(invoice.sgstAmount) || 0) +
    (parseFloat(invoice.igstAmount) || 0);

  const amountInWords = numberToIndianWords(invoice.totalAmount);
  const taxInWords = numberToIndianWords(totalTax);

  return (
    <div className="w-full bg-surface text-primary border-2 border-strong font-sans text-[11px] select-text print:bg-white print:text-black">
      {/* Title Header */}
      <div className="border-b-2 border-strong py-1.5 px-2 text-center relative bg-surface-sunken print:bg-white">
        <h1 className="text-sm font-black uppercase tracking-wider text-primary font-serif">
          {isCompanyGstRegistered ? 'Tax Invoice' : 'Invoice'}
        </h1>
        <span className="text-[9px] text-secondary uppercase font-semibold block">
          {isCompanyGstRegistered
            ? '(Issued under Rule 46 of the CGST Rules, 2017 — Original for Recipient)'
            : '(Commercial Invoice — Original for Recipient)'}
        </span>
      </div>

      {/* Top 2-Column Grid: Supplier (Left) vs Document & Dispatch Info (Right) */}
      <div className="grid grid-cols-2 border-b-2 border-strong divide-x-2 divide-border-strong">
        {/* Left: Supplier Details */}
        <div className="p-2 flex flex-col justify-between space-y-1.5">
          <div className="flex items-center gap-3">
            {logoUrl && (
              <img
                src={logoUrl}
                alt={companyName}
                className="h-20 w-20 max-h-[82px] max-w-[82px] object-contain shrink-0 self-center"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black uppercase tracking-tight text-primary">
                {companyName}
              </div>
              <div className="text-secondary leading-snug mt-0.5 text-[10.5px]">{companyAddr}</div>
              <div className="mt-1 space-y-0.5 font-mono text-[10px]">
                <div>
                  <span className="font-bold text-primary">GSTIN/UIN:</span>{' '}
                  {companyGstin || <span className="italic font-sans text-secondary">Unregistered</span>}
                </div>
                <div>
                  <span className="font-bold text-primary">State Name:</span> {companyState}, Code: {companyStateCode}
                </div>
                {companyPan && (
                  <div>
                    <span className="font-bold text-primary">PAN:</span> {companyPan}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Consignee / Buyer Section */}
          <div className="border-t border-default pt-1.5">
            <div className="text-[9px] font-bold text-secondary uppercase tracking-wider mb-0.5">
              Buyer (Bill to):
            </div>
            <div className="font-bold text-primary text-[11px]">{partyName}</div>
            {partyTradeName && <div className="text-[10px] text-secondary">({partyTradeName})</div>}
            <div className="text-secondary leading-snug text-[10px]">
              {billingAddr}
              {billingCity && `, ${billingCity}`}
              {billingPincode && ` - ${billingPincode}`}
            </div>
            <div className="mt-0.5 font-mono text-[10px] space-y-0.5">
              <div>
                <span className="font-bold">GSTIN/UIN:</span> {partyGstin}
              </div>
              <div>
                <span className="font-bold">State Name:</span> {billingState}, Code: {billingStateCode}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Structured Tracking Metadata Grid */}
        <div className="divide-y divide-border-default">
          <div className="grid grid-cols-2 divide-x divide-border-default">
            <div className="py-1 px-2">
              <span className="text-[9px] text-secondary print:text-black block uppercase font-bold">Invoice No.</span>
              <span className="font-mono font-black text-xs text-primary print:text-black whitespace-nowrap">{invoice.invoiceNumber}</span>
            </div>
            <div className="py-1 px-2">
              <span className="text-[9px] text-secondary print:text-black block uppercase font-bold">Dated</span>
              <span className="font-mono font-bold text-[11px] text-primary print:text-black"><DateText date={invoice.invoiceDate} className="text-primary print:text-black" /></span>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-border-default">
            <div className="py-1 px-2">
              <span className="text-[9px] text-secondary print:text-black block uppercase font-bold">Delivery Note</span>
              <span className="font-mono text-[10.5px] text-primary print:text-black">{invoice.deliveryNote || '—'}</span>
            </div>
            <div className="py-1 px-2">
              <span className="text-[9px] text-secondary print:text-black block uppercase font-bold">Mode/Terms of Payment</span>
              <span className="font-medium text-[10.5px] text-primary print:text-black">Due <DateText date={invoice.dueDate} className="text-primary print:text-black font-bold" /></span>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-border-default">
            <div className="py-1 px-2">
              <span className="text-[9px] text-secondary print:text-black block uppercase font-bold">Supplier's Ref.</span>
              <span className="font-mono text-[10.5px] text-primary print:text-black">{invoice.supplierRef || 'Direct'}</span>
            </div>
            <div className="py-1 px-2">
              <span className="text-[9px] text-secondary print:text-black block uppercase font-bold">Other Reference(s)</span>
              <span className="font-mono text-[10.5px] text-primary print:text-black">{invoice.otherReferences || 'N/A'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-border-default">
            <div className="py-1 px-2">
              <span className="text-[9px] text-secondary print:text-black block uppercase font-bold">Buyer's Order No.</span>
              <span className="font-mono text-[10.5px] text-primary print:text-black">{invoice.purchaseOrderNumber || '—'}</span>
            </div>
            <div className="py-1 px-2">
              <span className="text-[9px] text-secondary print:text-black block uppercase font-bold">Order Dated</span>
              <span className="font-mono text-[10.5px] text-primary print:text-black"><DateText date={invoice.invoiceDate} className="text-primary print:text-black" /></span>
            </div>
          </div>

          <div className="py-1 px-2 bg-surface-sunken print:bg-white text-[10px]">
            <span className="text-[9px] text-secondary block uppercase font-bold">Place of Supply</span>
            <span className="font-bold text-primary">
              State Code {invoice.placeOfSupplyStateCode} ({isIntraState ? 'Intra-State Supply' : 'Inter-State Supply'})
            </span>
          </div>
        </div>
      </div>

      {/* Main Item Table */}
      <div className="border-b-2 border-strong">
        <table className="w-full text-left text-[10.5px] border-collapse">
          <thead>
            <tr className="border-b-2 border-strong bg-surface-sunken print:bg-white text-[9px] font-black uppercase text-primary">
              <th className="py-1 px-1.5 w-8 text-center border-r border-default">Sl No.</th>
              <th className="py-1 px-1.5 border-r border-default">Description of Goods</th>
              <th className="py-1 px-1.5 w-18 text-center border-r border-default">HSN/SAC</th>
              <th className="py-1 px-1.5 w-16 text-right border-r border-default">Quantity</th>
              <th className="py-1 px-1.5 w-20 text-right border-r border-default">Rate</th>
              <th className="py-1 px-1.5 w-12 text-center border-r border-default">per</th>
              <th className="py-1 px-1.5 w-14 text-right border-r border-default">Disc %</th>
              <th className="py-1 px-2 w-24 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {invoice.items?.map((it: any, idx: number) => {
              const disc = parseFloat(it.discountPercent) || 0;
              return (
                <tr key={it.id || idx} className="align-top">
                  <td className="py-1 px-1.5 text-center font-mono border-r border-default text-secondary">
                    {idx + 1}
                  </td>
                  <td className="py-1 px-1.5 border-r border-default">
                    <div className="font-bold text-primary">{it.description}</div>
                  </td>
                  <td className="py-1 px-1.5 text-center font-mono border-r border-default text-secondary">
                    {it.hsnSacCode}
                  </td>
                  <td className="py-1 px-1.5 text-right font-mono font-bold border-r border-default">
                    {parseFloat(it.quantity).toFixed(0)} {it.uom}
                  </td>
                  <td className="py-1 px-1.5 text-right font-mono border-r border-default">
                    <MoneyText amount={it.unitPrice} />
                  </td>
                  <td className="py-1 px-1.5 text-center uppercase border-r border-default text-secondary">
                    {it.uom}
                  </td>
                  <td className="py-1 px-1.5 text-right font-mono border-r border-default text-secondary">
                    {disc > 0 ? `${disc.toFixed(1)}%` : '—'}
                  </td>
                  <td className="py-1 px-2 text-right font-mono font-bold text-primary">
                    <MoneyText amount={it.taxableAmount} />
                  </td>
                </tr>
              );
            })}

            {/* GST Output Lines (Tally Style) */}
            {isIntraState ? (
              <>
                <tr className="text-secondary italic">
                  <td className="py-1 px-1.5 border-r border-default" />
                  <td className="py-1 px-1.5 font-bold border-r border-default">Output CGST (9.00%)</td>
                  <td className="py-1 px-1.5 border-r border-default" />
                  <td className="py-1 px-1.5 border-r border-default" />
                  <td className="py-1 px-1.5 border-r border-default" />
                  <td className="py-1 px-1.5 border-r border-default" />
                  <td className="py-1 px-1.5 border-r border-default" />
                  <td className="py-1 px-2 text-right font-mono font-semibold">
                    <MoneyText amount={invoice.cgstAmount} />
                  </td>
                </tr>
                <tr className="text-secondary italic">
                  <td className="py-1 px-1.5 border-r border-default" />
                  <td className="py-1 px-1.5 font-bold border-r border-default">Output SGST (9.00%)</td>
                  <td className="py-1 px-1.5 border-r border-default" />
                  <td className="py-1 px-1.5 border-r border-default" />
                  <td className="py-1 px-1.5 border-r border-default" />
                  <td className="py-1 px-1.5 border-r border-default" />
                  <td className="py-1 px-1.5 border-r border-default" />
                  <td className="py-1 px-2 text-right font-mono font-semibold">
                    <MoneyText amount={invoice.sgstAmount} />
                  </td>
                </tr>
              </>
            ) : (
              <tr className="text-secondary italic">
                <td className="py-1 px-1.5 border-r border-default" />
                <td className="py-1 px-1.5 font-bold border-r border-default">Output IGST (18.00%)</td>
                <td className="py-1 px-1.5 border-r border-default" />
                <td className="py-1 px-1.5 border-r border-default" />
                <td className="py-1 px-1.5 border-r border-default" />
                <td className="py-1 px-1.5 border-r border-default" />
                <td className="py-1 px-1.5 border-r border-default" />
                <td className="py-1 px-2 text-right font-mono font-semibold">
                  <MoneyText amount={invoice.igstAmount} />
                </td>
              </tr>
            )}

            {/* Round-off line if present */}
            {parseFloat(invoice.roundOffAmount) !== 0 && (
              <tr className="text-secondary italic">
                <td className="py-1 px-1.5 border-r border-default" />
                <td className="py-1 px-1.5 border-r border-default">Round-off</td>
                <td className="py-1 px-1.5 border-r border-default" />
                <td className="py-1 px-1.5 border-r border-default" />
                <td className="py-1 px-1.5 border-r border-default" />
                <td className="py-1 px-1.5 border-r border-default" />
                <td className="py-1 px-1.5 border-r border-default" />
                <td className="py-1 px-2 text-right font-mono">
                  <MoneyText amount={invoice.roundOffAmount} />
                </td>
              </tr>
            )}
          </tbody>

          {/* Grand Total Row */}
          <tfoot>
            <tr className="border-t-2 border-b-2 border-strong bg-surface-sunken print:bg-white font-black">
              <td className="py-1.5 px-1.5 text-center border-r border-default" />
              <td className="py-1.5 px-1.5 border-r border-default uppercase tracking-wider text-[11px]">
                Total
              </td>
              <td className="py-1.5 px-1.5 border-r border-default" />
              <td className="py-1.5 px-1.5 text-right font-mono border-r border-default">
                {invoice.items
                  ?.reduce((acc: number, it: any) => acc + (parseFloat(it.quantity) || 0), 0)
                  .toFixed(0)}
              </td>
              <td className="py-1.5 px-1.5 border-r border-default" />
              <td className="py-1.5 px-1.5 border-r border-default" />
              <td className="py-1.5 px-1.5 border-r border-default" />
              <td className="py-1.5 px-2 text-right font-mono text-xs text-primary">
                <MoneyText amount={invoice.totalAmount} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Amount Chargeable in Words */}
      <div className="border-b border-default py-1.5 px-2 flex justify-between items-center bg-surface-sunken print:bg-white">
        <div>
          <span className="text-[9px] text-secondary uppercase font-bold block">
            Amount Chargeable (in words):
          </span>
          <span className="font-bold text-primary text-[10.5px] font-serif">{amountInWords}</span>
        </div>
        <span className="text-[9px] font-bold text-muted italic">E. & O.E</span>
      </div>

      {/* Statutory HSN/SAC Tax Analysis Breakup Table (Classic Tally Box) */}
      <div className="border-b-2 border-strong page-break-avoid">
        <div className="py-1 px-1.5 bg-surface-sunken print:bg-white text-[9px] font-black uppercase text-primary border-b border-default">
          Tax Analysis & Breakup
        </div>
        <table className="w-full text-[10px] text-left border-collapse">
          <thead>
            <tr className="border-b border-default text-[9px] font-bold text-secondary bg-surface-sunken print:bg-white">
              <th className="py-1 px-1.5 border-r border-default">HSN/SAC</th>
              <th className="py-1 px-1.5 text-right border-r border-default">Taxable Value</th>
              {isIntraState ? (
                <>
                  <th className="py-1 px-1.5 text-right border-r border-default">Central Tax Rate</th>
                  <th className="py-1 px-1.5 text-right border-r border-default">Central Tax Amt</th>
                  <th className="py-1 px-1.5 text-right border-r border-default">State Tax Rate</th>
                  <th className="py-1 px-1.5 text-right border-r border-default">State Tax Amt</th>
                </>
              ) : (
                <>
                  <th className="py-1 px-1.5 text-right border-r border-default">Integrated Tax Rate</th>
                  <th className="py-1 px-1.5 text-right border-r border-default">Integrated Tax Amt</th>
                </>
              )}
              <th className="py-1 px-1.5 text-right">Total Tax Amount</th>
            </tr>
          </thead>
          <tbody className="font-mono text-[9.5px] divide-y divide-border-subtle">
            <tr>
              <td className="py-1 px-1.5 border-r border-default">998311</td>
              <td className="py-1 px-1.5 text-right border-r border-default">
                <MoneyText amount={invoice.subtotalAmount} />
              </td>
              {isIntraState ? (
                <>
                  <td className="py-1 px-1.5 text-right border-r border-default">9.00%</td>
                  <td className="py-1 px-1.5 text-right border-r border-default">
                    <MoneyText amount={invoice.cgstAmount} />
                  </td>
                  <td className="py-1 px-1.5 text-right border-r border-default">9.00%</td>
                  <td className="py-1 px-1.5 text-right border-r border-default">
                    <MoneyText amount={invoice.sgstAmount} />
                  </td>
                </>
              ) : (
                <>
                  <td className="py-1 px-1.5 text-right border-r border-default">18.00%</td>
                  <td className="py-1 px-1.5 text-right border-r border-default">
                    <MoneyText amount={invoice.igstAmount} />
                  </td>
                </>
              )}
              <td className="py-1 px-1.5 text-right font-bold text-primary">
                <MoneyText amount={totalTax} />
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t border-default font-bold bg-surface-sunken print:bg-white text-[9px]">
              <td className="py-1 px-1.5 border-r border-default uppercase">Total</td>
              <td className="py-1 px-1.5 text-right font-mono border-r border-default">
                <MoneyText amount={invoice.subtotalAmount} />
              </td>
              {isIntraState ? (
                <>
                  <td className="py-1 px-1.5 border-r border-default" />
                  <td className="py-1 px-1.5 text-right font-mono border-r border-default">
                    <MoneyText amount={invoice.cgstAmount} />
                  </td>
                  <td className="py-1 px-1.5 border-r border-default" />
                  <td className="py-1 px-1.5 text-right font-mono border-r border-default">
                    <MoneyText amount={invoice.sgstAmount} />
                  </td>
                </>
              ) : (
                <>
                  <td className="py-1 px-1.5 border-r border-default" />
                  <td className="py-1 px-1.5 text-right font-mono border-r border-default">
                    <MoneyText amount={invoice.igstAmount} />
                  </td>
                </>
              )}
              <td className="py-1 px-1.5 text-right font-mono">
                <MoneyText amount={totalTax} />
              </td>
            </tr>
          </tfoot>
        </table>
        <div className="py-1 px-2 border-t border-subtle bg-surface-sunken print:bg-white text-[10px]">
          <span className="font-bold text-secondary">Tax Amount (in words): </span>
          <span className="font-serif font-bold text-primary">{taxInWords}</span>
        </div>
      </div>

      {/* Footer Section: Bank Details + QR + Terms (Left) vs Authorised Signatory (Right) */}
      <div className="grid grid-cols-2 divide-x-2 divide-border-strong page-break-avoid">
        <div className="p-2 space-y-1.5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold uppercase text-secondary block">
                Company's Bank Details:
              </span>
              <div className="text-[10px] font-mono space-y-0.5">
                <div><span className="font-bold">Bank Name:</span> HDFC Bank Limited</div>
                <div><span className="font-bold">A/c No.:</span> 50200012345678</div>
                <div><span className="font-bold">Branch & IFS Code:</span> Nariman Point & HDFC0000060</div>
                {upiId && <div><span className="font-bold">UPI ID:</span> {upiId}</div>}
              </div>
            </div>

            {showQrCode && (
              <div className="text-center shrink-0 flex flex-col items-center">
                <QrCode value={upiUri} size={64} className="border border-default p-0.5 bg-white" />
                <span className="text-[7.5px] font-bold text-secondary uppercase mt-0.5">Scan to Pay UPI</span>
              </div>
            )}
          </div>

          <div className="border-t border-subtle pt-1 text-[8.5px] text-secondary leading-tight space-y-1">
            <div>
              <span className="font-bold text-primary block mb-0.5">Terms & Conditions:</span>
              <p className="whitespace-pre-line text-secondary">{termsAndConditions}</p>
            </div>
            <div className="italic text-[8px] text-muted pt-0.5">
              Declaration: We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
            </div>
          </div>
        </div>

        <div className="p-2 flex flex-col justify-between text-right">
          <div>
            <span className="text-[10px] font-bold text-primary block">
              for {companyName}
            </span>
          </div>

          <div className="pt-2 text-center flex flex-col items-center">
            {showSignature && signatureType === 'DSC' ? (
              <div className="inline-flex items-center gap-1.5 p-1 px-2 mb-1 rounded border border-status-success bg-status-success-subtle text-status-success-text text-[8px] text-left">
                <CheckCircle2 className="h-4 w-4 text-status-success-text shrink-0" />
                <div>
                  <div className="font-bold">Digitally Signed by {dscSignerName}</div>
                  <div className="text-[7px] text-status-success-text font-mono">
                    {dscDesignation} • {dscCertDetails || 'Valid Class-3 DSC'}
                  </div>
                </div>
              </div>
            ) : showSignature && signatureUrl ? (
              <img
                src={signatureUrl}
                alt="Authorized Signature"
                className="h-10 max-w-[120px] object-contain mb-1"
              />
            ) : (
              <div className="h-8" />
            )}
            <div className="w-full border-t border-strong pt-1 text-[9px] font-bold text-secondary uppercase">
              {settings?.['document.authorized_signatory_title'] || 'Authorised Signatory'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

