import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Request,
} from '@nestjs/common';
import { ApprovalService } from './approval.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@platform/shared-types';
import { requireContext } from '../../common/http/request-context';

@Controller('v1/companies/:companyId/approvals')
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  private getContext(req: any) {
    return requireContext(req);
  }

  @Get()
  async listApprovals(
    @Param('companyId') companyId: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.approvalService.listPendingApprovals(tenantId, companyId);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.FIRM_PARTNER, UserRole.CLIENT_APPROVER)
  @Post(':id/approve')
  async approve(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body: { comments?: string },
    @Request() req: any,
  ) {
    const { tenantId, userId } = this.getContext(req);
    return await this.approvalService.approve(tenantId, companyId, userId, id, body?.comments);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.FIRM_PARTNER, UserRole.CLIENT_APPROVER)
  @Post(':id/reject')
  async reject(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Request() req: any,
  ) {
    const { tenantId, userId } = this.getContext(req);
    return await this.approvalService.reject(tenantId, companyId, userId, id, body?.reason || 'Rejected');
  }
}

