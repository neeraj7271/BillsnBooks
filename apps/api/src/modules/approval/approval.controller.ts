import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Request,
} from '@nestjs/common';
import { ApprovalService } from './approval.service';

@Controller('v1/companies/:companyId/approvals')
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  private getContext(req: any) {
    const tenantId =
      req.user?.tenantId ||
      req.headers['x-tenant-id'] ||
      'a0000000-0000-4000-8000-000000000001';
    const userId =
      req.user?.id ||
      req.headers['x-user-id'] ||
      'b0000000-0000-4000-8000-000000000001';

    return { tenantId, userId };
  }

  @Get()
  async listApprovals(
    @Param('companyId') companyId: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.approvalService.listPendingApprovals(tenantId, companyId);
  }

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

