import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./apiClient', () => ({
  apiFetchJson: vi.fn(),
  getApiErrorMessage: vi.fn((err, res) => res?.statusText || err?.message || 'API error'),
}));

import { apiFetchJson } from './apiClient';
import configService from './configService';

describe('configService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns defaults metadata when system config request fails', async () => {
    apiFetchJson.mockResolvedValueOnce({
      response: { ok: false, status: 503, statusText: 'Service Unavailable' },
      data: {},
    });

    const result = await configService.getSystemConfig();
    expect(result.rag.enabled).toBe(false);
    expect(result.emergencyOs).toMatchObject({
      conditionalRuntime: 'mongoose',
      configuredForMount: false,
      status: 'unknown',
    });
    expect(result._meta.fromDefaults).toBe(true);
    expect(result._meta.ok).toBe(false);
  });

  it('returns live data when system config succeeds', async () => {
    apiFetchJson.mockResolvedValueOnce({
      response: { ok: true, status: 200 },
      data: { rag: { enabled: true, topK: 3, minScore: 0.5 }, session: { idleTimeoutMs: 1, absoluteTimeoutMs: 2 } },
    });

    const result = await configService.getSystemConfig();
    expect(result.rag.enabled).toBe(true);
    expect(result.emergencyOs.status).toBe('unknown');
    expect(result._meta.ok).toBe(true);
    expect(result._meta.fromDefaults).toBe(false);
  });
});
