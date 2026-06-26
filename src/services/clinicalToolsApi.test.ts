import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./apiClient', () => ({
  apiFetch: vi.fn(),
  parseApiResponse: vi.fn(async (response) => response._json ?? {}),
  getApiErrorMessage: vi.fn((err) => err?.message || 'API error'),
}));

vi.mock('../config/backendApiCapabilities', () => ({
  isBackendCapabilityEnabled: vi.fn(() => true),
}));

import { apiFetch } from './apiClient';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';
import {
  clearClinicalToolsApiCache,
  fetchBackendClinicalTools,
  fetchClinicalToolMetadata,
  fetchToolExecutorCatalog,
  fetchToolStatistics,
  validateClinicalTool,
} from './clinicalToolsApi';

describe('clinicalToolsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearClinicalToolsApiCache();
    vi.mocked(isBackendCapabilityEnabled).mockReturnValue(true);
  });

  it('returns tools on success', async () => {
    apiFetch.mockResolvedValueOnce({
      ok: true,
      _json: { tools: [{ id: 'sofa-calculator' }], count: 1, tier: 'pro' },
    });

    const result = await fetchBackendClinicalTools();
    expect(result.ok).toBe(true);
    expect(result.tools).toHaveLength(1);
    expect(result.error).toBeUndefined();
    expect(apiFetch).toHaveBeenCalledWith('/api/tools', expect.any(Object));
  });

  it('coalesces in-flight tool list requests and reuses the short-lived cache', async () => {
    let resolveFetch;
    const pendingResponse = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    apiFetch.mockReturnValueOnce(pendingResponse);

    const first = fetchBackendClinicalTools();
    const second = fetchBackendClinicalTools();

    expect(apiFetch).toHaveBeenCalledTimes(1);
    resolveFetch({
      ok: true,
      _json: { tools: [{ id: 'sofa-calculator' }], count: 1, tier: 'pro' },
    });

    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(firstResult.ok).toBe(true);
    expect(secondResult).toBe(firstResult);

    const cached = await fetchBackendClinicalTools();
    expect(cached).toBe(firstResult);
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it('returns empty tools and error message on HTTP failure', async () => {
    apiFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      _json: { message: 'Service unavailable' },
    });

    const result = await fetchBackendClinicalTools();
    expect(result.ok).toBe(false);
    expect(result.tools).toEqual([]);
    expect(result.error).toContain('Service unavailable');
  });

  it('returns network error without throwing (catalog can render static rows)', async () => {
    apiFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

    const result = await fetchBackendClinicalTools();
    expect(result.ok).toBe(false);
    expect(result.tools).toEqual([]);
    expect(result.error).toBeTruthy();
  });

  it('skips fetch when capability disabled', async () => {
    vi.mocked(isBackendCapabilityEnabled).mockReturnValue(false);

    const result = await fetchBackendClinicalTools();
    expect(result.ok).toBe(false);
    expect(result.tools).toEqual([]);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('fetches tool metadata with an encoded id', async () => {
    apiFetch.mockResolvedValueOnce({
      ok: true,
      _json: { id: 'sofa-calculator', parameters: [] },
    });

    const result = await fetchClinicalToolMetadata('sofa-calculator');
    expect(result.ok).toBe(true);
    expect(result.data.id).toBe('sofa-calculator');
    expect(apiFetch).toHaveBeenCalledWith('/api/tools/sofa-calculator', expect.any(Object));
  });

  it('validates tool parameters without executing', async () => {
    apiFetch.mockResolvedValueOnce({
      ok: true,
      _json: { valid: true, errors: [], warnings: [] },
    });

    const result = await validateClinicalTool('lab-interpreter', { labValues: [] });
    expect(result.ok).toBe(true);
    expect(apiFetch).toHaveBeenCalledWith('/api/tools/lab-interpreter/validate', {
      method: 'POST',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ parameters: { labValues: [] } }),
    });
  });

  it('fetches executor catalog and tool statistics through guarded clients', async () => {
    apiFetch
      .mockResolvedValueOnce({ ok: true, _json: { registeredExecutorToolIds: ['sofa-calculator'] } })
      .mockResolvedValueOnce({ ok: true, _json: { totalTools: 3 } });

    await expect(fetchToolExecutorCatalog()).resolves.toMatchObject({
      ok: true,
      data: { registeredExecutorToolIds: ['sofa-calculator'] },
    });
    await expect(fetchToolStatistics()).resolves.toMatchObject({
      ok: true,
      data: { totalTools: 3 },
    });

    expect(apiFetch).toHaveBeenNthCalledWith(1, '/api/tools/catalog/executors', expect.any(Object));
    expect(apiFetch).toHaveBeenNthCalledWith(2, '/api/tools/statistics', expect.any(Object));
  });

  it('does not call validation route when tool execution capability is disabled', async () => {
    vi.mocked(isBackendCapabilityEnabled).mockImplementation((capability) => capability !== 'toolsExecute');

    const result = await validateClinicalTool('sofa-calculator', {});
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/validation API is not available/i);
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
