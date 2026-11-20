import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationSettingsService } from './notification-settings.service';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import { CompanyOrmEntity } from '../../infrastructure/persistence/entities/company.orm-entity';
import { TenantOrmEntity } from '../../infrastructure/persistence/entities/tenant.orm-entity';
import { UserOrmEntity } from '../../infrastructure/persistence/entities/user.orm-entity';

@Controller('v1')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly settingsService: NotificationSettingsService,
    private readonly schedulerService: NotificationSchedulerService,
    private readonly uow: UnitOfWorkService,
  ) {}

  private async getContext(req: any, companyIdParam?: string) {
    let tenantId =
      req.user?.tenantId ||
      req.headers['x-tenant-id'];
    let userId =
      req.user?.id ||
      req.headers['x-user-id'] ||
      'b0000000-0000-4000-8000-000000000001';
    let companyId =
      companyIdParam ||
      req.headers['x-company-id'] ||
      req.query?.companyId;

    if (companyId && companyId !== 'c0000000-0000-4000-8000-000000000001') {
      const company = await this.uow.executeInTransaction(async (qr) =>
        qr.manager.findOne(CompanyOrmEntity, { where: { id: companyId } }),
      );
      if (company) {
        tenantId = company.tenantId;
      }
    }

    if (!tenantId || tenantId === 'a0000000-0000-4000-8000-000000000001') {
      const firstTenant = await this.uow.executeInTransaction(async (qr) =>
        qr.manager.findOne(TenantOrmEntity, { where: {} }),
      );
      if (firstTenant) {
        tenantId = firstTenant.id;
      }
    }

    if (!companyId || companyId === 'c0000000-0000-4000-8000-000000000001') {
      const firstCompany = await this.uow.executeInTransaction(async (qr) =>
        qr.manager.findOne(CompanyOrmEntity, { where: { tenantId } }),
      );
      if (firstCompany) {
        companyId = firstCompany.id;
      }
    }

    if (!userId || userId === 'b0000000-0000-4000-8000-000000000001') {
      const firstUser = await this.uow.executeInTransaction(async (qr) =>
        qr.manager.findOne(UserOrmEntity, { where: { tenantId } }),
      );
      if (firstUser) {
        userId = firstUser.id;
      }
    }

    return { tenantId, userId, companyId };
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
    return await this.settingsService.getCompanySettings(tenantId, companyId);
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
    return await this.settingsService.updateCompanySettings(tenantId, companyId, body);
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
      companyId,
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
      companyId,
      userId,
      body?.channel || 'IN_APP',
    );
  }
}
