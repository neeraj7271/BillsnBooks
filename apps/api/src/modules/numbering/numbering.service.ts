import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import {
  GapReportItem,
  NumberPreviewResult,
  ResetFrequency,
} from '@platform/shared-types';
import { NumberingSeriesOrmEntity } from '../../infrastructure/persistence/entities/numbering-series.orm-entity';
import { NumberAllocationOrmEntity } from '../../infrastructure/persistence/entities/number-allocation.orm-entity';

export interface NumberAllocationContext {
  date?: Date | string;
  branchCode?: string;
  customNumber?: string;
}

@Injectable()
export class NumberingService {
  constructor(
    @InjectRepository(NumberingSeriesOrmEntity)
    private readonly seriesRepo: Repository<NumberingSeriesOrmEntity>,
    @InjectRepository(NumberAllocationOrmEntity)
    private readonly allocationRepo: Repository<NumberAllocationOrmEntity>,
  ) {}

  /**
   * Helper to compute Indian Financial Year string (e.g. "24-25" or "2024-2025")
   */
  computeFinancialYear(date: Date, format: 'short' | 'full' = 'short'): string {
    const month = date.getMonth() + 1; // 1 to 12
    const year = date.getFullYear();

    const startYear = month >= 4 ? year : year - 1;
    const endYear = startYear + 1;

    if (format === 'short') {
      const sy = String(startYear).slice(-2);
      const ey = String(endYear).slice(-2);
      return `${sy}-${ey}`;
    }
    return `${startYear}-${endYear}`;
  }

  /**
   * Interpolate pattern tokens: {FY}, {YYYY}, {YY}, {MM}, {BRANCH}, {SEQ}
   */
  interpolatePattern(
    pattern: string,
    seq: number,
    padding: number,
    context?: NumberAllocationContext,
  ): string {
    const targetDate = context?.date ? new Date(context.date) : new Date();
    const branch = context?.branchCode || 'HO';
    const fyShort = this.computeFinancialYear(targetDate, 'short');
    const fyFull = this.computeFinancialYear(targetDate, 'full');
    const yyyy = String(targetDate.getFullYear());
    const yy = yyyy.slice(-2);
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const seqStr = String(seq).padStart(padding, '0');

    return pattern
      .replace(/{FY}/g, fyShort)
      .replace(/{FY_FULL}/g, fyFull)
      .replace(/{YYYY}/g, yyyy)
      .replace(/{YY}/g, yy)
      .replace(/{MM}/g, mm)
      .replace(/{BRANCH}/g, branch)
      .replace(/{SEQ}/g, seqStr);
  }

