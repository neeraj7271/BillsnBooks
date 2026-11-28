import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import { FirmClientOrmEntity } from '../../infrastructure/persistence/entities/firm-client.orm-entity';
import { StaffAssignmentOrmEntity } from '../../infrastructure/persistence/entities/staff-assignment.orm-entity';
import { ComplianceTaskOrmEntity } from '../../infrastructure/persistence/entities/compliance-task.orm-entity';
import { TaskCommentOrmEntity } from '../../infrastructure/persistence/entities/task-comment.orm-entity';
import { ClientDocumentRequestOrmEntity } from '../../infrastructure/persistence/entities/client-document-request.orm-entity';
import { CompanyOrmEntity } from '../../infrastructure/persistence/entities/company.orm-entity';
import { DocumentVaultService } from './document-vault.service';
import {
  FirmClientDto,
  CreateFirmClientDto,
  ComplianceTaskDto,
  CreateComplianceTaskDto,
  TaskCommentDto,
  ClientDocumentRequestDto,
  CreateDocumentRequestDto,
  TaskStatus,
  DocumentRequestStatus,
  ClientHealthStatus,
  TaskCategory,
  TaskPriority,
} from '@platform/shared-types';

@Injectable()
export class PracticeService {
  constructor(
    private readonly uow: UnitOfWorkService,
    private readonly vaultService: DocumentVaultService,
  ) {}

  // ==========================================
  // CLIENT MANAGEMENT
  // ==========================================

  async listClients(tenantId: string): Promise<FirmClientDto[]> {
    return this.uow.executeInTransaction(async (qr) => {
      const clients = await qr.manager
        .createQueryBuilder(FirmClientOrmEntity, 'c')
        .leftJoinAndSelect('c.company', 'comp')
        .where('c.tenant_id = :tenantId', { tenantId })
        .orderBy('c.created_at', 'DESC')
        .getMany();

      const taskCounts = await qr.manager
        .createQueryBuilder(ComplianceTaskOrmEntity, 't')
        .select('t.client_id', 'clientId')
        .addSelect('COUNT(t.id)', 'count')
        .where('t.tenant_id = :tenantId', { tenantId })
        .andWhere("t.status != 'FILED'")
        .groupBy('t.client_id')
        .getRawMany();

      const docCounts = await qr.manager
        .createQueryBuilder(ClientDocumentRequestOrmEntity, 'd')
        .select('d.client_id', 'clientId')
        .addSelect('COUNT(d.id)', 'count')
        .where('d.tenant_id = :tenantId', { tenantId })
        .andWhere("d.status = 'REQUESTED'")
        .groupBy('d.client_id')
        .getRawMany();

      const taskMap = new Map(taskCounts.map((r) => [r.clientId, parseInt(r.count, 10)]));
      const docMap = new Map(docCounts.map((r) => [r.clientId, parseInt(r.count, 10)]));

      return clients.map((c) => ({
        id: c.id,
        tenantId: c.tenantId,
        companyId: c.companyId,
        companyName: c.company?.legalName || 'Unknown Entity',
        pan: c.company?.panEncrypted || undefined,
        clientCode: c.clientCode,
        primaryContactName: c.primaryContactName,
        primaryContactEmail: c.primaryContactEmail,
        primaryContactPhone: c.primaryContactPhone || undefined,
        engagementType: c.engagementType,
        serviceTier: c.serviceTier,
        isPortalEnabled: c.isPortalEnabled,
        healthStatus: c.healthStatus,
        openTaskCount: taskMap.get(c.id) || 0,
        pendingDocCount: docMap.get(c.id) || 0,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      }));
    });
  }

