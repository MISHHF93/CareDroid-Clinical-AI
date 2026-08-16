import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useOperationsHubLiveFeeds } from './useOperationsHubLiveFeeds';

const mocks = vi.hoisted(() => ({
  fetchEmergencyCapacityDashboard: vi.fn().mockResolvedValue({ ok: true, data: {} }),
  fetchHospitalMapSnapshot: vi.fn().mockResolvedValue({}),
  fetchMedicalIotSnapshot: vi.fn().mockResolvedValue({}),
  fetchFleetCommandSnapshot: vi.fn().mockResolvedValue({}),
  fetchUnifiedPlatformHealth: vi.fn().mockResolvedValue({}),
  fetchClinicalAlerts: vi.fn(),
}));

vi.mock('../services/clinicalAlertsApi', () => ({
  fetchClinicalAlerts: () => mocks.fetchClinicalAlerts(),
}));
vi.mock('../services/emergencyAnalyticsApi', () => ({
  fetchEmergencyCapacityDashboard: () => mocks.fetchEmergencyCapacityDashboard(),
}));
vi.mock('../services/fleetTelemetryService', () => ({
  fetchFleetCommandSnapshot: (...args: unknown[]) => mocks.fetchFleetCommandSnapshot(...args),
}));
vi.mock('../services/hospitalMapService', () => ({
  fetchHospitalMapSnapshot: () => mocks.fetchHospitalMapSnapshot(),
}));
vi.mock('../services/medicalIotService', () => ({
  fetchMedicalIotSnapshot: () => mocks.fetchMedicalIotSnapshot(),
}));
vi.mock('../services/unifiedServiceRegistry', () => ({
  fetchUnifiedPlatformHealth: (...args: unknown[]) => mocks.fetchUnifiedPlatformHealth(...args),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('useOperationsHubLiveFeeds (HEAL-248)', () => {
  it('does not let a slower, superseded refresh() overwrite a faster, more recent one', async () => {
    const deferredA = deferred<unknown[]>();
    mocks.fetchClinicalAlerts.mockImplementationOnce(() => deferredA.promise);

    const { result } = renderHook(() => useOperationsHubLiveFeeds({ refreshIntervalMs: 0 }));

    await waitFor(() => expect(mocks.fetchClinicalAlerts).toHaveBeenCalledTimes(1));

    mocks.fetchClinicalAlerts.mockResolvedValueOnce([{ id: 'fresh-alert' }]);
    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() =>
      expect(result.current.liveFeeds.clinicalAlerts).toEqual([{ id: 'fresh-alert' }]),
    );

    await act(async () => {
      deferredA.resolve([{ id: 'stale-alert' }]);
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(result.current.liveFeeds.clinicalAlerts).toEqual([{ id: 'fresh-alert' }]);
  });
});