  /**
   * Allocate the next sequential number atomically with pessimistic locking (SELECT FOR UPDATE)
   */
  async allocateNextNumber(
    seriesId: string,
    documentId: string,
    userId: string,
    context?: NumberAllocationContext,
    externalManager?: EntityManager,
  ): Promise<{ allocatedNumber: string; seqNumber: number; seriesId: string }> {
    const executeInTx = async (manager: EntityManager) => {
      // 1. Acquire pessimistic write lock on the series row
      const series = await manager
        .getRepository(NumberingSeriesOrmEntity)
        .createQueryBuilder('series')
        .setLock('pessimistic_write')
        .where('series.id = :id', { id: seriesId })
        .getOne();

      if (!series) {
        throw new NotFoundException(`Numbering series "${seriesId}" not found.`);
      }

      if (!series.isActive) {
        throw new BadRequestException(`Numbering series "${series.seriesCode}" is inactive.`);
      }

      // Check if document already has an allocation
      const existingAlloc = await manager.getRepository(NumberAllocationOrmEntity).findOne({
        where: { documentId },
      });
      if (existingAlloc) {
        return {
          allocatedNumber: existingAlloc.allocatedNumber,
          seqNumber: existingAlloc.seqNumber,
          seriesId: series.id,
        };
      }

      // 2. Handle Manual Series
      if (series.isManual) {
        if (!context?.customNumber || !context.customNumber.trim()) {
          throw new BadRequestException(
            `Series "${series.seriesCode}" is configured for manual numbering. Custom number is required.`,
          );
        }
        const customNo = context.customNumber.trim();

        // Check uniqueness within company and docType
        const collision = await manager.getRepository(NumberAllocationOrmEntity).findOne({
          where: {
            companyId: series.companyId,
            docType: series.docType,
            allocatedNumber: customNo,
          },
        });
        if (collision) {
          throw new ConflictException(
            `Document number "${customNo}" has already been allocated for doc type "${series.docType}".`,
          );
        }

        const alloc = manager.getRepository(NumberAllocationOrmEntity).create({
          seriesId: series.id,
          companyId: series.companyId,
          docType: series.docType,
          documentId,
          allocatedNumber: customNo,
          seqNumber: 0,
          status: 'ISSUED',
          allocatedBy: userId,
        });
        await manager.getRepository(NumberAllocationOrmEntity).save(alloc);

        if (!series.isLocked) {
          series.isLocked = true;
          await manager.getRepository(NumberingSeriesOrmEntity).save(series);
        }

        return { allocatedNumber: customNo, seqNumber: 0, seriesId: series.id };
      }

      // 3. Handle Auto Series
      const nextSeq = series.currentSeq === 0 ? series.startSeq : series.currentSeq + 1;
      const allocatedNo = this.interpolatePattern(
        series.formatPattern,
        nextSeq,
        series.seqPadding,
        context,
      );

      // Verify no collision
      const existingConflict = await manager.getRepository(NumberAllocationOrmEntity).findOne({
        where: {
          companyId: series.companyId,
          docType: series.docType,
          allocatedNumber: allocatedNo,
        },
      });
      if (existingConflict) {
        throw new ConflictException(
          `Computed number "${allocatedNo}" already exists in allocations. Check starting sequence configuration.`,
        );
      }

      // Update series counter & lock series against mutation
      series.currentSeq = nextSeq;
      series.isLocked = true;
      await manager.getRepository(NumberingSeriesOrmEntity).save(series);

      // Save allocation
      const allocation = manager.getRepository(NumberAllocationOrmEntity).create({
        seriesId: series.id,
        companyId: series.companyId,
        docType: series.docType,
        documentId,
        allocatedNumber: allocatedNo,
        seqNumber: nextSeq,
        status: 'ISSUED',
        allocatedBy: userId,
      });
      await manager.getRepository(NumberAllocationOrmEntity).save(allocation);

      return {
        allocatedNumber: allocatedNo,
        seqNumber: nextSeq,
        seriesId: series.id,
      };
    };

    if (externalManager) {
      return executeInTx(externalManager);
    }
    return this.seriesRepo.manager.transaction(executeInTx);
  }

  /**
   * Cancel an allocated number (e.g. invoice cancelled/voided).
   * Note: The sequence number is PERMANENTLY retained and NEVER returned to the pool.
   */
  async cancelNumber(
    documentId: string,
    reason: string,
    userId: string,
    externalManager?: EntityManager,
  ): Promise<NumberAllocationOrmEntity> {
    const repo = externalManager
      ? externalManager.getRepository(NumberAllocationOrmEntity)
      : this.allocationRepo;

    const alloc = await repo.findOne({ where: { documentId } });
    if (!alloc) {
      throw new NotFoundException(`No number allocation found for document "${documentId}".`);
    }

    alloc.status = 'CANCELLED';
    alloc.cancellationReason = reason;
    return repo.save(alloc);
  }

