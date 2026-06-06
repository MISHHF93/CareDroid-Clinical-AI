import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

describe('MetricsController', () => {
  it('awaits Prometheus metrics before sending the response', async () => {
    const metricsText = '# HELP http_requests_total Total HTTP requests\nhttp_requests_total 1\n';
    const metricsService = {
      getMetricsAsString: jest.fn().mockResolvedValue(metricsText),
    } as unknown as MetricsService;
    const response = {
      set: jest.fn(),
      send: jest.fn(),
    };

    const controller = new MetricsController(metricsService);
    await controller.getMetrics(response as any);

    expect(metricsService.getMetricsAsString).toHaveBeenCalledTimes(1);
    expect(response.set).toHaveBeenCalledWith('Content-Type', 'text/plain; charset=utf-8');
    expect(response.send).toHaveBeenCalledWith(metricsText);
    expect(response.send).not.toHaveBeenCalledWith(expect.any(Promise));
  });
});
