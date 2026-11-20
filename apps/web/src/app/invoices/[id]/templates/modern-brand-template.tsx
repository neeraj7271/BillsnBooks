import React from 'react';
import { DateText, MoneyText, Badge, QrCode } from '@platform/ui';
import { formatPartyTaxIdentity, INDIAN_GST_STATES } from '@platform/shared-types';
import { ShieldCheck, Landmark, CheckCircle2 } from 'lucide-react';
import { numberToIndianWords } from '@/lib/number-to-words';
import type { InvoiceTemplateProps } from './types';

export function ModernBrandTemplate({ invoice, company, settings }: InvoiceTemplateProps) {
  const isIntraState = invoice.supplyType === 'INTRA_STATE';
  const partyName = invoice.partyNameSnapshot || invoice.party?.name || 'Customer Name';
  const partyTradeName = invoice.partyTradeNameSnapshot || invoice.party?.tradeName;
  const partyRegType = invoice.partyRegistrationTypeSnapshot || invoice.party?.registrationType;
  const partyGstin = invoice.partyGstinSnapshot || invoice.party?.gstin;
  const identity = formatPartyTaxIdentity(partyRegType, partyGstin);

  const billingAddr =
    invoice.billingAddressSnapshot?.addressLine1 ||
    invoice.party?.billingAddressLine1 ||
    'Client Registered Address';
  const billingCity = invoice.billingAddressSnapshot?.city || invoice.party?.billingCity || '';
  const billingPincode = invoice.billingAddressSnapshot?.pincode || invoice.party?.billingPincode || '';
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
  const amountInWords = numberToIndianWords(invoice.totalAmount);

  return (
    <div className="w-full bg-white text-slate-900 font-sans text-xs select-text print:text-black">
      {/* Brand Top Header */}
      <div className="flex justify-between items-start pb-5 border-b border-slate-200 print:border-slate-300 gap-6">
        <div className="flex items-center gap-4 min-w-0">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={companyName}
              className="h-20 w-20 max-h-[82px] max-w-[82px] object-contain shrink-0 self-center"
            />
          ) : (
            <div className="h-16 w-16 rounded-xl bg-blue-600 text-white font-black text-2xl flex items-center justify-center shrink-0 print:border print:border-blue-700">
              {companyName.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 print:bg-slate-100 print:text-black">
                {isCompanyGstRegistered ? 'TAX INVOICE' : 'INVOICE'}
              </span>
              <span className="text-[10px] text-slate-500 print:text-slate-700 font-medium">
                {isCompanyGstRegistered ? '• Rule 46 Compliant' : '• Commercial Invoice'}
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-950 mt-1 tracking-tight leading-snug">{companyName}</h1>
            <p className="text-xs text-slate-600 print:text-slate-800 mt-0.5 max-w-lg leading-relaxed">
              {companyAddr}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono text-slate-700 print:text-black">
              <div>
                <span className="font-bold text-slate-900">GSTIN:</span>{' '}
                {companyGstin || <span className="italic font-sans text-slate-500">Unregistered</span>}
              </div>
              {companyPan && (
                <div>
                  <span className="font-bold text-slate-900">PAN:</span> {companyPan}
                </div>
              )}
              <div>
                <span className="font-bold text-slate-900">State:</span> {companyStateCode} ({companyState})
              </div>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 print:text-slate-700 block">
            INVOICE NUMBER
          </span>
          <span className="text-2xl font-black font-mono text-blue-600 print:text-black block whitespace-nowrap tracking-tight">
            {invoice.invoiceNumber}
          </span>
          <div className="mt-2 space-y-1 text-xs text-slate-800 print:text-black">
            <div>
              <span className="text-slate-500 print:text-slate-700 font-medium">Invoice Date:</span>{' '}
              <DateText date={invoice.invoiceDate} className="text-slate-950 print:text-black font-bold font-mono" />
            </div>
            <div>
              <span className="text-slate-500 print:text-slate-700 font-medium">Payment Due:</span>{' '}
              <DateText date={invoice.dueDate} className="text-slate-950 print:text-black font-bold font-mono" />
            </div>
            <div>
              <span className="text-slate-500 print:text-slate-700 font-medium">Place of Supply:</span>{' '}
              <span className="font-bold">State {invoice.placeOfSupplyStateCode}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Clean Cards: Client Details vs Bank Remittance */}
      <div className="grid grid-cols-2 gap-5 py-5 border-b border-slate-200 print:border-slate-300">
        <div className="p-4 rounded-xl bg-slate-50/80 print:bg-slate-50 border border-slate-200/80 print:border-slate-300 flex flex-col justify-between space-y-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 print:text-slate-700 mb-1.5">
              Billed To (Customer):
            </div>
            <div className="font-black text-sm text-slate-950 leading-snug">{partyName}</div>
            {partyTradeName && <div className="text-xs text-slate-500 mt-0.5">Trade: {partyTradeName}</div>}
            <div className="text-slate-600 print:text-slate-800 text-xs leading-relaxed mt-1">
              {billingAddr}
              {billingCity && `, ${billingCity}`}
              {billingPincode && ` - ${billingPincode}`}
            </div>
          </div>
          <div className="pt-2 border-t border-slate-200/80 print:border-slate-300 font-mono text-xs text-slate-800 print:text-black space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600 print:text-slate-700">Tax Treatment:</span>
              <Badge variant={identity.badgeVariant} size="xs">
                {identity.badgeLabel}
              </Badge>
            </div>
            {identity.showGstin && partyGstin ? (
              <div>
                <span className="font-bold text-slate-600 print:text-slate-700">GSTIN / UIN:</span>{' '}
                <span className="font-bold text-slate-950 print:text-black">{partyGstin}</span>
              </div>
            ) : null}
            <div>
              <span className="font-bold text-slate-600 print:text-slate-700">State:</span> State Code {invoice.placeOfSupplyStateCode} ({billingState})
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50/80 print:bg-slate-50 border border-slate-200/80 print:border-slate-300 flex flex-col justify-between space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 print:text-slate-700 mb-1.5">
                <Landmark className="w-3.5 h-3.5 text-blue-600 print:text-black" />
                <span>Remittance Bank Details:</span>
              </div>
              <div className="font-black text-slate-950 text-xs">HDFC Bank Limited</div>
              <div className="font-mono text-xs text-slate-800 print:text-black mt-1.5 space-y-0.5">
                <div>
                  <span className="text-slate-500 print:text-slate-700">Current A/c:</span>{' '}
                  <span className="font-bold text-slate-950 print:text-black">50200012345678</span>
                </div>
                <div>
                  <span className="text-slate-500 print:text-slate-700">IFSC Code:</span>{' '}
                  <span className="font-bold text-slate-950 print:text-black">HDFC0000060</span>
                </div>
                <div className="truncate">
                  <span className="text-slate-500 print:text-slate-700">Branch:</span> Nariman Point Commercial Hub
                </div>
                {upiId && (
                  <div className="truncate">
                    <span className="text-slate-500 print:text-slate-700">UPI ID:</span>{' '}
                    <span className="font-bold text-slate-950 print:text-black">{upiId}</span>
                  </div>
                )}
              </div>
            </div>

            {showQrCode && (
              <div className="text-center shrink-0 flex flex-col items-center bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                <QrCode value={upiUri} size={64} />
                <span className="text-[8px] font-bold text-slate-700 print:text-black uppercase mt-1">Instant UPI Pay</span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-200/80 print:border-slate-300 flex items-center gap-1.5 text-[11px] text-emerald-700 print:text-black font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600 print:text-black" />
            <span>Verified GST Compliant E-Transaction</span>
          </div>
        </div>
      </div>

      {/* Billable Items Table */}
      <div className="py-5 border-b border-slate-200 print:border-slate-300">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/80 print:bg-slate-100 border-y border-slate-200 print:border-slate-300 text-[10px] font-black uppercase text-slate-700 print:text-black tracking-wider">
              <th className="py-2.5 px-2 w-8 text-center">#</th>
              <th className="py-2.5 px-3">Item Description</th>
              <th className="py-2.5 px-2 w-20 text-center">HSN/SAC</th>
              <th className="py-2.5 px-2 w-20 text-right">Qty & Unit</th>
              <th className="py-2.5 px-2 w-24 text-right">Rate</th>
              <th className="py-2.5 px-2 w-14 text-right">Disc %</th>
              <th className="py-2.5 px-2 w-24 text-right">Taxable</th>
              <th className="py-2.5 px-2 w-14 text-right">GST</th>
              <th className="py-2.5 px-2 w-26 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 print:divide-slate-200 font-medium">
            {invoice.items?.map((it: any, idx: number) => {
              const disc = parseFloat(it.discountPercent) || 0;
              return (
                <tr key={it.id || idx} className="hover:bg-slate-50/50">
                  <td className="py-3 px-2 text-center text-slate-400 print:text-slate-600 font-mono">{idx + 1}</td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-950 print:text-black leading-snug">{it.description}</div>
                  </td>
                  <td className="py-3 px-2 text-center font-mono text-slate-700 print:text-black">{it.hsnSacCode}</td>
                  <td className="py-3 px-2 text-right font-mono font-bold text-slate-950 print:text-black whitespace-nowrap">
                    {parseFloat(it.quantity).toFixed(0)} <span className="font-normal text-slate-600 print:text-black text-[11px]">{it.uom}</span>
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-800 print:text-black">
                    <MoneyText amount={it.unitPrice} />
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-600 print:text-black">
                    {disc > 0 ? `${disc.toFixed(1)}%` : '—'}
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-semibold text-slate-900 print:text-black">
                    <MoneyText amount={it.taxableAmount} />
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-700 print:text-black">
                    {parseFloat(it.gstRatePercent)}%
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-bold text-slate-950 print:text-black">
                    <MoneyText amount={it.totalAmount} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Tax Breakdown, In Words & Financial Summary Block */}
      <div className="py-5 flex justify-between items-start gap-8">
        <div className="flex-1 space-y-3 max-w-lg">
          <div className="p-3.5 rounded-xl bg-slate-50/80 print:bg-slate-50 border border-slate-200/80 print:border-slate-300">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 print:text-slate-700">
              Amount Chargeable (in words):
            </div>
            <div className="font-bold text-slate-950 print:text-black text-xs mt-1 font-serif">
              {amountInWords}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/80 print:bg-slate-50 border border-slate-200/80 print:border-slate-300 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 print:text-slate-700">
              Terms & Conditions:
            </div>
            <p className="text-xs text-slate-600 print:text-slate-800 leading-relaxed whitespace-pre-line">
              {termsAndConditions}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/80 print:bg-slate-50 border border-slate-200/80 print:border-slate-300 text-[11px] text-slate-700 print:text-black space-y-0.5">
            <span className="font-bold block text-slate-900 print:text-black">Statutory Tax Schedule:</span>
            {isIntraState ? (
              <div>Intra-State Supply: Central GST (CGST) @ 9% and State GST (SGST) @ 9% applied equally.</div>
            ) : (
              <div>Inter-State Supply: Integrated GST (IGST) @ 18% applied in full.</div>
            )}
          </div>
        </div>

        <div className="w-80 shrink-0 space-y-4">
          <div className="p-4 rounded-xl bg-slate-50/80 print:bg-slate-50 border border-slate-200/80 print:border-slate-300 space-y-2.5 text-xs">
            <div className="flex justify-between text-slate-600 print:text-slate-800 font-medium">
              <span>Taxable Subtotal:</span>
              <MoneyText amount={invoice.subtotalAmount} />
            </div>

            {isIntraState ? (
              <>
                <div className="flex justify-between text-slate-600 print:text-slate-800">
                  <span>Central GST (CGST 9%):</span>
                  <MoneyText amount={invoice.cgstAmount} />
                </div>
                <div className="flex justify-between text-slate-600 print:text-slate-800">
                  <span>State GST (SGST 9%):</span>
                  <MoneyText amount={invoice.sgstAmount} />
                </div>
              </>
            ) : (
              <div className="flex justify-between text-slate-600 print:text-slate-800">
                <span>Integrated GST (IGST 18%):</span>
                <MoneyText amount={invoice.igstAmount} />
              </div>
            )}

            {parseFloat(invoice.roundOffAmount) !== 0 && (
              <div className="flex justify-between text-slate-500 print:text-slate-700 text-[11px]">
                <span>Round-Off:</span>
                <MoneyText amount={invoice.roundOffAmount} />
              </div>
            )}

            <div className="pt-3 border-t-2 border-slate-300 print:border-slate-400 flex justify-between items-baseline font-black">
              <span className="text-sm text-slate-900 print:text-black">Grand Total:</span>
              <span className="text-2xl font-mono text-blue-600 print:text-black">
                <MoneyText amount={invoice.totalAmount} />
              </span>
            </div>
          </div>

          <div className="pt-2 text-center text-xs flex flex-col items-center">
            <div className="font-bold text-slate-900 print:text-black mb-2">For {companyName}</div>

            {showSignature && signatureType === 'DSC' ? (
              <div className="inline-flex items-center gap-1.5 p-1.5 px-3 mb-2 rounded-lg border border-emerald-600 bg-emerald-50/70 text-emerald-950 text-left">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold text-[11px]">Digitally Signed by {dscSignerName}</div>
                  <div className="text-[9px] text-emerald-800 font-mono">
                    {dscDesignation} • {dscCertDetails || 'Valid Class 3 DSC'}
                  </div>
                </div>
              </div>
            ) : showSignature && signatureUrl ? (
              <img
                src={signatureUrl}
                alt="Authorized Signature"
                className="h-12 max-w-[140px] object-contain mb-2"
              />
            ) : (
              <div className="h-10" />
            )}

            <div className="w-full border-t border-dashed border-slate-400 print:border-slate-500 pt-1 text-[10px] text-slate-700 print:text-black uppercase font-bold">
              {settings?.['document.authorized_signatory_title'] || 'Authorized Signatory'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
