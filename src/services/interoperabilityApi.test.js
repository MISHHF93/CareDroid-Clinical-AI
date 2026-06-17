import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetch = vi.hoisted(() => vi.fn());
const parseApiResponse = vi.hoisted(() => vi.fn());

vi.mock('./apiClient', () => ({
  apiFetch,
  getApiErrorMessage: (error) => error?.message || 'API error',
  parseApiResponse,
}));

import {
  fetchIntegrationEventTrace,
  fetchIntegrationEvents,
  fetchInteroperabilitySummary,
  INTEROPERABILITY_API_ENDPOINTS,
} from './interoperabilityApi';

describe('interoperabilityApi', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    parseApiResponse.mockReset();
  });

  it('calls interoperability summary endpoint', async () => {
    parseApiResponse.mockResolvedValue({ status: 'synthetic_ready' });
    apiFetch.mockResolvedValue({ ok: true });

    await fetchInteroperabilitySummary();

    expect(apiFetch).toHaveBeenCalledWith(INTEROPERABILITY_API_ENDPOINTS.summary, {});
  });

  it('calls integration events list with limit', async () => {
    parseApiResponse.mockResolvedValue([]);
    apiFetch.mockResolvedValue({ ok: true });

    await fetchIntegrationEvents(10);

    expect(apiFetch).toHaveBeenCalledWith(`${INTEROPERABILITY_API_ENDPOINTS.events}?limit=10`, {});
  });

  it('calls integration event trace endpoint', async () => {
    parseApiResponse.mockResolvedValue({ id: 'evt-1' });
    apiFetch.mockResolvedValue({ ok: true });

    await fetchIntegrationEventTrace('evt-1');

    expect(apiFetch).toHaveBeenCalledWith(`${INTEROPERABILITY_API_ENDPOINTS.events}/evt-1`, {});
  });
});
