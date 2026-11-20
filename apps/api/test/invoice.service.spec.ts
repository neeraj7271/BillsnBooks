import { InvoiceService } from '../src/modules/invoice/invoice.service';
import {
  InvoiceStatus,
  ApprovalStatus,
  SupplyType,
  VoucherType,
  DocumentType,
  TaxClassification,
} from '@platform/shared-types';

describe('InvoiceService and GST Engine', () => {
  let service: InvoiceService;
  let mockUow: any;
  let mockVoucherService: any;
  let mockQr: any;

  const tenantId = 'a0000000-0000-4000-8000-000000000001';
  const companyId = 'c0000000-0000-4000-8000-000000000001';
  const userId = 'b0000000-0000-4000-8000-000000000001';
  const branchId = 'd0000000-0000-4000-8000-000000000001';
  const financialYearId = 'e0000000-0000-4000-8000-000000000001';

  beforeEach(() => {
    mockVoucherService = {
      createAndPostVoucher: jest.fn().mockResolvedValue({
        id: 'vouch-123',
        voucherNumber: 'V-2024-001',
      }),
    };

    mockQr = {
      manager: {
        findOne: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation((entityClass, data) => ({
          ...data,
          id: 'inv-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
        createQueryBuilder: jest.fn(),
      },
    };

    mockUow = {
      executeInTransaction: jest.fn().mockImplementation(async (cb) => cb(mockQr)),
    };

    service = new InvoiceService(mockUow, mockVoucherService);
  });

  it('creates intra-state invoice with CGST and SGST split evenly and posts sales voucher', async () => {
    // Supplier branch state = '27' (Maharashtra), Customer party state = '27' (Maharashtra)
    mockQr.manager.findOne.mockImplementation((entityClass: any, options: any) => {
      if (options?.where?.id === 'party-1') {
        return Promise.resolve({
          id: 'party-1',
          name: 'Tata Motors Commercial Ltd',
          billingStateCode: '27',
          gstin: '27AAACT2727Q1ZW',
          ledgerId: 'led-debtor-1',
        });
      }
      if (options?.where?.id === branchId) {
        return Promise.resolve({
          id: branchId,
          stateCode: '27',
        });
      }
      return Promise.resolve(null);
    });

    const mockLedgerQueryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ id: 'led-sales-1', name: 'Sales Account' }),
      getMany: jest.fn().mockResolvedValue([
        { id: 'led-cgst', name: 'Output CGST Account' },
        { id: 'led-sgst', name: 'Output SGST Account' },
      ]),
    };
    mockQr.manager.createQueryBuilder.mockReturnValue(mockLedgerQueryBuilder);

    const result = await service.createInvoice(tenantId, companyId, userId, {
      branchId,
      financialYearId,
      partyId: 'party-1',
      invoiceDate: '2024-10-15',
      dueDate: '2024-11-15',
      placeOfSupplyStateCode: '27',
      items: [
        {
          description: 'Consulting Services',
          hsnSacCode: '998311',
          quantity: 1,
          unitPrice: 10000,
          gstRatePercent: 18,
        },
      ],
    });

    expect(result.supplyType).toBe(SupplyType.INTRA_STATE);
    expect(result.subtotalAmount).toBe('10000.00');
    expect(result.cgstAmount).toBe('900.00');
    expect(result.sgstAmount).toBe('900.00');
    expect(result.igstAmount).toBe('0.00');
    expect(result.totalAmount).toBe('11800.00');
    expect(result.status).toBe(InvoiceStatus.ISSUED);

    // Verify canonical double-entry voucher posted
    expect(mockVoucherService.createAndPostVoucher).toHaveBeenCalled();
    const voucherArgs = mockVoucherService.createAndPostVoucher.mock.calls[0][3];
    expect(voucherArgs.voucherType).toBe(VoucherType.SALES);
    expect(voucherArgs.entries.length).toBe(4); // Debtor, Sales, CGST, SGST -> 4 entries
  });

  it('creates inter-state invoice with 100% IGST when customer is in Gujarat and supplier in Maharashtra', async () => {
    // Supplier branch state = '27', Customer party state = '24'
    mockQr.manager.findOne.mockImplementation((entityClass: any, options: any) => {
      if (options?.where?.id === 'party-2') {
        return Promise.resolve({
          id: 'party-2',
          name: 'Reliance Retail Ventures',
          billingStateCode: '24',
          gstin: '24AAACR4534K1ZV',
          ledgerId: 'led-debtor-2',
        });
      }
      if (options?.where?.id === branchId) {
        return Promise.resolve({
          id: branchId,
          stateCode: '27',
        });
      }
      return Promise.resolve(null);
    });

    const mockLedgerQueryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ id: 'led-sales-1', name: 'Sales Account' }),
      getMany: jest.fn().mockResolvedValue([
        { id: 'led-igst', name: 'Output IGST Account' },
      ]),
    };
    mockQr.manager.createQueryBuilder.mockReturnValue(mockLedgerQueryBuilder);

    const result = await service.createInvoice(tenantId, companyId, userId, {
      branchId,
      financialYearId,
      partyId: 'party-2',
      invoiceDate: '2024-10-15',
      dueDate: '2024-11-15',
      placeOfSupplyStateCode: '24',
      items: [
        {
          description: 'ERP Software License',
          hsnSacCode: '997331',
          quantity: 2,
          unitPrice: 20000,
          gstRatePercent: 18,
        },
      ],
    });

    expect(result.supplyType).toBe(SupplyType.INTER_STATE);
    expect(result.subtotalAmount).toBe('40000.00');
    expect(result.cgstAmount).toBe('0.00');
    expect(result.sgstAmount).toBe('0.00');
    expect(result.igstAmount).toBe('7200.00');
    expect(result.totalAmount).toBe('47200.00');
  });

  it('routes high-value invoice (>= ₹50,000) to PENDING_APPROVAL maker-checker queue', async () => {
    mockQr.manager.findOne.mockImplementation((entityClass: any, options: any) => {
      if (options?.where?.id === 'party-1') {
        return Promise.resolve({
          id: 'party-1',
          name: 'Tata Motors Commercial Ltd',
          billingStateCode: '27',
          ledgerId: 'led-debtor-1',
        });
      }
      if (options?.where?.id === branchId) {
        return Promise.resolve({
          id: branchId,
          stateCode: '27',
        });
      }
      return Promise.resolve(null);
    });

    const result = await service.createInvoice(tenantId, companyId, userId, {
      branchId,
      financialYearId,
      partyId: 'party-1',
      invoiceDate: '2024-10-15',
      dueDate: '2024-11-15',
      placeOfSupplyStateCode: '27',
      items: [
        {
          description: 'Enterprise Cloud Transformation',
          hsnSacCode: '998311',
          quantity: 1,
          unitPrice: 75000,
          gstRatePercent: 18,
        },
      ],
    });

    // Subtotal 75k + 18% = 88,500 >= 50,000 -> PENDING_APPROVAL
    expect(result.status).toBe(InvoiceStatus.PENDING_APPROVAL);
    expect(result.approvalStatus).toBe(ApprovalStatus.PENDING);
    // Voucher should not be posted yet until approved
    expect(mockVoucherService.createAndPostVoucher).not.toHaveBeenCalled();
  });

  it('creates Proforma Invoice with PI- prefix and does NOT post GL voucher', async () => {
    mockQr.manager.findOne.mockImplementation((entityClass: any, options: any) => {
      if (options?.where?.id === 'party-1') {
        return Promise.resolve({
          id: 'party-1',
          name: 'Tata Motors Commercial Ltd',
          billingStateCode: '27',
          ledgerId: 'led-debtor-1',
        });
      }
      if (options?.where?.id === branchId) {
        return Promise.resolve({ id: branchId, stateCode: '27' });
      }
      return Promise.resolve(null);
    });

    const result = await service.createInvoice(tenantId, companyId, userId, {
      branchId,
      financialYearId,
      partyId: 'party-1',
      invoiceDate: '2024-10-15',
      dueDate: '2024-11-15',
      placeOfSupplyStateCode: '27',
      documentType: DocumentType.PROFORMA_INVOICE,
      items: [
        {
          description: 'Consulting Estimate',
          hsnSacCode: '998311',
          quantity: 1,
          unitPrice: 20000,
          gstRatePercent: 18,
        },
      ],
    });

    expect(result.documentType).toBe(DocumentType.PROFORMA_INVOICE);
    expect(result.invoiceNumber).toMatch(/^PI-/);
    expect(mockVoucherService.createAndPostVoucher).not.toHaveBeenCalled();
  });

  it('converts Proforma Invoice to Tax Invoice and posts to General Ledger', async () => {
    const existingProforma = {
      id: 'inv-pi-1',
      tenantId,
      companyId,
      branchId,
      financialYearId,
      partyId: 'party-1',
      invoiceNumber: 'PI-00001',
      invoiceDate: '2024-10-15',
      dueDate: '2024-11-15',
      status: InvoiceStatus.ISSUED,
      documentType: DocumentType.PROFORMA_INVOICE,
      subtotalAmount: '20000.00',
      cgstAmount: '1800.00',
      sgstAmount: '1800.00',
      igstAmount: '0.00',
      cessAmount: '0.00',
      roundOffAmount: '0.00',
      totalAmount: '23600.00',
      party: { id: 'party-1', name: 'Tata Motors', ledgerId: 'led-debtor-1' },
      items: [],
    };

    mockQr.manager.findOne.mockResolvedValue(existingProforma);

    const mockLedgerQueryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ id: 'led-sales-1', name: 'Sales Account' }),
      getMany: jest.fn().mockResolvedValue([
        { id: 'led-cgst', name: 'Output CGST Account' },
        { id: 'led-sgst', name: 'Output SGST Account' },
      ]),
    };
    mockQr.manager.createQueryBuilder.mockReturnValue(mockLedgerQueryBuilder);

    const converted = await service.convertToTaxInvoice(tenantId, companyId, userId, 'inv-pi-1');

    expect(converted.documentType).toBe(DocumentType.TAX_INVOICE);
    expect(converted.invoiceNumber).toMatch(/^INV-/);
    expect(mockVoucherService.createAndPostVoucher).toHaveBeenCalled();
  });

  it('calculates zero GST for Nil-Rated or Exempt supply classifications', async () => {
    mockQr.manager.findOne.mockImplementation((entityClass: any, options: any) => {
      if (options?.where?.id === 'party-1') {
        return Promise.resolve({
          id: 'party-1',
          name: 'Agri Supply Corp',
          billingStateCode: '27',
          ledgerId: 'led-debtor-1',
        });
      }
      if (options?.where?.id === branchId) {
        return Promise.resolve({ id: branchId, stateCode: '27' });
      }
      return Promise.resolve(null);
    });

    const mockLedgerQueryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ id: 'led-sales-1', name: 'Sales Account' }),
      getMany: jest.fn().mockResolvedValue([]),
    };
    mockQr.manager.createQueryBuilder.mockReturnValue(mockLedgerQueryBuilder);

    const result = await service.createInvoice(tenantId, companyId, userId, {
      branchId,
      financialYearId,
      partyId: 'party-1',
      invoiceDate: '2024-10-15',
      dueDate: '2024-11-15',
      placeOfSupplyStateCode: '27',
      taxClassification: TaxClassification.NIL_RATED,
      items: [
        {
          description: 'Unprocessed Agricultural Produce',
          hsnSacCode: '07019000',
          quantity: 100,
          unitPrice: 50,
        },
      ],
    });

    expect(result.taxClassification).toBe(TaxClassification.NIL_RATED);
    expect(result.cgstAmount).toBe('0.00');
    expect(result.sgstAmount).toBe('0.00');
    expect(result.igstAmount).toBe('0.00');
    expect(result.totalAmount).toBe('5000.00');
  });

  it('records and updates promise-to-pay date and notes on an invoice', async () => {
    const existing = {
      id: 'inv-123',
      tenantId,
      companyId,
      invoiceNumber: 'INV-00001',
      promiseToPayDate: null,
      promiseToPayNotes: null,
      totalAmount: '10000.00',
    };
    mockQr.manager.findOne.mockResolvedValue(existing);

    const updated = await service.setPromiseToPay(tenantId, companyId, 'inv-123', {
      promiseToPayDate: '2024-11-20',
      promiseToPayNotes: 'Customer confirmed RTGS payment next Monday after director sign-off.',
    });

    expect(updated.promiseToPayDate).toBe('2024-11-20');
    expect(updated.promiseToPayNotes).toContain('confirmed RTGS');
  });
});
