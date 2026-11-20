import { Controller, Get, Post, Param, Query, Request } from '@nestjs/common';
import { PeriodService } from './period.service';

@Controller('v1/companies/:companyId/periods')
export class PeriodController {
  constructor(private readonly periodService: PeriodService) {}

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
  async listPeriods(
    @Param('companyId') companyId: string,
    @Query('financialYearId') financialYearId: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.periodService.listPeriods(tenantId, companyId, financialYearId);
  }

  @Post(':id/lock')
  async lockPeriod(
    @Param('companyId') companyId: string,
    @Param('id') periodId: string,
    @Request() req: any,
  ) {
    const { tenantId, userId } = this.getContext(req);
    return await this.periodService.lockPeriod(tenantId, companyId, periodId, userId);
  }

  @Post(':id/unlock')
  async unlockPeriod(
    @Param('companyId') companyId: string,
    @Param('id') periodId: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.periodService.unlockPeriod(tenantId, companyId, periodId);
  }
}

