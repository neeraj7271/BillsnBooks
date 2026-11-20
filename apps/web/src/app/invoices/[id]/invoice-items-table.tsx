import React from 'react';
import { MoneyText } from '@platform/ui';

interface InvoiceItemsTableProps {
  items: any[];
}

export function InvoiceItemsTable({ items }: InvoiceItemsTableProps) {
  return (
    <div className="py-6 border-b border-slate-200 dark:border-slate-800 print:border-slate-300 overflow-x-auto print:overflow-visible">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-slate-200 dark:border-slate-800 print:border-slate-300 text-[11px] font-bold text-slate-500 print:text-slate-700 uppercase tracking-wider">
          <tr>
            <th className="py-2.5 px-2 w-8">#</th>
            <th className="py-2.5 px-3">Description of Goods / Services</th>
            <th className="py-2.5 px-2 w-20">HSN/SAC</th>
            <th className="py-2.5 px-2 w-16 text-right">Qty</th>
            <th className="py-2.5 px-2 w-16">UOM</th>
            <th className="py-2.5 px-2 w-24 text-right">Rate</th>
            <th className="py-2.5 px-2 w-24 text-right">Taxable</th>
            <th className="py-2.5 px-2 w-16 text-right">GST %</th>
            <th className="py-2.5 px-2 w-24 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 print:divide-slate-200 font-medium">
          {items?.map((it: any, idx: number) => (
            <tr key={it.id || idx}>
              <td className="py-3 px-2 text-slate-400 print:text-slate-600">{idx + 1}</td>
              <td className="py-3 px-3">
                <div className="font-bold text-slate-900 dark:text-white print:text-black">
                  {it.description}
                </div>
              </td>
              <td className="py-3 px-2 font-mono text-slate-600 dark:text-slate-400 print:text-black">
                {it.hsnSacCode}
              </td>
              <td className="py-3 px-2 text-right font-mono print:text-black">
                {parseFloat(it.quantity).toFixed(0)}
              </td>
              <td className="py-3 px-2 text-slate-600 dark:text-slate-400 print:text-black">
                {it.uom}
              </td>
              <td className="py-3 px-2 text-right print:text-black">
                <MoneyText amount={it.unitPrice} />
              </td>
              <td className="py-3 px-2 text-right font-semibold print:text-black">
                <MoneyText amount={it.taxableAmount} />
              </td>
              <td className="py-3 px-2 text-right font-mono text-slate-600 dark:text-slate-400 print:text-black">
                {parseFloat(it.gstRatePercent)}%
              </td>
              <td className="py-3 px-2 text-right font-bold text-slate-900 dark:text-white print:text-black">
                <MoneyText amount={it.totalAmount} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

