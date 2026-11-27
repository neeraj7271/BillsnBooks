import React from 'react';
import { MoneyText, DataTable, ColumnDef } from '@platform/ui';

interface InvoiceItemsTableProps {
  items: any[];
}

export function InvoiceItemsTable({ items }: InvoiceItemsTableProps) {
  const columns: ColumnDef<any>[] = [
    {
      key: 'index',
      header: '#',
      width: '32px',
      cell: (_it, idx) => <span className="text-muted print:text-black">{idx + 1}</span>,
    },
    {
      key: 'description',
      header: 'Description of Goods / Services',
      cell: (it) => (
        <div className="font-bold text-primary print:text-black">{it.description}</div>
      ),
    },
    {
      key: 'hsnSacCode',
      header: 'HSN/SAC',
      width: '80px',
      cell: (it) => (
        <span className="font-mono text-secondary print:text-black">{it.hsnSacCode}</span>
      ),
    },
    {
      key: 'quantity',
      header: 'Qty',
      width: '64px',
      align: 'right',
      cell: (it) => (
        <span className="font-mono print:text-black">{parseFloat(it.quantity).toFixed(0)}</span>
      ),
    },
    {
      key: 'uom',
      header: 'UOM',
      width: '64px',
      cell: (it) => <span className="text-secondary print:text-black">{it.uom}</span>,
    },
    {
      key: 'unitPrice',
      header: 'Rate',
      width: '96px',
      align: 'right',
      cell: (it) => (
        <span className="print:text-black">
          <MoneyText amount={it.unitPrice} />
        </span>
      ),
    },
    {
      key: 'taxableAmount',
      header: 'Taxable',
      width: '96px',
      align: 'right',
      cell: (it) => (
        <span className="font-semibold print:text-black">
          <MoneyText amount={it.taxableAmount} />
        </span>
      ),
    },
    {
      key: 'gstRatePercent',
      header: 'GST %',
      width: '64px',
      align: 'right',
      cell: (it) => (
        <span className="font-mono text-secondary print:text-black">
          {parseFloat(it.gstRatePercent)}%
        </span>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Total',
      width: '96px',
      align: 'right',
      cell: (it) => (
        <span className="font-bold text-primary print:text-black">
          <MoneyText amount={it.totalAmount} />
        </span>
      ),
    },
  ];

  return (
    <div className="py-6 border-b border-default overflow-x-auto print:overflow-visible">
      <DataTable
        columns={columns}
        data={items || []}
        showPagination={false}
        density="compact"
        emptyTitle="No items"
        emptyDescription="This invoice does not contain line items."
      />
    </div>
  );
}

