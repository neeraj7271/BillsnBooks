import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import { PracticeNoticeOrmEntity } from '../../infrastructure/persistence/entities/practice-notice.orm-entity';
import {
  PracticeReminderTemplateOrmEntity,
  PracticeNotificationRuleOrmEntity,
} from '../../infrastructure/persistence/entities/practice-reminder.orm-entity';
import { PracticeJobOrmEntity } from '../../infrastructure/persistence/entities/practice-job.orm-entity';
import { UserOrmEntity } from '../../infrastructure/persistence/entities/user.orm-entity';
import { FirmClientOrmEntity } from '../../infrastructure/persistence/entities/firm-client.orm-entity';
import { ServiceTypeOrmEntity } from '../../infrastructure/persistence/entities/service-type.orm-entity';
import { PracticeBillOrmEntity } from '../../infrastructure/persistence/entities/practice-bill.orm-entity';
import { PracticeTimeEntryOrmEntity } from '../../infrastructure/persistence/entities/practice-time-entry.orm-entity';
import { NotificationOrmEntity } from '../../infrastructure/persistence/entities/notification.orm-entity';
import { TenantOrmEntity } from '../../infrastructure/persistence/entities/tenant.orm-entity';
import { NotificationType } from '@platform/shared-types';

@Injectable()
export class PracticeOperationsService {
  constructor(private readonly uow: UnitOfWorkService) {}

  // ==================== §9 CAPACITY PLANNING ====================

  async getCapacityHeatmap(tenantId: string) {
    return this.uow.executeInTransaction(async (qr) => {
      const [users, jobs, services] = await Promise.all([
        qr.manager.find(UserOrmEntity, { where: { tenantId, isActive: true } }),
        qr.manager.find(PracticeJobOrmEntity, {
          where: { tenantId },
          relations: ['client', 'client.company'],
        }),
        qr.manager.find(ServiceTypeOrmEntity, { where: { tenantId } }),
      ]);

      const svcHoursMap = new Map(services.map((s) => [s.id, Number(s.estimatedHours || 2)]));
      const today = new Date().toISOString().slice(0, 10);
      const openJobs = jobs.filter((j) => j.stage !== 'DONE' && j.stage !== 'FILED');

      // Compliance peak buckets: W1 (1-7 TDS), W2 (8-15 GST-1/PF/ESI), W3 (16-22 GSTR-3B), W4 (23-31 Month End)
      const staff = users
        .filter((u) => u.role !== 'CLIENT_VIEWER')
        .map((u) => {
          const myJobs = openJobs.filter((j) => j.assignedToUserId === u.id);
          const assignedHours = myJobs.reduce(
            (s, j) => s + (j.serviceTypeId ? svcHoursMap.get(j.serviceTypeId) ?? 3 : 3),
            0,
          );
          const overdueCount = myJobs.filter((j) => j.dueDate < today).length;
          const capacity = u.weeklyCapacityHours || 40;

          const peakBuckets = { w1_tds: 0, w2_gst1_pf: 0, w3_gstr3b: 0, w4_close: 0 };
          for (const j of myJobs) {
            const day = Number((j.dueDate || '').slice(8, 10)) || 15;
            const hrs = j.serviceTypeId ? svcHoursMap.get(j.serviceTypeId) ?? 3 : 3;
            if (day <= 7) peakBuckets.w1_tds += hrs;
            else if (day <= 15) peakBuckets.w2_gst1_pf += hrs;
            else if (day <= 22) peakBuckets.w3_gstr3b += hrs;
            else peakBuckets.w4_close += hrs;
          }

          return {
            userId: u.id,
            name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
            role: u.role,
            weeklyCapacityHours: capacity,
            assignedHours: Number(assignedHours.toFixed(1)),
            openJobsCount: myJobs.length,
            overdueCount,
            isOverloaded: assignedHours > capacity,
            utilizationPct: Math.round((assignedHours / capacity) * 100),
            peakBuckets,
            jobs: myJobs.slice(0, 15).map((j) => ({
              id: j.id,
              title: j.title,
              dueDate: j.dueDate,
              stage: j.stage,
              clientName: j.client?.company?.legalName || 'Client',
            })),
          };
        });

      const unassignedJobs = openJobs
        .filter((j) => !j.assignedToUserId)
        .map((j) => ({
          id: j.id,
          title: j.title,
          dueDate: j.dueDate,
          stage: j.stage,
          clientName: j.client?.company?.legalName || 'Client',
        }));

      return { staff, unassignedJobs };
    });
  }

