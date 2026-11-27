import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as crypto from 'crypto';
import { EntityManager } from 'typeorm';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import {
  WorkflowTemplateOrmEntity,
  WorkflowChecklistTemplateItem,
} from '../../infrastructure/persistence/entities/workflow-template.orm-entity';
import {
  PracticeJobOrmEntity,
  JobChecklistItem,
} from '../../infrastructure/persistence/entities/practice-job.orm-entity';
import { PracticeJobCommentOrmEntity } from '../../infrastructure/persistence/entities/practice-job-comment.orm-entity';
import { ClientContactOrmEntity } from '../../infrastructure/persistence/entities/client-contact.orm-entity';
import { FirmClientOrmEntity } from '../../infrastructure/persistence/entities/firm-client.orm-entity';
import { UserOrmEntity } from '../../infrastructure/persistence/entities/user.orm-entity';
import { BranchOrmEntity } from '../../infrastructure/persistence/entities/branch.orm-entity';
import { DocumentFileOrmEntity } from '../../infrastructure/persistence/entities/document-file.orm-entity';
import { ClientDocumentRequestOrmEntity } from '../../infrastructure/persistence/entities/client-document-request.orm-entity';
import { ComplianceTaskOrmEntity } from '../../infrastructure/persistence/entities/compliance-task.orm-entity';
import { ServiceTypeOrmEntity } from '../../infrastructure/persistence/entities/service-type.orm-entity';
import { ClientServiceOrmEntity } from '../../infrastructure/persistence/entities/client-service.orm-entity';
import { PracticeCustomFieldOrmEntity } from '../../infrastructure/persistence/entities/practice-custom-field.orm-entity';
import { PracticeLabelOrmEntity } from '../../infrastructure/persistence/entities/practice-label.orm-entity';
import { TenantOrmEntity } from '../../infrastructure/persistence/entities/tenant.orm-entity';

export const JOB_STAGES = [
  'BACKLOG',
  'IN_PROGRESS',
  'REVIEW',
  'AWAITING_CLIENT',
  'FILED',
  'DONE',
] as const;

