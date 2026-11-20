import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Request,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingScope, SettingResolutionContext } from '@platform/shared-types';

@Controller('v1/companies/:companyId/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

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
  async getAllSettings(
    @Param('companyId') companyId: string,
    @Query('branchId') branchId?: string,
    @Query('docType') docType?: string,
    @Request() req?: any,
  ) {
    const { tenantId, userId } = this.getContext(req);
    const resolutionContext: SettingResolutionContext = {
      tenantId,
      companyId,
      branchId,
      docType,
      userId,
    };
    return this.settingsService.resolveAll(resolutionContext);
  }

  @Get('single')
  async getSingleSetting(
    @Param('companyId') companyId: string,
    @Query('key') key: string,
    @Query('branchId') branchId?: string,
    @Query('docType') docType?: string,
    @Request() req?: any,
  ) {
    const { tenantId, userId } = this.getContext(req);
    const resolutionContext: SettingResolutionContext = {
      tenantId,
      companyId,
      branchId,
      docType,
      userId,
    };
    return this.settingsService.resolve(key, resolutionContext);
  }

  @Post()
  async updateSetting(
    @Param('companyId') companyId: string,
    @Body()
    body: {
      key: string;
      value: any;
      scope?: SettingScope;
      scopeId?: string | null;
      reason?: string;
    },
    @Request() req?: any,
  ) {
    const { userId } = this.getContext(req);
    const targetScope = body.scope || SettingScope.COMPANY;
    const targetScopeId =
      body.scopeId !== undefined
        ? body.scopeId
        : targetScope === SettingScope.COMPANY
        ? companyId
        : null;

    return this.settingsService.set(
      body.key,
      body.value,
      targetScope,
      targetScopeId,
      userId,
      body.reason,
    );
  }

  @Delete('override')
  async resetSetting(
    @Param('companyId') companyId: string,
    @Query('key') key: string,
    @Query('scope') scope?: SettingScope,
    @Query('scopeId') scopeId?: string,
    @Query('reason') reason?: string,
    @Request() req?: any,
  ) {
    const { userId } = this.getContext(req);
    const targetScope = scope || SettingScope.COMPANY;
    const targetScopeId = scopeId !== undefined ? scopeId : targetScope === SettingScope.COMPANY ? companyId : null;

    await this.settingsService.reset(key, targetScope, targetScopeId, userId, reason);
    return { success: true };
  }

  @Get('history')
  async getHistory(
    @Query('key') key: string,
    @Query('scope') scope?: SettingScope,
    @Query('scopeId') scopeId?: string,
  ) {
    return this.settingsService.getHistory(key, scope, scopeId);
  }

  @Post('copy')
  async copySettings(
    @Param('companyId') companyId: string,
    @Body('sourceCompanyId') sourceCompanyId: string,
    @Request() req?: any,
  ) {
    const { userId } = this.getContext(req);
    return this.settingsService.copyCompanySettings(sourceCompanyId, companyId, userId);
  }

  @Get('export')
  async exportSettings(@Param('companyId') companyId: string) {
    return this.settingsService.exportCompanySettings(companyId);
  }

  @Post('import')
  async importSettings(
    @Param('companyId') companyId: string,
    @Body('settings') settings: Record<string, any>,
    @Request() req?: any,
  ) {
    const { userId } = this.getContext(req);
    return this.settingsService.importCompanySettings(companyId, settings, userId);
  }

  @Get('snapshots/:docType/:docId')
  async getSnapshot(
    @Param('docType') docType: string,
    @Param('docId') docId: string,
  ) {
    return this.settingsService.getDocumentSnapshot(docType, docId);
  }
}

