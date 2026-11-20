import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  Request,
} from '@nestjs/common';
import { NumberingService } from './numbering.service';
import { ResetFrequency } from '@platform/shared-types';

@Controller('v1/companies/:companyId/numbering-series')
export class NumberingController {
  constructor(private readonly numberingService: NumberingService) {}

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
  async listSeries(
    @Param('companyId') companyId: string,
    @Query('docType') docType?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.numberingService.listSeries(companyId, docType, branchId);
  }

  @Post('configure')
  async configureActiveSeries(
    @Param('companyId') companyId: string,
    @Body()
    body: {
      docType: string;
      branchId?: string | null;
      prefix?: string;
      suffix?: string;
      startSeq: number;
      seqPadding?: number;
      isManual?: boolean;
    },
    @Request() req?: any,
  ) {
    const { tenantId } = this.getContext(req);
    return this.numberingService.configureActiveSeries({
      tenantId,
      companyId,
      ...body,
    });
  }

  @Post()
  async createSeries(
    @Param('companyId') companyId: string,
    @Body()
    body: {
      branchId?: string | null;
      docType: string;
      seriesCode: string;
      formatPattern: string;
      seqPadding?: number;
      startSeq?: number;
      resetFrequency?: ResetFrequency;
      isManual?: boolean;
    },
    @Request() req?: any,
  ) {
    const { tenantId } = this.getContext(req);
    return this.numberingService.createSeries({
      tenantId,
      companyId,
      ...body,
    });
  }

  @Put(':id')
  async updateSeries(
    @Param('id') seriesId: string,
    @Body()
    body: {
      seriesCode?: string;
      formatPattern?: string;
      seqPadding?: number;
      startSeq?: number;
      resetFrequency?: ResetFrequency;
      isActive?: boolean;
    },
  ) {
    return this.numberingService.updateSeries(seriesId, body);
  }

  @Get(':id/preview')
  async previewNextNumber(
    @Param('id') seriesId: string,
    @Query('branchCode') branchCode?: string,
    @Query('date') date?: string,
    @Query('customNumber') customNumber?: string,
  ) {
    return this.numberingService.previewNextNumber(seriesId, {
      branchCode,
      date,
      customNumber,
    });
  }

  @Get(':id/gaps')
  async getGapsReport(@Param('id') seriesId: string) {
    return this.numberingService.findGaps(seriesId);
  }
}