  async reassignJobWithNotification(
    tenantId: string,
    jobId: string,
    assignedToUserId: string | null,
  ) {
    return this.uow.executeInTransaction(async (qr) => {
      const job = await qr.manager.findOne(PracticeJobOrmEntity, { where: { id: jobId, tenantId } });
      if (!job) throw new NotFoundException('Job not found');
      job.assignedToUserId = assignedToUserId;
      const saved = await qr.manager.save(job);

      if (assignedToUserId) {
        const notifRepo = qr.manager.getRepository(NotificationOrmEntity);
        await notifRepo.save(
          notifRepo.create({
            tenantId,
            userId: assignedToUserId,
            title: 'Job Assigned to You',
            message: `You have been assigned "${job.title}" (Due ${job.dueDate}).`,
            type: NotificationType.COMPLIANCE_TASK_UPCOMING,
            entityType: 'PRACTICE_JOB',
            entityId: job.id,
            isRead: false,
          }),
        );
      }
      return saved;
    });
  }

  // ==================== §10 NOTICE MANAGEMENT ====================

  async listNotices(
    tenantId: string,
    filters?: { authority?: string; status?: string; clientId?: string },
  ) {
    return this.uow.executeInTransaction(async (qr) => {
      const qb = qr.manager
        .createQueryBuilder(PracticeNoticeOrmEntity, 'n')
        .leftJoinAndSelect('n.client', 'client')
        .leftJoinAndSelect('client.company', 'company')
        .where('n.tenant_id = :tenantId', { tenantId })
        .orderBy('n.response_due_date', 'ASC');

      if (filters?.authority) qb.andWhere('n.authority = :auth', { auth: filters.authority });
      if (filters?.status) qb.andWhere('n.status = :st', { st: filters.status });
      if (filters?.clientId) qb.andWhere('n.client_id = :cid', { cid: filters.clientId });

      const today = new Date().toISOString().slice(0, 10);
      const list = await qb.getMany();
      return list.map((n) => ({
        ...n,
        amountInvolved: n.amountInvolved != null ? Number(n.amountInvolved) : null,
        clientName: n.client?.company?.legalName || 'Client',
        isOverdue: n.status !== 'CLOSED' && n.status !== 'RESPONDED' && n.responseDueDate < today,
      }));
    });
  }

  async createNotice(
    tenantId: string,
    dto: {
      clientId: string;
      authority: any;
      noticeType: string;
      noticeNo: string;
      section?: string;
      receivedDate: string;
      responseDueDate: string;
      assignedStaffId?: string;
      amountInvolved?: number;
      documents?: string[];
      responseNotes?: string;
    },
  ) {
    if (!dto.clientId || !dto.noticeType || !dto.noticeNo) {
      throw new BadRequestException('clientId, noticeType, and noticeNo are required.');
    }
    return this.uow.executeInTransaction(async (qr) => {
      const repo = qr.manager.getRepository(PracticeNoticeOrmEntity);
      const notice = repo.create({
        tenantId,
        clientId: dto.clientId,
        authority: dto.authority || 'GST',
        noticeType: dto.noticeType,
        noticeNo: dto.noticeNo,
        section: dto.section || null,
        receivedDate: dto.receivedDate || new Date().toISOString().slice(0, 10),
        responseDueDate: dto.responseDueDate,
        status: 'NEW',
        assignedStaffId: dto.assignedStaffId || null,
        amountInvolved: dto.amountInvolved ?? null,
        documents: dto.documents || [],
        responseNotes: dto.responseNotes || null,
      });
      return await repo.save(notice);
    });
  }

