import { ObservabilityService } from './observability.module';

describe('ObservabilityService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function createService(health: Record<string, string>) {
    return new ObservabilityService(
      {
        recentObservability: jest.fn().mockResolvedValue({
          status: 'synthetic_ready',
          events: [],
          health,
        }),
      } as any,
      {
        getDiagnostics: jest.fn().mockReturnValue({
          engineId: 'platform-telemetry',
          generatedAt: new Date().toISOString(),
          totals: {
            bufferedEvents: 0,
            crashReports: 0,
            slowApiCount: 0,
            errorCount: 0,
          },
          categoryCounts: {},
          recentWorkflow: [],
          recentErrors: [],
          slowApiCalls: [],
          recentCrashes: [],
        }),
      } as any,
    );
  }

  it('builds a SaaS health center with all monitored domains', async () => {
    process.env.FRONTEND_VERSION = '1.2.3';
    process.env.BACKEND_VERSION = '1.2.3';

    const service = createService({
      api: 'ok',
      aiGateway: 'guarded',
      audit: 'guarded',
      externalConnectors: 'synthetic',
    });

    const result = await service.getSaasHealthCenter();

    expect(result.status).toBe('warning');
    expect(result.label).toBe('Warning');
    expect(result.summary.total).toBe(8);
    expect(result.checks.map((check) => check.id)).toEqual([
      'frontend',
      'backend',
      'api',
      'integrations',
      'tenant',
      'ai',
      'simulation',
      'observability',
    ]);
    expect(result.checks.map((check) => check.displayStatus)).toEqual(
      expect.arrayContaining(['Healthy', 'Warning']),
    );
  });

  it('rolls up critical tenant isolation failures', async () => {
    process.env.CAREDROID_TENANT_ISOLATION_DISABLED = 'true';
    const service = createService({
      api: 'ok',
      aiGateway: 'ok',
      externalConnectors: 'ok',
    });

    const result = await service.getSaasHealthCenter();

    expect(result.status).toBe('critical');
    expect(result.label).toBe('Critical');
    expect(result.checks.find((check) => check.id === 'tenant')?.displayStatus).toBe('Critical');
  });
});
