import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import { VoucherService } from '../voucher/voucher.service';
import { InvoiceService } from '../invoice/invoice.service';
import { RecurringScheduleOrmEntity } from '../../infrastructure/persistence/entities/recurring-schedule.orm-entity';
import { PaymentLinkOrmEntity } from '../../infrastructure/persistence/entities/payment-link.orm-entity';
import { GatewaySettlementOrmEntity } from '../../infrastructure/persistence/entities/gateway-settlement.orm-entity';
import { CollectionReminderOrmEntity } from '../../infrastructure/persistence/entities/collection-reminder.orm-entity';
import { InvoiceOrmEntity } from '../../infrastructure/persistence/entities/invoice.orm-entity';
import { PartyOrmEntity } from '../../infrastructure/persistence/entities/party.orm-entity';
import { BranchOrmEntity } from '../../infrastructure/persistence/entities/branch.orm-entity';
import { LedgerOrmEntity } from '../../infrastructure/persistence/entities/ledger.orm-entity';
import { LedgerGroupOrmEntity } from '../../infrastructure/persistence/entities/ledger-group.orm-entity';
import { FinancialYearOrmEntity } from '../../infrastructure/persistence/entities/financial-year.orm-entity';
import {
  RecurringFrequency,
  RecurringScheduleStatus,
  PaymentLinkProvider,
  PaymentLinkStatus,
  GatewaySettlementStatus,
  ReminderChannel,
  ReminderCadence,
  ReminderStatus,
  InvoiceStatus,
  VoucherType,
  EntryType,
  AccountNature,
  ArAgeingSummaryDto,
  PartyAgeingDto,
  RecurringScheduleDto,
  CreateRecurringScheduleDto,
  PaymentLinkDto,
  CreatePaymentLinkDto,
  GatewaySettlementDto,
  ReconcileSettlementDto,
  CollectionReminderDto,
  SendReminderDto,
} from '@platform/shared-types';
import { Decimal } from 'decimal.js';
import * as crypto from 'crypto';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

@Injectable()
export class CollectionsService {
  constructor(
    private readonly uow: UnitOfWorkService,
    private readonly voucherService: VoucherService,
    private readonly invoiceService: InvoiceService,
  ) {}

  // ==========================================
  // 1. AR AGEING ANALYSIS
  // ==========================================

  async getArAgeingSummary(
    tenantId: string,
    companyId: string,
    asOfDateStr?: string,
  ): Promise<ArAgeingSummaryDto> {
    const asOfDate = asOfDateStr ? new Date(asOfDateStr) : new Date();

    return this.uow.executeInTransaction(async (qr) => {
      // Find all issued/open invoices
      const invoices = await qr.manager
        .createQueryBuilder(InvoiceOrmEntity, 'inv')
        .leftJoinAndSelect('inv.party', 'party')
        .where('inv.tenant_id = :tenantId', { tenantId })
        .andWhere('inv.company_id = :companyId', { companyId })
        .andWhere('inv.status = :status', { status: InvoiceStatus.ISSUED })
        .getMany();

      let totalOutstanding = new Decimal(0);
      let current0To30 = new Decimal(0);
      let days31To60 = new Decimal(0);
      let days61To90 = new Decimal(0);
      let days90Plus = new Decimal(0);
      let totalWeightedDays = new Decimal(0);

      const partiesSet = new Set<string>();

      for (const inv of invoices) {
        partiesSet.add(inv.partyId);
        const amount = new Decimal(inv.totalAmount || 0);
        totalOutstanding = totalOutstanding.plus(amount);

        const invDate = new Date(inv.invoiceDate);
        const diffMs = asOfDate.getTime() - invDate.getTime();
        const ageDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

        totalWeightedDays = totalWeightedDays.plus(amount.times(ageDays));

        if (ageDays <= 30) {
          current0To30 = current0To30.plus(amount);
        } else if (ageDays <= 60) {
          days31To60 = days31To60.plus(amount);
        } else if (ageDays <= 90) {
          days61To90 = days61To90.plus(amount);
        } else {
          days90Plus = days90Plus.plus(amount);
        }
      }

      const dso = totalOutstanding.isZero()
        ? 0
        : Math.round(totalWeightedDays.dividedBy(totalOutstanding).toNumber());

      return {
        totalOutstanding: totalOutstanding.toFixed(2),
        current0To30: current0To30.toFixed(2),
        days31To60: days31To60.toFixed(2),
        days61To90: days61To90.toFixed(2),
        days90Plus: days90Plus.toFixed(2),
        dsoDays: dso,
        partiesCount: partiesSet.size,
        asOfDate: asOfDate.toISOString().split('T')[0],
      };
    });
  }

