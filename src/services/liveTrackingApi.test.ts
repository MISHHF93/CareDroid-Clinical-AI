import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/backendApiCapabilities', () => ({
  isBackendCapabilityEnabled: vi.fn((capability) => capability !== 'disabledCapability'),
}));

vi.mock('./apiClient', () => ({
  apiFetchJson: vi.fn(),
  getApiErrorMessage: vi.fn((error, response) =>
    response ? `status ${response.status}` : error?.message || 'api unavailable'
  ),
}));

vi.mock('./automationAuditLogger', () => ({
  recordAutomationBlocked: vi.fn(),
  recordAutomationFailure: vi.fn(),
}));

import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';
import { apiFetchJson } from './apiClient';
import { recordAutomationBlocked, recordAutomationFailure } from './automationAuditLogger';
import { fetchLiveTrackingCapability } from './liveTrackingApi';

describe('liveTrackingApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips network calls when a capability is disabled', async () => {
    const result = await fetchLiveTrackingCapability('disabledCapability', '/api/devices/live');

    expect(result).toMatchObject({ ok: false, unsupported: true });
    expect(isBackendCapabilityEnabled).toHaveBeenCalledWith('disabledCapability');
    expect(apiFetchJson).not.toHaveBeenCalled();
    expect(recordAutomationBlocked).toHaveBeenCalledWith(
      expect.objectContaining({
        toolCalled: 'disabledCapability',
        reason: 'Backend capability is disabled.',
      })
    );
  });

  it('normalizes successful demo contract responses', async () => {
    apiFetchJson.mockResolvedValueOnce({
      response: { ok: true, status: 200 },
      data: {
        success: true,
        demo: true,
        sourceLabel: 'Backend demo contract',
        generatedAt: '2026-05-24T12:00:00.000Z',
        message: 'Demo data returned.',
        data: { devices: [{ id: 'device-1' }] },
      },
    });

    const result = await fetchLiveTrackingCapability('telemetryLive', '/api/telemetry/live');

    expect(result).toMatchObject({
      ok: true,
      demo: true,
      sourceLabel: 'Backend demo contract',
      generatedAt: '2026-05-24T12:00:00.000Z',
      message: 'Demo data returned.',
      payload: { devices: [{ id: 'device-1' }] },
    });
  });

  it('returns a safe failure result for unavailable backend routes', async () => {
    apiFetchJson.mockRejectedValueOnce(new Error('backend unavailable'));

    const result = await fetchLiveTrackingCapability('hospitalMap', '/api/hospital-map/floors');

    expect(result).toMatchObject({
      ok: false,
      unsupported: false,
      message: 'backend unavailable',
    });
    expect(recordAutomationFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        toolCalled: 'hospitalMap',
        error: expect.any(Error),
      })
    );
  });
});