  async updateNotice(
    tenantId: string,
    id: string,
    patch: Partial<{
      status: any;
      assignedStaffId: string | null;
      responseNotes: string | null;
      documents: string[];
    }>,
  ) {
    return this.uow.executeInTransaction(async (qr) => {
      const repo = qr.manager.getRepository(PracticeNoticeOrmEntity);
      const n = await repo.findOne({ where: { id, tenantId } });
      if (!n) throw new NotFoundException('Notice not found');
      if (patch.status !== undefined) {
        n.status = patch.status;
        if (patch.status === 'CLOSED' || patch.status === 'RESPONDED') n.resolvedAt = new Date();
      }
      if (patch.assignedStaffId !== undefined) n.assignedStaffId = patch.assignedStaffId;
      if (patch.responseNotes !== undefined) n.responseNotes = patch.responseNotes;
      if (patch.documents !== undefined) n.documents = patch.documents;
      return await repo.save(n);
    });
  }

  // ==================== §11 REMINDERS & NOTIFICATION RULES ====================

  async listReminderTemplates(tenantId: string) {
    return this.uow.executeInTransaction(async (qr) => {
      const repo = qr.manager.getRepository(PracticeReminderTemplateOrmEntity);
      const existing = await repo.find({ where: { tenantId }, order: { createdAt: 'ASC' } });
      if (existing.length > 0) return existing;

      const defaults = [
        {
          eventType: 'DUE_DATE' as const,
          channel: 'EMAIL' as const,
          name: 'Statutory Due-Date Reminder',
          subject: 'Reminder: {{service}} due on {{dueDate}}',
          bodyTemplate: 'Dear {{client}}, your {{service}} filing is due on {{dueDate}}. Please share pending documents.',
        },
        {
          eventType: 'NOTICE_RESPONSE' as const,
          channel: 'WHATSAPP' as const,
          name: 'Tax Notice WhatsApp Alert',
          subject: 'Notice Response Due',
          bodyTemplate: 'Hi {{client}}, statutory notice response is due on {{dueDate}}. Please review in portal.',
        },
      ];
      const saved = [];
      for (const d of defaults) saved.push(await repo.save(repo.create({ tenantId, ...d })));
      return saved;
    });
  }

  async upsertReminderTemplate(tenantId: string, dto: any) {
    return this.uow.executeInTransaction(async (qr) => {
      const repo = qr.manager.getRepository(PracticeReminderTemplateOrmEntity);
      if (dto.id) {
        const t = await repo.findOne({ where: { id: dto.id, tenantId } });
        if (!t) throw new NotFoundException('Template not found');
        Object.assign(t, dto);
        return await repo.save(t);
      }
      return await repo.save(repo.create({ ...dto, tenantId }));
    });
  }

  async listNotificationRules(tenantId: string) {
    return this.uow.executeInTransaction(async (qr) => {
      return await qr.manager.find(PracticeNotificationRuleOrmEntity, {
        where: { tenantId },
        order: { createdAt: 'ASC' },
      });
    });
  }

  async upsertNotificationRule(tenantId: string, dto: any) {
    return this.uow.executeInTransaction(async (qr) => {
      const repo = qr.manager.getRepository(PracticeNotificationRuleOrmEntity);
      if (dto.id) {
        const r = await repo.findOne({ where: { id: dto.id, tenantId } });
        if (!r) throw new NotFoundException('Rule not found');
        Object.assign(r, dto);
        return await repo.save(r);
      }
      return await repo.save(repo.create({ ...dto, tenantId }));
    });
  }

