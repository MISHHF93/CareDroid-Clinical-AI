import { MOHFHIRService } from './moh-fhir.service';

/**
 * HEAL: MohFhirService.checkHealth() used to report `status: 'ready'`
 * whenever `config.enabled` was true, regardless of whether MoH FHIR was
 * actually reachable (connect() just copied `config.enabled` into
 * `connected`, and checkHealth() echoed that back -- no network call ever
 * happened). This suite proves the fixed version performs a real probe and
 * reports something other than 'ready' when there's no real backend to
 * reach, even though config is fully "enabled".
 */
describe('MOHFHIRService.checkHealth (HEAL)', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('reports not_connected (not "ready") when MoH FHIR is not configured', async () => {
    delete process.env.MOH_FHIR_BASE_URL;
    delete process.env.MOH_CLIENT_ID;
    delete process.env.MOH_CLIENT_SECRET;

    const service = new MOHFHIRService();
    const health = await service.checkHealth();

    expect(health.status).toBe('not_connected');
    expect(health.configured).toBe(false);
    expect(service.isConnected()).toBe(false);
  });

  // The core regression case: config.enabled ends up true (a base URL is
  // set), but nothing real is listening at that address, so a genuine probe
  // must fail -- proving config presence alone can no longer fabricate
  // "ready". 127.0.0.1:1 is a reserved, essentially-always-closed port, so
  // the connection is refused almost immediately instead of hanging for the
  // probe's full timeout.
  it('reports something other than "ready" when enabled but unreachable', async () => {
    process.env.MOH_FHIR_BASE_URL = 'http://127.0.0.1:1/fhir';
    process.env.MOH_CLIENT_ID = 'test-client';
    process.env.MOH_CLIENT_SECRET = 'test-secret';

    const service = new MOHFHIRService();
    const health = await service.checkHealth();

    expect(health.configured).toBe(true);
    expect(health.status).not.toBe('ready');
    expect(['unreachable', 'not_connected', 'degraded']).toContain(health.status);
    expect(health.error).toEqual(expect.any(String));
    expect(service.isConnected()).toBe(false);
  }, 15000);

  it('reports degraded when the configured base URL is not a valid URL', async () => {
    process.env.MOH_FHIR_BASE_URL = 'not-a-valid-url';
    process.env.MOH_CLIENT_ID = 'test-client';
    process.env.MOH_CLIENT_SECRET = 'test-secret';

    const service = new MOHFHIRService();
    const health = await service.checkHealth();

    expect(health.status).toBe('degraded');
    expect(health.configured).toBe(true);
    expect(service.isConnected()).toBe(false);
  });

  it('connect() no longer echoes config presence into `connected`', async () => {
    process.env.MOH_FHIR_BASE_URL = 'http://127.0.0.1:1/fhir';
    process.env.MOH_CLIENT_ID = 'test-client';
    process.env.MOH_CLIENT_SECRET = 'test-secret';

    const service = new MOHFHIRService();
    await service.connect();

    // Previously: connect() set connected = config.enabled = true here,
    // with zero network calls made. Now `connected` only ever changes
    // inside checkHealth()'s real probe.
    expect(service.isConnected()).toBe(false);
  });
});