  async getPartyAgeing(
    tenantId: string,
    companyId: string,
    asOfDateStr?: string,
  ): Promise<PartyAgeingDto[]> {
    const asOfDate = asOfDateStr ? new Date(asOfDateStr) : new Date();

    return this.uow.executeInTransaction(async (qr) => {
      const invoices = await qr.manager
        .createQueryBuilder(InvoiceOrmEntity, 'inv')
        .leftJoinAndSelect('inv.party', 'party')
        .where('inv.tenant_id = :tenantId', { tenantId })
        .andWhere('inv.company_id = :companyId', { companyId })
        .andWhere('inv.status = :status', { status: InvoiceStatus.ISSUED })
        .orderBy('inv.invoice_date', 'ASC')
        .getMany();

      const partyMap = new Map<
        string,
        {
          partyId: string;
          partyName: string;
          tradeName?: string;
          gstin?: string;
          phone?: string;
          email?: string;
          totalDue: Decimal;
          current0To30: Decimal;
          days31To60: Decimal;
          days61To90: Decimal;
          days90Plus: Decimal;
          oldestInvoiceDate: string;
          invoicesCount: number;
        }
      >();

      for (const inv of invoices) {
        let entry = partyMap.get(inv.partyId);
        if (!entry) {
          entry = {
            partyId: inv.partyId,
            partyName: inv.party?.name || 'Unknown Party',
            tradeName: inv.party?.tradeName,
            gstin: inv.party?.gstin,
            phone: inv.party?.phone,
            email: inv.party?.email,
            totalDue: new Decimal(0),
            current0To30: new Decimal(0),
            days31To60: new Decimal(0),
            days61To90: new Decimal(0),
            days90Plus: new Decimal(0),
            oldestInvoiceDate: inv.invoiceDate,
            invoicesCount: 0,
          };
          partyMap.set(inv.partyId, entry);
        }

        const amount = new Decimal(inv.totalAmount || 0);
        entry.totalDue = entry.totalDue.plus(amount);
        entry.invoicesCount += 1;

        const invDate = new Date(inv.invoiceDate);
        const diffMs = asOfDate.getTime() - invDate.getTime();
        const ageDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

        if (ageDays <= 30) {
          entry.current0To30 = entry.current0To30.plus(amount);
        } else if (ageDays <= 60) {
          entry.days31To60 = entry.days31To60.plus(amount);
        } else if (ageDays <= 90) {
          entry.days61To90 = entry.days61To90.plus(amount);
        } else {
          entry.days90Plus = entry.days90Plus.plus(amount);
        }
      }

      return Array.from(partyMap.values()).map((p) => ({
        partyId: p.partyId,
        partyName: p.partyName,
        tradeName: p.tradeName,
        gstin: p.gstin,
        phone: p.phone,
        email: p.email,
        totalDue: p.totalDue.toFixed(2),
        current0To30: p.current0To30.toFixed(2),
        days31To60: p.days31To60.toFixed(2),
        days61To90: p.days61To90.toFixed(2),
        days90Plus: p.days90Plus.toFixed(2),
        oldestInvoiceDate: p.oldestInvoiceDate,
        invoicesCount: p.invoicesCount,
      }));
    });
  }