const DEFAULT_WORKFLOW_TEMPLATES: Array<{
  name: string;
  jobType: string;
  description: string;
  isRecurring: boolean;
  recurrenceFrequency: string | null;
  defaultDueDay: number;
  stages: string[];
  checklist: WorkflowChecklistTemplateItem[];
}> = [
  {
    name: 'Monthly GST',
    jobType: 'GST_MONTHLY',
    description: 'End-to-end monthly GST compliance: GSTR-1, GSTR-2B reconciliation, GSTR-3B, challan payment, and filing.',
    isRecurring: true,
    recurrenceFrequency: 'MONTHLY',
    defaultDueDay: 20,
    stages: [...JOB_STAGES],
    checklist: [
      { id: 'gst-1', title: 'Collect outward sales register & e-invoices', stage: 'BACKLOG' },
      { id: 'gst-2', title: 'File GSTR-1 by 11th of following month', stage: 'IN_PROGRESS' },
      { id: 'gst-3', title: 'Reconcile ITC against GSTR-2B & purchase register', stage: 'IN_PROGRESS' },
      { id: 'gst-4', title: 'Compute net GSTR-3B liability & generate PMT-06 challan', stage: 'REVIEW' },
      { id: 'gst-5', title: 'Client approval & tax payment confirmation', stage: 'AWAITING_CLIENT' },
      { id: 'gst-6', title: 'File GSTR-3B & archive ARN in Vault', stage: 'FILED' },
    ],
  },
  {
    name: 'Quarterly TDS',
    jobType: 'TDS_QUARTERLY',
    description: 'Quarterly TDS return workflow: deduction summary, challan OLTAS verification, 24Q/26Q FVU, Form 16A.',
    isRecurring: true,
    recurrenceFrequency: 'QUARTERLY',
    defaultDueDay: 31,
    stages: [...JOB_STAGES],
    checklist: [
      { id: 'tds-1', title: 'Collect quarterly vendor & salary deduction ledger', stage: 'BACKLOG' },
      { id: 'tds-2', title: 'Verify CIN / BSR codes & challan balances on TRACES', stage: 'IN_PROGRESS' },
      { id: 'tds-3', title: 'Prepare Form 26Q / 24Q & validate via FVU', stage: 'REVIEW' },
      { id: 'tds-4', title: 'File quarterly TDS return & download Form 16A certificates', stage: 'FILED' },
    ],
  },
  {
    name: 'Annual ITR',
    jobType: 'ITR_ANNUAL',
    description: 'Annual Income Tax Return filing: AIS/26AS reconciliation, books finalization, computation, partner review, e-verification.',
    isRecurring: true,
    recurrenceFrequency: 'ANNUAL',
    defaultDueDay: 31,
    stages: [...JOB_STAGES],
    checklist: [
      { id: 'itr-1', title: 'Download AIS, TIS & Form 26AS from Income Tax portal', stage: 'BACKLOG' },
      { id: 'itr-2', title: 'Finalize Trial Balance, P&L & Balance Sheet', stage: 'IN_PROGRESS' },
      { id: 'itr-3', title: 'Prepare tax computation & MAT/AMT check', stage: 'REVIEW' },
      { id: 'itr-4', title: 'Client sign-off & self-assessment tax challan', stage: 'AWAITING_CLIENT' },
      { id: 'itr-5', title: 'Upload ITR JSON & complete e-Verification (ITR-V)', stage: 'FILED' },
    ],
  },
  {
    name: 'Tax Audit (44AB)',
    jobType: 'TAX_AUDIT',
    description: 'Statutory Tax Audit under Section 44AB: planning, fieldwork, Form 3CD clauses, partner review, UDIN generation.',
    isRecurring: false,
    recurrenceFrequency: null,
    defaultDueDay: 30,
    stages: [...JOB_STAGES],
    checklist: [
      { id: 'ta-1', title: 'Audit planning & engagement letter sign-off', stage: 'BACKLOG' },
      { id: 'ta-2', title: 'Fieldwork: 40A(3), 43B, MSME 43B(h), & TDS compliance checks', stage: 'IN_PROGRESS' },
      { id: 'ta-3', title: 'Draft Form 3CA/3CB & 3CD schedules', stage: 'REVIEW' },
      { id: 'ta-4', title: 'Partner review & UDIN generation', stage: 'REVIEW' },
      { id: 'ta-5', title: 'Upload Form 3CD & client portal acceptance', stage: 'FILED' },
    ],
  },
  {
    name: 'ROC Annual (AOC-4 & MGT-7)',
    jobType: 'ROC_ANNUAL',
    description: 'MCA annual filing for companies: Board Report, AGM notice, AOC-4 XBRL/normal, MGT-7/7A.',
    isRecurring: true,
    recurrenceFrequency: 'ANNUAL',
    defaultDueDay: 30,
    stages: [...JOB_STAGES],
    checklist: [
      { id: 'roc-1', title: 'Collect signed financial statements & Board Report', stage: 'BACKLOG' },
      { id: 'roc-2', title: 'Prepare Form AOC-4 & attach financials', stage: 'IN_PROGRESS' },
      { id: 'roc-3', title: 'Prepare Form MGT-7 / MGT-7A & shareholding list', stage: 'REVIEW' },
      { id: 'roc-4', title: 'DSC affixation & MCA V3 portal filing', stage: 'FILED' },
    ],
  },
];

@Injectable()
export class PracticeWorkflowService {
  constructor(private readonly uow: UnitOfWorkService) {}

  private async ensureDefaultTemplatesInTx(
    manager: EntityManager,
    tenantId: string,
  ): Promise<WorkflowTemplateOrmEntity[]> {
    const existing = await manager.find(WorkflowTemplateOrmEntity, {
      where: { tenantId },
      order: { name: 'ASC' },
    });
    if (existing.length > 0) return existing;

    const created: WorkflowTemplateOrmEntity[] = [];
    for (const tpl of DEFAULT_WORKFLOW_TEMPLATES) {
      const entity = manager.create(WorkflowTemplateOrmEntity, {
        tenantId,
        name: tpl.name,
        jobType: tpl.jobType,
        description: tpl.description,
        isRecurring: tpl.isRecurring,
        recurrenceFrequency: tpl.recurrenceFrequency,
        defaultDueDay: tpl.defaultDueDay,
        stages: tpl.stages,
        checklist: tpl.checklist,
      });
      created.push(await manager.save(WorkflowTemplateOrmEntity, entity));
    }
    return created;
  }

  async listTemplates(tenantId: string) {
    return this.uow.executeInTransaction(async (qr) => {
      return await this.ensureDefaultTemplatesInTx(qr.manager, tenantId);
    });
  }