  /**
   * Preview what the next number will look like (read-only dry run)
   */
  async previewNextNumber(
    seriesId: string,
    context?: NumberAllocationContext,
  ): Promise<NumberPreviewResult> {
    const series = await this.seriesRepo.findOne({ where: { id: seriesId } });
    if (!series) {
      throw new NotFoundException(`Series "${seriesId}" not found.`);
    }

    if (series.isManual) {
      return {
        previewNumber: context?.customNumber || 'MANUAL-ENTRY',
        nextSeq: 0,
        pattern: 'MANUAL',
        seriesCode: series.seriesCode,
      };
    }

    const nextSeq = series.currentSeq === 0 ? series.startSeq : series.currentSeq + 1;
    const previewNo = this.interpolatePattern(
      series.formatPattern,
      nextSeq,
      series.seqPadding,
      context,
    );

    return {
      previewNumber: previewNo,
      nextSeq,
      pattern: series.formatPattern,
      seriesCode: series.seriesCode,
    };
  }

  /**
   * Gap Detection Report: Identifies missing integers in the issued series sequence
   */
  async findGaps(seriesId: string): Promise<GapReportItem[]> {
    const series = await this.seriesRepo.findOne({ where: { id: seriesId } });
    if (!series) {
      throw new NotFoundException(`Series "${seriesId}" not found.`);
    }

    if (series.isManual || series.currentSeq === 0) {
      return [];
    }

    const allocations = await this.allocationRepo.find({
      where: { seriesId },
      order: { seqNumber: 'ASC' },
      select: ['seqNumber'],
    });

    const allocatedSet = new Set(allocations.map((a) => a.seqNumber));
    const gaps: GapReportItem[] = [];

    let gapStart: number | null = null;

    for (let s = series.startSeq; s <= series.currentSeq; s++) {
      if (!allocatedSet.has(s)) {
        if (gapStart === null) gapStart = s;
      } else {
        if (gapStart !== null) {
          gaps.push({
            fromSeq: gapStart,
            toSeq: s - 1,
            missingCount: s - gapStart,
          });
          gapStart = null;
        }
      }
    }

    if (gapStart !== null) {
      gaps.push({
        fromSeq: gapStart,
        toSeq: series.currentSeq,
        missingCount: series.currentSeq - gapStart + 1,
      });
    }

    return gaps;
  }

  /**
   * Create a new series
   */
  async createSeries(dto: {
    tenantId: string;
    companyId: string;
    branchId?: string | null;
    docType: string;
    seriesCode: string;
    formatPattern: string;
    seqPadding?: number;
    startSeq?: number;
    resetFrequency?: ResetFrequency;
    isManual?: boolean;
  }): Promise<NumberingSeriesOrmEntity> {
    const existing = await this.seriesRepo.findOne({
      where: {
        companyId: dto.companyId,
        docType: dto.docType,
        seriesCode: dto.seriesCode,
      },
    });
    if (existing) {
      throw new ConflictException(
        `Series code "${dto.seriesCode}" already exists for document type "${dto.docType}".`,
      );
    }

    const series = this.seriesRepo.create({
      tenantId: dto.tenantId,
      companyId: dto.companyId,
      branchId: dto.branchId || null,
      docType: dto.docType,
      seriesCode: dto.seriesCode,
      formatPattern: dto.formatPattern,
      seqPadding: dto.seqPadding ?? 5,
      startSeq: dto.startSeq ?? 1,
      currentSeq: 0,
      resetFrequency: dto.resetFrequency || 'YEARLY',
      isManual: dto.isManual || false,
      isLocked: false,
      isActive: true,
    });

    return this.seriesRepo.save(series);
  }

