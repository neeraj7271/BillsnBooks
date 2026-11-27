import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import { InvoiceService } from '../invoice/invoice.service';
import { PracticeTimeEntryOrmEntity } from '../../infrastructure/persistence/entities/practice-time-entry.orm-entity';
import {
  PracticeBillOrmEntity,
  PracticeBillLineOrmEntity,
} from '../../infrastructure/persistence/entities/practice-bill.orm-entity';
import { PracticeJobOrmEntity } from '../../infrastructure/persistence/entities/practice-job.orm-entity';
import { FirmClientOrmEntity } from '../../infrastructure/persistence/entities/firm-client.orm-entity';
import { ClientServiceOrmEntity } from '../../infrastructure/persistence/entities/client-service.orm-entity';
import { UserOrmEntity } from '../../infrastructure/persistence/entities/user.orm-entity';
import { PartyOrmEntity } from '../../infrastructure/persistence/entities/party.orm-entity';
import { BranchOrmEntity } from '../../infrastructure/persistence/entities/branch.orm-entity';
import { FinancialYearOrmEntity } from '../../infrastructure/persistence/entities/financial-year.orm-entity';
import { InvoiceOrmEntity } from '../../infrastructure/persistence/entities/invoice.orm-entity';
import { PartyType, PartyRegistrationType } from '@platform/shared-types';

@Injectable()
export class PracticeBillingService {
  constructor(
    private readonly uow: UnitOfWorkService,
    private readonly invoiceService: InvoiceService,
  ) {}

  // ==================== TIME TRACKING & TIMESHEETS ====================

  async logTimeEntry(
    tenantId: string,
    userId: string,
    dto: {
      clientId: string;
      jobId?: string | null;
      serviceTypeId?: string | null;
      entryDate?: string;
      minutes: number;
      isBillable?: boolean;
      hourlyRate?: number;
      notes?: string | null;
    },
  ) {
    if (!dto.clientId) throw new BadRequestException('clientId is required');
    if (!dto.minutes || dto.minutes <= 0) throw new BadRequestException('minutes must be > 0');

    return this.uow.executeInTransaction(async (qr) => {
      let serviceTypeId = dto.serviceTypeId || null;
      if (dto.jobId && !serviceTypeId) {
        const job = await qr.manager.findOne(PracticeJobOrmEntity, {
          where: { id: dto.jobId, tenantId },
        });
        if (job) serviceTypeId = job.serviceTypeId || null;
      }

      const repo = qr.manager.getRepository(PracticeTimeEntryOrmEntity);
      const entry = repo.create({
        tenantId,
        clientId: dto.clientId,
        jobId: dto.jobId || null,
        serviceTypeId,
        userId,
        entryDate: dto.entryDate || new Date().toISOString().slice(0, 10),
        minutes: Math.round(dto.minutes),
        isBillable: dto.isBillable ?? true,
        hourlyRate: dto.hourlyRate ?? 1500,
        approvalStatus: 'DRAFT',
        notes: dto.notes || null,
      });
      return await repo.save(entry);
    });
  }

