import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { NumberingService } from '../src/modules/numbering/numbering.service';
import { NumberingSeriesOrmEntity } from '../src/infrastructure/persistence/entities/numbering-series.orm-entity';
import { NumberAllocationOrmEntity } from '../src/infrastructure/persistence/entities/number-allocation.orm-entity';

describe('NumberingService', () => {
  let service: NumberingService;
  let mockSeries: NumberingSeriesOrmEntity[] = [];
  let mockAllocations: NumberAllocationOrmEntity[] = [];

  const mockSeriesRepo: any = {
    findOne: jest.fn(async (opts: any) => {
      return (
        mockSeries.find(
          (s) =>
            (!opts.where.id || s.id === opts.where.id) &&
            (!opts.where.companyId || s.companyId === opts.where.companyId) &&
            (!opts.where.docType || s.docType === opts.where.docType) &&
            (!opts.where.seriesCode || s.seriesCode === opts.where.seriesCode),
        ) || null
      );
    }),
    find: jest.fn(async (opts?: any) => {
      let filtered = [...mockSeries];
      if (opts?.where?.companyId) {
        filtered = filtered.filter((s) => s.companyId === opts.where.companyId);
      }
      return filtered;
    }),
    create: jest.fn((dto) => ({
      id: 'ser-' + Math.random().toString(36).substring(7),
      ...dto,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    save: jest.fn(async (entity) => {
      const idx = mockSeries.findIndex((s) => s.id === entity.id);
      if (idx >= 0) {
        mockSeries[idx] = { ...mockSeries[idx], ...entity };
        return mockSeries[idx];
      }
      mockSeries.push(entity);
      return entity;
    }),
    createQueryBuilder: jest.fn(() => ({
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(async () => mockSeries[0] || null),
    })),
    manager: {
      transaction: jest.fn(async (callback) => {
        const fakeManager: any = {
          getRepository: (entityClass: any) => {
            if (entityClass === NumberingSeriesOrmEntity) {
              return mockSeriesRepo;
            }
            return mockAllocationRepo;
          },
        };
        return callback(fakeManager);
      }),
    },
  };

  const mockAllocationRepo: any = {
    findOne: jest.fn(async (opts: any) => {
      return (
        mockAllocations.find(
          (a) =>
            (!opts.where.documentId || a.documentId === opts.where.documentId) &&
            (!opts.where.allocatedNumber || a.allocatedNumber === opts.where.allocatedNumber),
        ) || null
      );
    }),
    find: jest.fn(async (opts?: any) => {
      let filtered = [...mockAllocations];
      if (opts?.where?.seriesId) {
        filtered = filtered.filter((a) => a.seriesId === opts.where.seriesId);
      }
      return filtered;
    }),
    create: jest.fn((dto) => ({
      id: 'alloc-' + Math.random().toString(36).substring(7),
      ...dto,
      allocatedAt: new Date(),
    })),
    save: jest.fn(async (entity) => {
      const idx = mockAllocations.findIndex((a) => a.id === entity.id);
      if (idx >= 0) {
        mockAllocations[idx] = { ...mockAllocations[idx], ...entity };
        return mockAllocations[idx];
      }
      mockAllocations.push(entity);
      return entity;
    }),
  };

  beforeEach(async () => {
    mockSeries = [];
    mockAllocations = [];
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NumberingService,
        {
          provide: getRepositoryToken(NumberingSeriesOrmEntity),
          useValue: mockSeriesRepo,
        },
        {
          provide: getRepositoryToken(NumberAllocationOrmEntity),
          useValue: mockAllocationRepo,
        },
      ],
    }).compile();

    service = module.get<NumberingService>(NumberingService);
  });

  describe('Financial Year Computation', () => {
    it('should compute correct Indian FY for month in calendar year', () => {
      // April 2024 -> FY 24-25
      const apr2024 = new Date(2024, 3, 15);
      expect(service.computeFinancialYear(apr2024, 'short')).toBe('24-25');
      expect(service.computeFinancialYear(apr2024, 'full')).toBe('2024-2025');

      // October 2024 -> FY 24-25
      const oct2024 = new Date(2024, 9, 31);
      expect(service.computeFinancialYear(oct2024, 'short')).toBe('24-25');

      // March 2025 -> Still FY 24-25
      const mar2025 = new Date(2025, 2, 31);
      expect(service.computeFinancialYear(mar2025, 'short')).toBe('24-25');

      // April 2025 -> Next FY 25-26
      const apr2025 = new Date(2025, 3, 1);
      expect(service.computeFinancialYear(apr2025, 'short')).toBe('25-26');
    });
  });

  describe('Token Interpolation', () => {
    it('should interpolate {FY}, {BRANCH}, {YYYY}, and {SEQ}', () => {
      const pattern = 'INV/{FY}/{BRANCH}/{SEQ}';
      const result = service.interpolatePattern(pattern, 42, 5, {
        date: new Date(2024, 9, 15),
        branchCode: 'MUM',
      });
      expect(result).toBe('INV/24-25/MUM/00042');
    });

    it('should support customized padding', () => {
      const pattern = 'DC-{SEQ}';
      const result = service.interpolatePattern(pattern, 7, 3);
      expect(result).toBe('DC-007');
    });
  });

  describe('Sequential Auto-Allocation with Pessimistic Locking', () => {
    it('should allocate next sequence number and lock series against alteration', async () => {
      const series = await service.createSeries({
        tenantId: 't-1',
        companyId: 'c-1',
        docType: 'TAX_INVOICE',
        seriesCode: 'INV-MAIN',
        formatPattern: 'INV/{FY}/{SEQ}',
        seqPadding: 4,
        startSeq: 101,
      });

      mockSeries[0] = series;

      const alloc1 = await service.allocateNextNumber(
        series.id,
        'doc-101',
        'user-1',
        { date: new Date(2024, 9, 1) },
      );

      expect(alloc1.allocatedNumber).toBe('INV/24-25/0101');
      expect(alloc1.seqNumber).toBe(101);
      expect(mockSeries[0].currentSeq).toBe(101);
      expect(mockSeries[0].isLocked).toBe(true);

      const alloc2 = await service.allocateNextNumber(
        series.id,
        'doc-102',
        'user-1',
        { date: new Date(2024, 9, 1) },
      );

      expect(alloc2.allocatedNumber).toBe('INV/24-25/0102');
      expect(alloc2.seqNumber).toBe(102);
      expect(mockSeries[0].currentSeq).toBe(102);
    });

    it('should prohibit modifying format pattern or startSeq once locked', async () => {
      const series = await service.createSeries({
        tenantId: 't-1',
        companyId: 'c-1',
        docType: 'TAX_INVOICE',
        seriesCode: 'INV-TEST',
        formatPattern: 'INV/{SEQ}',
      });

      series.isLocked = true;
      mockSeries = [series];

      await expect(
        service.updateSeries(series.id, { formatPattern: 'MUTATED/{SEQ}' }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.updateSeries(series.id, { startSeq: 500 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Cancellation Invariants (Never decrement sequence)', () => {
    it('should mark allocation as CANCELLED while preserving current sequence', async () => {
      const series = await service.createSeries({
        tenantId: 't-1',
        companyId: 'c-1',
        docType: 'TAX_INVOICE',
        seriesCode: 'INV-CANCEL-TEST',
        formatPattern: 'INV/{SEQ}',
        startSeq: 1,
      });
      mockSeries = [series];

      const alloc = await service.allocateNextNumber(series.id, 'doc-to-cancel', 'user-1');
      expect(mockSeries[0].currentSeq).toBe(1);

      const cancelled = await service.cancelNumber(
        'doc-to-cancel',
        'Customer order cancelled before dispatch',
        'user-1',
      );

      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.cancellationReason).toBe('Customer order cancelled before dispatch');

      // Crucial statutory invariant: currentSeq remains 1, never decrements to 0
      expect(mockSeries[0].currentSeq).toBe(1);
    });
  });

  describe('Gap Detection Report', () => {
    it('should detect missing integers in non-contiguous sequence numbers', async () => {
      const series = await service.createSeries({
        tenantId: 't-1',
        companyId: 'c-1',
        docType: 'TAX_INVOICE',
        seriesCode: 'INV-GAP',
        formatPattern: 'INV/{SEQ}',
        startSeq: 1,
      });

      series.currentSeq = 5;
      mockSeries = [series];

      // Simulate missing seq 2 and 4
      mockAllocations = [
        { seqNumber: 1, seriesId: series.id } as any,
        { seqNumber: 3, seriesId: series.id } as any,
        { seqNumber: 5, seriesId: series.id } as any,
      ];

      const gaps = await service.findGaps(series.id);
      expect(gaps.length).toBe(2);
      expect(gaps[0]).toEqual({ fromSeq: 2, toSeq: 2, missingCount: 1 });
      expect(gaps[1]).toEqual({ fromSeq: 4, toSeq: 4, missingCount: 1 });
    });
  });

  describe('Manual Numbering Series', () => {
    it('should require customNumber and reject duplicates in manual mode', async () => {
      const series = await service.createSeries({
        tenantId: 't-1',
        companyId: 'c-1',
        docType: 'BILL_OF_SUPPLY',
        seriesCode: 'BOS-MANUAL',
        formatPattern: 'MANUAL',
        isManual: true,
      });
      mockSeries = [series];

      // Rejects without customNumber
      await expect(
        service.allocateNextNumber(series.id, 'doc-man-1', 'user-1', {}),
      ).rejects.toThrow(BadRequestException);

      // Successfully allocates custom number
      const alloc1 = await service.allocateNextNumber(series.id, 'doc-man-1', 'user-1', {
        customNumber: 'CUSTOM-BOS-99',
      });
      expect(alloc1.allocatedNumber).toBe('CUSTOM-BOS-99');

      // Duplicate detection
      mockAllocations.push({
        companyId: 'c-1',
        docType: 'BILL_OF_SUPPLY',
        allocatedNumber: 'CUSTOM-BOS-99',
      } as any);

      await expect(
        service.allocateNextNumber(series.id, 'doc-man-2', 'user-1', {
          customNumber: 'CUSTOM-BOS-99',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});