  /**
   * Update an existing series (prohibits altering formatPattern or startSeq once locked)
   */
  async updateSeries(
    seriesId: string,
    updates: {
      seriesCode?: string;
      formatPattern?: string;
      seqPadding?: number;
      startSeq?: number;
      resetFrequency?: ResetFrequency;
      isActive?: boolean;
    },
  ): Promise<NumberingSeriesOrmEntity> {
    const series = await this.seriesRepo.findOne({ where: { id: seriesId } });
    if (!series) {
      throw new NotFoundException(`Series "${seriesId}" not found.`);
    }

    if (series.isLocked) {
      if (
        (updates.formatPattern && updates.formatPattern !== series.formatPattern) ||
        (updates.startSeq !== undefined && updates.startSeq !== series.startSeq) ||
        (updates.seqPadding !== undefined && updates.seqPadding !== series.seqPadding)
      ) {
        throw new BadRequestException(
          `Cannot modify numbering pattern or starting sequence after documents have already been issued in series "${series.seriesCode}".`,
        );
      }
    }

    Object.assign(series, updates);
    return this.seriesRepo.save(series);
  }

  /**
   * List series for a company / docType
   */
  async listSeries(
    companyId: string,
    docType?: string,
    branchId?: string,
  ): Promise<NumberingSeriesOrmEntity[]> {
    const where: any = { companyId };
    if (docType) where.docType = docType;
    if (branchId) where.branchId = branchId;
    return this.seriesRepo.find({ where, order: { createdAt: 'ASC' } });
  }

  /**
   * Get default or active series for a document type
   */
  async getActiveSeriesForDocType(
    companyId: string,
    docType: string,
    branchId?: string,
  ): Promise<NumberingSeriesOrmEntity | null> {
    let series = await this.seriesRepo.findOne({
      where: {
        companyId,
        docType,
        branchId: branchId || undefined,
        isActive: true,
      },
    });

    if (!series && branchId) {
      // Fallback to company-wide series
      series = await this.seriesRepo.findOne({
        where: {
          companyId,
          docType,
          branchId: undefined,
          isActive: true,
        },
      });
    }

    return series;
  }

  /**
   * Configure or update the active numbering series for a document type
   */
  async configureActiveSeries(dto: {
    tenantId: string;
    companyId: string;
    branchId?: string | null;
    docType: string;
    prefix?: string;
    suffix?: string;
    startSeq: number;
    seqPadding?: number;
    isManual?: boolean;
  }): Promise<NumberingSeriesOrmEntity> {
    const prefix = dto.prefix !== undefined ? dto.prefix : 'INV-';
    const suffix = dto.suffix ?? '';
    const formatPattern = `${prefix}{SEQ}${suffix}`;
    const seqPadding = dto.seqPadding ?? 4;
    const startSeq = Math.max(1, Number(dto.startSeq) || 1);

    let series = await this.seriesRepo.findOne({
      where: {
        companyId: dto.companyId,
        docType: dto.docType,
        branchId: dto.branchId || undefined,
        isActive: true,
      },
    });

    if (series) {
      if (series.isLocked && series.currentSeq > 0) {
        throw new BadRequestException(
          `Cannot modify starting sequence after documents have already been issued in series "${series.seriesCode}".`,
        );
      }
      series.formatPattern = formatPattern;
      series.seqPadding = seqPadding;
      series.startSeq = startSeq;
      series.isManual = dto.isManual || false;
      return this.seriesRepo.save(series);
    }

    const defaultCode =
      dto.docType === 'TAX_INVOICE'
        ? 'INV'
        : dto.docType === 'CREDIT_NOTE'
          ? 'CN'
          : dto.docType === 'DEBIT_NOTE'
            ? 'DN'
            : dto.docType === 'PROFORMA_INVOICE'
              ? 'PI'
              : dto.docType === 'DELIVERY_CHALLAN'
                ? 'DC'
                : 'DOC';

    const newSeries = this.seriesRepo.create({
      tenantId: dto.tenantId,
      companyId: dto.companyId,
      branchId: dto.branchId || null,
      docType: dto.docType,
      seriesCode: defaultCode,
      formatPattern,
      seqPadding,
      startSeq,
      currentSeq: 0,
      resetFrequency: 'YEARLY',
      isManual: dto.isManual || false,
      isLocked: false,
      isActive: true,
    });

    return this.seriesRepo.save(newSeries);
  }
}

