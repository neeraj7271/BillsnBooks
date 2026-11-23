import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Request,
  Headers,
} from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { requireContext } from '../../common/http/request-context';
import {
  RecurringScheduleStatus,
  CreateRecurringScheduleDto,
  CreatePaymentLinkDto,
  ReconcileSettlementDto,
  SendReminderDto,
} from '@platform/shared-types';

@Controller('v1/companies/:companyId/collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  private getContext(req: any) {
    return requireContext(req);
  }

  // 1. AR Ageing
  @Get('ageing/summary')
  async getArAgeingSummary(
    @Param('companyId') companyId: string,
    @Query('asOfDate') asOfDate: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.collectionsService.getArAgeingSummary(tenantId, companyId, asOfDate);
  }

  @Get('ageing/parties')
  async getPartyAgeing(
    @Param('companyId') companyId: string,
    @Query('asOfDate') asOfDate: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.collectionsService.getPartyAgeing(tenantId, companyId, asOfDate);
  }

  @Get('ageing/invoices')
  async getInvoicesAgeing(
    @Param('companyId') companyId: string,
    @Query('asOfDate') asOfDate: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.collectionsService.getInvoicesAgeing(tenantId, companyId, asOfDate);
  }

  @Post('ageing/invoices/:id/promise-to-pay')
  async setInvoicePromiseToPay(
    @Param('companyId') companyId: string,
    @Param('id') invoiceId: string,
    @Body() body: { promiseToPayDate?: string; promiseToPayNotes?: string },
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.collectionsService.setInvoicePromiseToPay(
      tenantId,
      companyId,
      invoiceId,
      body.promiseToPayDate,
      body.promiseToPayNotes,
    );
  }

  // 2. Recurring Schedules
  @Get('recurring')
  async listRecurringSchedules(
    @Param('companyId') companyId: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.collectionsService.listRecurringSchedules(tenantId, companyId);
  }

  @Post('recurring')
  async createRecurringSchedule(
    @Param('companyId') companyId: string,
    @Body() dto: CreateRecurringScheduleDto,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.collectionsService.createRecurringSchedule(tenantId, companyId, dto);
  }

  @Patch('recurring/:id/status')
  async updateRecurringStatus(
    @Param('companyId') companyId: string,
    @Param('id') scheduleId: string,
    @Body('status') status: RecurringScheduleStatus,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.collectionsService.updateRecurringScheduleStatus(
      tenantId,
      companyId,
      scheduleId,
      status,
    );
  }

  @Post('recurring/:id/run')
  async triggerRecurringRun(
    @Param('companyId') companyId: string,
    @Param('id') scheduleId: string,
    @Request() req: any,
  ) {
    const { tenantId, userId } = this.getContext(req);
    return await this.collectionsService.triggerRecurringRun(
      tenantId,
      companyId,
      userId,
      scheduleId,
    );
  }

  // 3. Payment Links
  @Get('payment-links')
  async listPaymentLinks(
    @Param('companyId') companyId: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.collectionsService.listPaymentLinks(tenantId, companyId);
  }

  @Post('payment-links')
  async createPaymentLink(
    @Param('companyId') companyId: string,
    @Body() dto: CreatePaymentLinkDto,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.collectionsService.createPaymentLink(tenantId, companyId, dto);
  }

  @Post('payment-links/:linkId/callback')
  async simulatePaymentCallback(
    @Param('companyId') companyId: string,
    @Param('linkId') linkId: string,
    @Body() body: { signature?: string; amountPaid?: string | number; providerRef?: string },
    @Headers('x-webhook-signature') signatureHeader: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.collectionsService.simulatePaymentCallback(tenantId, companyId, linkId, {
      signature: body?.signature || signatureHeader,
      amountPaid: body?.amountPaid,
      providerRef: body?.providerRef,
    });
  }

  // 4. Gateway Settlements
  @Get('settlements')
  async listSettlements(
    @Param('companyId') companyId: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.collectionsService.listSettlements(tenantId, companyId);
  }

  @Post('settlements/reconcile')
  async reconcileSettlement(
    @Param('companyId') companyId: string,
    @Body() dto: ReconcileSettlementDto,
    @Request() req: any,
  ) {
    const { tenantId, userId } = this.getContext(req);
    return await this.collectionsService.reconcileSettlement(
      tenantId,
      companyId,
      userId,
      dto,
    );
  }

  // 5. Reminders
  @Get('reminders')
  async listReminders(
    @Param('companyId') companyId: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.collectionsService.listReminders(tenantId, companyId);
  }

  @Post('reminders')
  async sendReminder(
    @Param('companyId') companyId: string,
    @Body() dto: SendReminderDto,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.collectionsService.sendReminder(tenantId, companyId, dto);
  }
}