  private computeNextPeriodAndDueDate(
    currentPeriod: string,
    currentDueDate: string,
    frequency: string | null | undefined,
  ): { nextPeriod: string; nextDueDate: string } {
    const due = new Date(currentDueDate || new Date().toISOString().split('T')[0]);
    const monthsToAdd = frequency === 'QUARTERLY' ? 3 : frequency === 'ANNUAL' ? 12 : 1;
    const nextDue = new Date(due.getFullYear(), due.getMonth() + monthsToAdd, due.getDate());
    const nextDueStr = nextDue.toISOString().split('T')[0];

    const ymMatch = currentPeriod.match(/^(\d{4})-(\d{2})$/);
    if (ymMatch) {
      const d = new Date(parseInt(ymMatch[1], 10), parseInt(ymMatch[2], 10) - 1 + monthsToAdd, 1);
      const nextPeriod = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return { nextPeriod, nextDueDate: nextDueStr };
    }
    return { nextPeriod: `${currentPeriod} (Next)`, nextDueDate: nextDueStr };
  }

  private async mapJobs(manager: EntityManager, tenantId: string, jobs: PracticeJobOrmEntity[]) {
    const [users, services] = await Promise.all([
      manager.find(UserOrmEntity, { where: { tenantId } }),
      manager.find(ServiceTypeOrmEntity, { where: { tenantId } }),
    ]);
    const userMap = new Map(
      users.map((u) => [u.id, `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email]),
    );
    const svcMap = new Map(services.map((s) => [s.id, s]));
    return jobs.map((j) => {
      const svc = j.serviceTypeId ? svcMap.get(j.serviceTypeId) : undefined;
      return {
        id: j.id,
        tenantId: j.tenantId,
        clientId: j.clientId,
        clientName: j.client?.company?.legalName || 'Unknown Client',
        clientCode: j.client?.clientCode || '',
        templateId: j.templateId || null,
        templateName: j.template?.name || null,
        serviceTypeId: j.serviceTypeId || null,
        serviceName: svc?.name || null,
        serviceCategory: svc?.category || null,
        stages: j.stages?.length ? j.stages : svc?.defaultStages || j.template?.stageConfigs || [],
        customFields: j.customFields || {},
        labels: j.labels || [],
        title: j.title,
        jobType: j.jobType,
        period: j.period,
        stage: j.stage,
        priority: j.priority,
        dueDate: j.dueDate,
        assignedToUserId: j.assignedToUserId || null,
        assignedToName: j.assignedToUserId ? userMap.get(j.assignedToUserId) || 'Assigned Staff' : 'Unassigned',
        isRecurring: j.isRecurring,
        recurrenceFrequency: j.recurrenceFrequency || null,
        nextSpawnedJobId: j.nextSpawnedJobId || null,
        filingAckNumber: j.filingAckNumber || null,
        checklist: j.checklist || [],
        preparerUserId: j.preparerUserId || null,
        reviewerUserId: j.reviewerUserId || null,
        partnerUserId: j.partnerUserId || null,
        reviewStatus: j.reviewStatus || 'NONE',
        reviewNotes: j.reviewNotes || null,
        stageState: j.stageState || {},
        createdAt: j.createdAt.toISOString(),
        updatedAt: j.updatedAt.toISOString(),
      };
    });
  }

  async listJobs(
    tenantId: string,
    filters?: { clientId?: string; stage?: string; assignedToUserId?: string },
  ) {
    return this.uow.executeInTransaction(async (qr) => {
      await this.ensureDefaultTemplatesInTx(qr.manager, tenantId);
      const qb = qr.manager
        .createQueryBuilder(PracticeJobOrmEntity, 'j')
        .leftJoinAndSelect('j.client', 'client')
        .leftJoinAndSelect('client.company', 'company')
        .leftJoinAndSelect('j.template', 'template')
        .where('j.tenant_id = :tenantId', { tenantId })
        .orderBy('j.due_date', 'ASC');

      if (filters?.clientId) qb.andWhere('j.client_id = :clientId', { clientId: filters.clientId });
      if (filters?.stage) qb.andWhere('j.stage = :stage', { stage: filters.stage });
      if (filters?.assignedToUserId) {
        qb.andWhere('j.assigned_to_user_id = :uid', { uid: filters.assignedToUserId });
      }

      const jobs = await qb.getMany();
      return await this.mapJobs(qr.manager, tenantId, jobs);
    });
  }

  async getJob(tenantId: string, jobId: string) {
    return this.uow.executeInTransaction(async (qr) => {
      const job = await qr.manager.findOne(PracticeJobOrmEntity, {
        where: { id: jobId, tenantId },
        relations: ['client', 'client.company', 'template'],
      });
      if (!job) throw new NotFoundException(`Job '${jobId}' not found.`);

      const comments = await qr.manager.find(PracticeJobCommentOrmEntity, {
        where: { tenantId, jobId },
        order: { createdAt: 'ASC' },
      });

      const [mapped] = await this.mapJobs(qr.manager, tenantId, [job]);
      return {
        ...mapped,
        comments: comments.map((c) => ({
          id: c.id,
          userId: c.userId,
          authorName: c.authorName,
          comment: c.comment,
          createdAt: c.createdAt.toISOString(),
        })),
      };
    });
  }

  async createJob(
    tenantId: string,
    dto: {
      clientId: string;
      templateId?: string;
      serviceTypeId?: string;
      title?: string;
      jobType?: string;
      period: string;
      dueDate?: string;
      priority?: string;
      assignedToUserId?: string;
      isRecurring?: boolean;
      recurrenceFrequency?: string;
      customFields?: Record<string, any>;
      labels?: string[];
    },
  ) {
    return this.uow.executeInTransaction(async (qr) => {
      const client = await qr.manager.findOne(FirmClientOrmEntity, {
        where: { id: dto.clientId, tenantId },
        relations: ['company'],
      });
      if (!client) throw new NotFoundException(`Client '${dto.clientId}' not found.`);

      let serviceType: ServiceTypeOrmEntity | null = null;
      if (dto.serviceTypeId) {
        serviceType = await qr.manager.findOne(ServiceTypeOrmEntity, {
          where: { id: dto.serviceTypeId, tenantId },
        });
        if (!serviceType) throw new NotFoundException(`Service type '${dto.serviceTypeId}' not found.`);
      }

      let template: WorkflowTemplateOrmEntity | null = null;
      if (dto.templateId) {
        template = await qr.manager.findOne(WorkflowTemplateOrmEntity, {
          where: { id: dto.templateId, tenantId },
        });
        if (!template) throw new NotFoundException(`Workflow template '${dto.templateId}' not found.`);
      }

      const period = (dto.period || new Date().toISOString().slice(0, 7)).trim();
      const title =
        dto.title?.trim() ||
        `${serviceType?.name || template?.name || dto.jobType || 'Compliance Job'} — ${client.company?.legalName || client.clientCode} — ${period}`;

      const defaultDue = new Date();
      const offset = serviceType?.defaultDueDateRule?.offsetDays ?? template?.defaultDueDay ?? 20;
      defaultDue.setDate(Math.min(28, Math.max(1, Math.abs(offset))));
      if (defaultDue < new Date()) defaultDue.setMonth(defaultDue.getMonth() + 1);
      const dueDate = dto.dueDate || defaultDue.toISOString().split('T')[0];

      const stages = serviceType?.defaultStages?.length
        ? serviceType.defaultStages
        : template?.stageConfigs?.length
          ? template.stageConfigs
          : [];
      const firstStage = stages[0]?.key || 'BACKLOG';

      const sourceChecklist = serviceType?.defaultChecklist?.length
        ? serviceType.defaultChecklist
        : template?.checklist || [];
      const checklist: JobChecklistItem[] = sourceChecklist.map((c) => ({
        id: c.id || crypto.randomUUID(),
        title: c.title,
        stage: c.stage,
        completed: false,
      }));

      const job = qr.manager.create(PracticeJobOrmEntity, {
        tenantId,
        clientId: client.id,
        templateId: template?.id || null,
        serviceTypeId: serviceType?.id || null,
        title,
        jobType: dto.jobType || serviceType?.code || template?.jobType || 'GENERAL',
        period,
        stage: firstStage,
        priority: dto.priority || serviceType?.defaultPriority || 'MEDIUM',
        dueDate,
        assignedToUserId: dto.assignedToUserId || null,
        isRecurring:
          dto.isRecurring ??
          (serviceType ? serviceType.frequency !== 'ONE_TIME' : template?.isRecurring ?? false),
        recurrenceFrequency:
          dto.recurrenceFrequency ?? serviceType?.frequency ?? template?.recurrenceFrequency ?? null,
        stages,
        checklist,
        customFields: dto.customFields || {},
        labels: dto.labels || [],
      });

      const saved = await qr.manager.save(PracticeJobOrmEntity, job);
      const reloaded = await qr.manager.findOne(PracticeJobOrmEntity, {
        where: { id: saved.id, tenantId },
        relations: ['client', 'client.company', 'template'],
      });
      const [mapped] = await this.mapJobs(qr.manager, tenantId, [reloaded!]);
      return mapped;
    });
  }

  async moveJobStage(
    tenantId: string,
    jobId: string,
    stage: string,
    filingAckNumber?: string,
    actorUserId?: string,
  ) {
    return this.uow.executeInTransaction(async (qr) => {
      const [tenant, job] = await Promise.all([
        qr.manager.findOne(TenantOrmEntity, { where: { id: tenantId } }),
        qr.manager.findOne(PracticeJobOrmEntity, {
          where: { id: jobId, tenantId },
          relations: ['client', 'client.company', 'template'],
        }),
      ]);
      if (!job) throw new NotFoundException(`Job '${jobId}' not found.`);

      const allowedStages = new Set<string>([
        ...JOB_STAGES,
        ...(job.stages || []).map((s) => s.key),
        ...(job.template?.stages || []),
      ]);
      if (!allowedStages.has(stage)) {
        throw new BadRequestException(`Invalid stage '${stage}'.`);
      }

      // Enforced maker-checker review gate: preparer cannot advance past a gated stage or mark FILED/DONE without approval
      const reviewMode = (tenant?.reviewMode as 'OFF' | 'SELF_SIGNOFF' | 'ENFORCED') || 'ENFORCED';
      if (reviewMode === 'ENFORCED') {
        const stagesList = job.stages?.length ? job.stages : [];
        const curStageDef = stagesList.find((s) => s.key === job.stage);
        const curIsGated = Boolean(curStageDef?.requiresApproval) || job.stage.includes('REVIEW');
        const targetIdx = stagesList.findIndex((s) => s.key === stage);
        const curIdx = stagesList.findIndex((s) => s.key === job.stage);
        const movingForward = targetIdx > curIdx || stage === 'FILED' || stage === 'DONE';

        const hasGatedStage = stagesList.some((s) => s.requiresApproval) || job.stage.includes('REVIEW') || job.reviewStatus === 'IN_REVIEW';
        const isApproved = job.reviewStatus === 'APPROVED' || job.reviewStatus === 'SIGNED_OFF';

        if (movingForward && (curIsGated || job.reviewStatus === 'IN_REVIEW' || (hasGatedStage && (stage === 'FILED' || stage === 'DONE'))) && !isApproved) {
          if (!actorUserId || job.preparerUserId === actorUserId || job.assignedToUserId === actorUserId || job.reviewStatus === 'IN_REVIEW') {
            throw new ForbiddenException(
              `Awaiting review by ${curStageDef?.assigneeRole || 'Reviewer'}: preparer cannot advance or file a gated job.`,
            );
          }
        }
      }

      job.stage = stage;
      if (filingAckNumber) job.filingAckNumber = filingAckNumber;

      let spawnedJob: any = null;
      if (job.isRecurring && (stage === 'FILED' || stage === 'DONE') && !job.nextSpawnedJobId) {
        const { nextPeriod, nextDueDate } = this.computeNextPeriodAndDueDate(
          job.period,
          job.dueDate,
          job.recurrenceFrequency,
        );
        const baseName = job.template?.name || job.jobType;
        const clientName = job.client?.company?.legalName || job.client?.clientCode || 'Client';
        const nextChecklist = (job.checklist || []).map((item) => ({
          ...item,
          completed: false,
        }));
        const firstStage = job.stages?.[0]?.key || 'BACKLOG';

        const nextEntity = qr.manager.create(PracticeJobOrmEntity, {
          tenantId,
          clientId: job.clientId,
          templateId: job.templateId || null,
          serviceTypeId: job.serviceTypeId || null,
          stages: job.stages || [],
          customFields: job.customFields || {},
          labels: job.labels || [],
          title: `${baseName} — ${clientName} — ${nextPeriod}`,
          jobType: job.jobType,
          period: nextPeriod,
          stage: firstStage,
          priority: job.priority,
          dueDate: nextDueDate,
          assignedToUserId: job.assignedToUserId || null,
          isRecurring: true,
          recurrenceFrequency: job.recurrenceFrequency || 'MONTHLY',
          checklist: nextChecklist,
        });
        const savedNext = await qr.manager.save(PracticeJobOrmEntity, nextEntity);
        job.nextSpawnedJobId = savedNext.id;
        spawnedJob = savedNext;
      }

      const saved = await qr.manager.save(PracticeJobOrmEntity, job);
      const [mapped] = await this.mapJobs(qr.manager, tenantId, [saved]);
      return { ...mapped, spawnedNextJob: spawnedJob ? { id: spawnedJob.id, title: spawnedJob.title, period: spawnedJob.period } : null };
    });
  }

  async toggleChecklistItem(tenantId: string, jobId: string, itemId: string) {
    return this.uow.executeInTransaction(async (qr) => {
      const job = await qr.manager.findOne(PracticeJobOrmEntity, {
        where: { id: jobId, tenantId },
        relations: ['client', 'client.company', 'template'],
      });
      if (!job) throw new NotFoundException(`Job '${jobId}' not found.`);

      job.checklist = (job.checklist || []).map((c) =>
        c.id === itemId ? { ...c, completed: !c.completed } : c,
      );
      const saved = await qr.manager.save(PracticeJobOrmEntity, job);
      const [mapped] = await this.mapJobs(qr.manager, tenantId, [saved]);
      return mapped;
    });
  }

  async assignJob(tenantId: string, jobId: string, assignedToUserId: string | null) {
    return this.uow.executeInTransaction(async (qr) => {
      const job = await qr.manager.findOne(PracticeJobOrmEntity, {
        where: { id: jobId, tenantId },
        relations: ['client', 'client.company', 'template'],
      });
      if (!job) throw new NotFoundException(`Job '${jobId}' not found.`);
      job.assignedToUserId = assignedToUserId || null;
      const saved = await qr.manager.save(PracticeJobOrmEntity, job);
      const [mapped] = await this.mapJobs(qr.manager, tenantId, [saved]);
      return mapped;
    });
  }

  async addJobComment(tenantId: string, userId: string, jobId: string, comment: string) {
    if (!comment?.trim()) throw new BadRequestException('Comment text is required.');
    return this.uow.executeInTransaction(async (qr) => {
      const job = await qr.manager.findOne(PracticeJobOrmEntity, { where: { id: jobId, tenantId } });
      if (!job) throw new NotFoundException(`Job '${jobId}' not found.`);

      const user = await qr.manager.findOne(UserOrmEntity, { where: { id: userId } });
      const authorName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Team Member';

      const entity = qr.manager.create(PracticeJobCommentOrmEntity, {
        tenantId,
        jobId,
        userId,
        authorName,
        comment: comment.trim(),
      });
      return await qr.manager.save(PracticeJobCommentOrmEntity, entity);
    });
  }

  // ==========================================
  // CLIENT 360 / CRM & CONTACTS
  // ==========================================

  async getClient360(tenantId: string, clientId: string) {
    return this.uow.executeInTransaction(async (qr) => {
      const client = await qr.manager.findOne(FirmClientOrmEntity, {
        where: { id: clientId, tenantId },
        relations: ['company'],
      });
      if (!client) throw new NotFoundException(`Client '${clientId}' not found.`);

      const branches = await qr.manager.find(BranchOrmEntity, {
        where: { companyId: client.companyId, tenantId },
      });

      const jobsRaw = await qr.manager.find(PracticeJobOrmEntity, {
        where: { tenantId, clientId },
        relations: ['client', 'client.company', 'template'],
        order: { dueDate: 'ASC' },
      });
      const jobs = await this.mapJobs(qr.manager, tenantId, jobsRaw);

      const contacts = await qr.manager.find(ClientContactOrmEntity, {
        where: { tenantId, clientId },
        order: { isPrimary: 'DESC', createdAt: 'ASC' },
      });

      const vaultFiles = await qr.manager.find(DocumentFileOrmEntity, {
        where: { tenantId, clientId, isLatest: true, isDeleted: false },
        order: { createdAt: 'DESC' },
        take: 15,
      });

      const docRequests = await qr.manager.find(ClientDocumentRequestOrmEntity, {
        where: { tenantId, clientId },
        order: { createdAt: 'DESC' },
      });

      const tasks = await qr.manager.find(ComplianceTaskOrmEntity, {
        where: { tenantId, clientId },
        order: { dueDate: 'ASC' },
      });

      const [clientServices, customFieldsDef, labelsDef] = await Promise.all([
        qr.manager.find(ClientServiceOrmEntity, {
          where: { tenantId, clientId },
          relations: ['serviceType'],
          order: { createdAt: 'ASC' },
        }),
        qr.manager.find(PracticeCustomFieldOrmEntity, {
          where: { tenantId, entityType: 'CLIENT' },
          order: { sortOrder: 'ASC' },
        }),
        qr.manager.find(PracticeLabelOrmEntity, {
          where: { tenantId },
          order: { name: 'ASC' },
        }),
      ]);

      const activity = [
        ...jobs.map((j) => ({
          id: `job-${j.id}`,
          type: 'JOB',
          title: j.title,
          meta: `Stage: ${j.stage} · Due ${j.dueDate}`,
          timestamp: j.updatedAt,
        })),
        ...vaultFiles.map((f) => ({
          id: `file-${f.id}`,
          type: 'DOCUMENT',
          title: `Uploaded ${f.fileName} (v${f.version})`,
          meta: `By ${f.uploadedByName || 'System'}`,
          timestamp: f.createdAt.toISOString(),
        })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const branchGstins = branches.map((b) => b.gstin).filter(Boolean) as string[];
      const mergedGstins = Array.from(new Set([...(client.gstins || []), ...branchGstins]));

      return {
        client: {
          id: client.id,
          companyId: client.companyId,
          companyName: client.company?.legalName || 'Unknown Entity',
          pan: client.company?.panEncrypted || null,
          gstins: mergedGstins,
          clientCode: client.clientCode,
          primaryContactName: client.primaryContactName,
          primaryContactEmail: client.primaryContactEmail,
          primaryContactPhone: client.primaryContactPhone || null,
          engagementType: client.engagementType,
          serviceTier: client.serviceTier,
          healthStatus: client.healthStatus,
          isPortalEnabled: client.isPortalEnabled,
          entityType: client.entityType || 'Pvt Ltd',
          incorporationDate: client.incorporationDate || null,
          cin: client.cin || null,
          tan: client.tan || null,
          aadhaarMasked: client.aadhaarMasked || null,
          registeredAddress: client.registeredAddress || null,
          fyPreference: client.fyPreference || 'April-March',
          isVip: Boolean(client.isVip),
          assignedPartnerId: client.assignedPartnerId || null,
          customFields: client.customFields || {},
          labels: client.labels || [],
          createdAt: client.createdAt.toISOString(),
        },
        clientServices: clientServices.map((cs) => ({
          ...cs,
          feeAmount: cs.feeAmount != null ? Number(cs.feeAmount) : null,
        })),
        customFieldsDef,
        labelsDef: labelsDef.filter((l) => l.entityType === 'ALL' || l.entityType === 'CLIENT'),
        jobs,
        contacts: contacts.map((c) => ({
          id: c.id,
          name: c.name,
          role: c.role,
          email: c.email,
          phone: c.phone,
          isPrimary: c.isPrimary,
        })),
        recentFiles: vaultFiles.map((f) => ({
          id: f.id,
          fileName: f.fileName,
          sizeBytes: Number(f.sizeBytes),
          version: f.version,
          createdAt: f.createdAt.toISOString(),
        })),
        documentRequests: docRequests,
        complianceCalendar: tasks,
        activity: activity.slice(0, 20),
      };
    });
  }

  async addClientContact(
    tenantId: string,
    clientId: string,
    dto: { name: string; role: string; email?: string; phone?: string; isPrimary?: boolean },
  ) {
    if (!dto.name?.trim()) throw new BadRequestException('Contact name is required.');
    return this.uow.executeInTransaction(async (qr) => {
      const client = await qr.manager.findOne(FirmClientOrmEntity, { where: { id: clientId, tenantId } });
      if (!client) throw new NotFoundException(`Client '${clientId}' not found.`);
      const contact = qr.manager.create(ClientContactOrmEntity, {
        tenantId,
        clientId,
        name: dto.name.trim(),
        role: dto.role || 'Accountant',
        email: dto.email?.trim() || null,
        phone: dto.phone?.trim() || null,
        isPrimary: Boolean(dto.isPrimary),
      });
      return await qr.manager.save(ClientContactOrmEntity, contact);
    });
  }

  async deleteClientContact(tenantId: string, contactId: string) {
    return this.uow.executeInTransaction(async (qr) => {
      const contact = await qr.manager.findOne(ClientContactOrmEntity, { where: { id: contactId, tenantId } });
      if (!contact) throw new NotFoundException('Contact not found.');
      await qr.manager.remove(ClientContactOrmEntity, contact);
      return { deleted: true };
    });
  }

  // ==========================================
  // STAFF WORKLOAD & PRACTICE DASHBOARD
  // ==========================================

  async getStaffWorkload(tenantId: string) {
    return this.uow.executeInTransaction(async (qr) => {
      const users = await qr.manager.find(UserOrmEntity, {
        where: { tenantId, isActive: true },
        order: { firstName: 'ASC' },
      });
      const jobs = await qr.manager.find(PracticeJobOrmEntity, {
        where: { tenantId },
        relations: ['client', 'client.company'],
      });
      const today = new Date().toISOString().split('T')[0];

      const staffList = users
        .filter((u) => u.role !== 'CLIENT_VIEWER')
        .map((u) => {
          const userJobs = jobs.filter((j) => j.assignedToUserId === u.id);
          const openJobs = userJobs.filter((j) => j.stage !== 'DONE' && j.stage !== 'FILED');
          const overdueJobs = openJobs.filter((j) => j.dueDate < today);
          const stageCounts: Record<string, number> = {};
          for (const s of JOB_STAGES) stageCounts[s] = 0;
          for (const j of userJobs) {
            stageCounts[j.stage] = (stageCounts[j.stage] || 0) + 1;
          }
          const assignedHours = openJobs.length * 4; // 4h avg per active engagement job
          const capacityHours = 40;
          return {
            userId: u.id,
            name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
            email: u.email,
            role: u.role,
            openJobCount: openJobs.length,
            overdueCount: overdueJobs.length,
            completedCount: userJobs.length - openJobs.length,
            assignedHours,
            capacityHours,
            utilizationPct: Math.min(100, Math.round((assignedHours / capacityHours) * 100)),
            stageCounts,
          };
        });

      const unassignedCount = jobs.filter(
        (j) => !j.assignedToUserId && j.stage !== 'DONE' && j.stage !== 'FILED',
      ).length;

      return { staff: staffList, unassignedCount };
    });
  }

  async getPracticeDashboard(tenantId: string) {
    return this.uow.executeInTransaction(async (qr) => {
      await this.ensureDefaultTemplatesInTx(qr.manager, tenantId);
      const [clients, jobs, docRequests] = await Promise.all([
        qr.manager.find(FirmClientOrmEntity, { where: { tenantId }, relations: ['company'] }),
        qr.manager.find(PracticeJobOrmEntity, { where: { tenantId }, relations: ['client', 'client.company'] }),
        qr.manager.find(ClientDocumentRequestOrmEntity, { where: { tenantId } }),
      ]);

      const today = new Date().toISOString().split('T')[0];
      const nextWeekDate = new Date();
      nextWeekDate.setDate(nextWeekDate.getDate() + 7);
      const nextWeek = nextWeekDate.toISOString().split('T')[0];

      const jobsByStage: Record<string, number> = {};
      for (const s of JOB_STAGES) jobsByStage[s] = 0;
      for (const j of jobs) {
        jobsByStage[j.stage] = (jobsByStage[j.stage] || 0) + 1;
      }

      const openJobs = jobs.filter((j) => j.stage !== 'DONE' && j.stage !== 'FILED');
      const overdueJobs = openJobs.filter((j) => j.dueDate < today);
      const dueThisWeek = openJobs.filter((j) => j.dueDate >= today && j.dueDate <= nextWeek);

      const clientHealth = clients.map((c) => {
        const cJobs = openJobs.filter((j) => j.clientId === c.id);
        const cOverdue = cJobs.filter((j) => j.dueDate < today).length;
        return {
          clientId: c.id,
          companyName: c.company?.legalName || c.clientCode,
          clientCode: c.clientCode,
          openJobs: cJobs.length,
          overdueJobs: cOverdue,
          riskLevel: cOverdue > 0 ? 'AT_RISK' : 'HEALTHY',
        };
      });

      const workload = await this.getStaffWorkload(tenantId);

      return {
        summary: {
          totalClients: clients.length,
          totalJobs: jobs.length,
          openJobs: openJobs.length,
          overdueJobs: overdueJobs.length,
          dueThisWeek: dueThisWeek.length,
          pendingDocRequests: docRequests.filter((d) => d.status === 'REQUESTED').length,
        },
        jobsByStage,
        overdueList: overdueJobs.slice(0, 10).map((j) => ({
          id: j.id,
          title: j.title,
          clientName: j.client?.company?.legalName || j.client?.clientCode,
          dueDate: j.dueDate,
          stage: j.stage,
        })),
        dueThisWeekList: dueThisWeek.slice(0, 10).map((j) => ({
          id: j.id,
          title: j.title,
          clientName: j.client?.company?.legalName || j.client?.clientCode,
          dueDate: j.dueDate,
          stage: j.stage,
        })),
        clientHealth,
        staffCapacity: workload.staff,
      };
    });
  }
}
