import { Controller, Get, Header } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { MetricsService } from './metrics.service';

@Public()
@Controller()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(): Promise<string> {
    return await this.metricsService.getPrometheusMetrics();
  }

  @Get('v1/metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetricsV1(): Promise<string> {
    return await this.metricsService.getPrometheusMetrics();
  }
}