  async createClient(tenantId: string, dto: CreateFirmClientDto): Promise<FirmClientDto> {
    return this.uow.executeInTransaction(async (qr) => {
      const company = await qr.manager.findOne(CompanyOrmEntity, {
        where: { id: dto.companyId, tenantId },
      });
      if (!company) {
        throw new NotFoundException(`Company '${dto.companyId}' not found.`);
      }

      const existingForCompany = await qr.manager.findOne(FirmClientOrmEntity, {
        where: { companyId: dto.companyId, tenantId },
      });
      if (existingForCompany) {
        throw new ConflictException(`Company '${company.legalName}' is already onboarded as a practice client.`);
      }

      const client = qr.manager.create(FirmClientOrmEntity, {
        tenantId,
        companyId: dto.companyId,
        clientCode: dto.clientCode.trim().toUpperCase(),
        primaryContactName: dto.primaryContactName.trim(),
        primaryContactEmail: dto.primaryContactEmail.trim().toLowerCase(),
        primaryContactPhone: dto.primaryContactPhone?.trim(),
        engagementType: dto.engagementType,
        serviceTier: dto.serviceTier,
        healthStatus: ClientHealthStatus.HEALTHY,
        isPortalEnabled: true,
      });

      const saved = await qr.manager.save(FirmClientOrmEntity, client);
      await this.vaultService.ensureDefaultFoldersInTx(qr.manager, tenantId, saved.id);

      // Auto-populate default statutory tasks for current month
      const currentYear = new Date().getFullYear();
      const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
      const period = `${currentYear}-${currentMonth}`;

      const defaultTasks = [
        {
          title: `GSTR-1 Monthly Return Filing - ${period}`,
          description: 'Reconcile outward sales register with e-invoicing and file GSTR-1 by 11th',
          category: TaskCategory.GST,
          statutoryPeriod: period,
          dueDate: `${currentYear}-${currentMonth}-11`,
          priority: TaskPriority.HIGH,
        },
        {
          title: `GSTR-3B Tax Offset & Payment - ${period}`,
          description: 'ITC reconciliation from GSTR-2B, calculate net cash tax, file by 20th',
          category: TaskCategory.GST,
          statutoryPeriod: period,
          dueDate: `${currentYear}-${currentMonth}-20`,
          priority: TaskPriority.CRITICAL,
        },
        {
          title: `Monthly Bank Reconciliation & Book Close - ${period}`,
          description: 'Reconcile operational bank accounts and clear suspense entries',
          category: TaskCategory.ACCOUNTING,
          statutoryPeriod: period,
          dueDate: `${currentYear}-${currentMonth}-25`,
          priority: TaskPriority.MEDIUM,
        },
      ];

      for (const t of defaultTasks) {
        const task = qr.manager.create(ComplianceTaskOrmEntity, {
          tenantId,
          clientId: saved.id,
          ...t,
          status: TaskStatus.NOT_STARTED,
        });
        await qr.manager.save(ComplianceTaskOrmEntity, task);
      }

      return {
        id: saved.id,
        tenantId: saved.tenantId,
        companyId: saved.companyId,
        companyName: company.legalName,
        clientCode: saved.clientCode,
        primaryContactName: saved.primaryContactName,
        primaryContactEmail: saved.primaryContactEmail,
        primaryContactPhone: saved.primaryContactPhone || undefined,
        engagementType: saved.engagementType,
        serviceTier: saved.serviceTier,
        isPortalEnabled: saved.isPortalEnabled,
        healthStatus: saved.healthStatus,
        openTaskCount: 3,
        pendingDocCount: 0,
        createdAt: saved.createdAt.toISOString(),
        updatedAt: saved.updatedAt.toISOString(),
      };
    });
  }

  // ==========================================
  // COMPLIANCE TASK MANAGEMENT
  // ==========================================

  async listTasks(
    tenantId: string,
    filters?: { clientId?: string; status?: string; category?: string },
  ): Promise<ComplianceTaskDto[]> {
    return this.uow.executeInTransaction(async (qr) => {
      const qb = qr.manager
        .createQueryBuilder(ComplianceTaskOrmEntity, 't')
        .leftJoinAndSelect('t.client', 'c')
        .leftJoinAndSelect('c.company', 'comp')
        .leftJoinAndSelect('t.assignedToUser', 'u')
        .where('t.tenant_id = :tenantId', { tenantId });

      if (filters?.clientId) {
        qb.andWhere('t.client_id = :clientId', { clientId: filters.clientId });
      }
      if (filters?.status && filters.status !== 'ALL') {
        qb.andWhere('t.status = :status', { status: filters.status });
      }
      if (filters?.category && filters.category !== 'ALL') {
        qb.andWhere('t.category = :category', { category: filters.category });
      }

      qb.orderBy('t.due_date', 'ASC');
      const tasks = await qb.getMany();

      return tasks.map((t) => ({
        id: t.id,
        tenantId: t.tenantId,
        clientId: t.clientId,
        clientName: t.client?.company?.legalName || 'Client Entity',
        title: t.title,
        description: t.description || undefined,
        category: t.category,
        statutoryPeriod: t.statutoryPeriod,
        dueDate: t.dueDate,
        status: t.status,
        priority: t.priority,
        assignedToUserId: t.assignedToUserId || undefined,
        assignedToName: t.assignedToUser
          ? `${t.assignedToUser.firstName} ${t.assignedToUser.lastName}`.trim()
          : 'Unassigned',
        filingAcknowledgmentNumber: t.filingAcknowledgmentNumber || undefined,
        completedAt: t.completedAt ? t.completedAt.toISOString() : undefined,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }));
    });
  }

