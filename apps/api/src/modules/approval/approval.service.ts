import {
  Injectable,
  NotFoundException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import { ApprovalRequestOrmEntity } from '../../infrastructure/persistence/entities/approval-request.orm-entity';
import { ApprovalStatus, ApprovalRequestDto } from '@platform/shared-types';
import { InvoiceService } from '../invoice/invoice.service';

@Injectable()
export class ApprovalService {
  constructor(
    private readonly uow: UnitOfWorkService,
    @Inject(forwardRef(() => InvoiceService))
    private readonly invoiceService: InvoiceService,
  ) {}

  async listPendingApprovals(
    tenantId: string,
    companyId: string,
  ): Promise<ApprovalRequestDto[]> {
    return this.uow.executeInTransaction(async (qr) => {
      const entities = await qr.manager
        .createQueryBuilder(ApprovalRequestOrmEntity, 'ar')
        .leftJoinAndSelect('ar.requester', 'requester')
        .where('ar.tenant_id = :tenantId', { tenantId })
        .andWhere('ar.company_id = :companyId', { companyId })
        .andWhere('ar.status = :status', { status: ApprovalStatus.PENDING })
        .orderBy('ar.created_at', 'DESC')
        .getMany();

      return entities.map((e) => ({
        id: e.id,
        tenantId: e.tenantId,
        companyId: e.companyId,
        entityType: e.entityType,
        entityId: e.entityId,
        requestType: e.requestType,
        requestedBy: e.requestedBy,
        requesterName: e.requester ? `${e.requester.firstName} ${e.requester.lastName}`.trim() : 'Accountant',
        status: e.status,
        approverId: e.approverId,
        actionTimestamp: e.actionTimestamp?.toISOString(),
        comments: e.comments,
        metadata: e.metadata,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      }));
    });
  }

  async approve(
    tenantId: string,
    companyId: string,
    approverId: string,
    requestId: string,
    comments?: string,
  ) {
    const request = await this.uow.executeInTransaction(async (qr) => {
      const req = await qr.manager.findOne(ApprovalRequestOrmEntity, {
        where: { id: requestId, tenantId, companyId },
      });
      if (!req) {
        throw new NotFoundException(`Approval request '${requestId}' not found.`);
      }
      return req;
    });

    if (request.entityType === 'INVOICE') {
      return await this.invoiceService.approveInvoice(
        tenantId,
        companyId,
        approverId,
        request.entityId,
        comments,
      );
    }

    return { success: true };
  }

  async reject(
    tenantId: string,
    companyId: string,
    approverId: string,
    requestId: string,
    reason: string,
  ) {
    const request = await this.uow.executeInTransaction(async (qr) => {
      const req = await qr.manager.findOne(ApprovalRequestOrmEntity, {
        where: { id: requestId, tenantId, companyId },
      });
      if (!req) {
        throw new NotFoundException(`Approval request '${requestId}' not found.`);
      }
      return req;
    });

    if (request.entityType === 'INVOICE') {
      return await this.invoiceService.rejectInvoice(
        tenantId,
        companyId,
        approverId,
        request.entityId,
        reason,
      );
    }

    return { success: true };
  }
}

