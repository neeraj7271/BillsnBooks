import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Res,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { requireContext } from '../../common/http/request-context';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportService } from './import.service';
import { ExcelTemplateService, TemplateType } from './excel-template.service';
import { BulkResolveMastersDto } from './import-masters.service';
import {
  ColumnMappingConfig,
  BulkFixRowsRequest,
  RiskApprovalState,
  ImportType,
} from '@platform/shared-types';

@Controller('v1/companies/:companyId/imports')
export class ImportController {
  constructor(
    private readonly importService: ImportService,
    private readonly templateService: ExcelTemplateService,
  ) {}

  private getContext(req: any, companyId: string) {
    const { tenantId, userId } = requireContext(req);
    return { tenantId, userId, companyId };
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('companyId') companyId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('importType') importType: ImportType = ImportType.SALES_REGISTER,
    @Body('branchId') branchId?: string,
    @Request() req?: any,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file uploaded. Please attach an Excel (.xlsx) or CSV file.');
    }

    const { tenantId, userId } = this.getContext(req, companyId);
    const result = await this.importService.uploadFile(
      tenantId,
      companyId,
      userId,
      file.buffer,
      file.originalname,
      branchId,
      importType,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Post(':batchId/map')
  async applyMapping(
    @Param('companyId') companyId: string,
    @Param('batchId') batchId: string,
    @Body() mapping: ColumnMappingConfig,
    @Request() req?: any,
  ) {
    const { tenantId } = this.getContext(req, companyId);
    const batch = await this.importService.applyMappingAndValidate(
      tenantId,
      companyId,
      batchId,
      mapping,
    );

    return {
      success: true,
      data: batch,
    };
  }

  @Get()
  async listBatches(@Param('companyId') companyId: string, @Request() req?: any) {
    const { tenantId } = this.getContext(req, companyId);
    const batches = await this.importService.listBatches(tenantId, companyId);
    return {
      success: true,
      data: batches,
    };
  }

  @Get(':batchId')
  async getBatch(
    @Param('companyId') companyId: string,
    @Param('batchId') batchId: string,
    @Request() req?: any,
  ) {
    const { tenantId } = this.getContext(req, companyId);
    const batch = await this.importService.getBatch(tenantId, companyId, batchId);
    return {
      success: true,
      data: batch,
    };
  }

  @Get(':batchId/rows')
  async getBatchRows(
    @Param('companyId') companyId: string,
    @Param('batchId') batchId: string,
    @Query('status') status?: RiskApprovalState,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Request() req?: any,
  ) {
    const { tenantId } = this.getContext(req, companyId);
    const result = await this.importService.getBatchRows(
      tenantId,
      companyId,
      batchId,
      status,
      parseInt(page, 10),
      parseInt(limit, 10),
    );

    return {
      success: true,
      data: result,
    };
  }

  @Patch(':batchId/rows/bulk-fix')
  async bulkFix(
    @Param('companyId') companyId: string,
    @Param('batchId') batchId: string,
    @Body() body: BulkFixRowsRequest,
    @Request() req?: any,
  ) {
    const { tenantId } = this.getContext(req, companyId);
    const batch = await this.importService.bulkFixRows(tenantId, companyId, batchId, body);
    return {
      success: true,
      data: batch,
    };
  }

  @Patch(':batchId/rows/:rowId')
  async updateRow(
    @Param('companyId') companyId: string,
    @Param('batchId') batchId: string,
    @Param('rowId') rowId: string,
    @Body() body: Record<string, any>,
    @Request() req?: any,
  ) {
    const { tenantId } = this.getContext(req, companyId);
    const row = await this.importService.updateRowAndRevalidate(tenantId, companyId, batchId, rowId, body);
    return {
      success: true,
      data: row,
    };
  }

  @Post(':batchId/approve')
  async approveBatch(
    @Param('companyId') companyId: string,
    @Param('batchId') batchId: string,
    @Request() req?: any,
  ) {
    const { tenantId, userId } = this.getContext(req, companyId);
    const batch = await this.importService.approveBatch(tenantId, companyId, batchId, userId);
    return {
      success: true,
      data: batch,
    };
  }

  @Get('templates/:type')
  async downloadTemplate(
    @Param('companyId') companyId: string,
    @Param('type') type: TemplateType,
    @Res() res: Response,
  ) {
    const buffer = await this.templateService.generateTemplate(type, companyId);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${type}-template.xlsx"`,
    );
    res.send(buffer);
  }

  @Get(':batchId/masters/scan')
  async scanMissingMasters(
    @Param('companyId') companyId: string,
    @Param('batchId') batchId: string,
    @Request() req?: any,
  ) {
    const { tenantId } = this.getContext(req, companyId);
    const scanResult = await this.importService.scanBatchMissingMasters(tenantId, companyId, batchId);
    return {
      success: true,
      data: scanResult,
    };
  }

  @Post(':batchId/masters/resolve')
  async resolveMissingMasters(
    @Param('companyId') companyId: string,
    @Param('batchId') batchId: string,
    @Body() body: BulkResolveMastersDto,
    @Request() req?: any,
  ) {
    const { tenantId } = this.getContext(req, companyId);
    const result = await this.importService.resolveBatchMasters(tenantId, companyId, batchId, body);
    return {
      success: true,
      data: result,
    };
  }

  @Post(':batchId/auto-fix-gst')
  async autoFixGst(
    @Param('companyId') companyId: string,
    @Param('batchId') batchId: string,
    @Request() req?: any,
  ) {
    const { tenantId } = this.getContext(req, companyId);
    const result = await this.importService.autoFixBatchGst(tenantId, companyId, batchId);
    return {
      success: true,
      data: result,
    };
  }

  @Post(':batchId/post')
  async postBatch(
    @Param('companyId') companyId: string,
    @Param('batchId') batchId: string,
    @Request() req?: any,
  ) {
    const { tenantId, userId } = this.getContext(req, companyId);
    const result = await this.importService.postBatchToVouchers(tenantId, companyId, userId, batchId);
    return {
      success: true,
      data: result,
    };
  }
}

