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
      <div className="py-6 border-b border-slate-200 dark:border-slate-800 print:border-slate-300">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-600 mb-2">
          GST Tax Schedule & Breakup:
        </div>
        <table className="w-full text-left text-xs bg-slate-50/50 dark:bg-slate-800/30 print:bg-white rounded-xl overflow-hidden print:border print:border-slate-300">
          <thead className="border-b border-slate-200 dark:border-slate-800 print:border-slate-300 text-[10px] font-bold text-slate-500 print:text-slate-700 uppercase">
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
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-200 font-mono text-[11px] print:text-black">
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
              <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white print:text-black">
                <MoneyText amount={totalTax} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="py-6 flex justify-between items-start">
        <div className="max-w-xs text-xs space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-600">
            Terms & Conditions:
          </div>
          <p className="text-slate-500 dark:text-slate-400 print:text-slate-700 leading-relaxed">
            {invoice.notes || 'Payment due within 30 days of invoice date. All disputes subject to jurisdiction.'}
          </p>
        </div>

        <div className="w-72 space-y-2 text-xs">
          <div className="flex justify-between text-slate-600 dark:text-slate-400 print:text-slate-800">
            <span>Subtotal (Taxable):</span>
            <MoneyText amount={invoice.subtotalAmount} />
          </div>

          {isIntraState ? (
            <>
              <div className="flex justify-between text-slate-600 dark:text-slate-400 print:text-slate-800">
                <span>Central GST (CGST):</span>
                <MoneyText amount={invoice.cgstAmount} />
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400 print:text-slate-800">
                <span>State GST (SGST):</span>
                <MoneyText amount={invoice.sgstAmount} />
              </div>
            </>
          ) : (
            <div className="flex justify-between text-slate-600 dark:text-slate-400 print:text-slate-800">
              <span>Integrated GST (IGST):</span>
              <MoneyText amount={invoice.igstAmount} />
            </div>
          )}

          {parseFloat(invoice.roundOffAmount) !== 0 && (
            <div className="flex justify-between text-slate-500 print:text-slate-700 text-[11px]">
              <span>Round-Off:</span>
              <MoneyText amount={invoice.roundOffAmount} />
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 print:border-slate-300 flex justify-between items-baseline font-black">
            <span className="text-sm text-slate-900 dark:text-white print:text-black">Total Due:</span>
            <span className="text-xl font-mono text-blue-600 dark:text-blue-400 print:text-black">
              <MoneyText amount={invoice.totalAmount} />
            </span>
          </div>

          <div className="pt-8 text-center text-xs text-slate-400 print:text-slate-600">
            <div className="font-bold text-slate-700 dark:text-slate-300 print:text-black">
              For {companyLegalName}
            </div>
            <div className="mt-8 border-t border-dashed border-slate-300 dark:border-slate-700 print:border-slate-400 pt-1 text-[10px] print:text-black">
              Authorized Signatory
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

