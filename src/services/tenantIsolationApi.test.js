import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchTenantDataIsolationAudit } from './tenantIsolationApi';
import { apiFetchJson } from './apiClient';

vi.mock('./apiClient', () => ({
  apiFetchJson: vi.fn(),
  getApiErrorMessage: vi.fn(() => 'Request failed'),
}));

describe('tenantIsolationApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches the tenant data isolation audit report', async () => {
    apiFetchJson.mockResolvedValue({
      response: { ok: true },
      data: { status: 'tenant_isolated', summary: { auditedDomains: 6 } },
    });

    const result = await fetchTenantDataIsolationAudit();

    expect(apiFetchJson).toHaveBeenCalledWith('/api/tenant/isolation-audit', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(result).toEqual({
      ok: true,
      data: { status: 'tenant_isolated', summary: { auditedDomains: 6 } },
      message: '',
    });
  });
});
