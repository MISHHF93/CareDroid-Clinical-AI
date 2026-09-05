import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./apiClient', () => ({
  apiFetchJson: vi.fn(),
  getApiErrorMessage: vi.fn((err, res) => res?.statusText || err?.message || 'API error'),
}));

import { apiFetchJson } from './apiClient';
import configService from './configService';
import logger from '../utils/logger';

describe('configService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns defaults metadata when system config request fails', async () => {
    vi.mocked(apiFetchJson).mockResolvedValueOnce({
      response: {
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      } as unknown as Response,
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
    vi.mocked(apiFetchJson).mockResolvedValueOnce({
      response: { ok: true, status: 200 } as unknown as Response,
      data: {
        rag: { enabled: true, topK: 3, minScore: 0.5 },
        session: { idleTimeoutMs: 1, absoluteTimeoutMs: 2 },
      },
    });

    const result = await configService.getSystemConfig();
    expect(result.rag.enabled).toBe(true);
    expect(result.emergencyOs.status).toBe('unknown');
    expect(result._meta.ok).toBe(true);
    expect(result._meta.fromDefaults).toBe(false);
  });

  /**
   * React StrictMode runs every effect twice in development and aborts the
   * first run's fetches; navigating away aborts whatever is still in flight.
   * A single page load produced 7 aborted API requests, and logging each at
   * error level put "Config fetch error" lines on a page whose endpoints all
   * answer 200 — noise indistinguishable from a real outage (2026-09-04).
   */
  it('logs a cancelled request at debug, not error, while still returning defaults', async () => {
    const abort = Object.assign(new Error('The user aborted a request.'), { name: 'AbortError' });
    vi.mocked(apiFetchJson).mockRejectedValueOnce(abort);
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const debugSpy = vi.spyOn(logger, 'debug').mockImplementation(() => undefined);

    const result = await configService.getSystemConfig();

    expect(errorSpy).not.toHaveBeenCalled();
    expect(debugSpy).toHaveBeenCalledWith(
      expect.stringContaining('Config fetch cancelled'),
      expect.anything(),
    );
    expect(result._meta.fromDefaults).toBe(true);
  });

  it('still logs a genuine fetch failure at error level', async () => {
    vi.mocked(apiFetchJson).mockRejectedValueOnce(new Error('Network down'));
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => undefined);

    const result = await configService.getSystemConfig();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Config fetch error'),
      expect.anything(),
    );
    expect(result._meta.fromDefaults).toBe(true);
  });
});