  async createTask(tenantId: string, dto: CreateComplianceTaskDto): Promise<ComplianceTaskDto> {
    return this.uow.executeInTransaction(async (qr) => {
      const client = await qr.manager.findOne(FirmClientOrmEntity, {
        where: { id: dto.clientId, tenantId },
        relations: ['company'],
      });
      if (!client) {
        throw new NotFoundException(`Firm client '${dto.clientId}' not found.`);
      }

      const task = qr.manager.create(ComplianceTaskOrmEntity, {
        tenantId,
        clientId: dto.clientId,
        title: dto.title.trim(),
        description: dto.description?.trim(),
        category: dto.category,
        statutoryPeriod: dto.statutoryPeriod,
        dueDate: dto.dueDate,
        priority: dto.priority || TaskPriority.MEDIUM,
        assignedToUserId: dto.assignedToUserId || null,
        status: TaskStatus.NOT_STARTED,
      });

      const saved = await qr.manager.save(ComplianceTaskOrmEntity, task);

      return {
        id: saved.id,
        tenantId: saved.tenantId,
        clientId: saved.clientId,
        clientName: client.company?.legalName,
        title: saved.title,
        description: saved.description || undefined,
        category: saved.category,
        statutoryPeriod: saved.statutoryPeriod,
        dueDate: saved.dueDate,
        status: saved.status,
        priority: saved.priority,
        assignedToUserId: saved.assignedToUserId || undefined,
        createdAt: saved.createdAt.toISOString(),
        updatedAt: saved.updatedAt.toISOString(),
      };
    });
  }

  async updateTaskStatus(
    tenantId: string,
    taskId: string,
    status: TaskStatus,
    filingAcknowledgmentNumber?: string,
  ): Promise<ComplianceTaskDto> {
    return this.uow.executeInTransaction(async (qr) => {
      const task = await qr.manager.findOne(ComplianceTaskOrmEntity, {
        where: { id: taskId, tenantId },
        relations: ['client', 'client.company', 'assignedToUser'],
      });
      if (!task) {
        throw new NotFoundException(`Compliance task '${taskId}' not found.`);
      }

      task.status = status;
      if (filingAcknowledgmentNumber) {
        task.filingAcknowledgmentNumber = filingAcknowledgmentNumber.trim();
      }
      if (status === TaskStatus.FILED) {
        task.completedAt = new Date();
      }

      const saved = await qr.manager.save(ComplianceTaskOrmEntity, task);

      return {
        id: saved.id,
        tenantId: saved.tenantId,
        clientId: saved.clientId,
        clientName: saved.client?.company?.legalName,
        title: saved.title,
        description: saved.description || undefined,
        category: saved.category,
        statutoryPeriod: saved.statutoryPeriod,
        dueDate: saved.dueDate,
        status: saved.status,
        priority: saved.priority,
        assignedToUserId: saved.assignedToUserId || undefined,
        assignedToName: saved.assignedToUser
          ? `${saved.assignedToUser.firstName} ${saved.assignedToUser.lastName}`.trim()
          : 'Unassigned',
        filingAcknowledgmentNumber: saved.filingAcknowledgmentNumber || undefined,
        completedAt: saved.completedAt ? saved.completedAt.toISOString() : undefined,
        createdAt: saved.createdAt.toISOString(),
        updatedAt: saved.updatedAt.toISOString(),
      };
    });
  }

