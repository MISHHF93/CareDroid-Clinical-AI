import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useIntegrationHub } from './useIntegrationHub';
import { getApiErrorMessage } from '../services/apiClient';
import { fetchIntegrationHub } from '../services/emergencyOsApi';
import {
  fetchIntegrationEvents,
  fetchInteroperabilitySummary,
} from '../services/interoperabilityApi';

vi.mock('../services/apiClient', () => ({
  getApiErrorMessage: vi.fn(),
}));

vi.mock('../services/emergencyOsApi', () => ({
  fetchIntegrationHub: vi.fn(),
}));

vi.mock('../services/interoperabilityApi', () => ({
  fetchIntegrationEvents: vi.fn(),
  fetchInteroperabilitySummary: vi.fn(),
}));

const GENERIC_FALLBACK = 'Integration Hub status is temporarily unavailable.';

/**
 * HEAL: useIntegrationHub's refresh() used to set a single fixed generic
 * string on any rejection ('Integration Hub status is temporarily
 * unavailable.'), never reading the real rejection reason at all -- a 401,
 * a 500, a timeout, and "backend not running" were all indistinguishable to
 * the user. Fixed to route the real rejection through apiClient's
 * getApiErrorMessage() (the same helper every other already-correct
 * call site in this codebase uses), falling back to the generic string only
 * when that comes back empty.
 */
describe('useIntegrationHub (HEAL)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchInteroperabilitySummary).mockResolvedValue({});
    vi.mocked(fetchIntegrationEvents).mockResolvedValue([]);
  });

  it('surfaces the real message for a simulated 401', async () => {
    const httpError: any = new Error('401 from server');
    httpError.status = 401;
    vi.mocked(fetchIntegrationHub).mockRejectedValue(httpError);
    vi.mocked(getApiErrorMessage).mockReturnValue('Sign in required to load this data.');

    const { result } = renderHook(() => useIntegrationHub());

    await waitFor(() => expect(result.current.status).toBe('error'));

    expect(getApiErrorMessage).toHaveBeenCalledWith(httpError);
    expect(result.current.error).toBe('Sign in required to load this data.');
    expect(result.current.error).not.toBe(GENERIC_FALLBACK);
  });

  it('surfaces the real message for a simulated network-unreachable failure', async () => {
    const networkError = new Error('network failure');
    vi.mocked(fetchIntegrationHub).mockRejectedValue(networkError);
    vi.mocked(getApiErrorMessage).mockReturnValue(
      'Unable to reach the API. Start the backend with `npm run dev:api` or `npm run dev:fullstack`.',
    );

    const { result } = renderHook(() => useIntegrationHub());

    await waitFor(() => expect(result.current.status).toBe('error'));

    expect(getApiErrorMessage).toHaveBeenCalledWith(networkError);
    expect(result.current.error).toBe(
      'Unable to reach the API. Start the backend with `npm run dev:api` or `npm run dev:fullstack`.',
    );
    expect(result.current.error).not.toBe(GENERIC_FALLBACK);
  });

  it('produces visibly different error text for a 401 vs. a network-unreachable failure -- not the same generic string', async () => {
    vi.mocked(fetchIntegrationHub).mockRejectedValue(
      Object.assign(new Error('401'), { status: 401 }),
    );
    vi.mocked(getApiErrorMessage).mockReturnValue('Sign in required to load this data.');
    const { result: authResult } = renderHook(() => useIntegrationHub());
    await waitFor(() => expect(authResult.current.status).toBe('error'));

    vi.mocked(fetchIntegrationHub).mockRejectedValue(new Error('network failure'));
    vi.mocked(getApiErrorMessage).mockReturnValue(
      'Unable to reach the API. Start the backend with `npm run dev:api` or `npm run dev:fullstack`.',
    );
    const { result: networkResult } = renderHook(() => useIntegrationHub());
    await waitFor(() => expect(networkResult.current.status).toBe('error'));

    expect(authResult.current.error).not.toBe(networkResult.current.error);
    expect(authResult.current.error).not.toBe(GENERIC_FALLBACK);
    expect(networkResult.current.error).not.toBe(GENERIC_FALLBACK);
  });

  it('falls back to the generic message only when the real error message is empty', async () => {
    vi.mocked(fetchIntegrationHub).mockRejectedValue(new Error(''));
    vi.mocked(getApiErrorMessage).mockReturnValue('');

    const { result } = renderHook(() => useIntegrationHub());

    await waitFor(() => expect(result.current.status).toBe('error'));

    expect(result.current.error).toBe(GENERIC_FALLBACK);
  });

  // Regression coverage for the 2026-08-27 fix: GET /interoperability/events
  // (IntegrationHubService.listRecent()) has always returned { events, count }
  // -- this hook checked payload.items, which never existed on the real
  // response, so recentEvents was always [] regardless of what the backend
  // actually persisted. Every ingested FHIR/HL7/lab/device-telemetry event
  // was silently invisible on the Integration Hub page.
  it('reads recentEvents off the real { events, count } response shape, not a nonexistent .items field', async () => {
    vi.mocked(fetchIntegrationHub).mockResolvedValue({ data: {} });
    vi.mocked(fetchIntegrationEvents).mockResolvedValue({
      events: [
        { id: 'evt-1', family: 'FHIR', eventType: 'Patient', processingStatus: 'processed' },
        {
          id: 'evt-2',
          family: 'HL7',
          eventType: 'ADT^A01',
          processingStatus: 'failed',
          error: 'boom',
        },
      ],
      count: 2,
    });

    const { result } = renderHook(() => useIntegrationHub());

    await waitFor(() => expect(result.current.recentEvents).toHaveLength(2));

    expect(result.current.recentEvents[0]).toMatchObject({ id: 'evt-1', family: 'FHIR' });
    expect(result.current.recentEvents[1]).toMatchObject({ id: 'evt-2', error: 'boom' });
  });

  it('still accepts a bare array response, for backward compatibility', async () => {
    vi.mocked(fetchIntegrationHub).mockResolvedValue({ data: {} });
    vi.mocked(fetchIntegrationEvents).mockResolvedValue([{ id: 'evt-legacy' }]);

    const { result } = renderHook(() => useIntegrationHub());

    await waitFor(() => expect(result.current.recentEvents).toHaveLength(1));
    expect(result.current.recentEvents[0]).toMatchObject({ id: 'evt-legacy' });
  });
});
