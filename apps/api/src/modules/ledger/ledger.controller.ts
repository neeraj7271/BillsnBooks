import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Request,
} from '@nestjs/common';
import {
  LedgerService,
  CreateLedgerDto,
  UpdateLedgerDto,
  CreateLedgerGroupDto,
  UpdateLedgerGroupDto,
} from './ledger.service';
import { BusinessTemplate } from '@platform/shared-types';

@Controller('v1/companies/:companyId/ledgers')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  private getTenantId(req: any): string {
    return (
      req.user?.tenantId ||
      req.headers['x-tenant-id'] ||
      'a0000000-0000-4000-8000-000000000001'
    );
  }

  @Get('tree')
  async getLedgerTree(@Param('companyId') companyId: string, @Request() req: any) {
    const tenantId = this.getTenantId(req);
    return await this.ledgerService.getLedgerTree(tenantId, companyId);
  }

  @Get()
  async listLedgers(
    @Param('companyId') companyId: string,
    @Query('groupId') groupId: string,
    @Request() req: any,
  ) {
    const tenantId = this.getTenantId(req);
    return await this.ledgerService.listLedgers(tenantId, companyId, groupId);
  }

  @Post()
  async createLedger(
    @Param('companyId') companyId: string,
    @Body() dto: CreateLedgerDto,
    @Request() req: any,
  ) {
    const tenantId = this.getTenantId(req);
    return await this.ledgerService.createLedger(tenantId, companyId, dto);
  }

  @Patch(':ledgerId')
  async updateLedger(
    @Param('companyId') companyId: string,
    @Param('ledgerId') ledgerId: string,
    @Body() dto: UpdateLedgerDto,
    @Request() req: any,
  ) {
    const tenantId = this.getTenantId(req);
    return await this.ledgerService.updateLedger(tenantId, companyId, ledgerId, dto);
  }

  @Delete(':ledgerId')
  async deleteLedger(
    @Param('companyId') companyId: string,
    @Param('ledgerId') ledgerId: string,
    @Request() req: any,
  ) {
    const tenantId = this.getTenantId(req);
    return await this.ledgerService.deleteLedger(tenantId, companyId, ledgerId);
  }

  @Get('groups')
  async listGroups(@Param('companyId') companyId: string, @Request() req: any) {
    const tenantId = this.getTenantId(req);
    return await this.ledgerService.listGroups(tenantId, companyId);
  }

  @Post('groups')
  async createGroup(
    @Param('companyId') companyId: string,
    @Body() dto: CreateLedgerGroupDto,
    @Request() req: any,
  ) {
    const tenantId = this.getTenantId(req);
    return await this.ledgerService.createGroup(tenantId, companyId, dto);
  }

  @Patch('groups/:groupId')
  async updateGroup(
    @Param('companyId') companyId: string,
    @Param('groupId') groupId: string,
    @Body() dto: UpdateLedgerGroupDto,
    @Request() req: any,
  ) {
    const tenantId = this.getTenantId(req);
    return await this.ledgerService.updateGroup(tenantId, companyId, groupId, dto);
  }

  @Delete('groups/:groupId')
  async deleteGroup(
    @Param('companyId') companyId: string,
    @Param('groupId') groupId: string,
    @Request() req: any,
  ) {
    const tenantId = this.getTenantId(req);
    return await this.ledgerService.deleteGroup(tenantId, companyId, groupId);
  }

  @Post('seed')
  async seedCompanyCoa(
    @Param('companyId') companyId: string,
    @Body() body: { template?: BusinessTemplate },
    @Request() req: any,
  ) {
    const tenantId = this.getTenantId(req);
    return await this.ledgerService.seedCompanyCoa(
      tenantId,
      companyId,
      body.template || BusinessTemplate.TRADER,
    );
  }
}
