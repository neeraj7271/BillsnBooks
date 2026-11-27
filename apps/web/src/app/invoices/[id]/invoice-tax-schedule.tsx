import React from 'react';
import { MoneyText, DataTable, ColumnDef } from '@platform/ui';

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

  const taxColumns: ColumnDef<any>[] = [
    {
      key: 'hsn',
      header: 'HSN / SAC',
      cell: () => <span>Multiple / 998311</span>,
    },
    {
      key: 'taxable',
      header: 'Taxable Value',
      align: 'right',
      cell: () => <MoneyText amount={invoice.subtotalAmount} />,
    },
    ...(isIntraState
      ? [
          {
            key: 'cgstRate',
            header: 'CGST Rate',
            align: 'right' as const,
            cell: () => <span>9.00%</span>,
          },
          {
            key: 'cgstAmt',
            header: 'CGST Amount',
            align: 'right' as const,
            cell: () => <MoneyText amount={invoice.cgstAmount} />,
          },
          {
            key: 'sgstRate',
            header: 'SGST Rate',
            align: 'right' as const,
            cell: () => <span>9.00%</span>,
          },
          {
            key: 'sgstAmt',
            header: 'SGST Amount',
            align: 'right' as const,
            cell: () => <MoneyText amount={invoice.sgstAmount} />,
          },
        ]
      : [
          {
            key: 'igstRate',
            header: 'IGST Rate',
            align: 'right' as const,
            cell: () => <span>18.00%</span>,
          },
          {
            key: 'igstAmt',
            header: 'IGST Amount',
            align: 'right' as const,
            cell: () => <MoneyText amount={invoice.igstAmount} />,
          },
        ]),
    {
      key: 'totalTax',
      header: 'Total Tax',
      align: 'right',
      cell: () => (
        <span className="font-bold text-primary print:text-black">
          <MoneyText amount={totalTax} />
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="py-6 border-b border-default">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted print:text-black mb-2">
          GST Tax Schedule & Breakup:
        </div>
        <DataTable
          columns={taxColumns}
          data={[{ id: 'schedule-1' }]}
          showPagination={false}
          density="compact"
          emptyTitle="No tax schedule"
          emptyDescription="Tax schedule will appear once items are added."
        />
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

