'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Input, CurrencyInput, Select, MoneyText } from '@platform/ui';
import type { LineItem, ComputedInvoiceTotals } from './invoice-math';

interface InvoiceLineItemsProps {
  items: any[];
  lineItems: LineItem[];
  computedTotals: ComputedInvoiceTotals;
  onSelectItemForLine: (index: number, itemId: string) => void;
  onUpdateLineItem: (index: number, field: keyof LineItem, value: any) => void;
  onAddLineItem: () => void;
  onRemoveLineItem: (index: number) => void;
}

export function InvoiceLineItems({
  items,
  lineItems,
  computedTotals,
  onSelectItemForLine,
  onUpdateLineItem,
  onAddLineItem,
  onRemoveLineItem,
}: InvoiceLineItemsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">
          Billable Items & Services
        </h3>
        <Button variant="outline" size="xs" onClick={onAddLineItem} leftIcon={<Plus className="h-3.5 w-3.5" />}>
          Add Line Item
        </Button>
      </div>

      <div className="rounded-xl border border-default overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-sunken border-b border-default font-semibold text-secondary text-[11px]">
            <tr>
              <th className="py-2.5 px-3 min-w-[200px]">Item / Service</th>
              <th className="py-2.5 px-2 w-24">HSN/SAC</th>
              <th className="py-2.5 px-2 w-20 text-center">Qty</th>
              <th className="py-2.5 px-2 w-24 text-center">UOM</th>
              <th className="py-2.5 px-2 min-w-[140px] text-right">Rate</th>
              <th className="py-2.5 px-2 w-24 text-right">Disc %</th>
              <th className="py-2.5 px-2 w-24">GST Slab</th>
              <th className="py-2.5 px-3 min-w-[110px] text-right">Taxable</th>
              <th className="py-2.5 px-3 min-w-[110px] text-right">Total</th>
              <th className="py-2.5 px-2 w-10 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {lineItems.map((line, idx) => {
              const comp = computedTotals.computedLines[idx];
              return (
                <tr key={`line-${idx}`} className="align-middle">
                  <td className="p-2">
                    <Select
                      size="sm"
                      value={line.itemId || ''}
                      onValueChange={(val) => onSelectItemForLine(idx, val)}
                      options={items.map((it) => ({ label: it.name, value: it.id }))}
                      placeholder="Select item..."
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      size="sm"
                      className="font-mono text-xs"
                      value={line.hsnSacCode}
                      onChange={(e) => onUpdateLineItem(idx, 'hsnSacCode', e.target.value)}
                    />
                  </td>
                  <td className="p-2 w-20">
                    <Input
                      size="sm"
                      type="number"
                      min="0"
                      step="any"
                      className="font-mono text-center text-xs font-bold"
                      value={!line.quantity || line.quantity === 0 ? '' : line.quantity}
                      onChange={(e) => {
                        const val = e.target.value;
                        onUpdateLineItem(idx, 'quantity', val === '' ? 0 : (parseFloat(val) || 0));
                      }}
                      placeholder="1"
                    />
                  </td>
                  <td className="p-2 w-24">
                    <Input
                      size="sm"
                      className="font-mono uppercase text-center text-xs"
                      value={line.uom}
                      onChange={(e) => onUpdateLineItem(idx, 'uom', e.target.value.toUpperCase())}
                    />
                  </td>
                  <td className="p-2 min-w-[140px]">
                    <CurrencyInput
                      size="sm"
                      className="w-full font-mono font-bold text-xs"
                      value={line.unitPrice}
                      onChange={(val) => onUpdateLineItem(idx, 'unitPrice', val)}
                    />
                  </td>
                  <td className="p-2 w-24">
                    <div className="relative">
                      <Input
                        size="sm"
                        type="number"
                        min={0}
                        max={100}
                        step="0.5"
                        className="font-mono text-right text-xs pr-5"
                        value={!line.discountPercent || line.discountPercent === 0 ? '' : line.discountPercent}
                        onChange={(e) => {
                          const val = e.target.value;
                          onUpdateLineItem(idx, 'discountPercent', val === '' ? 0 : (parseFloat(val) || 0));
                        }}
                        placeholder="0"
                      />
                      <span className="absolute right-2 top-2 text-[10px] font-bold text-muted pointer-events-none">
                        %
                      </span>
                    </div>
                  </td>
                  <td className="p-2">
                    <Select
                      size="sm"
                      value={String(line.gstRatePercent)}
                      onValueChange={(val) => onUpdateLineItem(idx, 'gstRatePercent', parseFloat(val))}
                      options={[
                        { label: '0%', value: '0' },
                        { label: '5%', value: '5' },
                        { label: '12%', value: '12' },
                        { label: '18%', value: '18' },
                        { label: '28%', value: '28' },
                      ]}
                    />
                  </td>
                  <td className="p-2 text-right">
                    <MoneyText amount={comp?.taxable || 0} />
                  </td>
                  <td className="p-2 text-right font-bold text-primary">
                    <MoneyText amount={comp?.total || 0} />
                  </td>
                  <td className="p-2 text-center">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={lineItems.length <= 1}
                      onClick={() => onRemoveLineItem(idx)}
                      aria-label="Remove line item"
                      className="text-muted hover:text-status-danger-text"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

