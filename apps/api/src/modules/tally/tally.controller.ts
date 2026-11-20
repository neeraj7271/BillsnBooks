import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Request,
} from '@nestjs/common';
import { TallyGatewayService } from './tally-gateway.service';

@Controller('v1/companies/:companyId/tally')
export class TallyController {
  constructor(private readonly tallyService: TallyGatewayService) {}

  private getContext(req: any, companyId: string) {
    const tenantId =
      req?.user?.tenantId ||
      req?.headers['x-tenant-id'] ||
      'a0000000-0000-4000-8000-000000000001';
    return { tenantId, companyId };
  }

  @Get('connector')
  async getConnectorStatus(
    @Param('companyId') companyId: string,
    @Request() req?: any,
  ) {
    const { tenantId } = this.getContext(req, companyId);
    const connector = await this.tallyService.getConnectorStatus(tenantId, companyId);
    return {
      success: true,
      data: connector,
    };
  }

  @Post('heartbeat')
  async recordHeartbeat(
    @Param('companyId') companyId: string,
    @Body('machineName') machineName: string,
    @Body('tallyVersion') tallyVersion?: string,
    @Body('tallyPort') tallyPort?: number,
    @Body('activeCompany') activeCompany?: string,
    @Request() req?: any,
  ) {
    const { tenantId } = this.getContext(req, companyId);
    const connector = await this.tallyService.recordHeartbeat(
      tenantId,
      companyId,
      machineName || 'LOCAL-PC',
      tallyVersion || 'TallyPrime 4.1',
      tallyPort || 9000,
      activeCompany,
    );

    return {
      success: true,
      data: connector,
    };
  }

  @Get('masters')
  async listMasters(
    @Param('companyId') companyId: string,
    @Request() req?: any,
  ) {
    const { tenantId } = this.getContext(req, companyId);
    const masters = await this.tallyService.listCachedMasters(tenantId, companyId);
    return {
      success: true,
      data: masters,
    };
  }

  @Post('sync-masters')
  async syncMasters(
    @Param('companyId') companyId: string,
    @Body('masters') masters: any[],
    @Request() req?: any,
  ) {
    const { tenantId } = this.getContext(req, companyId);
    const result = await this.tallyService.syncMasters(
      tenantId,
      companyId,
      masters || [],
    );

    return {
      success: true,
      data: result,
    };
  }

  @Post('preview-envelope')
  async previewEnvelope(@Body() voucherData: any) {
    const xml = this.tallyService.generateTallyXmlEnvelope({
      voucherType: voucherData.voucherType || 'Sales',
      voucherNumber: voucherData.voucherNumber || 'INV-2024-001',
      voucherDate: voucherData.voucherDate || new Date().toISOString(),
      narration: voucherData.narration || 'Test Voucher',
      entries: voucherData.entries || [
        { ledgerName: 'Tata Motors Commercial Ltd', isDebit: true, amount: '11800.00' },
        { ledgerName: 'Domestic Sales Account', isDebit: false, amount: '10000.00' },
        { ledgerName: 'Output CGST Account', isDebit: false, amount: '900.00' },
        { ledgerName: 'Output SGST Account', isDebit: false, amount: '900.00' },
      ],
    });

    return {
      success: true,
      data: { xml },
    };
  }
}

