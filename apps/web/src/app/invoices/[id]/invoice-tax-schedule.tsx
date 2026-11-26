import React from 'react';
import { MoneyText } from '@platform/ui';

interface InvoiceTaxScheduleProps {
  invoice: any;
  company?: any;
}

export function InvoiceTaxSchedule({ invoice, company }: InvoiceTaxScheduleProps) {
  const isIntraState = invoice.supplyType === 'INTRA_STATE';
  const totalTax =
    (parseFloat(invoice.cgstAmount) || 0) +
    (parseFloat(invoice.sgstAmount) || 0) +
    (parseFloat(invoice.igstAmount) || 0);

  const companyLegalName = company?.legalName || 'Acme Global Technologies Pvt Ltd';

  return (
    <>
      <div className="py-6 border-b border-default">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted print:text-black mb-2">
          GST Tax Schedule & Breakup:
        </div>
        <table className="w-full text-left text-xs bg-surface-sunken print:bg-white rounded-xl overflow-hidden print:border print:border-default">
          <thead className="border-b border-default text-[10px] font-bold text-secondary print:text-black uppercase">
            <tr>
              <th className="py-2 px-3">HSN / SAC</th>
              <th className="py-2 px-3 text-right">Taxable Value</th>
              {isIntraState ? (
                <>
                  <th className="py-2 px-3 text-right">CGST Rate</th>
                  <th className="py-2 px-3 text-right">CGST Amount</th>
                  <th className="py-2 px-3 text-right">SGST Rate</th>
                  <th className="py-2 px-3 text-right">SGST Amount</th>
                </>
              ) : (
                <>
                  <th className="py-2 px-3 text-right">IGST Rate</th>
                  <th className="py-2 px-3 text-right">IGST Amount</th>
                </>
              )}
              <th className="py-2 px-3 text-right">Total Tax</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle font-mono text-[11px] print:text-black">
            <tr>
              <td className="py-2 px-3">Multiple / 998311</td>
              <td className="py-2 px-3 text-right">
                <MoneyText amount={invoice.subtotalAmount} />
              </td>
              {isIntraState ? (
                <>
                  <td className="py-2 px-3 text-right">9.00%</td>
                  <td className="py-2 px-3 text-right"><MoneyText amount={invoice.cgstAmount} /></td>
                  <td className="py-2 px-3 text-right">9.00%</td>
                  <td className="py-2 px-3 text-right"><MoneyText amount={invoice.sgstAmount} /></td>
                </>
              ) : (
                <>
                  <td className="py-2 px-3 text-right">18.00%</td>
                  <td className="py-2 px-3 text-right"><MoneyText amount={invoice.igstAmount} /></td>
                </>
              )}
              <td className="py-2 px-3 text-right font-bold text-primary print:text-black">
                <MoneyText amount={totalTax} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="py-6 flex justify-between items-start">
        <div className="max-w-xs text-xs space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted print:text-black">
            Terms & Conditions:
          </div>
          <p className="text-secondary print:text-black leading-relaxed">
            {invoice.notes || 'Payment due within 30 days of invoice date. All disputes subject to jurisdiction.'}
          </p>
        </div>

        <div className="w-72 space-y-2 text-xs">
          <div className="flex justify-between text-secondary print:text-black">
            <span>Subtotal (Taxable):</span>
            <MoneyText amount={invoice.subtotalAmount} />
          </div>

          {isIntraState ? (
            <>
              <div className="flex justify-between text-secondary print:text-black">
                <span>Central GST (CGST):</span>
                <MoneyText amount={invoice.cgstAmount} />
              </div>
              <div className="flex justify-between text-secondary print:text-black">
                <span>State GST (SGST):</span>
                <MoneyText amount={invoice.sgstAmount} />
              </div>
            </>
          ) : (
            <div className="flex justify-between text-secondary print:text-black">
              <span>Integrated GST (IGST):</span>
              <MoneyText amount={invoice.igstAmount} />
            </div>
          )}

          {parseFloat(invoice.roundOffAmount) !== 0 && (
            <div className="flex justify-between text-secondary print:text-black text-[11px]">
              <span>Round-Off:</span>
              <MoneyText amount={invoice.roundOffAmount} />
            </div>
          )}

          <div className="pt-3 border-t border-default flex justify-between items-baseline font-black">
            <span className="text-sm text-primary print:text-black">Total Due:</span>
            <span className="text-xl font-mono text-brand-text print:text-black">
              <MoneyText amount={invoice.totalAmount} />
            </span>
          </div>

          <div className="pt-8 text-center text-xs text-muted print:text-black">
            <div className="font-bold text-primary print:text-black">
              For {companyLegalName}
            </div>
            <div className="mt-8 border-t border-dashed border-strong pt-1 text-[10px] print:text-black">
              Authorized Signatory
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

