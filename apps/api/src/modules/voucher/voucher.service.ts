import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import * as crypto from 'crypto';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import { Voucher, JournalEntry, Money } from '@platform/accounting-core';
import { VoucherType, VoucherStatus, OutboxStatus } from '@platform/shared-types';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { VoucherOrmEntity } from '../../infrastructure/persistence/entities/voucher.orm-entity';
import { JournalEntryOrmEntity } from '../../infrastructure/persistence/entities/journal-entry.orm-entity';
import { VoucherSequenceOrmEntity } from '../../infrastructure/persistence/entities/voucher-sequence.orm-entity';
import { AccountingPeriodOrmEntity } from '../../infrastructure/persistence/entities/accounting-period.orm-entity';
import { OutboxOrmEntity } from '../../infrastructure/persistence/entities/outbox.orm-entity';
import { AuditLogOrmEntity } from '../../infrastructure/persistence/entities/audit-log.orm-entity';
import { VoucherMapper } from '../../infrastructure/persistence/mappers/voucher.mapper';

@Injectable()
export class VoucherService {
  constructor(private readonly uow: UnitOfWorkService) {}

  async createAndPostVoucher(
    tenantId: string,
    companyId: string,
    userId: string,
    dto: CreateVoucherDto,
    idempotencyKey?: string,
  ): Promise<Voucher> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      // 1. Idempotency Check
      if (idempotencyKey) {
        const existing = await qr.manager.findOne(VoucherOrmEntity, {
          where: { tenantId, companyId, idempotencyKey },
          relations: ['entries'],
        });
        if (existing) {
          return VoucherMapper.toDomain(existing);
        }
      }

      // 1.5. Period Lock Check
      const lockedPeriod = await qr.manager
        .createQueryBuilder(AccountingPeriodOrmEntity, 'period')
        .where('period.tenant_id = :tenantId', { tenantId })
        .andWhere('period.company_id = :companyId', { companyId })
        .andWhere('period.is_locked = true')
        .andWhere(':vDate BETWEEN period.start_date AND period.end_date', { vDate: dto.voucherDate })
        .getOne();

      if (lockedPeriod) {
        throw new BadRequestException(
          `Cannot post voucher on ${dto.voucherDate}: Accounting period "${lockedPeriod.periodName}" is locked.`,
        );
      }

      // 2. Concurrency-safe, gap-free document number allocation via pessimistic lock
      const series = dto.series || 'DEFAULT';
      const voucherNumber = await this.allocateSequenceNumber(
        qr,
        tenantId,
        companyId,
        dto.voucherType,
        series,
        dto.financialYearId,
      );

      // 3. Assemble domain aggregate
      const voucherId = crypto.randomUUID();
      const domainVoucher = new Voucher({
        id: voucherId,
        tenantId,
        companyId,
        branchId: dto.branchId,
        financialYearId: dto.financialYearId,
        voucherType: dto.voucherType,
        voucherNumber,
        voucherDate: new Date(dto.voucherDate),
        status: VoucherStatus.DRAFT,
        narration: dto.narration,
        idempotencyKey,
      });

      let lineIndex = 1;
      for (const entry of dto.entries) {
        domainVoucher.addEntry(
          new JournalEntry({
            voucherId,
            ledgerId: entry.ledgerId,
            entryType: entry.entryType,
            amount: new Money(entry.amount),
            narration: entry.narration,
            lineIndex: lineIndex++,
          }),
        );
      }

      // 4. Validate domain rules and transition to POSTED
      domainVoucher.post();

      // 5. Convert to ORM entities and persist
      const voucherOrm = VoucherMapper.toOrm(domainVoucher);
      voucherOrm.createdBy = userId;
      await qr.manager.save(VoucherOrmEntity, voucherOrm);
      await qr.manager.save(JournalEntryOrmEntity, voucherOrm.entries);

      // 6. Transactional Outbox Event
      const outboxEvent = new OutboxOrmEntity();
      outboxEvent.tenantId = tenantId;
      outboxEvent.aggregateType = 'VOUCHER';
      outboxEvent.aggregateId = voucherId;
      outboxEvent.eventType = 'VOUCHER_POSTED';
      outboxEvent.payload = {
        voucherId,
        companyId,
        voucherType: dto.voucherType,
        voucherNumber,
        totalAmount: domainVoucher.getTotalDebit().toFixed4(),
        voucherDate: dto.voucherDate,
      };
      outboxEvent.status = OutboxStatus.PENDING;
      await qr.manager.save(OutboxOrmEntity, outboxEvent);

