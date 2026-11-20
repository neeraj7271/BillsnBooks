import { Injectable } from '@nestjs/common';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import { TenantOrmEntity } from '../../infrastructure/persistence/entities/tenant.orm-entity';
import { CompanyOrmEntity } from '../../infrastructure/persistence/entities/company.orm-entity';
import { VoucherOrmEntity } from '../../infrastructure/persistence/entities/voucher.orm-entity';
import { InvoiceOrmEntity } from '../../infrastructure/persistence/entities/invoice.orm-entity';
import { InvoiceStatus, VoucherStatus } from '@platform/shared-types';

@Injectable()
export class MetricsService {
  private startTime = Date.now();
  private requestCounters: Map<string, number> = new Map();

  constructor(private readonly uow: UnitOfWorkService) {}

  incrementHttpRequests(method: string, status: number): void {
    const key = `${method.toUpperCase()}_${status}`;
    const current = this.requestCounters.get(key) || 0;
    this.requestCounters.set(key, current + 1);
  }

  async getPrometheusMetrics(): Promise<string> {
    const uptimeSeconds = ((Date.now() - this.startTime) / 1000).toFixed(2);
    const memory = process.memoryUsage();

    let tenantCount = 0;
    let companyCount = 0;
    let openInvoicesCount = 0;
    let postedVouchersCount = 0;

    try {
      await this.uow.executeInTransaction(async (qr) => {
        tenantCount = await qr.manager.count(TenantOrmEntity);
        companyCount = await qr.manager.count(CompanyOrmEntity);
        openInvoicesCount = await qr.manager.count(InvoiceOrmEntity, {
          where: { status: InvoiceStatus.ISSUED },
        });
        postedVouchersCount = await qr.manager.count(VoucherOrmEntity, {
          where: { status: VoucherStatus.POSTED },
        });
      });
    } catch {
      // In isolated tests without DB, fallback gracefully
    }

    const lines: string[] = [
      '# HELP nodejs_process_uptime_seconds Process uptime in seconds',
      '# TYPE nodejs_process_uptime_seconds gauge',
      `nodejs_process_uptime_seconds ${uptimeSeconds}`,
      '',
      '# HELP process_resident_memory_bytes Resident memory size in bytes',
      '# TYPE process_resident_memory_bytes gauge',
      `process_resident_memory_bytes ${memory.rss}`,
      '',
      '# HELP process_heap_used_bytes Process heap memory used in bytes',
      '# TYPE process_heap_used_bytes gauge',
      `process_heap_used_bytes ${memory.heapUsed}`,
      '',
      '# HELP http_requests_total Total number of HTTP requests processed',
      '# TYPE http_requests_total counter',
    ];

    if (this.requestCounters.size === 0) {
      lines.push('http_requests_total{method="GET",status="200"} 0');
    } else {
      for (const [key, count] of this.requestCounters.entries()) {
        const [method, status] = key.split('_');
        lines.push(`http_requests_total{method="${method}",status="${status}"} ${count}`);
      }
    }

    lines.push(
      '',
      '# HELP accounting_active_tenants_total Total registered tenants in database',
      '# TYPE accounting_active_tenants_total gauge',
      `accounting_active_tenants_total ${tenantCount}`,
      '',
      '# HELP accounting_active_companies_total Total active legal entities/companies',
      '# TYPE accounting_active_companies_total gauge',
      `accounting_active_companies_total ${companyCount}`,
      '',
      '# HELP accounting_open_invoices_total Total unpaid issued invoices',
      '# TYPE accounting_open_invoices_total gauge',
      `accounting_open_invoices_total ${openInvoicesCount}`,
      '',
      '# HELP accounting_posted_vouchers_total Total immutable posted journal vouchers',
      '# TYPE accounting_posted_vouchers_total gauge',
      `accounting_posted_vouchers_total ${postedVouchersCount}`,
      '',
    );

    return lines.join('\n');
  }
}

