import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Headers,
  Request,
} from '@nestjs/common';
import { VoucherService } from './voucher.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';

@Controller('v1/companies/:companyId/vouchers')
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

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
  async listVouchers(
    @Param('companyId') companyId: string,
    @Query('voucherType') voucherType: string,
    @Query('status') status: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('limit') limit: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.voucherService.listVouchers(tenantId, companyId, {
      voucherType,
      status,
      fromDate,
      toDate,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':voucherId')
  async getVoucher(
    @Param('companyId') companyId: string,
    @Param('voucherId') voucherId: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.voucherService.getVoucherById(tenantId, companyId, voucherId);
  }

  @Post()
  async createVoucher(
    @Param('companyId') companyId: string,
    @Body() dto: CreateVoucherDto,
    @Request() req: any,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    const { tenantId, userId } = this.getContext(req);
    const voucher = await this.voucherService.createAndPostVoucher(
      tenantId,
      companyId,
      userId,
      dto,
      idempotencyKey,
    );

    return {
      success: true,
      data: {
        id: voucher.id,
        voucherType: voucher.voucherType,
        voucherNumber: voucher.voucherNumber,
        voucherDate: voucher.voucherDate,
        status: voucher.status,
        totalAmount: voucher.getTotalDebit().toFixed4(),
        entries: voucher.entries.map((e) => ({
          ledgerId: e.ledgerId,
          entryType: e.entryType,
          amount: e.amount.toFixed4(),
          narration: e.narration,
          lineIndex: e.lineIndex,
        })),
      },
    };
  }

  @Post(':voucherId/reverse')
  async reverseVoucher(
    @Param('companyId') companyId: string,
    @Param('voucherId') voucherId: string,
    @Request() req: any,
  ) {
    const { tenantId, userId } = this.getContext(req);
    const reversal = await this.voucherService.reverseVoucher(
      tenantId,
      companyId,
      userId,
      voucherId,
    );

    return {
      success: true,
      data: {
        id: reversal.id,
        voucherType: reversal.voucherType,
        voucherNumber: reversal.voucherNumber,
        status: reversal.status,
        reversalOfId: voucherId,
      },
    };
  }
}
