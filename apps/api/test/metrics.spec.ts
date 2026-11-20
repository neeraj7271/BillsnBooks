import { MetricsService } from '../src/modules/metrics/metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;
  let mockUow: any;

  beforeEach(() => {
    mockUow = {
      executeInTransaction: jest.fn().mockImplementation(async (cb) => {
        const qr = {
          manager: {
            count: jest.fn().mockResolvedValue(5),
          },
        };
        return cb(qr);
      }),
    };
    service = new MetricsService(mockUow);
  });

  it('should generate valid Prometheus metric lines with system and business counters', async () => {
    service.incrementHttpRequests('GET', 200);
    service.incrementHttpRequests('POST', 201);

    const metrics = await service.getPrometheusMetrics();

    expect(metrics).toContain('# TYPE nodejs_process_uptime_seconds gauge');
    expect(metrics).toContain('process_resident_memory_bytes');
    expect(metrics).toContain('http_requests_total{method="GET",status="200"} 1');
    expect(metrics).toContain('http_requests_total{method="POST",status="201"} 1');
    expect(metrics).toContain('accounting_active_tenants_total 5');
    expect(metrics).toContain('accounting_active_companies_total 5');
  });
});

