import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CollectionsService } from '../src/modules/collections/collections.service';
import { UnitOfWorkService } from '../src/infrastructure/persistence/unit-of-work/unit-of-work.service';
import { VoucherService } from '../src/modules/voucher/voucher.service';
import { InvoiceService } from '../src/modules/invoice/invoice.service';
import {
  RecurringFrequency,
  PaymentLinkProvider,
} from '@platform/shared-types';

describe('CollectionsService', () => {
  let service: CollectionsService;

  const mockUow = {
    executeInTransaction: jest.fn((callback) => {
      const mockQr = {
        manager: {
          createQueryBuilder: jest.fn(),
          findOne: jest.fn(),
          find: jest.fn(),
          create: jest.fn((entityClass, data) => ({ id: 'mock-id', ...data })),
          save: jest.fn((entityClass, data) => Promise.resolve(data)),
        },
      };
      return callback(mockQr);
    }),
  };

  const mockVoucherService = {
    createAndPostVoucher: jest.fn(),
  };

  const mockInvoiceService = {
    createInvoice: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionsService,
        { provide: UnitOfWorkService, useValue: mockUow },
        { provide: VoucherService, useValue: mockVoucherService },
        { provide: InvoiceService, useValue: mockInvoiceService },
      ],
    }).compile();

    service = module.get<CollectionsService>(CollectionsService);
    jest.clearAllMocks();
  });

  describe('Settlement Reconciliation Invariant', () => {
    it('should throw BadRequestException if gross - fee - tax != net', async () => {
      await expect(
        service.reconcileSettlement(
          'tenant-1',
          'company-1',
          'user-1',
          {
            provider: PaymentLinkProvider.RAZORPAY,
            settlementId: 'set_123',
            settlementDate: '2026-10-31',
            grossAmount: '10000.00',
            feeAmount: '200.00',
            taxOnFee: '36.00',
            netCreditAmount: '9500.00', // Intentionally wrong! 10000 - 200 - 36 = 9764.00
            bankReference: 'UTR99887766',
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should pass validation when gross - fee - tax == net', async () => {
      // Mock branches, FY, ledgers
      const mockQr = {
        manager: {
          findOne: jest.fn().mockImplementation((entityClass) => {
            return Promise.resolve({
              id: 'mock-entity-id',
              code: 'LED-TEST',
              name: 'Test Ledger',
              isBankOrCash: true,
            });
          }),
          createQueryBuilder: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue({
              id: 'fy-1',
              name: 'FY 2026-27',
            }),
          }),
          create: jest.fn((_, data) => ({ id: 'settle-1', ...data })),
          save: jest.fn((_, data) => Promise.resolve(data)),
        },
      };

      mockUow.executeInTransaction.mockImplementation((cb) => cb(mockQr));
      mockVoucherService.createAndPostVoucher.mockResolvedValue({
        id: 'voucher-settle-1',
        voucherNumber: 'SETTLE/0001',
      });

      const result = await service.reconcileSettlement(
        'tenant-1',
        'company-1',
        'user-1',
        {
          provider: PaymentLinkProvider.RAZORPAY,
          settlementId: 'set_correct_123',
          settlementDate: '2026-10-31',
          grossAmount: '10000.00',
          feeAmount: '200.00',
          taxOnFee: '36.00',
          netCreditAmount: '9764.00', // Exact: 10000 - 200 - 36 = 9764
          bankReference: 'UTR11223344',
        },
      );

      expect(result).toBeDefined();
      expect(result.settlementId).toBe('set_correct_123');
      expect(mockVoucherService.createAndPostVoucher).toHaveBeenCalled();
    });
  });

  describe('Next Run Date Scheduling', () => {
    it('should correctly advance dates for different recurring frequencies', () => {
      const calc = (service as any).calculateNextRunDate.bind(service);

      expect(calc('2026-01-01', RecurringFrequency.WEEKLY)).toBe('2026-01-08');
      expect(calc('2026-01-01', RecurringFrequency.MONTHLY)).toBe('2026-02-01');
      expect(calc('2026-01-01', RecurringFrequency.QUARTERLY)).toBe('2026-04-01');
      expect(calc('2026-01-01', RecurringFrequency.ANNUAL)).toBe('2027-01-01');
    });

    it('should return invoice ageing breakdown with promise-to-pay statuses', async () => {
      const mockInvoices = [
        {
          id: 'inv-1',
          invoiceNumber: 'INV-00001',
          partyId: 'party-1',
          party: { name: 'Acme Corp', gstin: '27AABCU9603R1ZM' },
          invoiceDate: '2026-10-01',
          dueDate: '2026-10-15',
          totalAmount: '25000.00',
          promiseToPayDate: '2026-10-25', // Passed -> BROKEN
          promiseToPayNotes: 'Cheque promised by 25th',
        },
        {
          id: 'inv-2',
          invoiceNumber: 'INV-00002',
          partyId: 'party-2',
          party: { name: 'Beta Ltd' },
          invoiceDate: '2026-10-20',
          dueDate: '2026-11-05',
          totalAmount: '50000.00',
          promiseToPayDate: '2026-11-10', // Future -> UPCOMING
          promiseToPayNotes: null,
        },
      ];

      const mockQr = {
        manager: {
          createQueryBuilder: jest.fn().mockReturnValue({
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue(mockInvoices),
          }),
        },
      };

      mockUow.executeInTransaction.mockImplementation((cb) => cb(mockQr));

      const ageing = await service.getInvoicesAgeing('tenant-1', 'company-1', '2026-10-31');

      expect(ageing).toHaveLength(2);
      expect(ageing[0].promiseStatus).toBe('BROKEN');
      expect(ageing[0].promiseToPayNotes).toBe('Cheque promised by 25th');
      expect(ageing[1].promiseStatus).toBe('UPCOMING');
    });
  });
});

