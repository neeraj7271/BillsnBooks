import {
  Controller,
  Post,
  ForbiddenException,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { requireContext } from '../../common/http/request-context';

@Controller('v1/dev')
export class DevController {
  private readonly logger = new Logger(DevController.name);

  constructor(private readonly dataSource: DataSource) {}

  @Post('replay-journeys')
  @HttpCode(HttpStatus.OK)
  async replayJourneys(@Request() req: any) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Dev endpoints are forbidden in production');
    }
    const { tenantId, userId } = requireContext(req);
    this.logger.log(`Dev replay-journeys requested by user ${userId} for tenant ${tenantId}`);

    return {
      success: true,
      message: 'Demo journeys replay runner ready. Run `pnpm test:journeys` or launch Playwright test suite.',
      triggeredAt: new Date().toISOString(),
      tenantId,
    };
  }

  @Post('clear-tenant')
  @HttpCode(HttpStatus.OK)
  async clearTenant(@Request() req: any) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Dev endpoints are forbidden in production');
    }
    const { tenantId, userId } = requireContext(req);
    this.logger.warn(`Dev clear-tenant requested by user ${userId} for tenant ${tenantId}`);

    await this.dataSource.transaction(async (em) => {
      // Safely delete all operational and master records belonging to this tenant
      // Retaining the tenant record, company record, and user credentials
      await em.query(`DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE tenant_id = $1)`, [tenantId]);
      await em.query(`DELETE FROM invoices WHERE tenant_id = $1`, [tenantId]);
      await em.query(`DELETE FROM approval_requests WHERE tenant_id = $1`, [tenantId]);
      await em.query(`DELETE FROM recurring_schedules WHERE tenant_id = $1`, [tenantId]);
      await em.query(`DELETE FROM payment_links WHERE tenant_id = $1`, [tenantId]);
      await em.query(`DELETE FROM collection_reminders WHERE tenant_id = $1`, [tenantId]);
      await em.query(`DELETE FROM bank_reconciliation_items WHERE bank_statement_id IN (SELECT id FROM bank_statements WHERE tenant_id = $1)`, [tenantId]);
      await em.query(`DELETE FROM bank_transactions WHERE tenant_id = $1`, [tenantId]);
      await em.query(`DELETE FROM bank_statements WHERE tenant_id = $1`, [tenantId]);
      await em.query(`DELETE FROM bank_accounts WHERE tenant_id = $1`, [tenantId]);
      await em.query(`DELETE FROM task_comments WHERE task_id IN (SELECT id FROM compliance_tasks WHERE tenant_id = $1)`, [tenantId]);
      await em.query(`DELETE FROM compliance_tasks WHERE tenant_id = $1`, [tenantId]);
      await em.query(`DELETE FROM client_document_requests WHERE tenant_id = $1`, [tenantId]);
      await em.query(`DELETE FROM staff_assignments WHERE client_id IN (SELECT id FROM firm_clients WHERE tenant_id = $1)`, [tenantId]);
      await em.query(`DELETE FROM firm_clients WHERE tenant_id = $1`, [tenantId]);
      await em.query(`DELETE FROM journal_entries WHERE voucher_id IN (SELECT id FROM vouchers WHERE tenant_id = $1)`, [tenantId]);
      await em.query(`DELETE FROM vouchers WHERE tenant_id = $1`, [tenantId]);
      await em.query(`DELETE FROM party_registrations WHERE party_id IN (SELECT id FROM parties WHERE tenant_id = $1)`, [tenantId]);
      await em.query(`DELETE FROM party_addresses WHERE party_id IN (SELECT id FROM parties WHERE tenant_id = $1)`, [tenantId]);
      await em.query(`DELETE FROM party_ledger_links WHERE party_id IN (SELECT id FROM parties WHERE tenant_id = $1)`, [tenantId]);
      await em.query(`DELETE FROM parties WHERE tenant_id = $1`, [tenantId]);
      await em.query(`DELETE FROM items WHERE tenant_id = $1`, [tenantId]);
      await em.query(`DELETE FROM import_rows WHERE batch_id IN (SELECT id FROM import_batches WHERE tenant_id = $1)`, [tenantId]);
      await em.query(`DELETE FROM import_batches WHERE tenant_id = $1`, [tenantId]);
      await em.query(`DELETE FROM notifications WHERE tenant_id = $1`, [tenantId]);
    });

    return {
      success: true,
      message: 'Tenant operational and master records cleared successfully.',
      clearedAt: new Date().toISOString(),
      tenantId,
    };
  }
}
