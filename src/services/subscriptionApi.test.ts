import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, parseApiResponse } from './apiClient';
import {
  fetchBillingOverview,
  fetchUsageMeteringFramework,
  fetchUsageSummary,
  recordUsageEvent,
} from './subscriptionApi';

vi.mock('./apiClient', () => ({
  apiFetch: vi.fn(),
  getApiErrorMessage: vi.fn(() => 'Request failed'),
  parseApiResponse: vi.fn(),
}));

describe('subscriptionApi metering helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiFetch.mockResolvedValue({ ok: true });
    parseApiResponse.mockResolvedValue({});
  });

  it('fetches billing overview', async () => {
    await fetchBillingOverview();

    expect(apiFetch).toHaveBeenCalledWith('/api/subscriptions/billing');
  });

  it('fetches usage summary by period', async () => {
    await fetchUsageSummary({ period: 'week' });

    expect(apiFetch).toHaveBeenCalledWith('/api/subscriptions/usage?period=week');
  });

  it('fetches billing-neutral usage metering framework by period', async () => {
    await fetchUsageMeteringFramework({ period: 'week' });

    expect(apiFetch).toHaveBeenCalledWith('/api/subscriptions/usage/metering?period=week');
  });

  it('records usage events with payload', async () => {
    await recordUsageEvent({
      eventType: 'tool_launch',
      assetId: 'qsofa',
      quantity: 1,
    });

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/subscriptions/usage/events',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          eventType: 'tool_launch',
          assetId: 'qsofa',
          quantity: 1,
        }),
      }),
    );
  });
});
