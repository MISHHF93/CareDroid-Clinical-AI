import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetch = vi.hoisted(() => vi.fn());
const parseApiResponse = vi.hoisted(() => vi.fn());
const isBackendCapabilityEnabled = vi.hoisted(() => vi.fn());

vi.mock('./apiClient', () => ({
  apiFetch,
  getApiErrorMessage: (error) => error?.message || 'API error',
  parseApiResponse,
}));

vi.mock('../config/backendApiCapabilities', () => ({
  isBackendCapabilityEnabled,
}));

vi.mock('./tenantContextStore', () => ({
  getTenantContext: () => ({ organizationId: 'org-test' }),
}));

const { fetchEmergencyOsSettings, saveEmergencyOsSettings } = await import('./emergencySettingsApi');

describe('emergencySettingsApi CareDroid settings contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isBackendCapabilityEnabled.mockReturnValue(true);
    apiFetch.mockResolvedValue({ ok: true });
    parseApiResponse.mockResolvedValue({
      data: {
        tenantName: 'CareDroid ED',
        defaultWorkspace: 'emergency-whiteboard',
      },
    });
  });

  it('fetches the CareDroid settings endpoint', async () => {
    const result = await fetchEmergencyOsSettings();

    expect(result.ok).toBe(true);
    expect(apiFetch).toHaveBeenCalledWith('/api/emergency/settings', expect.objectContaining({ headers: {} }));
  });

  it('patches grouped settings and returns the updated envelope', async () => {
    const payload = { capacityThresholds: { warningPercent: 75 } };
    const result = await saveEmergencyOsSettings(payload);

    expect(result.ok).toBe(true);
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/emergency/settings',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });
});