  async listTimeEntries(
    tenantId: string,
    filters?: { jobId?: string; clientId?: string; userId?: string; unbilledOnly?: boolean },
  ) {
    return this.uow.executeInTransaction(async (qr) => {
      const qb = qr.manager
        .createQueryBuilder(PracticeTimeEntryOrmEntity, 't')
        .leftJoinAndSelect('t.client', 'client')
        .leftJoinAndSelect('client.company', 'company')
        .leftJoinAndSelect('t.job', 'job')
        .where('t.tenant_id = :tenantId', { tenantId })
        .orderBy('t.entry_date', 'DESC')
        .addOrderBy('t.created_at', 'DESC');

      if (filters?.jobId) qb.andWhere('t.job_id = :jobId', { jobId: filters.jobId });
      if (filters?.clientId) qb.andWhere('t.client_id = :clientId', { clientId: filters.clientId });
      if (filters?.userId) qb.andWhere('t.user_id = :userId', { userId: filters.userId });
      if (filters?.unbilledOnly) qb.andWhere('t.bill_id IS NULL AND t.is_write_off = false');

      const [entries, users] = await Promise.all([
        qb.getMany(),
        qr.manager.find(UserOrmEntity, { where: { tenantId } }),
      ]);
      const userMap = new Map(
        users.map((u) => [u.id, `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email]),
      );

      return entries.map((e) => ({
        ...e,
        hourlyRate: Number(e.hourlyRate),
        hours: Number((e.minutes / 60).toFixed(2)),
        amount: Number(((e.minutes / 60) * Number(e.hourlyRate)).toFixed(2)),
        staffName: userMap.get(e.userId) || 'Staff',
        clientName: e.client?.company?.legalName || 'Client',
        jobTitle: e.job?.title || null,
      }));
    });
  }

  async updateTimesheetApproval(
    tenantId: string,
    entryIds: string[],
    approvalStatus: 'SUBMITTED' | 'APPROVED',
  ) {
    return this.uow.executeInTransaction(async (qr) => {
      for (const id of entryIds) {
        await qr.manager.update(
          PracticeTimeEntryOrmEntity,
          { id, tenantId },
          { approvalStatus },
        );
      }
      return { updated: entryIds.length, approvalStatus };
    });
  }

  async getUnbilledWip(tenantId: string) {
    return this.uow.executeInTransaction(async (qr) => {
      const [entries, clients, clientServices] = await Promise.all([
        qr.manager.find(PracticeTimeEntryOrmEntity, {
          where: { tenantId, isBillable: true, isWriteOff: false },
        }),
        qr.manager.find(FirmClientOrmEntity, { where: { tenantId }, relations: ['company'] }),
        qr.manager.find(ClientServiceOrmEntity, {
          where: { tenantId, isActive: true },
          relations: ['serviceType'],
        }),
      ]);

      const unbilled = entries.filter((e) => !e.billId);
      return clients.map((c) => {
        const cTime = unbilled.filter((e) => e.clientId === c.id);
        const totalMinutes = cTime.reduce((s, e) => s + e.minutes, 0);
        const timeValue = cTime.reduce((s, e) => s + (e.minutes / 60) * Number(e.hourlyRate || 0), 0);
        const cSvcs = clientServices.filter((cs) => cs.clientId === c.id);
        const retainerFee = cSvcs
          .filter((cs) => cs.feeAmount && Number(cs.feeAmount) > 0)
          .reduce((s, cs) => s + Number(cs.feeAmount || 0), 0);

        return {
          clientId: c.id,
          clientName: c.company?.legalName || c.primaryContactName,
          clientCode: c.clientCode,
          unbilledMinutes: totalMinutes,
          unbilledHours: Number((totalMinutes / 60).toFixed(2)),
          unbilledTimeValue: Number(timeValue.toFixed(2)),
          retainerFeeValue: Number(retainerFee.toFixed(2)),
          entryIds: cTime.map((e) => e.id),
        };
      });
    });
  }

  // ==================== PRACTICE BILLING -> GST INVOICE ====================

  async listBills(tenantId: string, clientId?: string) {
    return this.uow.executeInTransaction(async (qr) => {
      const where: any = { tenantId };
      if (clientId) where.clientId = clientId;
      const bills = await qr.manager.find(PracticeBillOrmEntity, {
        where,
        relations: ['client', 'client.company', 'lines'],
        order: { createdAt: 'DESC' },
      });
      return bills.map((b) => ({
        ...b,
        subtotal: Number(b.subtotal),
        gstAmount: Number(b.gstAmount),
        totalAmount: Number(b.totalAmount),
        retainerApplied: Number(b.retainerApplied),
        clientName: b.client?.company?.legalName || 'Client',
      }));
    });
  }

  async createBillFromWip(
    tenantId: string,
    userId: string,
    dto: {
      clientId: string;
      timeEntryIds?: string[];
      includeRetainers?: boolean;
      retainerDrawdown?: number;
      writeOffAmount?: number;
      notes?: string;
    },
  ) {
    return this.uow.executeInTransaction(async (qr) => {
      const client = await qr.manager.findOne(FirmClientOrmEntity, {
        where: { id: dto.clientId, tenantId },
        relations: ['company'],
      });
      if (!client) throw new NotFoundException('Client not found');

      const linesToSave: Partial<PracticeBillLineOrmEntity>[] = [];

      // 1. Time entries
      const timeEntries = await qr.manager.find(PracticeTimeEntryOrmEntity, {
        where: { tenantId, clientId: client.id, isBillable: true, isWriteOff: false },
      });
      const selectedEntries = dto.timeEntryIds?.length
        ? timeEntries.filter((e) => !e.billId && dto.timeEntryIds!.includes(e.id))
        : timeEntries.filter((e) => !e.billId);

      for (const e of selectedEntries) {
        const hrs = Number((e.minutes / 60).toFixed(2));
        const rate = Number(e.hourlyRate || 1500);
        const amt = Number((hrs * rate).toFixed(2));
        linesToSave.push({
          tenantId,
          lineType: 'TIME',
          description: e.notes || `Professional Time (${hrs} hrs)`,
          serviceTypeId: e.serviceTypeId || null,
          timeEntryId: e.id,
          hours: hrs,
          rate,
          amount: amt,
          gstRate: 18,
        });
      }

      // 2. Retainer / Recurring / Fixed Client Services
      if (dto.includeRetainers !== false) {
        const cSvcs = await qr.manager.find(ClientServiceOrmEntity, {
          where: { tenantId, clientId: client.id, isActive: true },
          relations: ['serviceType'],
        });
        for (const cs of cSvcs) {
          if (cs.feeAmount && Number(cs.feeAmount) > 0) {
            linesToSave.push({
              tenantId,
              lineType: cs.feeType === 'fixed' ? 'FIXED_FEE' : 'RETAINER',
              description: `${cs.serviceType?.name || 'Retainer Service'} (${cs.feeType})`,
              serviceTypeId: cs.serviceTypeId,
              clientServiceId: cs.id,
              hours: 1,
              rate: Number(cs.feeAmount),
              amount: Number(cs.feeAmount),
              gstRate: 18,
            });
          }
        }
      }

      if (linesToSave.length === 0) {
        throw new BadRequestException('No unbilled time entries or active fee schedules found for this client.');
      }

      if (dto.writeOffAmount && dto.writeOffAmount > 0) {
        linesToSave.push({
          tenantId,
          lineType: 'WRITE_OFF',
          description: 'Fee Write-off / Adjustment',
          hours: 1,
          rate: -Math.abs(dto.writeOffAmount),
          amount: -Math.abs(dto.writeOffAmount),
          gstRate: 18,
          isWrittenOff: true,
        });
      }

      const subtotal = Math.max(
        0,
        linesToSave.reduce((s, l) => s + Number(l.amount || 0), 0) - Number(dto.retainerDrawdown || 0),
      );
      const gstAmount = Number(((subtotal * 18) / 100).toFixed(2));
      const totalAmount = Number((subtotal + gstAmount).toFixed(2));

      const billRepo = qr.manager.getRepository(PracticeBillOrmEntity);
      const lineRepo = qr.manager.getRepository(PracticeBillLineOrmEntity);
      const billDate = new Date().toISOString().slice(0, 10);
      const dueDate = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);

      const savedBill = await billRepo.save(
        billRepo.create({
          tenantId,
          clientId: client.id,
          billNumber: `PB-${Date.now().toString().slice(-6)}`,
          billDate,
          dueDate,
          status: 'DRAFT',
          subtotal,
          gstAmount,
          totalAmount,
          retainerApplied: Number(dto.retainerDrawdown || 0),
          notes: dto.notes || null,
          createdByUserId: userId,
        }),
      );

      for (const l of linesToSave) {
        await lineRepo.save(lineRepo.create({ ...l, billId: savedBill.id }));
      }

      for (const e of selectedEntries) {
        await qr.manager.update(
          PracticeTimeEntryOrmEntity,
          { id: e.id, tenantId },
          { billId: savedBill.id },
        );
      }

      return await billRepo.findOne({
        where: { id: savedBill.id, tenantId },
        relations: ['lines', 'client', 'client.company'],
      });
    });
  }

  async convertBillToGstInvoice(tenantId: string, activeCompanyId: string, userId: string, billId: string) {
    const setup = await this.uow.executeInTransaction(async (qr) => {
      const bill = await qr.manager.findOne(PracticeBillOrmEntity, {
        where: { id: billId, tenantId },
        relations: ['lines', 'client', 'client.company'],
      });
      if (!bill) throw new NotFoundException('Practice bill not found');
      if (bill.invoiceId) return { alreadyInvoiced: true, invoiceId: bill.invoiceId, bill };

      const branch = await qr.manager.findOne(BranchOrmEntity, {
        where: { tenantId, companyId: activeCompanyId },
      });
      if (!branch) throw new BadRequestException('No active firm branch found for invoicing.');

      const fy = await qr.manager.findOne(FinancialYearOrmEntity, {
        where: { tenantId, companyId: activeCompanyId },
        order: { startDate: 'DESC' },
      });
      if (!fy) throw new BadRequestException('No active Financial Year found for invoicing.');

      const clientName = bill.client?.company?.legalName || bill.client?.primaryContactName || 'Client';
      let party = await qr.manager.findOne(PartyOrmEntity, {
        where: { tenantId, companyId: activeCompanyId, name: clientName },
      });
      if (!party) {
        const partyRepo = qr.manager.getRepository(PartyOrmEntity);
        party = await partyRepo.save(
          partyRepo.create({
            tenantId,
            companyId: activeCompanyId,
            name: clientName,
            partyType: PartyType.CUSTOMER,
            registrationType: PartyRegistrationType.UNREGISTERED,
            billingStateCode: branch.stateCode || '27',
            creditLimit: new Decimal(0),
            email: bill.client?.primaryContactEmail || undefined,
            phone: bill.client?.primaryContactPhone || undefined,
          }),
        );
      }

      return { alreadyInvoiced: false, bill, branch, party, fy };
    });

    if (setup.alreadyInvoiced) {
      return { billId, invoiceId: setup.invoiceId };
    }

    const bill = setup.bill;
    const positiveLines = (bill.lines || []).filter((l) => Number(l.amount) > 0);
    const invoice = await this.invoiceService.createInvoice(tenantId, activeCompanyId, userId, {
      partyId: setup.party!.id,
      branchId: setup.branch!.id,
      financialYearId: setup.fy!.id,
      invoiceDate: bill.billDate,
      dueDate: bill.dueDate,
      notes: `Generated from Practice Bill ${bill.billNumber}`,
      items: positiveLines.map((l) => ({
        description: l.description,
        hsnSacCode: '998221', // Accounting & Auditing SAC code
        quantity: Number(l.hours || 1),
        uom: 'HRS',
        unitPrice: Number(l.rate || l.amount),
        gstRatePercent: Number(l.gstRate ?? 18),
      })),
    } as any);

    await this.uow.executeInTransaction(async (qr) => {
      await qr.manager.update(
        PracticeBillOrmEntity,
        { id: bill.id, tenantId },
        { status: 'INVOICED', invoiceId: invoice.id },
      );
    });

    return { billId: bill.id, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber };
  }

  async markBillPaid(tenantId: string, billId: string) {
    return this.uow.executeInTransaction(async (qr) => {
      const bill = await qr.manager.findOne(PracticeBillOrmEntity, { where: { id: billId, tenantId } });
      if (!bill) throw new NotFoundException('Bill not found');
      bill.status = 'PAID';
      if (bill.invoiceId) {
        await qr.manager.update(
          InvoiceOrmEntity,
          { id: bill.invoiceId, tenantId },
          { status: 'PAID' as any },
        );
      }
      return await qr.manager.save(bill);
    });
  }

  // ==================== PROFITABILITY ====================

  async getProfitabilityReport(tenantId: string) {
    return this.uow.executeInTransaction(async (qr) => {
      const [clients, entries, bills, users, jobs] = await Promise.all([
        qr.manager.find(FirmClientOrmEntity, { where: { tenantId }, relations: ['company'] }),
        qr.manager.find(PracticeTimeEntryOrmEntity, { where: { tenantId } }),
        qr.manager.find(PracticeBillOrmEntity, { where: { tenantId } }),
        qr.manager.find(UserOrmEntity, { where: { tenantId } }),
        qr.manager.find(PracticeJobOrmEntity, { where: { tenantId } }),
      ]);

      const costRateMap = new Map(users.map((u) => [u.id, Number(u.hourlyCostRate || 500)]));

      const byClient = clients.map((c) => {
        const cEntries = entries.filter((e) => e.clientId === c.id);
        const totalHours = cEntries.reduce((s, e) => s + e.minutes / 60, 0);
        const timeCost = cEntries.reduce(
          (s, e) => s + (e.minutes / 60) * (costRateMap.get(e.userId) ?? 500),
          0,
        );
        const cBills = bills.filter((b) => b.clientId === c.id);
        const billed = cBills.reduce((s, b) => s + Number(b.subtotal || 0), 0);
        const collected = cBills
          .filter((b) => b.status === 'PAID')
          .reduce((s, b) => s + Number(b.subtotal || 0), 0);
        const margin = billed - timeCost;
        const marginPct = billed > 0 ? Number(((margin / billed) * 100).toFixed(1)) : 0;

        return {
          clientId: c.id,
          clientName: c.company?.legalName || c.primaryContactName,
          totalHours: Number(totalHours.toFixed(2)),
          timeCost: Number(timeCost.toFixed(2)),
          billed: Number(billed.toFixed(2)),
          collected: Number(collected.toFixed(2)),
          margin: Number(margin.toFixed(2)),
          marginPct,
        };
      });

      const byJob = jobs.slice(0, 30).map((j) => {
        const jEntries = entries.filter((e) => e.jobId === j.id);
        const totalHours = jEntries.reduce((s, e) => s + e.minutes / 60, 0);
        const timeCost = jEntries.reduce(
          (s, e) => s + (e.minutes / 60) * (costRateMap.get(e.userId) ?? 500),
          0,
        );
        const billableValue = jEntries
          .filter((e) => e.isBillable)
          .reduce((s, e) => s + (e.minutes / 60) * Number(e.hourlyRate || 1500), 0);
        return {
          jobId: j.id,
          title: j.title,
          period: j.period,
          totalHours: Number(totalHours.toFixed(2)),
          timeCost: Number(timeCost.toFixed(2)),
          billableValue: Number(billableValue.toFixed(2)),
          margin: Number((billableValue - timeCost).toFixed(2)),
        };
      });

      return { byClient, byJob };
    });
  }
}
