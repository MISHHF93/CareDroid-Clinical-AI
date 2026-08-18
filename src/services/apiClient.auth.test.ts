/**
 * apiClient auth, streaming, and axios wiring.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeApiPath } from '../config/api.config';

const mockAppConfig = vi.hoisted(() => ({
  app: {
    name: 'CareDroid',
    version: 'test',
    environment: 'test',
  },
  api: { baseUrl: '', wsUrl: 'ws://localhost:3000' },
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
  apiAxios,
  apiFetch,
  apiFetchJson,
  buildStreamUrl,
  getStoredAccessToken,
  isDevSession401RetryEligible,
  isRefreshedDevSessionUsable,
} from './apiClient';
import { clearTenantContext, setTenantContext } from './tenantContextStore';

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
    clearTenantContext();
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

  it('injects tenant headers for CareDroid API requests', async () => {
    setTenantContext({
      organizationId: 'org-1',
      workspaceId: 'workspace-1',
      userId: 'user-1',
      role: 'physician',
      subscriptionPlan: 'institutional',
      source: 'resolved',
    });

    await apiFetch('/api/config/system');

    expect(fetch).toHaveBeenCalledWith(
      '/api/config/system',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-CareDroid-Organization-Id': 'org-1',
          'X-CareDroid-Workspace-Id': 'workspace-1',
          'X-CareDroid-User-Id': 'user-1',
          'X-CareDroid-Role': 'physician',
          'X-CareDroid-Subscription-Plan': 'institutional',
        }),
      }),
    );
  });

  it('does not inject tenant headers into third-party absolute URLs', async () => {
    setTenantContext({
      organizationId: 'org-1',
      workspaceId: 'workspace-1',
      userId: 'user-1',
      role: 'physician',
      subscriptionPlan: 'institutional',
    });

    await apiFetch('https://example.invalid/collect');

    expect(fetch).toHaveBeenCalledWith(
      'https://example.invalid/collect',
      expect.objectContaining({
        headers: expect.not.objectContaining({
          'X-CareDroid-Organization-Id': 'org-1',
        }),
      }),
    );
  });

  it('short-circuits protected emergency API routes without a token', async () => {
    localStorage.clear();

    const response = await apiFetch('/api/emergency/whiteboard');

    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('lets public CareDroid API routes reach fetch without a token', async () => {
    localStorage.clear();

    await apiFetch('/api/auth/dev-session');

    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/dev-session',
      expect.objectContaining({
        headers: expect.not.objectContaining({
          Authorization: expect.any(String),
        }),
      }),
    );
  });

  it('short-circuits protected API routes without a token', async () => {
    localStorage.clear();

    const response = await apiFetch('/api/subscriptions/current');

    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('isDevSession401RetryEligible (HEAL-341)', () => {
  it('is eligible for a 401 on a protected API path not yet retried', () => {
    expect(isDevSession401RetryEligible(401, '/api/emergency/whiteboard', false)).toBe(true);
  });

  it('is not eligible for a non-401 status', () => {
    expect(isDevSession401RetryEligible(200, '/api/emergency/whiteboard', false)).toBe(false);
    expect(isDevSession401RetryEligible(403, '/api/emergency/whiteboard', false)).toBe(false);
  });

  it('is not eligible once already retried once, to prevent a retry loop', () => {
    expect(isDevSession401RetryEligible(401, '/api/emergency/whiteboard', true)).toBe(false);
  });

  it('is not eligible for a public API path', () => {
    expect(isDevSession401RetryEligible(401, '/api/auth/dev-session', false)).toBe(false);
  });

  it('is not eligible for a non-API path', () => {
    expect(isDevSession401RetryEligible(401, '/some/other/path', false)).toBe(false);
  });
});

describe('isRefreshedDevSessionUsable (HEAL-341)', () => {
  it('treats a freshly-fetched dev session as usable', () => {
    expect(isRefreshedDevSessionUsable('dev-session')).toBe(true);
  });

  it('treats an already-valid cached JWT as usable', () => {
    expect(isRefreshedDevSessionUsable('cached-jwt')).toBe(true);
  });

  it('does not treat a fallback/offline bypass as usable -- retrying would just reproduce the 401', () => {
    expect(isRefreshedDevSessionUsable('fallback-bypass')).toBe(false);
    expect(isRefreshedDevSessionUsable('local-demo-bypass')).toBe(false);
    expect(isRefreshedDevSessionUsable(undefined)).toBe(false);
  });
});

describe('buildStreamUrl', () => {
  it('normalizes notification stream paths when wsUrl is empty', () => {
    mockAppConfig.api.wsUrl = '';
    expect(buildStreamUrl('/notifications/stream')).toBe('/api/notifications/stream');
    mockAppConfig.api.wsUrl = 'ws://localhost:3000';
  });

  it('uses wsUrl host when configured', () => {
    mockAppConfig.api.wsUrl = 'ws://api.test';
    expect(buildStreamUrl('/api/notifications/stream')).toContain('api.test');
    mockAppConfig.api.wsUrl = 'ws://localhost:3000';
  });
});

describe('apiFetchJson', () => {
  beforeEach(() => {
    localStorage.setItem('caredroid_access_token', 'test-jwt');
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
    localStorage.clear();
  });

  it('returns parsed data', async () => {
    const { data } = await apiFetchJson(normalizeApiPath('/config/system'));
    expect(data).toEqual({ ok: true });
  });
});

describe('apiAxios', () => {
  it('registers request interceptors for path and auth', () => {
    expect((apiAxios.interceptors.request as any).handlers.length).toBeGreaterThan(0);
  });

  it('injects tenant headers in axios requests', () => {
    setTenantContext({
      organizationId: 'org-1',
      workspaceId: 'workspace-1',
      userId: 'user-1',
      role: 'physician',
      subscriptionPlan: 'professional',
    });

    const interceptor = (apiAxios.interceptors.request as any).handlers[0].fulfilled;
    const config: any = interceptor({ url: '/config/system', headers: {} as any });

    expect(config.headers).toMatchObject({
      'X-CareDroid-Organization-Id': 'org-1',
      'X-CareDroid-Workspace-Id': 'workspace-1',
      'X-CareDroid-Subscription-Plan': 'professional',
    });
    clearTenantContext();
  });
});
