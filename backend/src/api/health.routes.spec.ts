import * as express from 'express';
import * as request from 'supertest';
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
        capacityService: {
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

  it('returns unhealthy when the core service registry has failed services', async () => {
    mockedCheckServiceHealth.mockResolvedValue({
      generatedAt: '2026-06-13T00:00:00.000Z',
      totals: {
        registered: 1,
        ready: 0,
        failed: 1,
      },
      services: {
        capacityService: {
          status: 'failed',
          checkedAt: '2026-06-13T00:00:00.000Z',
          error: 'boom',
        },
      },
    } as Awaited<ReturnType<typeof checkServiceHealth>>);

    const response = await request(buildApp()).get('/health').expect(503);

    expect(response.body.status).toBe('unhealthy');
    expect(response.body.components.services.status).toBe('unhealthy');
    expect(response.body.components.services.error).toContain('registered service');
  });
});