  async addTaskComment(
    tenantId: string,
    taskId: string,
    userId: string,
    comment: string,
    isInternalOnly: boolean = false,
  ): Promise<TaskCommentDto> {
    return this.uow.executeInTransaction(async (qr) => {
      const task = await qr.manager.findOne(ComplianceTaskOrmEntity, {
        where: { id: taskId, tenantId },
      });
      if (!task) {
        throw new NotFoundException(`Task '${taskId}' not found.`);
      }

      const commentEntity = qr.manager.create(TaskCommentOrmEntity, {
        tenantId,
        taskId,
        userId,
        comment: comment.trim(),
        isInternalOnly,
      });

      const saved = await qr.manager.save(TaskCommentOrmEntity, commentEntity);

      return {
        id: saved.id,
        tenantId: saved.tenantId,
        taskId: saved.taskId,
        userId: saved.userId,
        comment: saved.comment,
        isInternalOnly: saved.isInternalOnly,
        createdAt: saved.createdAt.toISOString(),
      };
    });
  }

  // ==========================================
  // CLIENT DOCUMENT REQUEST PORTAL
  // ==========================================

  async listDocumentRequests(
    tenantId: string,
    clientId?: string,
  ): Promise<ClientDocumentRequestDto[]> {
    return this.uow.executeInTransaction(async (qr) => {
      const qb = qr.manager
        .createQueryBuilder(ClientDocumentRequestOrmEntity, 'd')
        .leftJoinAndSelect('d.client', 'c')
        .leftJoinAndSelect('c.company', 'comp')
        .where('d.tenant_id = :tenantId', { tenantId });

      if (clientId) {
        qb.andWhere('d.client_id = :clientId', { clientId });
      }

      qb.orderBy('d.created_at', 'DESC');
      const docs = await qb.getMany();

      return docs.map((d) => ({
        id: d.id,
        tenantId: d.tenantId,
        clientId: d.clientId,
        clientName: d.client?.company?.legalName || 'Client Entity',
        title: d.title,
        description: d.description || undefined,
        documentType: d.documentType,
        period: d.period,
        status: d.status,
        dueDate: d.dueDate || undefined,
        fileUrl: d.fileUrl || undefined,
        fileName: d.fileName || undefined,
        fileSizeBytes: d.fileSizeBytes ? Number(d.fileSizeBytes) : undefined,
        rejectionReason: d.rejectionReason || undefined,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      }));
    });
  }

  async createDocumentRequest(
    tenantId: string,
    dto: CreateDocumentRequestDto,
  ): Promise<ClientDocumentRequestDto> {
    return this.uow.executeInTransaction(async (qr) => {
      const client = await qr.manager.findOne(FirmClientOrmEntity, {
        where: { id: dto.clientId, tenantId },
        relations: ['company'],
      });
      if (!client) {
        throw new NotFoundException(`Firm client '${dto.clientId}' not found.`);
      }

      const reqEntity = qr.manager.create(ClientDocumentRequestOrmEntity, {
        tenantId,
        clientId: dto.clientId,
        title: dto.title.trim(),
        description: dto.description?.trim(),
        documentType: dto.documentType,
        period: dto.period,
        dueDate: dto.dueDate,
        status: DocumentRequestStatus.REQUESTED,
      });

      const saved = await qr.manager.save(ClientDocumentRequestOrmEntity, reqEntity);

      return {
        id: saved.id,
        tenantId: saved.tenantId,
        clientId: saved.clientId,
        clientName: client.company?.legalName,
        title: saved.title,
        description: saved.description || undefined,
        documentType: saved.documentType,
        period: saved.period,
        status: saved.status,
        dueDate: saved.dueDate || undefined,
        createdAt: saved.createdAt.toISOString(),
        updatedAt: saved.updatedAt.toISOString(),
      };
    });
  }

