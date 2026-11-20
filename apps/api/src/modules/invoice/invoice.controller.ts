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
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto, InvoiceStatus } from '@platform/shared-types';

@Controller('v1/companies/:companyId/invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

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
  async listInvoices(
    @Param('companyId') companyId: string,
    @Query('status') status: InvoiceStatus,
    @Query('partyId') partyId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('limit') limit: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.invoiceService.listInvoices(tenantId, companyId, {
      status,
      partyId,
      fromDate,
      toDate,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('next-number')
  async getNextInvoiceNumber(
    @Param('companyId') companyId: string,
    @Query('documentType') documentType?: string,
    @Query('branchId') branchId?: string,
    @Query('invoiceDate') invoiceDate?: string,
  ) {
    return this.invoiceService.previewNextNumber(companyId, {
      documentType,
      branchId,
      invoiceDate,
    });
  }

  @Get(':id')
  async getInvoice(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.invoiceService.getInvoice(tenantId, companyId, id);
  }

  @Post()
  async createInvoice(
    @Param('companyId') companyId: string,
    @Body() dto: CreateInvoiceDto,
    @Request() req: any,
  ) {
    const { tenantId, userId } = this.getContext(req);
    return await this.invoiceService.createInvoice(tenantId, companyId, userId, dto);
  }

  @Put(':id')
  async updateInvoice(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: CreateInvoiceDto,
    @Request() req: any,
  ) {
    const { tenantId, userId } = this.getContext(req);
    return await this.invoiceService.updateInvoice(tenantId, companyId, userId, id, dto);
  }

  @Post(':id/approve')
  async approveInvoice(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body: { comments?: string },
    @Request() req: any,
  ) {
    const { tenantId, userId } = this.getContext(req);
    return await this.invoiceService.approveInvoice(tenantId, companyId, userId, id, body?.comments);
  }

  @Post(':id/reject')
  async rejectInvoice(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Request() req: any,
  ) {
    const { tenantId, userId } = this.getContext(req);
    return await this.invoiceService.rejectInvoice(tenantId, companyId, userId, id, body?.reason || 'Rejected by approver');
  }

  @Post(':id/convert-to-tax-invoice')
  async convertToTaxInvoice(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const { tenantId, userId } = this.getContext(req);
    return await this.invoiceService.convertToTaxInvoice(tenantId, companyId, userId, id);
  }

  @Post(':id/promise-to-pay')
  async setPromiseToPay(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body: { promiseToPayDate?: string; promiseToPayNotes?: string },
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.invoiceService.setPromiseToPay(tenantId, companyId, id, body);
  }

  @Post(':id/cancel')
  async cancelInvoice(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    const { tenantId, userId } = this.getContext(req);
    return await this.invoiceService.cancelInvoice(
      tenantId,
      companyId,
      id,
      userId,
      reason || 'Order cancelled by customer',
    );
  }
}

