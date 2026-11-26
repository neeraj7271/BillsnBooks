import type { LineItem } from './invoice-math';

export interface FormPreviewState {
  documentType?: string;
  displayInvoiceNo?: string;
  invoiceDate?: string;
  dueDate?: string;
  posStateCode?: string;
  notes?: string;
  terms?: string;
}

export function buildInvoicePreviewModel(
  formState: FormPreviewState,
  activeCompany: any,
  activeBranch: any,
  selectedParty: any,
  lineItems: LineItem[],
  computedTotals: any,
) {
  const isIntraState = !computedTotals?.isInterState;

  // Format line items for templates
  const rawItems = lineItems && lineItems.length > 0 && lineItems.some(it => Boolean((it as any).itemName || it.description || it.unitPrice))
    ? lineItems
    : [
        {
          id: 'preview-item-1',
          description: 'Consulting & Implementation Services',
          itemName: 'Consulting & Implementation Services',
          hsnSacCode: '998311',
          quantity: 2,
          uom: 'NOS',
          unitPrice: 10000,
          discountPercent: 5,
          gstRatePercent: 18,
          taxableAmount: 19000,
          cgstAmount: isIntraState ? 1710 : 0,
          sgstAmount: isIntraState ? 1710 : 0,
          igstAmount: isIntraState ? 0 : 3420,
          amount: 22420,
          totalAmount: 22420,
        },
      ];

  const items = rawItems.map((it: any, idx: number) => {
    const qty = Number(it.quantity) || 1;
    const rate = Number(it.unitPrice) || 0;
    const disc = Number(it.discountPercent) || 0;
    const gstRate = Number(it.gstRatePercent) || 18;
    const taxable = it.taxableAmount !== undefined && !isNaN(Number(it.taxableAmount))
      ? Number(it.taxableAmount)
      : Math.max(0, qty * rate * (1 - disc / 100));
    const gstAmt = taxable * (gstRate / 100);
    const lineTotal = it.amount !== undefined && !isNaN(Number(it.amount))
      ? Number(it.amount)
      : taxable + gstAmt;

    return {
      id: it.id || `line-${idx}`,
      description: it.description || it.itemName || 'Item description',
      itemName: it.description || it.itemName || 'Item description',
      hsnSacCode: it.hsnSacCode || '998311',
      quantity: qty,
      uom: it.uom || 'NOS',
      unitPrice: rate,
      discountPercent: disc,
      gstRatePercent: gstRate,
      taxableAmount: taxable,
      cgstAmount: isIntraState ? gstAmt / 2 : 0,
      sgstAmount: isIntraState ? gstAmt / 2 : 0,
      igstAmount: isIntraState ? 0 : gstAmt,
      amount: lineTotal,
      totalAmount: lineTotal,
    };
  });

  const subtotal = computedTotals?.taxableAmount !== undefined && !isNaN(Number(computedTotals.taxableAmount))
    ? Number(computedTotals.taxableAmount)
    : items.reduce((sum, it) => sum + it.taxableAmount, 0);

  const totalCgst = computedTotals?.cgstAmount !== undefined && !isNaN(Number(computedTotals.cgstAmount))
    ? Number(computedTotals.cgstAmount)
    : (isIntraState ? items.reduce((sum, it) => sum + it.cgstAmount, 0) : 0);

  const totalSgst = computedTotals?.sgstAmount !== undefined && !isNaN(Number(computedTotals.sgstAmount))
    ? Number(computedTotals.sgstAmount)
    : (isIntraState ? items.reduce((sum, it) => sum + it.sgstAmount, 0) : 0);

  const totalIgst = computedTotals?.igstAmount !== undefined && !isNaN(Number(computedTotals.igstAmount))
    ? Number(computedTotals.igstAmount)
    : (!isIntraState ? items.reduce((sum, it) => sum + it.igstAmount, 0) : 0);

  const grandTotal = computedTotals?.totalAmount !== undefined && !isNaN(Number(computedTotals.totalAmount))
    ? Number(computedTotals.totalAmount)
    : (subtotal + totalCgst + totalSgst + totalIgst);

  return {
    id: 'draft-preview-id',
    invoiceNumber: formState.displayInvoiceNo?.trim() || '(auto)',
    documentType: formState.documentType || 'TAX_INVOICE',
    invoiceDate: formState.invoiceDate || new Date().toISOString().split('T')[0],
    dueDate: formState.dueDate || formState.invoiceDate || new Date().toISOString().split('T')[0],
    supplyType: isIntraState ? 'INTRA_STATE' : 'INTER_STATE',
    placeOfSupplyStateCode: formState.posStateCode || selectedParty?.stateCode || activeBranch?.stateCode || '27',
    branchId: activeBranch?.id,
    status: 'DRAFT',

    // Party Information & Snapshots
    party: selectedParty ? {
      ...selectedParty,
      name: selectedParty.name || 'Customer not selected',
      gstin: selectedParty.gstin || 'Unregistered',
      billingAddressLine1: selectedParty.billingAddressLine1 || selectedParty.addressLine1 || 'Client Registered Address',
      billingCity: selectedParty.billingCity || selectedParty.city || '',
      billingState: selectedParty.billingState || selectedParty.state || 'India',
      billingPincode: selectedParty.billingPincode || selectedParty.pincode || '',
    } : {
      name: 'Customer not selected',
      gstin: 'Unregistered / Consumer',
      billingAddressLine1: 'Client Registered Address',
      billingCity: '',
      billingState: 'India',
      billingPincode: '',
    },
    partyNameSnapshot: selectedParty?.name || 'Customer not selected',
    partyTradeNameSnapshot: selectedParty?.tradeName,
    partyGstinSnapshot: selectedParty?.gstin || 'Unregistered',
    partyRegistrationTypeSnapshot: selectedParty?.registrationType || 'REGULAR',
    partyPanSnapshot: selectedParty?.pan || (selectedParty?.gstin ? selectedParty.gstin.substring(2, 12) : null),

    billingAddressSnapshot: {
      addressLine1: selectedParty?.billingAddressLine1 || selectedParty?.addressLine1 || 'Client Registered Address',
      city: selectedParty?.billingCity || selectedParty?.city || '',
      state: selectedParty?.billingState || selectedParty?.state || 'India',
      pincode: selectedParty?.billingPincode || selectedParty?.pincode || '',
    },

    // Company Snapshot Info
    companyLegalNameSnapshot: activeCompany?.legalName || 'Acme Global Technologies Pvt Ltd',
    companyPanSnapshot: activeCompany?.pan || 'AABCA1234F',

    items,
    subtotalAmount: subtotal,
    discountAmount: computedTotals?.discountAmount || 0,
    taxableAmount: subtotal,
    cgstAmount: totalCgst,
    sgstAmount: totalSgst,
    igstAmount: totalIgst,
    cessAmount: computedTotals?.cessAmount || 0,
    roundOffAmount: computedTotals?.roundOff || 0,
    totalAmount: grandTotal,

    notes: formState.notes || '',
    termsAndConditions: formState.terms || '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if payment is overdue.\n3. Subject to local jurisdiction.',
  };
}