  async uploadClientDocument(
    tenantId: string,
    requestId: string,
    fileName: string,
    fileSizeBytes: number,
    fileUrl: string,
  ): Promise<ClientDocumentRequestDto> {
    return this.uow.executeInTransaction(async (qr) => {
      const docReq = await qr.manager.findOne(ClientDocumentRequestOrmEntity, {
        where: { id: requestId, tenantId },
        relations: ['client', 'client.company'],
      });
      if (!docReq) {
        throw new NotFoundException(`Document request '${requestId}' not found.`);
      }

      docReq.fileName = fileName;
      docReq.fileSizeBytes = fileSizeBytes;
      docReq.fileUrl = fileUrl;
      docReq.status = DocumentRequestStatus.UPLOADED;

      const saved = await qr.manager.save(ClientDocumentRequestOrmEntity, docReq);
      if (status === DocumentRequestStatus.ACCEPTED) {
        await this.vaultService.autoPlaceAcceptedRequestFile(qr.manager, tenantId, saved);
      }

      return {
        id: saved.id,
        tenantId: saved.tenantId,
        clientId: saved.clientId,
        clientName: saved.client?.company?.legalName,
        title: saved.title,
        description: saved.description || undefined,
        documentType: saved.documentType,
        period: saved.period,
        status: saved.status,
        dueDate: saved.dueDate || undefined,
        fileUrl: saved.fileUrl || undefined,
        fileName: saved.fileName || undefined,
        fileSizeBytes: Number(saved.fileSizeBytes || 0),
        createdAt: saved.createdAt.toISOString(),
        updatedAt: saved.updatedAt.toISOString(),
      };
    });
  }

  async reviewClientDocument(
    tenantId: string,
    requestId: string,
    status: DocumentRequestStatus.ACCEPTED | DocumentRequestStatus.REJECTED,
    rejectionReason?: string,
  ): Promise<ClientDocumentRequestDto> {
    return this.uow.executeInTransaction(async (qr) => {
      const docReq = await qr.manager.findOne(ClientDocumentRequestOrmEntity, {
        where: { id: requestId, tenantId },
        relations: ['client', 'client.company'],
      });
      if (!docReq) {
        throw new NotFoundException(`Document request '${requestId}' not found.`);
      }

      docReq.status = status;
      if (status === DocumentRequestStatus.REJECTED) {
        docReq.rejectionReason = rejectionReason || 'Document illegible or incomplete';
      }

      const saved = await qr.manager.save(ClientDocumentRequestOrmEntity, docReq);
      if (status === DocumentRequestStatus.ACCEPTED) {
        await this.vaultService.autoPlaceAcceptedRequestFile(qr.manager, tenantId, saved);
      }

      return {
        id: saved.id,
        tenantId: saved.tenantId,
        clientId: saved.clientId,
        clientName: saved.client?.company?.legalName,
        title: saved.title,
        description: saved.description || undefined,
        documentType: saved.documentType,
        period: saved.period,
        status: saved.status,
        dueDate: saved.dueDate || undefined,
        fileUrl: saved.fileUrl || undefined,
        fileName: saved.fileName || undefined,
        rejectionReason: saved.rejectionReason || undefined,
        createdAt: saved.createdAt.toISOString(),
        updatedAt: saved.updatedAt.toISOString(),
      };
    });
  }

  // ==========================================
  // STATUTORY COMPLIANCE CALENDAR
  // ==========================================

  async getComplianceCalendar(
    tenantId: string,
    yearMonth?: string,
  ): Promise<{
    period: string;
    totalTasks: number;
    pendingCount: number;
    filedCount: number;
    overdueCount: number;
    upcomingDeadlines: Array<{
      date: string;
      tasks: ComplianceTaskDto[];
    }>;
  }> {
    const period = yearMonth || new Date().toISOString().slice(0, 7);
    const tasks = await this.listTasks(tenantId);

    const periodTasks = tasks.filter((t) => t.dueDate.startsWith(period) || t.statutoryPeriod.includes(period));

    const today = new Date().toISOString().split('T')[0]!;
    let pendingCount = 0;
    let filedCount = 0;
    let overdueCount = 0;

    const groupedByDate: Record<string, ComplianceTaskDto[]> = {};

    for (const t of periodTasks) {
      if (t.status === TaskStatus.FILED) {
        filedCount++;
      } else {
        pendingCount++;
        if (t.dueDate < today) {
          overdueCount++;
        }
      }

      if (!groupedByDate[t.dueDate]) {
        groupedByDate[t.dueDate] = [];
      }
      groupedByDate[t.dueDate].push(t);
    }

    const upcomingDeadlines = Object.keys(groupedByDate)
      .sort()
      .map((date) => ({
        date,
        tasks: groupedByDate[date]!,
      }));

    return {
      period,
      totalTasks: periodTasks.length,
      pendingCount,
      filedCount,
      overdueCount,
      upcomingDeadlines,
    };
  }
}
