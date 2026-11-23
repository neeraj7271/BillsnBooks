import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { DataSource } from 'typeorm';

@Public()
@Controller('v1/health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
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
}

