import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeApiPath } from '../config/api.config';

const mockAppConfig = vi.hoisted(() => ({
  app: {
    name: 'CareDroid',
    version: 'test',
    environment: 'test',
  },
  api: { baseUrl: '', wsUrl: '' },
  dev: { bearerToken: 'dev-bypass-token' },
  features: {
    enableDemoMode: false,
    allowLocalDemoAuth: false,
    enableDevAuthBypass: false,
    showDemoAuth: false,
    hideDivisionMode: false,
    enablePushNotifications: false,
    enableOfflineMode: false,
    enableBiometricAuth: false,
  },
}));

vi.mock('../config/appConfig', () => ({
  default: mockAppConfig,
}));

import {
  ApiResponseError,
  apiFetch,
  buildApiUrl,
  getApiErrorMessage,
  parseApiResponse,
} from './apiClient';

const makeResponse = (body, contentType = 'application/json', init = {}) =>
  new Response(body, {
    status: init.status || 200,
    statusText: init.statusText || 'OK',
    headers: { 'content-type': contentType },
  });

describe('normalizeApiPath', () => {
  it('prefixes backend paths without /api', () => {
    expect(normalizeApiPath('/config/system')).toBe('/api/config/system');
    expect(normalizeApiPath('tools/available')).toBe('/api/tools/available');
  });

  it('leaves /api paths and absolute URLs unchanged', () => {
    expect(normalizeApiPath('/api/audit/logs')).toBe('/api/audit/logs');
    expect(normalizeApiPath('https://example.com/api/x')).toBe('https://example.com/api/x');
    expect(normalizeApiPath('/health')).toBe('/health');
  });
});

describe('buildApiUrl', () => {
  afterEach(() => {
    mockAppConfig.api.baseUrl = '';
  });

  it('returns relative /api paths when base URL is empty', () => {
    mockAppConfig.api.baseUrl = '';
    expect(buildApiUrl('/api/config/system')).toBe('/api/config/system');
    expect(buildApiUrl('/config/system')).toBe('/api/config/system');
  });

  it('joins configured base URL with normalized paths', () => {
    mockAppConfig.api.baseUrl = 'https://api.test';
    expect(buildApiUrl('/api/health')).toBe('https://api.test/api/health');
  });
});

describe('parseApiResponse', () => {
  it('parses valid JSON responses', async () => {
    const data = await parseApiResponse(makeResponse('{"response":"ok"}'));
    expect(data).toEqual({ response: 'ok' });
  });

  it('reports HTML fallback pages as API response errors', async () => {
    await expect(parseApiResponse(makeResponse('<!DOCTYPE html><html></html>', 'text/html'))).rejects.toBeInstanceOf(
      ApiResponseError,
    );
  });
});

describe('getApiErrorMessage', () => {
  it('maps HTTP status codes', () => {
    expect(getApiErrorMessage(null, { ok: false, status: 401, statusText: 'Unauthorized' })).toMatch(/Sign in/);
    expect(getApiErrorMessage(null, { ok: false, status: 503, statusText: 'Unavailable' })).toMatch(/unavailable/);
  });

  it('maps timeout errors', () => {
    const err = new DOMException('Request timed out', 'TimeoutError');
    expect(getApiErrorMessage(err)).toMatch(/timed out/i);
  });
});

describe('apiFetch offline fallback', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('returns graceful JSON when the backend is unreachable in development', async () => {
    vi.stubGlobal('location', { hostname: 'localhost' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const response = await apiFetch('/api/emergency/whiteboard');
    expect(response.ok).toBe(true);
    const payload = await response.json();
    expect(payload.status).toBe('dev-offline');
  });
});

describe('apiFetch timeout', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  beforeEach(async () => {
    const { resetBackendReachabilityCache } = await import('./backendReachability');
    resetBackendReachabilityCache();
  });

  it('aborts when the request exceeds timeoutMs', async () => {
    localStorage.setItem('caredroid_access_token', 'test.jwt.token');
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url, init) =>
          new Promise((_, reject) => {
            init?.signal?.addEventListener('abort', () => reject(init.signal.reason));
          }),
      ),
    );

    await expect(apiFetch('/api/tenant/runtime-settings', { timeoutMs: 50 })).rejects.toMatchObject({
      name: 'TimeoutError',
    });
  });
});