  async runNotificationRules(tenantId: string, fallbackUserId: string) {
    return this.uow.executeInTransaction(async (qr) => {
      const rules = await qr.manager.find(PracticeNotificationRuleOrmEntity, {
        where: { tenantId, isActive: true },
      });
      const jobs = await qr.manager.find(PracticeJobOrmEntity, {
        where: { tenantId },
        relations: ['client', 'client.company'],
      });
      const notices = await qr.manager.find(PracticeNoticeOrmEntity, {
        where: { tenantId },
        relations: ['client', 'client.company'],
      });
      const notifRepo = qr.manager.getRepository(NotificationOrmEntity);

      const todayMs = Date.now();
      let dispatched = 0;
      const whatsappLinks: Array<{ client: string; message: string; link: string }> = [];

      for (const rule of rules) {
        const windowMs = (rule.daysBefore ?? 3) * 86400000;
        if (rule.eventType === 'DUE_DATE') {
          for (const j of jobs) {
            if (j.stage === 'DONE' || j.stage === 'FILED') continue;
            const dueMs = new Date(j.dueDate).getTime();
            if (dueMs - todayMs <= windowMs) {
              const targetUser = j.assignedToUserId || fallbackUserId;
              const clientName = j.client?.company?.legalName || 'Client';
              const msg = `[${rule.name}] "${j.title}" for ${clientName} is due on ${j.dueDate}.`;
              await notifRepo.save(
                notifRepo.create({
                  tenantId,
                  userId: targetUser,
                  title: rule.name,
                  message: msg,
                  type: NotificationType.COMPLIANCE_TASK_UPCOMING,
                  entityType: 'PRACTICE_JOB',
                  entityId: j.id,
                  isRead: false,
                }),
              );
              const phone = (j.client?.primaryContactPhone || '').replace(/\D/g, '');
              whatsappLinks.push({
                client: clientName,
                message: msg,
                link: `https://wa.me/${phone || ''}?text=${encodeURIComponent(msg)}`,
              });
              dispatched++;
            }
          }
        } else if (rule.eventType === 'NOTICE_RESPONSE') {
          for (const n of notices) {
            if (n.status === 'CLOSED' || n.status === 'RESPONDED') continue;
            const dueMs = new Date(n.responseDueDate).getTime();
            if (dueMs - todayMs <= windowMs) {
              const targetUser = n.assignedStaffId || fallbackUserId;
              const msg = `[${rule.name}] ${n.authority} Notice ${n.noticeNo} due on ${n.responseDueDate}.`;
              await notifRepo.save(
                notifRepo.create({
                  tenantId,
                  userId: targetUser,
                  title: rule.name,
                  message: msg,
                  type: NotificationType.COMPLIANCE_TASK_UPCOMING,
                  entityType: 'PRACTICE_NOTICE',
                  entityId: n.id,
                  isRead: false,
                }),
              );
              dispatched++;
            }
          }
        }
        await qr.manager.update(
          PracticeNotificationRuleOrmEntity,
          { id: rule.id, tenantId },
          { lastRunAt: new Date() },
        );
      }

      return {
        rulesEvaluated: rules.length,
        notificationsDispatched: dispatched,
        smtpConfigured: Boolean(process.env.SMTP_HOST),
        whatsappGatewayMode: 'CLICK_TO_SEND_LINK',
        whatsappLinks: whatsappLinks.slice(0, 10),
      };
    });
  }

  // ==================== §12 FIRM VS BUSINESS MODE ====================

  async getWorkspaceMode(tenantId: string): Promise<{ practiceMode: 'FIRM' | 'BUSINESS' }> {
    return this.uow.executeInTransaction(async (qr) => {
      const tenant = await qr.manager.findOne(TenantOrmEntity, { where: { id: tenantId } });
      return { practiceMode: (tenant?.practiceMode as 'FIRM' | 'BUSINESS') || 'FIRM' };
    });
  }

  async setWorkspaceMode(tenantId: string, practiceMode: 'FIRM' | 'BUSINESS') {
    if (practiceMode !== 'FIRM' && practiceMode !== 'BUSINESS') {
      throw new BadRequestException('practiceMode must be FIRM or BUSINESS');
    }
    return this.uow.executeInTransaction(async (qr) => {
      await qr.manager.update(TenantOrmEntity, { id: tenantId }, { practiceMode });
      return { practiceMode };
    });
  }

  // ==================== §13 COMMAND CENTER DASHBOARD ====================

