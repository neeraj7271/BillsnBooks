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
    <div className="space-y-3" data-testid="line-items-section">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">
          Billable Items & Services
        </h3>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={onAddLineItem}
          leftIcon={<Plus className="h-3.5 w-3.5" />}
          title="Add Line Item (Alt+N)"
        >
          Add Line Item
        </Button>
      </div>

      <div className="rounded-xl border border-default overflow-x-auto max-h-[460px] shadow-2xs">
        <table className="min-w-[948px] w-full text-left text-xs border-collapse">
          <thead className="bg-surface-sunken border-b border-default sticky top-0 z-20 font-semibold text-secondary text-[11px]">
            <tr>
              <th className="py-2.5 px-3 min-w-[220px] sticky left-0 bg-surface-sunken z-30 shadow-[1px_0_0_0_var(--color-border)]">
                Item / Service
              </th>
              <th className="py-2.5 px-2 w-[96px]">HSN/SAC</th>
              <th className="py-2.5 px-2 w-[72px] text-right">Qty</th>
              <th className="py-2.5 px-2 w-[72px] text-center">UOM</th>
              <th className="py-2.5 px-2 w-[140px] text-right">Rate</th>
              <th className="py-2.5 px-2 w-[80px] text-right">Disc %</th>
              <th className="py-2.5 px-2 w-[88px] text-right">GST %</th>
              <th className="py-2.5 px-3 w-[140px] text-right">Amount</th>
              <th className="py-2.5 px-1 w-[40px] text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle bg-surface">
            {lineItems.map((line, idx) => {
              const comp = computedTotals.computedLines[idx];
              return (
                <tr
                  key={`line-${idx}`}
                  className="align-middle hover:bg-surface-sunken/40 transition-colors group"
                >
                  <td className="p-2 min-w-[220px] sticky left-0 bg-surface group-hover:bg-surface-sunken/40 transition-colors z-10 shadow-[1px_0_0_0_var(--color-border)]">
                    <Select
                      size="sm"
                      className="w-full min-w-0"
                      value={line.itemId || ''}
                      onValueChange={(val) => onSelectItemForLine(idx, val)}
                      options={items.map((it) => ({ label: it.name, value: it.id }))}
                      placeholder="Select item..."
                      aria-label={`Item or service for row ${idx + 1}`}
                    />
                  </td>
                  <td className="p-2 w-[96px]">
                    <Input
                      size="sm"
                      className="w-full min-w-0 font-mono text-xs tabular-nums"
                      value={line.hsnSacCode}
                      aria-label={`HSN or SAC code for row ${idx + 1}`}
                      onChange={(e) => onUpdateLineItem(idx, 'hsnSacCode', e.target.value)}
                    />
                  </td>
                  <td className="p-2 w-[72px]">
                    <Input
                      size="sm"
                      type="number"
                      min="0"
                      step="any"
                      className="w-full min-w-0 font-mono text-right text-xs font-bold tabular-nums"
                      value={line.quantity === 0 ? '' : line.quantity}
                      aria-label={`Quantity for row ${idx + 1}`}
                      onChange={(e) => {
                        const val = e.target.value;
                        onUpdateLineItem(idx, 'quantity', val === '' ? 0 : (parseFloat(val) || 0));
                      }}
                      placeholder="1"
                    />
                  </td>
                  <td className="p-2 w-[72px]">
                    <Select
                      size="sm"
                      className="w-full min-w-0 font-mono uppercase text-center text-xs px-1.5"
                      value={line.uom || 'NOS'}
                      onValueChange={(val) => onUpdateLineItem(idx, 'uom', val)}
                      options={[
                        { label: 'NOS', value: 'NOS' },
                        { label: 'PCS', value: 'PCS' },
                        { label: 'KG', value: 'KG' },
                        { label: 'LTR', value: 'LTR' },
                        { label: 'BOX', value: 'BOX' },
                        { label: 'SET', value: 'SET' },
                      ]}
                      aria-label={`Unit of measure for row ${idx + 1}`}
                    />
                  </td>
                  <td className="p-2 w-[140px]">
                    <CurrencyInput
                      size="sm"
                      className="w-full min-w-0 font-mono font-bold text-xs tabular-nums text-right"
                      value={line.unitPrice}
                      aria-label={`Unit rate for row ${idx + 1}`}
                      onChange={(val) => onUpdateLineItem(idx, 'unitPrice', val)}
                      placeholder="0.00"
                    />
                  </td>
                  <td className="p-2 w-[80px]">
                    <Input
                      size="sm"
                      type="number"
                      min={0}
                      max={100}
                      step="0.5"
                      rightAddon={<span className="text-[11px] text-muted font-bold">%</span>}
                      className="w-full min-w-0 font-mono text-right text-xs tabular-nums pr-6"
                      value={line.discountPercent === 0 ? '' : line.discountPercent}
                      aria-label={`Discount percentage for row ${idx + 1}`}
                      onChange={(e) => {
                        const val = e.target.value;
                        onUpdateLineItem(idx, 'discountPercent', val === '' ? 0 : (parseFloat(val) || 0));
                      }}
                      placeholder="0"
                    />
                  </td>
                  <td className="p-2 w-[88px]">
                    <Select
                      size="sm"
                      className="w-full min-w-0 font-mono text-right text-xs tabular-nums"
                      value={String(line.gstRatePercent)}
                      onValueChange={(val) => onUpdateLineItem(idx, 'gstRatePercent', parseFloat(val))}
                      aria-label={`GST tax slab for row ${idx + 1}`}
                      options={[
                        { label: '0%', value: '0' },
                        { label: '5%', value: '5' },
                        { label: '12%', value: '12' },
                        { label: '18%', value: '18' },
                        { label: '28%', value: '28' },
                      ]}
                    />
                  </td>
                  <td className="p-2 w-[140px] text-right font-bold text-primary tabular-nums text-xs">
                    <MoneyText amount={comp?.total || 0} />
                  </td>
                  <td className="p-2 w-[40px] text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={lineItems.length <= 1}
                      onClick={() => onRemoveLineItem(idx)}
                      aria-label={`Remove line item ${idx + 1}`}
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
