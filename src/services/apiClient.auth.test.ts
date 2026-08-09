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
