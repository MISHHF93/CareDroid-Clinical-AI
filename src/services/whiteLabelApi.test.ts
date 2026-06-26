import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cacheWhiteLabelBranding,
  fetchWhiteLabelBranding,
  getCachedWhiteLabelBranding,
  getRequestedWhiteLabelTenantId,
  WHITE_LABEL_CACHE_KEY,
  WHITE_LABEL_TENANT_KEY,
} from './whiteLabelApi';
import { apiFetch } from './apiClient';

vi.mock('./apiClient', () => ({
  apiFetch: vi.fn(),
}));

describe('whiteLabelApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.history.replaceState({}, '', '/');
    apiFetch.mockResolvedValue(
      new Response(JSON.stringify({ tenantId: 'demo-care', branding: { displayName: 'Demo Care' } }), {
        status: 200,
      }),
    );
  });

  it('fetches public tenant branding by tenant id', async () => {
    const result = await fetchWhiteLabelBranding('demo-care');

    expect(apiFetch).toHaveBeenCalledWith('/api/white-label/demo-care');
    expect(result.branding.displayName).toBe('Demo Care');
  });

  it('caches and resolves requested tenant branding', () => {
    cacheWhiteLabelBranding({ tenantId: 'demo-care', branding: { displayName: 'Demo Care' } });

    expect(localStorage.getItem(WHITE_LABEL_TENANT_KEY)).toBe('demo-care');
    expect(getCachedWhiteLabelBranding()).toEqual({
      tenantId: 'demo-care',
      branding: { displayName: 'Demo Care' },
    });
    expect(getRequestedWhiteLabelTenantId()).toBe('demo-care');
    expect(localStorage.getItem(WHITE_LABEL_CACHE_KEY)).toContain('Demo Care');
  });
});
