/**
 * apiClient auth, streaming, and axios wiring.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeApiPath } from '../config/apiEnv';

const mockAppConfig = vi.hoisted(() => ({
  api: { baseUrl: '', wsUrl: 'ws://localhost:8000' },
}));

vi.mock('../config/appConfig', () => ({
  default: mockAppConfig,
}));

import {
  apiAxios,
  apiFetch,
  apiFetchJson,
  buildStreamUrl,
  getStoredAccessToken,
} from './apiClient';

describe('getStoredAccessToken', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('prefers caredroid_access_token over legacy authToken', () => {
    localStorage.setItem('authToken', 'legacy');
    localStorage.setItem('caredroid_access_token', 'primary');
    expect(getStoredAccessToken()).toBe('primary');
  });

  it('falls back to legacy authToken', () => {
    localStorage.setItem('authToken', 'legacy-only');
    expect(getStoredAccessToken()).toBe('legacy-only');
  });
});

describe('apiFetch auth header', () => {
  beforeEach(() => {
    localStorage.setItem('caredroid_access_token', 'test-jwt');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('injects Authorization when token is stored', async () => {
    await apiFetch('/api/config/system');
    expect(fetch).toHaveBeenCalledWith(
      '/api/config/system',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-jwt',
        }),
      }),
    );
  });
});

describe('buildStreamUrl', () => {
  it('normalizes notification stream paths when wsUrl is empty', () => {
    mockAppConfig.api.wsUrl = '';
    expect(buildStreamUrl('/notifications/stream')).toBe('/api/notifications/stream');
    mockAppConfig.api.wsUrl = 'ws://localhost:8000';
  });

  it('uses wsUrl host when configured', () => {
    mockAppConfig.api.wsUrl = 'ws://api.test';
    expect(buildStreamUrl('/api/notifications/stream')).toContain('api.test');
    mockAppConfig.api.wsUrl = 'ws://localhost:8000';
  });
});

describe('apiFetchJson', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns parsed data', async () => {
    const { data } = await apiFetchJson(normalizeApiPath('/config/system'));
    expect(data).toEqual({ ok: true });
  });
});

describe('apiAxios', () => {
  it('registers request interceptors for path and auth', () => {
    expect(apiAxios.interceptors.request.handlers.length).toBeGreaterThan(0);
  });
});
