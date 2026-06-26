import { beforeEach, describe, expect, it, vi } from 'vitest';

const capabilityEnabled = vi.fn(() => true);
const apiFetch = vi.fn();

vi.mock('../config/backendApiCapabilities', () => ({
  isBackendCapabilityEnabled: (capability) => capabilityEnabled(capability),
  UNSUPPORTED_CAPABILITY_MESSAGE: 'Unsupported capability.',
}));

vi.mock('./apiClient', () => ({
  apiFetch: (...args) => apiFetch(...args),
  getApiErrorMessage: () => 'API error',
  parseApiResponse: async (response, { fallback }: any = {}) => response.mockData ?? fallback ?? {},
}));

const {
  acknowledgeClinicalAlertApi,
  dismissClinicalAlertApi,
  fetchClinicalAlerts,
} = await import('./clinicalAlertsApi');

describe('clinicalAlertsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capabilityEnabled.mockReturnValue(true);
    apiFetch.mockResolvedValue({
      ok: true,
      mockData: { alerts: [{ id: 'alert-1' }] },
    });
  });

  it('fetches the demo-backed clinical alerts list', async () => {
    const result = await fetchClinicalAlerts();

    expect(result.ok).toBe(true);
    expect(apiFetch).toHaveBeenCalledWith('/api/clinical/alerts', expect.any(Object));
    expect(result.data.alerts).toHaveLength(1);
  });

  it('posts acknowledge and dismiss actions to canonical routes', async () => {
    await acknowledgeClinicalAlertApi('alert-1', { acknowledgedAt: '2026-01-01T00:00:00Z' });
    await dismissClinicalAlertApi('alert-1', { reason: 'duplicate' });

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/clinical/alerts/alert-1/acknowledge',
      expect.objectContaining({ method: 'POST' })
    );
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/clinical/alerts/alert-1/dismiss',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('does not call the network when clinical alerts are disabled', async () => {
    capabilityEnabled.mockReturnValue(false);

    const result = await fetchClinicalAlerts();

    expect(result.ok).toBe(false);
    expect(result.disabled).toBe(true);
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
