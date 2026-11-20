import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BankingService, CreateBankAccountDto } from './banking.service';
import { ReconciliationService } from './reconciliation.service';
import { SalesDiscoveryService, ConvertTicketDto } from './sales-discovery.service';

@Controller('v1/banking')
export class BankingController {
  constructor(
    private readonly bankingService: BankingService,
    private readonly reconService: ReconciliationService,
    private readonly discoveryService: SalesDiscoveryService,
  ) {}

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

  // --- Bank Accounts ---

  @Get('accounts')
  async listAccounts(@Query('companyId') companyId: string, @Request() req: any) {
    const { tenantId } = this.getContext(req);
    return await this.bankingService.listAccounts(tenantId, companyId);
  }

  @Post('accounts')
  async createAccount(@Body() dto: CreateBankAccountDto, @Request() req: any) {
    const { tenantId } = this.getContext(req);
    return await this.bankingService.createAccount(tenantId, dto);
  }

  @Post('accounts/:id/statement')
  @UseInterceptors(FileInterceptor('file'))
  async uploadStatement(
    @Param('id') bankAccountId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No statement file provided. Please upload a CSV or Excel statement.');
    }
    const { tenantId } = this.getContext(req);
    return await this.bankingService.uploadStatement(tenantId, bankAccountId, file.buffer, file.originalname);
  }

  @Get('accounts/:id/brs')
  async getBRS(@Param('id') bankAccountId: string, @Request() req: any) {
    const { tenantId } = this.getContext(req);
    return await this.reconService.calculateBRS(tenantId, bankAccountId);
  }

  @Get('accounts/:id/transactions')
  async listTransactions(
    @Param('id') bankAccountId: string,
    @Query('status') status: string,
    @Request() req: any,
  ) {
    const { tenantId } = this.getContext(req);
    return await this.bankingService.listTransactions(tenantId, bankAccountId, status);
  }

  // --- Reconciliation Workbench ---

  @Get('transactions/:id/suggestions')
  async getSuggestions(@Param('id') transactionId: string, @Request() req: any) {
    const { tenantId } = this.getContext(req);
    return await this.reconService.getMatchSuggestions(tenantId, transactionId);
  }

  @Post('transactions/:id/match')
  async matchTransaction(
    @Param('id') transactionId: string,
    @Body('voucherId') voucherId: string,
    @Request() req: any,
  ) {
    if (!voucherId) {
      throw new BadRequestException('voucherId is required for matching.');
    }
    const { tenantId, userId } = this.getContext(req);
    return await this.reconService.matchTransaction(tenantId, transactionId, voucherId, userId);
  }

  @Post('transactions/:id/unmatch')
  async unmatchTransaction(@Param('id') transactionId: string, @Request() req: any) {
    const { tenantId } = this.getContext(req);
    await this.reconService.unmatchTransaction(tenantId, transactionId);
    return { success: true, message: 'Transaction un-reconciled successfully.' };
  }

  // --- Sales Discovery ---

  @Get('discovery/tickets')
  async getTickets(@Query('status') status: string, @Request() req: any) {
    const { tenantId } = this.getContext(req);
    return await this.discoveryService.getTickets(tenantId, status);
  }

  @Post('discovery/tickets/scan')
  async scanTickets(@Body('bankAccountId') bankAccountId: string, @Request() req: any) {
    const { tenantId } = this.getContext(req);
    return await this.discoveryService.scanAndGenerateTickets(tenantId, bankAccountId);
  }

  @Post('discovery/tickets/:id/convert')
  async convertTicket(
    @Param('id') ticketId: string,
    @Body() dto: ConvertTicketDto,
    @Request() req: any,
  ) {
    if (!dto.partyLedgerId) {
      throw new BadRequestException('partyLedgerId is required to convert ticket into double-entry voucher.');
    }
    const { tenantId, userId } = this.getContext(req);
    return await this.discoveryService.convertTicketToVoucher(tenantId, ticketId, dto, userId);
  }
}
