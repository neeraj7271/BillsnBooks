import React from 'react';
import { MoneyText } from '@platform/ui';

interface InvoiceItemsTableProps {
  items: any[];
}

export function InvoiceItemsTable({ items }: InvoiceItemsTableProps) {
  return (
    <div className="py-6 border-b border border-strong print:border overflow-x-auto print:overflow-visible">
      <table className="w-full text-left text-xs">
        <thead className="border-b border border-strong print:border text-[11px] font-bold text-muted print:text-secondary uppercase tracking-wider">
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
        <tbody className="divide-y divide-subtle divide-strong print:divide font-medium">
          {items?.map((it: any, idx: number) => (
            <tr key={it.id || idx}>
              <td className="py-3 px-2 text-muted print:text-secondary">{idx + 1}</td>
              <td className="py-3 px-3">
                <div className="font-bold text-primary print:text-black">
                  {it.description}
                </div>
              </td>
              <td className="py-3 px-2 font-mono text-secondary text-muted print:text-black">
                {it.hsnSacCode}
              </td>
              <td className="py-3 px-2 text-right font-mono print:text-black">
                {parseFloat(it.quantity).toFixed(0)}
              </td>
              <td className="py-3 px-2 text-secondary text-muted print:text-black">
                {it.uom}
              </td>
              <td className="py-3 px-2 text-right print:text-black">
                <MoneyText amount={it.unitPrice} />
              </td>
              <td className="py-3 px-2 text-right font-semibold print:text-black">
                <MoneyText amount={it.taxableAmount} />
              </td>
              <td className="py-3 px-2 text-right font-mono text-secondary text-muted print:text-black">
                {parseFloat(it.gstRatePercent)}%
              </td>
              <td className="py-3 px-2 text-right font-bold text-primary print:text-black">
                <MoneyText amount={it.totalAmount} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

