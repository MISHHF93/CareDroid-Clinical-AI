import express from 'express';
import request from 'supertest';
import type healthRoutesType from './health.routes';
import type { checkServiceHealth as checkServiceHealthType } from '../services/service-registry';

jest.mock('../services/service-registry', () => ({
  checkServiceHealth: jest.fn(),
}));

const { default: healthRoutes } = jest.requireActual<{ default: typeof healthRoutesType }>(
  './health.routes',
);
const { checkServiceHealth } = jest.requireMock<{
  checkServiceHealth: jest.MockedFunction<typeof checkServiceHealthType>;
}>('../services/service-registry');
const mockedCheckServiceHealth = checkServiceHealth;

function buildApp() {
  const app = express();
  app.use('/health', healthRoutes);
  return app;
}

describe('health routes', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.MONGODB_URI;
    delete process.env.DATABASE_MONGO_URI;
    delete process.env.MQTT_BROKER_URL;
    delete process.env.MQTT_URL;
    delete process.env.MQTT_SERVER_URL;
    delete process.env.MQTT_HOST;
    delete process.env.MOH_FHIR_BASE_URL;
    delete process.env.MOH_FHIR_URL;
    delete process.env.FHIR_BASE_URL;
    delete process.env.FHIR_API_URL;
    delete process.env.WEARABLE_API_URL;
    delete process.env.WEARABLES_API_URL;
    delete process.env.WEARABLE_RPM_API_URL;
    delete process.env.WEARABLE_BASE_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns a detailed healthy response when core services are healthy', async () => {
    mockedCheckServiceHealth.mockResolvedValue({
      generatedAt: '2026-06-13T00:00:00.000Z',
      totals: {
        registered: 1,
        ready: 1,
        failed: 0,
      },
      services: {
        emsService: {
          status: 'ready',
          checkedAt: '2026-06-13T00:00:00.000Z',
        },
      },
    } as Awaited<ReturnType<typeof checkServiceHealth>>);

    const response = await request(buildApp()).get('/health').expect(200);

    expect(response.body.status).toBe('healthy');
    expect(response.body.timestamp).toEqual(expect.any(String));
    expect(response.body.responseTimeMs).toEqual(expect.any(Number));
    expect(response.body.components.database.status).toBe('not-configured');
    expect(response.body.components.services.status).toBe('healthy');
    expect(response.body.components.websocket.status).toBe('not-configured');
    expect(response.body.components.mqtt.status).toBe('not-configured');
    expect(response.body.components.mohFhirApi.status).toBe('not-configured');
    expect(response.body.components.wearableApi.status).toBe('not-configured');
  });

  // Regression coverage for the 2026-08-27 fix: this test previously asserted
  // a 503/unhealthy overall response here and locked in the bug it exposed --
  // service-registry.ts's ~24 registered services (service-registry.ts's own
  // doc comment: most are manually constructed OUTSIDE Nest DI, a standalone
  // shadow copy built solely for this health check, not the real request-serving
  // app) were marked critical:true, so a single optional/legacy service (OCR,
  // IoT digital twin, wearables, federated EMS, etc.) throwing flipped the
  // ENTIRE /health response to 503 -- and probeBackendReachability() only
  // checks response.ok, so that alone made the whole frontend show "Department
  // data unavailable" and skip real data fetching, even with both real
  // databases and every core patient/queue/EMS workflow fully healthy.
  it('degrades (not a full outage) when the registered-service registry has failed services', async () => {
    mockedCheckServiceHealth.mockResolvedValue({
      generatedAt: '2026-06-13T00:00:00.000Z',
      totals: {
        registered: 1,
        ready: 0,
        failed: 1,
      },
      services: {
        emsService: {
          status: 'failed',
          checkedAt: '2026-06-13T00:00:00.000Z',
          error: 'boom',
        },
      },
    } as Awaited<ReturnType<typeof checkServiceHealth>>);

    // The failure detail must still surface (this isn't a "hide the problem"
    // fix) -- only the overall status/HTTP code changes, from a false full
    // outage to an accurate "degraded, still usable" signal.
    const response = await request(buildApp()).get('/health').expect(200);

    expect(response.body.status).toBe('degraded');
    expect(response.body.components.services.status).toBe('unhealthy');
    expect(response.body.components.services.critical).toBe(false);
    expect(response.body.components.services.error).toContain('registered service');
  });

  // The real infrastructure dependencies must still be able to declare a
  // genuine outage -- this fix narrows WHICH component can trigger 503, it
  // doesn't remove the mechanism entirely.
  it('still returns a full 503 outage when the real SQL database is unavailable, unaffected by the registered-service fix above', async () => {
    mockedCheckServiceHealth.mockResolvedValue({
      generatedAt: '2026-06-13T00:00:00.000Z',
      totals: { registered: 1, ready: 1, failed: 0 },
      services: {
        emsService: { status: 'ready', checkedAt: '2026-06-13T00:00:00.000Z' },
      },
    } as Awaited<ReturnType<typeof checkServiceHealth>>);

    const app = express();
    app.set('typeormDataSource', { isInitialized: false });
    app.use('/health', healthRoutes);

    const response = await request(app).get('/health').expect(503);

    expect(response.body.status).toBe('unhealthy');
    expect(response.body.components.sqlDatabase.status).toBe('unhealthy');
    expect(response.body.components.sqlDatabase.critical).toBe(true);
  });
});