  async getCommandCenterDashboard(tenantId: string) {
    return this.uow.executeInTransaction(async (qr) => {
      const [tenant, clients, jobs, notices, bills, timeEntries, users] = await Promise.all([
        qr.manager.findOne(TenantOrmEntity, { where: { id: tenantId } }),
        qr.manager.find(FirmClientOrmEntity, { where: { tenantId }, relations: ['company'] }),
        qr.manager.find(PracticeJobOrmEntity, { where: { tenantId }, relations: ['client', 'client.company'] }),
        qr.manager.find(PracticeNoticeOrmEntity, { where: { tenantId }, relations: ['client', 'client.company'] }),
        qr.manager.find(PracticeBillOrmEntity, { where: { tenantId } }),
        qr.manager.find(PracticeTimeEntryOrmEntity, { where: { tenantId } }),
        qr.manager.find(UserOrmEntity, { where: { tenantId, isActive: true } }),
      ]);

      const today = new Date().toISOString().slice(0, 10);
      const next7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const next14 = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

      const jobsByStage: Record<string, number> = {};
      for (const j of jobs) {
        jobsByStage[j.stage] = (jobsByStage[j.stage] || 0) + 1;
      }

      const openJobs = jobs.filter((j) => j.stage !== 'DONE' && j.stage !== 'FILED');
      const overdueJobs = openJobs.filter((j) => j.dueDate < today);
      const dueThisWeek = openJobs.filter((j) => j.dueDate >= today && j.dueDate <= next7);
      const upcoming14Days = openJobs
        .filter((j) => j.dueDate >= today && j.dueDate <= next14)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 12)
        .map((j) => ({
          id: j.id,
          title: j.title,
          dueDate: j.dueDate,
          stage: j.stage,
          clientName: j.client?.company?.legalName || 'Client',
        }));

      const atRiskClients = clients
        .map((c) => {
          const cJobs = openJobs.filter((j) => j.clientId === c.id);
          const notStartedNearDue = cJobs.filter(
            (j) => (j.stage === 'BACKLOG' || j.stage === 'PLANNING') && j.dueDate <= next7,
          ).length;
          const overdue = cJobs.filter((j) => j.dueDate < today).length;
          return {
            clientId: c.id,
            clientName: c.company?.legalName || c.primaryContactName,
            overdue,
            notStartedNearDue,
            riskLevel: overdue > 0 || notStartedNearDue > 0 ? 'AT_RISK' : 'HEALTHY',
          };
        })
        .filter((c) => c.riskLevel === 'AT_RISK');

      const openNotices = notices.filter((n) => n.status !== 'CLOSED' && n.status !== 'RESPONDED');
      const noticesByAuthority: Record<string, number> = {};
      for (const n of openNotices) {
        noticesByAuthority[n.authority] = (noticesByAuthority[n.authority] || 0) + 1;
      }
      const overdueNotices = openNotices.filter((n) => n.responseDueDate < today);

      const unbilledWip = timeEntries
        .filter((e) => !e.billId && e.isBillable && !e.isWriteOff)
        .reduce((s, e) => s + (e.minutes / 60) * Number(e.hourlyRate || 1500), 0);
      const billedTotal = bills.reduce((s, b) => s + Number(b.totalAmount || 0), 0);
      const collectedTotal = bills
        .filter((b) => b.status === 'PAID')
        .reduce((s, b) => s + Number(b.totalAmount || 0), 0);

      const staffSummary = users
        .filter((u) => u.role !== 'CLIENT_VIEWER')
        .map((u) => {
          const cnt = openJobs.filter((j) => j.assignedToUserId === u.id).length;
          return {
            userId: u.id,
            name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
            openJobs: cnt,
            capacityHours: u.weeklyCapacityHours || 40,
          };
        });

      return {
        practiceMode: (tenant?.practiceMode as 'FIRM' | 'BUSINESS') || 'FIRM',
        summary: {
          totalClients: clients.length,
          openJobs: openJobs.length,
          overdueJobs: overdueJobs.length,
          dueThisWeek: dueThisWeek.length,
          openNotices: openNotices.length,
          overdueNotices: overdueNotices.length,
          atRiskClients: atRiskClients.length,
        },
        jobsByStage,
        atRiskClients,
        noticesByAuthority,
        financials: {
          unbilledWip: Number(unbilledWip.toFixed(2)),
          billedTotal: Number(billedTotal.toFixed(2)),
          collectedTotal: Number(collectedTotal.toFixed(2)),
          outstandingTotal: Number(Math.max(0, billedTotal - collectedTotal).toFixed(2)),
        },
        staffSummary,
        upcoming14Days,
      };
    });
  }
}