  async getInvoicesAgeing(
    tenantId: string,
    companyId: string,
    asOfDateStr?: string,
  ): Promise<any[]> {
    const asOfDate = asOfDateStr ? new Date(asOfDateStr) : new Date();

    return this.uow.executeInTransaction(async (qr) => {
      const invoices = await qr.manager
        .createQueryBuilder(InvoiceOrmEntity, 'inv')
        .leftJoinAndSelect('inv.party', 'party')
        .where('inv.tenant_id = :tenantId', { tenantId })
        .andWhere('inv.company_id = :companyId', { companyId })
        .andWhere('inv.status = :status', { status: InvoiceStatus.ISSUED })
        .orderBy('inv.invoice_date', 'ASC')
        .getMany();

      return invoices.map((inv) => {
        const dueDate = new Date(inv.dueDate || inv.invoiceDate);
        const diffMs = asOfDate.getTime() - dueDate.getTime();
        const overdueDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        let promiseStatus = 'NO_PROMISE';
        if (inv.promiseToPayDate) {
          const promiseDate = new Date(inv.promiseToPayDate);
          const pDiffDays = Math.floor(
            (asOfDate.getTime() - promiseDate.getTime()) / (1000 * 60 * 60 * 24),
          );
          if (pDiffDays > 0) {
            promiseStatus = 'BROKEN';
          } else if (pDiffDays === 0) {
            promiseStatus = 'DUE_TODAY';
          } else {
            promiseStatus = 'UPCOMING';
          }
        }

        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          documentType: inv.documentType || 'TAX_INVOICE',
          partyId: inv.partyId,
          partyName: inv.party?.name || 'Unknown Customer',
          partyGstin: inv.party?.gstin,
          partyPhone: inv.party?.phone,
          invoiceDate: inv.invoiceDate,
          dueDate: inv.dueDate,
          overdueDays: Math.max(0, overdueDays),
          totalAmount: new Decimal(inv.totalAmount || 0).toFixed(2),
          promiseToPayDate: inv.promiseToPayDate || null,
          promiseToPayNotes: inv.promiseToPayNotes || null,
          promiseStatus,
        };
      });
    });
  }

  async setInvoicePromiseToPay(
    tenantId: string,
    companyId: string,
    invoiceId: string,
    promiseToPayDate?: string,
    promiseToPayNotes?: string,
  ): Promise<any> {
    return this.invoiceService.setPromiseToPay(tenantId, companyId, invoiceId, {
      promiseToPayDate,
      promiseToPayNotes,
    });
  }

  // ==========================================
  // 2. RECURRING INVOICE ENGINE
  // ==========================================

  async listRecurringSchedules(
    tenantId: string,
    companyId: string,
  ): Promise<RecurringScheduleDto[]> {
    return this.uow.executeInTransaction(async (qr) => {
      const list = await qr.manager
        .createQueryBuilder(RecurringScheduleOrmEntity, 'rs')
        .leftJoinAndSelect('rs.party', 'party')
        .where('rs.tenant_id = :tenantId', { tenantId })
        .andWhere('rs.company_id = :companyId', { companyId })
        .orderBy('rs.next_run_date', 'ASC')
        .getMany();

      return list.map((s) => ({
        id: s.id,
        tenantId: s.tenantId,
        companyId: s.companyId,
        branchId: s.branchId,
        partyId: s.partyId,
        partyName: s.party?.name,
        frequency: s.frequency,
        status: s.status,
        nextRunDate: s.nextRunDate,
        lastRunDate: s.lastRunDate || undefined,
        endDate: s.endDate || undefined,
        templatePayload: s.templatePayload,
        totalRuns: s.totalRuns,
        maxRuns: s.maxRuns || undefined,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }));
    });
  }

  async createRecurringSchedule(
    tenantId: string,
    companyId: string,
    dto: CreateRecurringScheduleDto,
  ): Promise<RecurringScheduleDto> {
    return this.uow.executeInTransaction(async (qr) => {
      const party = await qr.manager.findOne(PartyOrmEntity, {
        where: { id: dto.partyId, tenantId, companyId },
      });
      if (!party) {
        throw new NotFoundException(`Party with ID '${dto.partyId}' not found.`);
      }

      const branch = await qr.manager.findOne(BranchOrmEntity, {
        where: { id: dto.branchId, tenantId, companyId },
      });
      if (!branch) {
        throw new NotFoundException(`Branch with ID '${dto.branchId}' not found.`);
      }

      const schedule = qr.manager.create(RecurringScheduleOrmEntity, {
        tenantId,
        companyId,
        branchId: dto.branchId,
        partyId: dto.partyId,
        frequency: dto.frequency,
        status: RecurringScheduleStatus.ACTIVE,
        nextRunDate: dto.startDate,
        endDate: dto.endDate || null,
        maxRuns: dto.maxRuns || null,
        templatePayload: dto.template,
        totalRuns: 0,
      });

      const saved = await qr.manager.save(RecurringScheduleOrmEntity, schedule);
      return {
        id: saved.id,
        tenantId: saved.tenantId,
        companyId: saved.companyId,
        branchId: saved.branchId,
        partyId: saved.partyId,
        partyName: party.name,
        frequency: saved.frequency,
        status: saved.status,
        nextRunDate: saved.nextRunDate,
        lastRunDate: undefined,
        endDate: saved.endDate || undefined,
        templatePayload: saved.templatePayload,
        totalRuns: saved.totalRuns,
        maxRuns: saved.maxRuns || undefined,
        createdAt: saved.createdAt ? saved.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: saved.updatedAt ? saved.updatedAt.toISOString() : new Date().toISOString(),
      };
    });
  }

  async updateRecurringScheduleStatus(
    tenantId: string,
    companyId: string,
    scheduleId: string,
    status: RecurringScheduleStatus,
  ): Promise<RecurringScheduleDto> {
    return this.uow.executeInTransaction(async (qr) => {
      const schedule = await qr.manager.findOne(RecurringScheduleOrmEntity, {
        where: { id: scheduleId, tenantId, companyId },
        relations: ['party'],
      });
      if (!schedule) {
        throw new NotFoundException(`Recurring schedule '${scheduleId}' not found.`);
      }

      schedule.status = status;
      const updated = await qr.manager.save(RecurringScheduleOrmEntity, schedule);

      return {
        id: updated.id,
        tenantId: updated.tenantId,
        companyId: updated.companyId,
        branchId: updated.branchId,
        partyId: updated.partyId,
        partyName: updated.party?.name,
        frequency: updated.frequency,
        status: updated.status,
        nextRunDate: updated.nextRunDate,
        lastRunDate: updated.lastRunDate || undefined,
        endDate: updated.endDate || undefined,
        templatePayload: updated.templatePayload,
        totalRuns: updated.totalRuns,
        maxRuns: updated.maxRuns || undefined,
        createdAt: updated.createdAt ? updated.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: updated.updatedAt ? updated.updatedAt.toISOString() : new Date().toISOString(),
      };
    });
  }

  async triggerRecurringRun(
    tenantId: string,
    companyId: string,
    userId: string,
    scheduleId: string,
  ): Promise<{ schedule: RecurringScheduleDto; invoiceId: string; invoiceNumber: string }> {
    // 1. Fetch schedule and financial year
    const schedule = await this.uow.executeInTransaction(async (qr) => {
      const s = await qr.manager.findOne(RecurringScheduleOrmEntity, {
        where: { id: scheduleId, tenantId, companyId },
        relations: ['party'],
      });
      if (!s) {
        throw new NotFoundException(`Recurring schedule '${scheduleId}' not found.`);
      }
      return s;
    });

    if (schedule.status !== RecurringScheduleStatus.ACTIVE) {
      throw new BadRequestException(`Cannot run schedule '${scheduleId}' in status ${schedule.status}.`);
    }

    const runDate = schedule.nextRunDate;
    const dueDateObj = new Date(runDate);
    dueDateObj.setDate(dueDateObj.getDate() + 30);
    const dueDate = dueDateObj.toISOString().split('T')[0];

    const fy = await this.uow.executeInTransaction(async (qr) => {
      return qr.manager
        .createQueryBuilder(FinancialYearOrmEntity, 'fy')
        .where('fy.tenant_id = :tenantId', { tenantId })
        .andWhere('fy.company_id = :companyId', { companyId })
        .andWhere(':runDate BETWEEN fy.start_date AND fy.end_date', { runDate })
        .getOne();
    });

    if (!fy) {
      throw new BadRequestException(`No active Financial Year covering date ${runDate}.`);
    }

    // 2. Create invoice using InvoiceService
    const createdInvoice = await this.invoiceService.createInvoice(
      tenantId,
      companyId,
      userId,
      {
        branchId: schedule.branchId,
        financialYearId: fy.id,
        partyId: schedule.partyId,
        invoiceDate: runDate,
        dueDate,
        placeOfSupplyStateCode: schedule.templatePayload.placeOfSupplyStateCode,
        notes: schedule.templatePayload.notes || 'Auto-generated recurring invoice',
        termsAndConditions: schedule.templatePayload.termsAndConditions,
        items: schedule.templatePayload.items.map((item) => ({
          itemId: item.itemId,
          description: item.description,
          hsnSacCode: item.hsnSacCode,
          quantity: item.quantity,
          uom: item.uom || 'NOS',
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent || 0,
          gstRatePercent: item.gstRatePercent || 18,
        })),
      },
    );

    // 3. Advance next_run_date and increment run count
    const nextDate = this.calculateNextRunDate(schedule.nextRunDate, schedule.frequency);
    const newTotalRuns = schedule.totalRuns + 1;
    let nextStatus: RecurringScheduleStatus = schedule.status;

    if (schedule.maxRuns && newTotalRuns >= schedule.maxRuns) {
      nextStatus = RecurringScheduleStatus.COMPLETED;
    } else if (schedule.endDate && nextDate > schedule.endDate) {
      nextStatus = RecurringScheduleStatus.COMPLETED;
    }

    const updatedSchedule = await this.uow.executeInTransaction(async (qr) => {
      const s = await qr.manager.findOne(RecurringScheduleOrmEntity, {
        where: { id: scheduleId, tenantId, companyId },
        relations: ['party'],
      });
      if (!s) throw new NotFoundException('Schedule not found');

      s.lastRunDate = runDate;
      s.nextRunDate = nextDate;
      s.totalRuns = newTotalRuns;
      s.status = nextStatus;
      return qr.manager.save(RecurringScheduleOrmEntity, s);
    });

    return {
      schedule: {
        id: updatedSchedule.id,
        tenantId: updatedSchedule.tenantId,
        companyId: updatedSchedule.companyId,
        branchId: updatedSchedule.branchId,
        partyId: updatedSchedule.partyId,
        partyName: updatedSchedule.party?.name,
        frequency: updatedSchedule.frequency,
        status: updatedSchedule.status,
        nextRunDate: updatedSchedule.nextRunDate,
        lastRunDate: updatedSchedule.lastRunDate || undefined,
        endDate: updatedSchedule.endDate || undefined,
        templatePayload: updatedSchedule.templatePayload,
        totalRuns: updatedSchedule.totalRuns,
        maxRuns: updatedSchedule.maxRuns || undefined,
        createdAt: updatedSchedule.createdAt ? updatedSchedule.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: updatedSchedule.updatedAt ? updatedSchedule.updatedAt.toISOString() : new Date().toISOString(),
      },
      invoiceId: createdInvoice.id,
      invoiceNumber: createdInvoice.invoiceNumber,
    };
  }

  private calculateNextRunDate(currentDateStr: string, frequency: RecurringFrequency): string {
    const d = new Date(currentDateStr);
    switch (frequency) {
      case RecurringFrequency.WEEKLY:
        d.setDate(d.getDate() + 7);
        break;
      case RecurringFrequency.MONTHLY:
        d.setMonth(d.getMonth() + 1);
        break;
      case RecurringFrequency.QUARTERLY:
        d.setMonth(d.getMonth() + 3);
        break;
      case RecurringFrequency.ANNUAL:
        d.setFullYear(d.getFullYear() + 1);
        break;
    }
    return d.toISOString().split('T')[0];
  }

  // ==========================================
  // 3. PAYMENT LINKS
  // ==========================================

  async listPaymentLinks(
    tenantId: string,
    companyId: string,
  ): Promise<PaymentLinkDto[]> {
    return this.uow.executeInTransaction(async (qr) => {
      const links = await qr.manager
        .createQueryBuilder(PaymentLinkOrmEntity, 'pl')
        .leftJoinAndSelect('pl.invoice', 'inv')
        .leftJoinAndSelect('pl.party', 'party')
        .where('pl.tenant_id = :tenantId', { tenantId })
        .andWhere('pl.company_id = :companyId', { companyId })
        .orderBy('pl.created_at', 'DESC')
        .getMany();

      return links.map((l) => ({
        id: l.id,
        tenantId: l.tenantId,
        companyId: l.companyId,
        invoiceId: l.invoiceId,
        partyId: l.partyId,
        partyName: l.party?.name,
        invoiceNumber: l.invoice?.invoiceNumber,
        provider: l.provider,
        linkId: l.linkId,
        shortUrl: l.shortUrl,
        amount: l.amount,
        currency: l.currency,
        status: l.status,
        paidAt: l.paidAt?.toISOString(),
        expiresAt: l.expiresAt?.toISOString(),
        createdAt: l.createdAt.toISOString(),
      }));
    });
  }

  async createPaymentLink(
    tenantId: string,
    companyId: string,
    dto: CreatePaymentLinkDto,
  ): Promise<PaymentLinkDto> {
    return this.uow.executeInTransaction(async (qr) => {
      const invoice = await qr.manager.findOne(InvoiceOrmEntity, {
        where: { id: dto.invoiceId, tenantId, companyId },
        relations: ['party'],
      });
      if (!invoice) {
        throw new NotFoundException(`Invoice '${dto.invoiceId}' not found.`);
      }

      const linkToken = crypto.randomBytes(6).toString('hex');
      const provider = dto.provider || PaymentLinkProvider.RAZORPAY;
      const linkId = `plink_${provider.toLowerCase()}_${linkToken}`;
      const shortUrl = `https://pay.platform.in/pl/${linkToken}`;

      const expiresDays = dto.expiresInDays || 30;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresDays);

      const link = qr.manager.create(PaymentLinkOrmEntity, {
        tenantId,
        companyId,
        invoiceId: invoice.id,
        partyId: invoice.partyId,
        provider,
        linkId,
        shortUrl,
        amount: invoice.totalAmount.toString(),
        currency: 'INR',
        status: PaymentLinkStatus.CREATED,
        expiresAt,
      });

      const saved = await qr.manager.save(PaymentLinkOrmEntity, link);

      return {
        id: saved.id,
        tenantId: saved.tenantId,
        companyId: saved.companyId,
        invoiceId: saved.invoiceId,
        partyId: saved.partyId,
        partyName: invoice.party?.name,
        invoiceNumber: invoice.invoiceNumber,
        provider: saved.provider,
        linkId: saved.linkId,
        shortUrl: saved.shortUrl,
        amount: saved.amount,
        currency: saved.currency,
        status: saved.status,
        paidAt: undefined,
        expiresAt: saved.expiresAt?.toISOString(),
        createdAt: saved.createdAt ? saved.createdAt.toISOString() : new Date().toISOString(),
      };
    });
  }


  private toPaymentLinkDto(link: PaymentLinkOrmEntity): PaymentLinkDto {
    return {
      id: link.id,
      tenantId: link.tenantId,
      companyId: link.companyId,
      invoiceId: link.invoiceId,
      partyId: link.partyId,
      partyName: link.party?.name,
      invoiceNumber: link.invoice?.invoiceNumber,
      provider: link.provider,
      linkId: link.linkId,
      shortUrl: link.shortUrl,
      amount: link.amount,
      currency: link.currency,
      status: link.status,
      paidAt: link.paidAt ? link.paidAt.toISOString() : undefined,
      expiresAt: link.expiresAt?.toISOString(),
      createdAt: link.createdAt.toISOString(),
    } as PaymentLinkDto;
  }

  async simulatePaymentCallback(
    tenantId: string,
    companyId: string,
    linkId: string,
    callback?: { signature?: string; amountPaid?: string | number; providerRef?: string },
  ): Promise<PaymentLinkDto> {
    return this.uow.executeInTransaction(async (qr) => {
      const link = await qr.manager.findOne(PaymentLinkOrmEntity, {
        where: { linkId, tenantId, companyId },
        relations: ['invoice', 'party'],
      });
      if (!link) {
        throw new NotFoundException(`Payment link '${linkId}' not found.`);
      }

      // SECURITY: when a gateway webhook secret is configured, require and verify
      // an HMAC-SHA256 signature over "<linkId>|<amountPaid>". This prevents a
      // caller from spoofing a "paid" callback. (Without a configured secret the
      // endpoint remains an authenticated internal simulation for testing.)
      const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;
      if (webhookSecret) {
        const expected = crypto
          .createHmac('sha256', webhookSecret)
          .update(`${linkId}|${callback?.amountPaid ?? ''}`)
          .digest('hex');
        const provided = callback?.signature || '';
        const ok =
          provided.length === expected.length &&
          crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
        if (!ok) {
          throw new BadRequestException('Invalid payment callback signature.');
        }
      }

      // Expiry guard.
      if (link.expiresAt && new Date() > new Date(link.expiresAt)) {
        throw new BadRequestException('Payment link has expired.');
      }

      // Idempotency: a link already marked PAID is returned unchanged so repeated
      // webhook deliveries do not double-settle.
      if (link.status === PaymentLinkStatus.PAID) {
        return this.toPaymentLinkDto(link);
      }

      link.status = PaymentLinkStatus.PAID;
      link.paidAt = new Date();
      await qr.manager.save(PaymentLinkOrmEntity, link);

      // Also mark the invoice as PAID
      if (link.invoice) {
        link.invoice.status = InvoiceStatus.PAID;
        await qr.manager.save(InvoiceOrmEntity, link.invoice);
      }

      return {
        id: link.id,
        tenantId: link.tenantId,
        companyId: link.companyId,
        invoiceId: link.invoiceId,
        partyId: link.partyId,
        partyName: link.party?.name,
        invoiceNumber: link.invoice?.invoiceNumber,
        provider: link.provider,
        linkId: link.linkId,
        shortUrl: link.shortUrl,
        amount: link.amount,
        currency: link.currency,
        status: link.status,
        paidAt: link.paidAt.toISOString(),
        expiresAt: link.expiresAt?.toISOString(),
        createdAt: link.createdAt.toISOString(),
      };
    });
  }

  // ==========================================
  // 4. GATEWAY SETTLEMENT RECONCILIATION
  // ==========================================

  async listSettlements(
    tenantId: string,
    companyId: string,
  ): Promise<GatewaySettlementDto[]> {
    return this.uow.executeInTransaction(async (qr) => {
      const settlements = await qr.manager.find(GatewaySettlementOrmEntity, {
        where: { tenantId, companyId },
        order: { settlementDate: 'DESC' },
      });

      return settlements.map((s) => ({
        id: s.id,
        tenantId: s.tenantId,
        companyId: s.companyId,
        settlementId: s.settlementId,
        provider: s.provider,
        settlementDate: s.settlementDate,
        grossAmount: s.grossAmount,
        feeAmount: s.feeAmount,
        taxOnFee: s.taxOnFee,
        netCreditAmount: s.netCreditAmount,
        bankReference: s.bankReference || undefined,
        voucherId: s.voucherId || undefined,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
      }));
    });
  }

  async reconcileSettlement(
    tenantId: string,
    companyId: string,
    userId: string,
    dto: ReconcileSettlementDto,
  ): Promise<GatewaySettlementDto> {
    const gross = new Decimal(dto.grossAmount);
    const fee = new Decimal(dto.feeAmount);
    const tax = new Decimal(dto.taxOnFee);
    const net = new Decimal(dto.netCreditAmount);

    // Validate equation: Gross - Fee - Tax == Net
    const calculatedNet = gross.minus(fee).minus(tax);
    if (!calculatedNet.equals(net)) {
      throw new BadRequestException(
        `Settlement math mismatch: Gross (${gross}) - Fee (${fee}) - Tax (${tax}) = ${calculatedNet}, does not match Net Credit (${net}).`,
      );
    }

    // Ensure double-entry ledgers exist
    const { bankLedger, feeLedger, taxLedger, clearingLedger } =
      await this.ensureSettlementLedgers(tenantId, companyId, dto.bankLedgerId);

    const { branch, fy } = await this.uow.executeInTransaction(async (qr) => {
      const b = await qr.manager.findOne(BranchOrmEntity, {
        where: { tenantId, companyId },
      });
      if (!b) {
        throw new BadRequestException('No branch found for company.');
      }
      const f = await qr.manager
        .createQueryBuilder(FinancialYearOrmEntity, 'fy')
        .where('fy.tenant_id = :tenantId', { tenantId })
        .andWhere('fy.company_id = :companyId', { companyId })
        .andWhere(':sDate BETWEEN fy.start_date AND fy.end_date', { sDate: dto.settlementDate })
        .getOne();
      if (!f) {
        throw new BadRequestException(`No active Financial Year covering settlement date ${dto.settlementDate}.`);
      }
      return { branch: b, fy: f };
    });

    // Create and post canonical double-entry Contra / Settlement Voucher
    // Debit: Bank Account (Net Credit)
    // Debit: Payment Gateway Charges (Fee)
    // Debit: Input GST on Charges (Tax)
    // Credit: Gateway Clearing (Gross)
    const voucher = await this.voucherService.createAndPostVoucher(
      tenantId,
      companyId,
      userId,
      {
        branchId: branch.id,
        financialYearId: fy.id,
        voucherType: VoucherType.CONTRA,
        voucherDate: dto.settlementDate,
        series: 'SETTLE',
        narration: `Payment gateway settlement ${dto.settlementId} via ${dto.provider}. Net credit ref: ${dto.bankReference}`,
        entries: [
          {
            ledgerId: bankLedger.id,
            entryType: EntryType.DEBIT,
            amount: net.toFixed(4),
            narration: `Bank net credit via ${dto.provider}`,
          },
          {
            ledgerId: feeLedger.id,
            entryType: EntryType.DEBIT,
            amount: fee.toFixed(4),
            narration: 'Gateway processing fee charges',
          },
          {
            ledgerId: taxLedger.id,
            entryType: EntryType.DEBIT,
            amount: tax.toFixed(4),
            narration: 'Input GST on gateway fee (18%)',
          },
          {
            ledgerId: clearingLedger.id,
            entryType: EntryType.CREDIT,
            amount: gross.toFixed(4),
            narration: `Gateway gross collection clearing for ${dto.settlementId}`,
          },
        ],
      },
      `settlement_${dto.settlementId}`,
    );

    // Persist GatewaySettlement record
    return this.uow.executeInTransaction(async (qr) => {
      const settlement = qr.manager.create(GatewaySettlementOrmEntity, {
        tenantId,
        companyId,
        settlementId: dto.settlementId,
        provider: dto.provider,
        settlementDate: dto.settlementDate,
        grossAmount: gross.toFixed(4),
        feeAmount: fee.toFixed(4),
        taxOnFee: tax.toFixed(4),
        netCreditAmount: net.toFixed(4),
        bankReference: dto.bankReference,
        voucherId: voucher.id,
        status: GatewaySettlementStatus.RECONCILED,
      });

      const saved = await qr.manager.save(GatewaySettlementOrmEntity, settlement);

      return {
        id: saved.id,
        tenantId: saved.tenantId,
        companyId: saved.companyId,
        settlementId: saved.settlementId,
        provider: saved.provider,
        settlementDate: saved.settlementDate,
        grossAmount: saved.grossAmount,
        feeAmount: saved.feeAmount,
        taxOnFee: saved.taxOnFee,
        netCreditAmount: saved.netCreditAmount,
        bankReference: saved.bankReference || undefined,
        voucherId: saved.voucherId || undefined,
        status: saved.status,
        createdAt: saved.createdAt ? saved.createdAt.toISOString() : new Date().toISOString(),
      };
    });
  }

  private async ensureSettlementLedgers(
    tenantId: string,
    companyId: string,
    preferredBankLedgerId?: string,
  ): Promise<{
    bankLedger: LedgerOrmEntity;
    feeLedger: LedgerOrmEntity;
    taxLedger: LedgerOrmEntity;
    clearingLedger: LedgerOrmEntity;
  }> {
    return this.uow.executeInTransaction(async (qr) => {
      // 1. Bank ledger
      let bankLedger: LedgerOrmEntity | null = null;
      if (preferredBankLedgerId) {
        bankLedger = await qr.manager.findOne(LedgerOrmEntity, {
          where: { id: preferredBankLedgerId, tenantId, companyId },
        });
      }
      if (!bankLedger) {
        bankLedger = await qr.manager.findOne(LedgerOrmEntity, {
          where: { tenantId, companyId, isBankOrCash: true },
        });
      }
      if (!bankLedger) {
        throw new BadRequestException('No bank account ledger configured for this company.');
      }

      // 2. Gateway fee ledger
      let feeLedger = await qr.manager.findOne(LedgerOrmEntity, {
        where: { tenantId, companyId, code: 'LED-PG-CHARGES' },
      });
      if (!feeLedger) {
        let expenseGroup = await qr.manager.findOne(LedgerGroupOrmEntity, {
          where: { tenantId, companyId, nature: AccountNature.EXPENSE },
        });
        if (!expenseGroup) {
          expenseGroup = await qr.manager.save(
            LedgerGroupOrmEntity,
            qr.manager.create(LedgerGroupOrmEntity, {
              tenantId,
              companyId,
              code: 'GRP-IND-EXP',
              name: 'Indirect Expenses',
              nature: AccountNature.EXPENSE,
            }),
          );
        }
        feeLedger = await qr.manager.save(
          LedgerOrmEntity,
          qr.manager.create(LedgerOrmEntity, {
            tenantId,
            companyId,
            groupId: expenseGroup.id,
            code: 'LED-PG-CHARGES',
            name: 'Payment Gateway Processing Charges',
            openingBalance: '0',
            currentBalance: '0',
            isBankOrCash: false,
          }),
        );
      }

      // 3. Tax on fee ledger (Input GST)
      let taxLedger = await qr.manager.findOne(LedgerOrmEntity, {
        where: { tenantId, companyId, code: 'LED-INPUT-GST-SERVICES' },
      });
      if (!taxLedger) {
        let assetGroup = await qr.manager.findOne(LedgerGroupOrmEntity, {
          where: { tenantId, companyId, nature: AccountNature.ASSET },
        });
        if (!assetGroup) {
          assetGroup = await qr.manager.save(
            LedgerGroupOrmEntity,
            qr.manager.create(LedgerGroupOrmEntity, {
              tenantId,
              companyId,
              code: 'GRP-CURR-ASSET',
              name: 'Current Assets',
              nature: AccountNature.ASSET,
            }),
          );
        }
        taxLedger = await qr.manager.save(
          LedgerOrmEntity,
          qr.manager.create(LedgerOrmEntity, {
            tenantId,
            companyId,
            groupId: assetGroup.id,
            code: 'LED-INPUT-GST-SERVICES',
            name: 'Input GST on Banking & Gateway Charges',
            openingBalance: '0',
            currentBalance: '0',
            isBankOrCash: false,
          }),
        );
      }

      // 4. Gateway clearing ledger
      let clearingLedger = await qr.manager.findOne(LedgerOrmEntity, {
        where: { tenantId, companyId, code: 'LED-PG-CLEARING' },
      });
      if (!clearingLedger) {
        let assetGroup = await qr.manager.findOne(LedgerGroupOrmEntity, {
          where: { tenantId, companyId, nature: AccountNature.ASSET },
        });
        if (!assetGroup) {
          assetGroup = await qr.manager.save(
            LedgerGroupOrmEntity,
            qr.manager.create(LedgerGroupOrmEntity, {
              tenantId,
              companyId,
              code: 'GRP-CURR-ASSET',
              name: 'Current Assets',
              nature: AccountNature.ASSET,
            }),
          );
        }
        clearingLedger = await qr.manager.save(
          LedgerOrmEntity,
          qr.manager.create(LedgerOrmEntity, {
            tenantId,
            companyId,
            groupId: assetGroup.id,
            code: 'LED-PG-CLEARING',
            name: 'Payment Gateway Clearing Account',
            openingBalance: '0',
            currentBalance: '0',
            isBankOrCash: false,
          }),
        );
      }

      return { bankLedger, feeLedger, taxLedger, clearingLedger };
    });
  }

  // ==========================================
  // 5. COLLECTION REMINDERS
  // ==========================================

  async listReminders(
    tenantId: string,
    companyId: string,
  ): Promise<CollectionReminderDto[]> {
    return this.uow.executeInTransaction(async (qr) => {
      const reminders = await qr.manager
        .createQueryBuilder(CollectionReminderOrmEntity, 'rem')
        .leftJoinAndSelect('rem.invoice', 'inv')
        .leftJoinAndSelect('rem.party', 'party')
        .where('rem.tenant_id = :tenantId', { tenantId })
        .andWhere('rem.company_id = :companyId', { companyId })
        .orderBy('rem.sent_at', 'DESC')
        .getMany();

      return reminders.map((r) => ({
        id: r.id,
        tenantId: r.tenantId,
        companyId: r.companyId,
        invoiceId: r.invoiceId,
        partyId: r.partyId,
        invoiceNumber: r.invoice?.invoiceNumber,
        partyName: r.party?.name,
        channel: r.channel,
        cadence: r.cadence,
        recipient: r.recipient,
        messageBody: r.messageBody,
        status: r.status,
        sentAt: r.sentAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
      }));
    });
  }

  async sendReminder(
    tenantId: string,
    companyId: string,
    dto: SendReminderDto,
  ): Promise<CollectionReminderDto> {
    return this.uow.executeInTransaction(async (qr) => {
      const invoice = await qr.manager.findOne(InvoiceOrmEntity, {
        where: { id: dto.invoiceId, tenantId, companyId },
        relations: ['party'],
      });
      if (!invoice) {
        throw new NotFoundException(`Invoice '${dto.invoiceId}' not found.`);
      }

      const recipient =
        dto.channel === ReminderChannel.WHATSAPP || dto.channel === ReminderChannel.SMS
          ? invoice.party?.phone || '+91 98765 43210'
          : invoice.party?.email || 'accounts@party.com';

      const formattedAmount = Number(invoice.totalAmount).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
      });

      const messageBody =
        dto.customMessage ||
        `Dear ${invoice.party?.name || 'Customer'},\nThis is a gentle payment reminder for invoice ${invoice.invoiceNumber} dated ${invoice.invoiceDate} for ${formattedAmount}, due on ${invoice.dueDate}.\nPlease arrange payment at your earliest convenience.`;

      const reminder = qr.manager.create(CollectionReminderOrmEntity, {
        tenantId,
        companyId,
        invoiceId: invoice.id,
        partyId: invoice.partyId,
        channel: dto.channel,
        cadence: dto.cadence,
        recipient,
        messageBody,
        status: ReminderStatus.SENT,
        sentAt: new Date(),
      });

      const saved = await qr.manager.save(CollectionReminderOrmEntity, reminder);

      return {
        id: saved.id,
        tenantId: saved.tenantId,
        companyId: saved.companyId,
        invoiceId: saved.invoiceId,
        partyId: saved.partyId,
        invoiceNumber: invoice.invoiceNumber,
        partyName: invoice.party?.name,
        channel: saved.channel,
        cadence: saved.cadence,
        recipient: saved.recipient,
        messageBody: saved.messageBody,
        status: saved.status,
        sentAt: saved.sentAt ? saved.sentAt.toISOString() : new Date().toISOString(),
        createdAt: saved.createdAt ? saved.createdAt.toISOString() : new Date().toISOString(),
      };
    });
  }
}
