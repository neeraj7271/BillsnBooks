import React from 'react';
import { DateText, MoneyText, QrCode } from '@platform/ui';
import { CheckCircle2 } from 'lucide-react';
import { numberToIndianWords } from '@/lib/number-to-words';
import { INDIAN_GST_STATES } from '@platform/shared-types';
import type { InvoiceTemplateProps } from './types';

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
    <div className="w-full bg-white text-slate-900 border-2 border-slate-900 font-sans text-[11px] select-text print:border-slate-900 print:text-black">
      {/* Title Header */}
      <div className="border-b-2 border-slate-900 py-1.5 px-2 text-center relative bg-slate-50 print:bg-white">
        <h1 className="text-sm font-black uppercase tracking-wider text-slate-950 font-serif">
          {isCompanyGstRegistered ? 'Tax Invoice' : 'Invoice'}
        </h1>
        <span className="text-[9px] text-slate-600 uppercase font-semibold block">
          {isCompanyGstRegistered
            ? '(Issued under Rule 46 of the CGST Rules, 2017 — Original for Recipient)'
            : '(Commercial Invoice — Original for Recipient)'}
        </span>
      </div>

      {/* Top 2-Column Grid: Supplier (Left) vs Document & Dispatch Info (Right) */}
      <div className="grid grid-cols-2 border-b-2 border-slate-900 divide-x-2 divide-slate-900">
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
              <div className="text-xs font-black uppercase tracking-tight text-slate-950">
                {companyName}
              </div>
              <div className="text-slate-700 leading-snug mt-0.5 text-[10.5px]">{companyAddr}</div>
              <div className="mt-1 space-y-0.5 font-mono text-[10px]">
                <div>
                  <span className="font-bold text-slate-900">GSTIN/UIN:</span>{' '}
                  {companyGstin || <span className="italic font-sans text-slate-600">Unregistered</span>}
                </div>
                <div>
                  <span className="font-bold text-slate-900">State Name:</span> {companyState}, Code: {companyStateCode}
                </div>
                {companyPan && (
                  <div>
                    <span className="font-bold text-slate-900">PAN:</span> {companyPan}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Consignee / Buyer Section */}
          <div className="border-t border-slate-300 pt-1.5">
            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
              Buyer (Bill to):
            </div>
            <div className="font-bold text-slate-900 text-[11px]">{partyName}</div>
            {partyTradeName && <div className="text-[10px] text-slate-600">({partyTradeName})</div>}
            <div className="text-slate-700 leading-snug text-[10px]">
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
        <div className="divide-y divide-slate-300">
          <div className="grid grid-cols-2 divide-x divide-slate-300">
            <div className="py-1 px-2">
              <span className="text-[9px] text-slate-600 print:text-slate-800 block uppercase font-bold">Invoice No.</span>
              <span className="font-mono font-black text-xs text-slate-950 print:text-black whitespace-nowrap">{invoice.invoiceNumber}</span>
            </div>
            <div className="py-1 px-2">
              <span className="text-[9px] text-slate-600 print:text-slate-800 block uppercase font-bold">Dated</span>
              <span className="font-mono font-bold text-[11px] text-slate-950 print:text-black"><DateText date={invoice.invoiceDate} className="text-slate-950 print:text-black" /></span>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-slate-300">
            <div className="py-1 px-2">
              <span className="text-[9px] text-slate-600 print:text-slate-800 block uppercase font-bold">Delivery Note</span>
              <span className="font-mono text-[10.5px] text-slate-950 print:text-black">{invoice.deliveryNote || '—'}</span>
            </div>
            <div className="py-1 px-2">
              <span className="text-[9px] text-slate-600 print:text-slate-800 block uppercase font-bold">Mode/Terms of Payment</span>
              <span className="font-medium text-[10.5px] text-slate-950 print:text-black">Due <DateText date={invoice.dueDate} className="text-slate-950 print:text-black font-bold" /></span>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-slate-300">
            <div className="py-1 px-2">
              <span className="text-[9px] text-slate-600 print:text-slate-800 block uppercase font-bold">Supplier's Ref.</span>
              <span className="font-mono text-[10.5px] text-slate-950 print:text-black">{invoice.supplierRef || 'Direct'}</span>
            </div>
            <div className="py-1 px-2">
              <span className="text-[9px] text-slate-600 print:text-slate-800 block uppercase font-bold">Other Reference(s)</span>
              <span className="font-mono text-[10.5px] text-slate-950 print:text-black">{invoice.otherReferences || 'N/A'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-slate-300">
            <div className="py-1 px-2">
              <span className="text-[9px] text-slate-600 print:text-slate-800 block uppercase font-bold">Buyer's Order No.</span>
              <span className="font-mono text-[10.5px] text-slate-950 print:text-black">{invoice.purchaseOrderNumber || '—'}</span>
            </div>
            <div className="py-1 px-2">
              <span className="text-[9px] text-slate-600 print:text-slate-800 block uppercase font-bold">Order Dated</span>
              <span className="font-mono text-[10.5px] text-slate-950 print:text-black"><DateText date={invoice.invoiceDate} className="text-slate-950 print:text-black" /></span>
            </div>
          </div>

          <div className="py-1 px-2 bg-slate-50 print:bg-white text-[10px]">
            <span className="text-[9px] text-slate-500 block uppercase font-bold">Place of Supply</span>
            <span className="font-bold text-slate-900">
              State Code {invoice.placeOfSupplyStateCode} ({isIntraState ? 'Intra-State Supply' : 'Inter-State Supply'})
            </span>
          </div>
        </div>
      </div>

      {/* Main Item Table */}
      <div className="border-b-2 border-slate-900">
        <table className="w-full text-left text-[10.5px] border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-900 bg-slate-100 print:bg-slate-100 text-[9px] font-black uppercase text-slate-800">
              <th className="py-1 px-1.5 w-8 text-center border-r border-slate-300">Sl No.</th>
              <th className="py-1 px-1.5 border-r border-slate-300">Description of Goods</th>
              <th className="py-1 px-1.5 w-18 text-center border-r border-slate-300">HSN/SAC</th>
              <th className="py-1 px-1.5 w-16 text-right border-r border-slate-300">Quantity</th>
              <th className="py-1 px-1.5 w-20 text-right border-r border-slate-300">Rate</th>
              <th className="py-1 px-1.5 w-12 text-center border-r border-slate-300">per</th>
              <th className="py-1 px-1.5 w-14 text-right border-r border-slate-300">Disc %</th>
              <th className="py-1 px-2 w-24 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {invoice.items?.map((it: any, idx: number) => {
              const disc = parseFloat(it.discountPercent) || 0;
              return (
                <tr key={it.id || idx} className="align-top">
                  <td className="py-1 px-1.5 text-center font-mono border-r border-slate-300 text-slate-600">
                    {idx + 1}
                  </td>
                  <td className="py-1 px-1.5 border-r border-slate-300">
                    <div className="font-bold text-slate-950">{it.description}</div>
                  </td>
                  <td className="py-1 px-1.5 text-center font-mono border-r border-slate-300 text-slate-700">
                    {it.hsnSacCode}
                  </td>
                  <td className="py-1 px-1.5 text-right font-mono font-bold border-r border-slate-300">
                    {parseFloat(it.quantity).toFixed(0)} {it.uom}
                  </td>
                  <td className="py-1 px-1.5 text-right font-mono border-r border-slate-300">
                    <MoneyText amount={it.unitPrice} />
                  </td>
                  <td className="py-1 px-1.5 text-center uppercase border-r border-slate-300 text-slate-600">
                    {it.uom}
                  </td>
                  <td className="py-1 px-1.5 text-right font-mono border-r border-slate-300 text-slate-600">
                    {disc > 0 ? `${disc.toFixed(1)}%` : '—'}
                  </td>
                  <td className="py-1 px-2 text-right font-mono font-bold text-slate-950">
                    <MoneyText amount={it.taxableAmount} />
                  </td>
                </tr>
              );
            })}

            {/* GST Output Lines (Tally Style) */}
            {isIntraState ? (
              <>
                <tr className="text-slate-700 italic">
                  <td className="py-1 px-1.5 border-r border-slate-300" />
                  <td className="py-1 px-1.5 font-bold border-r border-slate-300">Output CGST (9.00%)</td>
                  <td className="py-1 px-1.5 border-r border-slate-300" />
                  <td className="py-1 px-1.5 border-r border-slate-300" />
                  <td className="py-1 px-1.5 border-r border-slate-300" />
                  <td className="py-1 px-1.5 border-r border-slate-300" />
                  <td className="py-1 px-1.5 border-r border-slate-300" />
                  <td className="py-1 px-2 text-right font-mono font-semibold">
                    <MoneyText amount={invoice.cgstAmount} />
                  </td>
                </tr>
                <tr className="text-slate-700 italic">
                  <td className="py-1 px-1.5 border-r border-slate-300" />
                  <td className="py-1 px-1.5 font-bold border-r border-slate-300">Output SGST (9.00%)</td>
                  <td className="py-1 px-1.5 border-r border-slate-300" />
                  <td className="py-1 px-1.5 border-r border-slate-300" />
                  <td className="py-1 px-1.5 border-r border-slate-300" />
                  <td className="py-1 px-1.5 border-r border-slate-300" />
                  <td className="py-1 px-1.5 border-r border-slate-300" />
                  <td className="py-1 px-2 text-right font-mono font-semibold">
                    <MoneyText amount={invoice.sgstAmount} />
                  </td>
                </tr>
              </>
            ) : (
              <tr className="text-slate-700 italic">
                <td className="py-1 px-1.5 border-r border-slate-300" />
                <td className="py-1 px-1.5 font-bold border-r border-slate-300">Output IGST (18.00%)</td>
                <td className="py-1 px-1.5 border-r border-slate-300" />
                <td className="py-1 px-1.5 border-r border-slate-300" />
                <td className="py-1 px-1.5 border-r border-slate-300" />
                <td className="py-1 px-1.5 border-r border-slate-300" />
                <td className="py-1 px-1.5 border-r border-slate-300" />
                <td className="py-1 px-2 text-right font-mono font-semibold">
                  <MoneyText amount={invoice.igstAmount} />
                </td>
              </tr>
            )}

            {/* Round-off line if present */}
            {parseFloat(invoice.roundOffAmount) !== 0 && (
              <tr className="text-slate-600 italic">
                <td className="py-1 px-1.5 border-r border-slate-300" />
                <td className="py-1 px-1.5 border-r border-slate-300">Round-off</td>
                <td className="py-1 px-1.5 border-r border-slate-300" />
                <td className="py-1 px-1.5 border-r border-slate-300" />
                <td className="py-1 px-1.5 border-r border-slate-300" />
                <td className="py-1 px-1.5 border-r border-slate-300" />
                <td className="py-1 px-1.5 border-r border-slate-300" />
                <td className="py-1 px-2 text-right font-mono">
                  <MoneyText amount={invoice.roundOffAmount} />
                </td>
              </tr>
            )}
          </tbody>

          {/* Grand Total Row */}
          <tfoot>
            <tr className="border-t-2 border-b-2 border-slate-900 bg-slate-50 print:bg-white font-black">
              <td className="py-1.5 px-1.5 text-center border-r border-slate-300" />
              <td className="py-1.5 px-1.5 border-r border-slate-300 uppercase tracking-wider text-[11px]">
                Total
              </td>
              <td className="py-1.5 px-1.5 border-r border-slate-300" />
              <td className="py-1.5 px-1.5 text-right font-mono border-r border-slate-300">
                {invoice.items
                  ?.reduce((acc: number, it: any) => acc + (parseFloat(it.quantity) || 0), 0)
                  .toFixed(0)}
              </td>
              <td className="py-1.5 px-1.5 border-r border-slate-300" />
              <td className="py-1.5 px-1.5 border-r border-slate-300" />
              <td className="py-1.5 px-1.5 border-r border-slate-300" />
              <td className="py-1.5 px-2 text-right font-mono text-xs text-slate-950">
                <MoneyText amount={invoice.totalAmount} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Amount Chargeable in Words */}
      <div className="border-b border-slate-300 py-1.5 px-2 flex justify-between items-center bg-slate-50/50 print:bg-white">
        <div>
          <span className="text-[9px] text-slate-500 uppercase font-bold block">
            Amount Chargeable (in words):
          </span>
          <span className="font-bold text-slate-900 text-[10.5px] font-serif">{amountInWords}</span>
        </div>
        <span className="text-[9px] font-bold text-slate-400 italic">E. & O.E</span>
      </div>

      {/* Statutory HSN/SAC Tax Analysis Breakup Table (Classic Tally Box) */}
      <div className="border-b-2 border-slate-900">
        <div className="py-1 px-1.5 bg-slate-100 print:bg-slate-100 text-[9px] font-black uppercase text-slate-800 border-b border-slate-300">
          Tax Analysis & Breakup
        </div>
        <table className="w-full text-[10px] text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-300 text-[9px] font-bold text-slate-700 bg-slate-50 print:bg-white">
              <th className="py-1 px-1.5 border-r border-slate-300">HSN/SAC</th>
              <th className="py-1 px-1.5 text-right border-r border-slate-300">Taxable Value</th>
              {isIntraState ? (
                <>
                  <th className="py-1 px-1.5 text-right border-r border-slate-300">Central Tax Rate</th>
                  <th className="py-1 px-1.5 text-right border-r border-slate-300">Central Tax Amt</th>
                  <th className="py-1 px-1.5 text-right border-r border-slate-300">State Tax Rate</th>
                  <th className="py-1 px-1.5 text-right border-r border-slate-300">State Tax Amt</th>
                </>
              ) : (
                <>
                  <th className="py-1 px-1.5 text-right border-r border-slate-300">Integrated Tax Rate</th>
                  <th className="py-1 px-1.5 text-right border-r border-slate-300">Integrated Tax Amt</th>
                </>
              )}
              <th className="py-1 px-1.5 text-right">Total Tax Amount</th>
            </tr>
          </thead>
          <tbody className="font-mono text-[9.5px] divide-y divide-slate-200">
            <tr>
              <td className="py-1 px-1.5 border-r border-slate-300">998311</td>
              <td className="py-1 px-1.5 text-right border-r border-slate-300">
                <MoneyText amount={invoice.subtotalAmount} />
              </td>
              {isIntraState ? (
                <>
                  <td className="py-1 px-1.5 text-right border-r border-slate-300">9.00%</td>
                  <td className="py-1 px-1.5 text-right border-r border-slate-300">
                    <MoneyText amount={invoice.cgstAmount} />
                  </td>
                  <td className="py-1 px-1.5 text-right border-r border-slate-300">9.00%</td>
                  <td className="py-1 px-1.5 text-right border-r border-slate-300">
                    <MoneyText amount={invoice.sgstAmount} />
                  </td>
                </>
              ) : (
                <>
                  <td className="py-1 px-1.5 text-right border-r border-slate-300">18.00%</td>
                  <td className="py-1 px-1.5 text-right border-r border-slate-300">
                    <MoneyText amount={invoice.igstAmount} />
                  </td>
                </>
              )}
              <td className="py-1 px-1.5 text-right font-bold text-slate-900">
                <MoneyText amount={totalTax} />
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-300 font-bold bg-slate-50 print:bg-white text-[9px]">
              <td className="py-1 px-1.5 border-r border-slate-300 uppercase">Total</td>
              <td className="py-1 px-1.5 text-right font-mono border-r border-slate-300">
                <MoneyText amount={invoice.subtotalAmount} />
              </td>
              {isIntraState ? (
                <>
                  <td className="py-1 px-1.5 border-r border-slate-300" />
                  <td className="py-1 px-1.5 text-right font-mono border-r border-slate-300">
                    <MoneyText amount={invoice.cgstAmount} />
                  </td>
                  <td className="py-1 px-1.5 border-r border-slate-300" />
                  <td className="py-1 px-1.5 text-right font-mono border-r border-slate-300">
                    <MoneyText amount={invoice.sgstAmount} />
                  </td>
                </>
              ) : (
                <>
                  <td className="py-1 px-1.5 border-r border-slate-300" />
                  <td className="py-1 px-1.5 text-right font-mono border-r border-slate-300">
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
        <div className="py-1 px-2 border-t border-slate-200 bg-slate-50/50 print:bg-white text-[10px]">
          <span className="font-bold text-slate-600">Tax Amount (in words): </span>
          <span className="font-serif font-bold text-slate-900">{taxInWords}</span>
        </div>
      </div>

      {/* Footer Section: Bank Details + QR + Terms (Left) vs Authorised Signatory (Right) */}
      <div className="grid grid-cols-2 divide-x-2 divide-slate-900">
        <div className="p-2 space-y-1.5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold uppercase text-slate-500 block">
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
                <QrCode value={upiUri} size={64} className="border border-slate-300 p-0.5 bg-white" />
                <span className="text-[7.5px] font-bold text-slate-600 uppercase mt-0.5">Scan to Pay UPI</span>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 pt-1 text-[8.5px] text-slate-600 leading-tight space-y-1">
            <div>
              <span className="font-bold text-slate-800 block mb-0.5">Terms & Conditions:</span>
              <p className="whitespace-pre-line text-slate-700">{termsAndConditions}</p>
            </div>
            <div className="italic text-[8px] text-slate-500 pt-0.5">
              Declaration: We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
            </div>
          </div>
        </div>

        <div className="p-2 flex flex-col justify-between text-right">
          <div>
            <span className="text-[10px] font-bold text-slate-800 block">
              for {companyName}
            </span>
          </div>

          <div className="pt-2 text-center flex flex-col items-center">
            {showSignature && signatureType === 'DSC' ? (
              <div className="inline-flex items-center gap-1.5 p-1 px-2 mb-1 rounded border border-emerald-600 bg-emerald-50/80 text-emerald-950 text-[8px] text-left">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold">Digitally Signed by {dscSignerName}</div>
                  <div className="text-[7px] text-emerald-800 font-mono">
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
            <div className="w-full border-t border-slate-400 pt-1 text-[9px] font-bold text-slate-700 uppercase">
              {settings?.['document.authorized_signatory_title'] || 'Authorised Signatory'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

