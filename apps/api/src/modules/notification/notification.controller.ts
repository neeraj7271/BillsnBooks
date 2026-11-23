import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Request,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { requireContext } from '../../common/http/request-context';
import { NotificationService } from './notification.service';
import { NotificationSettingsService } from './notification-settings.service';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import { CompanyOrmEntity } from '../../infrastructure/persistence/entities/company.orm-entity';

@Controller('v1')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly settingsService: NotificationSettingsService,
    private readonly schedulerService: NotificationSchedulerService,
    private readonly uow: UnitOfWorkService,
  ) {}

  private async getContext(req: any, companyIdParam?: string) {
    const { tenantId, userId } = requireContext(req);
    const companyId =
      companyIdParam || (req.query?.companyId as string | undefined);
    if (companyId) {
      const company = await this.uow.executeInTransaction(async (qr) =>
        qr.manager.findOne(CompanyOrmEntity, { where: { id: companyId, tenantId } }),
      );
      if (!company) {
        throw new NotFoundException(
          `Company '${companyId}' not found for this tenant`,
        );
      }
    }
    return { tenantId, userId, companyId };
  }

  private requireCompany(companyId?: string): string {
    if (!companyId) {
      throw new BadRequestException(
        'A companyId is required for this operation. Provide it in the path or request body.',
      );
    }
    return companyId;
  }

  // --- In-App Notifications ---

  @Get('notifications')
  async listNotifications(
    @Query('limit') limit: string,
    @Request() req: any,
  ) {
    const { tenantId, userId } = await this.getContext(req);
    return await this.notificationService.listNotifications(
      tenantId,
      userId,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Post('notifications/:id/read')
  async markRead(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const { tenantId } = await this.getContext(req);
    await this.notificationService.markAsRead(tenantId, id);
    return { success: true };
  }

  @Post('notifications/read-all')
  async markAllRead(@Request() req: any) {
    const { tenantId, userId } = await this.getContext(req);
    await this.notificationService.markAllAsRead(tenantId, userId);
    return { success: true };
  }

  // --- Notification Settings Rules ---

  @Get('companies/:companyId/notifications/settings')
  async getCompanySettings(
    @Param('companyId') companyId: string,
    @Request() req: any,
  ) {
    const { tenantId } = await this.getContext(req, companyId);
    return await this.settingsService.getCompanySettings(tenantId, companyId);
  }

  @Get('notifications/settings')
  async getSettingsRoot(@Request() req: any) {
    const { tenantId, companyId } = await this.getContext(req);
    return await this.settingsService.getCompanySettings(tenantId, this.requireCompany(companyId));
  }

  @Put('companies/:companyId/notifications/settings')
  async updateCompanySettings(
    @Param('companyId') companyId: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    const { tenantId } = await this.getContext(req, companyId);
    return await this.settingsService.updateCompanySettings(tenantId, companyId, body);
  }

  @Put('notifications/settings')
  async updateSettingsRoot(
    @Body() body: any,
    @Request() req: any,
  ) {
    const { tenantId, companyId } = await this.getContext(req, body.companyId);
    return await this.settingsService.updateCompanySettings(tenantId, this.requireCompany(companyId), body);
  }

  // --- Trigger Scheduler Scan ---

  @Post('companies/:companyId/notifications/trigger-scan')
  async triggerScan(
    @Param('companyId') companyId: string,
    @Body() body: { simulatedDate?: string },
    @Request() req: any,
  ) {
    const { tenantId } = await this.getContext(req, companyId);
    return await this.schedulerService.scanAndDispatchScheduledNotifications(
      tenantId,
      companyId,
      body?.simulatedDate,
    );
  }

  @Post('notifications/trigger-scan')
  async triggerScanRoot(
    @Body() body: { companyId?: string; simulatedDate?: string },
    @Request() req: any,
  ) {
    const { tenantId, companyId } = await this.getContext(req, body?.companyId);
    return await this.schedulerService.scanAndDispatchScheduledNotifications(
      tenantId,
      this.requireCompany(companyId),
      body?.simulatedDate,
    );
  }

  // --- Test Notification ---

  @Post('companies/:companyId/notifications/test')
  async sendTest(
    @Param('companyId') companyId: string,
    @Body() body: { channel?: string },
    @Request() req: any,
  ) {
    const { tenantId, userId } = await this.getContext(req, companyId);
    return await this.settingsService.sendTestNotification(
      tenantId,
      companyId,
      userId,
      body?.channel || 'IN_APP',
    );
  }

  @Post('notifications/test')
  async sendTestRoot(
    @Body() body: { companyId?: string; channel?: string },
    @Request() req: any,
  ) {
    const { tenantId, userId, companyId } = await this.getContext(req, body?.companyId);
    return await this.settingsService.sendTestNotification(
      tenantId,
      this.requireCompany(companyId),
      userId,
      body?.channel || 'IN_APP',
    );
  }
}