      // 7. Tamper-evident Audit Log
      const auditLog = new AuditLogOrmEntity();
      auditLog.tenantId = tenantId;
      auditLog.companyId = companyId;
      auditLog.actorId = userId;
      auditLog.entityType = 'VOUCHER';
      auditLog.entityId = voucherId;
      auditLog.action = 'POST';
      auditLog.payloadAfter = outboxEvent.payload;
      auditLog.recordHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(outboxEvent.payload) + Date.now().toString())
        .digest('hex');
      await qr.manager.save(AuditLogOrmEntity, auditLog);

      return domainVoucher;
    });
  }

  async reverseVoucher(
    tenantId: string,
    companyId: string,
    userId: string,
    voucherId: string,
  ): Promise<Voucher> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const existingOrm = await qr.manager.findOne(VoucherOrmEntity, {
        where: { id: voucherId, tenantId, companyId },
        relations: ['entries'],
      });

      if (!existingOrm) {
        throw new NotFoundException(`Voucher ${voucherId} not found`);
      }

      const originalDomain = VoucherMapper.toDomain(existingOrm);

      // Period-lock pre-check: the reversal is dated today, so refuse early with
      // a clear error if today falls in a locked accounting period (the DB
      // trigger would otherwise reject the insert with a raw error).
      const reversalDateIso = new Date().toISOString().split('T')[0];
      const lockedPeriod = await qr.manager
        .createQueryBuilder(AccountingPeriodOrmEntity, 'period')
        .where('period.tenant_id = :tenantId', { tenantId })
        .andWhere('period.company_id = :companyId', { companyId })
        .andWhere('period.is_locked = true')
        .andWhere(':vDate BETWEEN period.start_date AND period.end_date', { vDate: reversalDateIso })
        .getOne();
      if (lockedPeriod) {
        throw new BadRequestException(
          `Cannot reverse voucher on ${reversalDateIso}: accounting period "${lockedPeriod.periodName}" is locked.`,
        );
      }

      const reversalId = crypto.randomUUID();

      const reversalNumber = await this.allocateSequenceNumber(
        qr,
        tenantId,
        companyId,
        originalDomain.voucherType,
        'REVERSAL',
        originalDomain.financialYearId,
      );

      const reversalDomain = originalDomain.createReversal(reversalId, reversalNumber);
      reversalDomain.post();

      // Update original status to REVERSED in database
      existingOrm.status = VoucherStatus.REVERSED;
      await qr.manager.save(VoucherOrmEntity, existingOrm);

      // Save reversal voucher
      const reversalOrm = VoucherMapper.toOrm(reversalDomain);
      reversalOrm.createdBy = userId;
      await qr.manager.save(VoucherOrmEntity, reversalOrm);
      await qr.manager.save(JournalEntryOrmEntity, reversalOrm.entries);

      // Outbox and Audit
      const outbox = new OutboxOrmEntity();
      outbox.tenantId = tenantId;
      outbox.aggregateType = 'VOUCHER';
      outbox.aggregateId = reversalId;
      outbox.eventType = 'VOUCHER_REVERSED';
      outbox.payload = {
        reversalVoucherId: reversalId,
        originalVoucherId: voucherId,
      };
      await qr.manager.save(OutboxOrmEntity, outbox);

      return reversalDomain;
    });
  }

  async listVouchers(
    tenantId: string,
    companyId: string,
    filters?: {
      voucherType?: string;
      status?: string;
      fromDate?: string;
      toDate?: string;
      limit?: number;
    },
  ): Promise<any[]> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const idQb = qr.manager
        .getRepository(VoucherOrmEntity)
        .createQueryBuilder('v')
        .select('v.id', 'id')
        .where('v.tenant_id = :tenantId', { tenantId })
        .andWhere('v.company_id = :companyId', { companyId })
        .orderBy('v.voucher_date', 'DESC')
        .addOrderBy('v.created_at', 'DESC')
        .limit(filters?.limit || 100);

      if (filters?.voucherType) {
        idQb.andWhere('v.voucher_type = :vType', { vType: filters.voucherType });
      }
      if (filters?.status) {
        idQb.andWhere('v.status = :status', { status: filters.status });
      }
      if (filters?.fromDate) {
        idQb.andWhere('v.voucher_date >= :fromDate', { fromDate: filters.fromDate });
      }
      if (filters?.toDate) {
        idQb.andWhere('v.voucher_date <= :toDate', { toDate: filters.toDate });
      }

      const idRows = await idQb.getRawMany();
      const ids = idRows.map((r) => r.id);
      if (ids.length === 0) return [];

      const vouchers = await qr.manager
        .getRepository(VoucherOrmEntity)
        .createQueryBuilder('v')
        .leftJoinAndSelect('v.entries', 'entries')
        .leftJoinAndSelect('entries.ledger', 'ledger')
        .where('v.id IN (:...ids)', { ids })
        .orderBy('v.voucher_date', 'DESC')
        .addOrderBy('v.created_at', 'DESC')
        .getMany();

      return vouchers.map((v) => ({
        id: v.id,
        voucherType: v.voucherType,
        voucherNumber: v.voucherNumber,
        voucherDate: v.voucherDate,
        status: v.status,
        totalAmount: Number(v.totalAmount),
        narration: v.narration,
        reversalOfId: v.reversalOfId,
        entries: (v.entries || []).map((e) => ({
          id: e.id,
          ledgerId: e.ledgerId,
          ledgerName: e.ledger?.name,
          ledgerCode: e.ledger?.code,
          ledger: e.ledger ? { id: e.ledger.id, name: e.ledger.name, code: e.ledger.code } : undefined,
          entryType: e.entryType,
          amount: Number(e.amount),
        })),
      }));
    });
  }

  async getVoucherById(tenantId: string, companyId: string, voucherId: string): Promise<any> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const v = await qr.manager.findOne(VoucherOrmEntity, {
        where: { id: voucherId, tenantId, companyId },
        relations: ['entries', 'entries.ledger', 'branch', 'financialYear'],
      });

      if (!v) {
        throw new NotFoundException(`Voucher ${voucherId} not found.`);
      }

      return {
        id: v.id,
        voucherType: v.voucherType,
        voucherNumber: v.voucherNumber,
        voucherDate: v.voucherDate,
        status: v.status,
        totalAmount: Number(v.totalAmount),
        narration: v.narration,
        branch: v.branch ? { id: v.branch.id, name: v.branch.branchName } : null,
        financialYear: v.financialYear ? { id: v.financialYear.id, name: v.financialYear.name } : null,
        reversalOfId: v.reversalOfId,
        entries: v.entries.map((e) => ({
          id: e.id,
          ledgerId: e.ledgerId,
          ledgerName: e.ledger?.name,
          ledgerCode: e.ledger?.code,
          entryType: e.entryType,
          amount: Number(e.amount),
        })),
      };
    });
  }

  private async allocateSequenceNumber(
    qr: QueryRunner,
    tenantId: string,
    companyId: string,
    voucherType: VoucherType,
    series: string,
    financialYearId: string,
  ): Promise<string> {
    // Pessimistic write lock: SELECT FOR UPDATE
    let seq = await qr.manager
      .createQueryBuilder(VoucherSequenceOrmEntity, 'seq')
      .setLock('pessimistic_write')
      .where('seq.companyId = :companyId', { companyId })
      .andWhere('seq.voucherType = :voucherType', { voucherType })
      .andWhere('seq.series = :series', { series })
      .andWhere('seq.financialYearId = :financialYearId', { financialYearId })
      .getOne();

    if (!seq) {
      seq = new VoucherSequenceOrmEntity();
      seq.tenantId = tenantId;
      seq.companyId = companyId;
      seq.voucherType = voucherType;
      seq.series = series;
      seq.financialYearId = financialYearId;
      seq.lastSequence = 0;
      seq.prefix = `${voucherType.substring(0, 3)}/`;
      seq.padding = 4;
      await qr.manager.save(VoucherSequenceOrmEntity, seq);
    }

    seq.lastSequence = Number(seq.lastSequence) + 1;
    await qr.manager.save(VoucherSequenceOrmEntity, seq);

    const paddedNum = String(seq.lastSequence).padStart(seq.padding, '0');
    return `${seq.prefix}${paddedNum}${seq.suffix}`;
  }
}
