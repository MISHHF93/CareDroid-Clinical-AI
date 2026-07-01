import { describe, expect, it, vi } from 'vitest';
import { UNIFIED_SERVICE_REGISTRY_VERSION } from '../config/unifiedServiceRegistry.config';
import { fetchUnifiedPlatformHealth, getUnifiedServiceHealthSnapshot } from './unifiedServiceRegistry';

vi.mock('./saasHealthApi', () => ({
  SAAS_HEALTH_FALLBACK: { status: 'critical', checks: [], summary: { total: 0 } },
  fetchSaasHealthCenter: vi.fn().mockResolvedValue({
    ok: true,
    message: '',
    data: {
      status: 'healthy',
      label: 'Healthy',
      summary: { healthy: 7, warning: 0, critical: 0, total: 7 },
      checks: [],
    },
  }),
}));

describe('unifiedServiceRegistry', () => {
  it('returns a frozen snapshot with services and bottlenecks', () => {
    const snapshot = getUnifiedServiceHealthSnapshot({
      sync: { status: 'test', source: 'unifiedServiceRegistry.test', stale: false, message: 'ok' },
    });

    expect(snapshot.version).toBe(UNIFIED_SERVICE_REGISTRY_VERSION);
    expect(snapshot.services.length).toBeGreaterThan(0);
    expect(snapshot.bottlenecks).toBeTruthy();
    expect(snapshot.endpoints.backendProbe).toBe('/health');
  });

  it('fetchUnifiedPlatformHealth merges SaaS health with registry snapshot', async () => {
    const bundle = await fetchUnifiedPlatformHealth();
    expect(bundle.saas.ok).toBe(true);
    expect(bundle.registry.version).toBe(UNIFIED_SERVICE_REGISTRY_VERSION);
    expect(bundle.registry.bottlenecks).toBeTruthy();
    expect(bundle.generatedAt).toBeTruthy();
  });
});