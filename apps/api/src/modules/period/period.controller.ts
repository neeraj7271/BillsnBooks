import { Controller, Get, Post, Param, Query, Request } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@platform/shared-types';
import { requireContext } from '../../common/http/request-context';
import { PeriodService } from './period.service';

@Controller('v1/companies/:companyId/periods')
export class PeriodController {
  constructor(private readonly periodService: PeriodService) {}

  private getContext(req: any) {
    return requireContext(req);
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

  @Roles(UserRole.SUPER_ADMIN, UserRole.FIRM_PARTNER)
  @Post(':id/lock')
  async lockPeriod(
    @Param('companyId') companyId: string,
    @Param('id') periodId: string,
    @Request() req: any,
  ) {
    const { tenantId, userId } = this.getContext(req);
    return await this.periodService.lockPeriod(tenantId, companyId, periodId, userId);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.FIRM_PARTNER)
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

