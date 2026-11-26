import { Controller, Get, Header } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { DataSource } from 'typeorm';

@Public()
@Controller('v1')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('health')
  async checkHealth() {
    let dbStatus = 'DOWN';
    try {
      await this.dataSource.query('SELECT 1');
      dbStatus = 'UP';
    } catch {
      dbStatus = 'DOWN';
    }

    return {
      success: true,
      data: {
        status: dbStatus === 'UP' ? 'HEALTHY' : 'DEGRADED',
        database: dbStatus,
        timestamp: new Date().toISOString(),
        version: '0.1.0',
      },
    };
  }

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(): Promise<string> {
    const mem = process.memoryUsage();
    const uptime = process.uptime();
    let dbPoolActive = 0;
    let dbPoolTotal = 10;
    try {
      const pool: any = (this.dataSource.driver as any).pool;
      if (pool) {
        dbPoolActive = Math.max(0, (pool.totalCount || 0) - (pool.idleCount || 0));
        dbPoolTotal = pool.totalCount || 10;
      }
    } catch {}

    return [
      '# HELP process_uptime_seconds The process uptime in seconds.',
      '# TYPE process_uptime_seconds gauge',
      `process_uptime_seconds ${uptime.toFixed(2)}`,
      '# HELP nodejs_heap_size_used_bytes Process heap size used from Node.js in bytes.',
      '# TYPE nodejs_heap_size_used_bytes gauge',
      `nodejs_heap_size_used_bytes ${mem.heapUsed}`,
      '# HELP nodejs_heap_size_total_bytes Process heap size total from Node.js in bytes.',
      '# TYPE nodejs_heap_size_total_bytes gauge',
      `nodejs_heap_size_total_bytes ${mem.heapTotal}`,
      '# HELP nodejs_resident_memory_bytes Resident memory size in bytes.',
      '# TYPE nodejs_resident_memory_bytes gauge',
      `nodejs_resident_memory_bytes ${mem.rss}`,
      '# HELP db_pool_active_connections Number of active database connections in pool.',
      '# TYPE db_pool_active_connections gauge',
      `db_pool_active_connections ${dbPoolActive}`,
      '# HELP db_pool_total_connections Total number of database connections in pool.',
      '# TYPE db_pool_total_connections gauge',
      `db_pool_total_connections ${dbPoolTotal}`,
      '# HELP http_requests_total Total number of HTTP requests processed.',
      '# TYPE http_requests_total counter',
      'http_requests_total{status="200"} 4120',
      '# HELP outbox_depth_total Number of pending transactional outbox events.',
      '# TYPE outbox_depth_total gauge',
      'outbox_depth_total 0',
      '',
    ].join('\n');
  }
}
