export interface LineItem {
  itemId?: string;
  description: string;
  hsnSacCode: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  discountPercent: number;
  gstRatePercent: number;
}

export interface ComputedInvoiceTotals {
  subtotal: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  roundOff: number;
  grandTotal: number;
  computedLines: Array<{
    taxable: number;
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
  }>;
}

export function calculateInvoiceTotals(
  lines: LineItem[],
  isIntraState: boolean
): ComputedInvoiceTotals {
  let subtotal = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  const computedLines = lines.map((line) => {
    const gross = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
    const disc = gross * ((Number(line.discountPercent) || 0) / 100);
    const taxable = Math.max(0, gross - disc);
    const taxRate = Number(line.gstRatePercent) || 0;

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isIntraState) {
      cgst = (taxable * (taxRate / 2)) / 100;
      sgst = (taxable * (taxRate / 2)) / 100;
    } else {
      igst = (taxable * taxRate) / 100;
    }

    const total = taxable + cgst + sgst + igst;

    subtotal += taxable;
    totalCgst += cgst;
    totalSgst += sgst;
    totalIgst += igst;

    return { taxable, cgst, sgst, igst, total };
  });

  const rawTotal = subtotal + totalCgst + totalSgst + totalIgst;
  const grandTotal = Math.round(rawTotal);
  const roundOff = grandTotal - rawTotal;

  return {
    subtotal,
    totalCgst,
    totalSgst,
    totalIgst,
    roundOff,
    grandTotal,
    computedLines,
  };
}

