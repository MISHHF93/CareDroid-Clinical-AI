import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, parseApiResponse } from './apiClient';
import { fetchEmergencyCapacityDashboard } from './emergencyAnalyticsApi';

vi.mock('./apiClient', () => ({
  apiFetch: vi.fn(),
  getApiErrorMessage: vi.fn(() => 'API error'),
  parseApiResponse: vi.fn(),
}));

vi.mock('../config/backendApiCapabilities', () => ({
  isBackendCapabilityEnabled: vi.fn(() => true),
  UNSUPPORTED_CAPABILITY_MESSAGE: 'Capability disabled.',
}));

/**
 * 2026-08-09: fetchEmergencyCapacityDashboard() used to call the
 * Mongoose-only /api/emergency/capacity/dashboard through a capability key
 * that was statically DISABLED at the frontend layer -- the fetch never
 * fired, so HospitalMapDashboard.tsx and useOperationsHubLiveFeeds.ts always
 * silently rendered hardcoded demo numbers, in every environment, regardless
 * of backend configuration. Repointed to the real, always-available
 * /api/emergency/capacity (EmergencyOsController, TypeORM-backed). These
 * tests guard the real endpoint being called and the response shape being
 * mapped correctly -- especially that `band`, not a recomputed score
 * threshold, is what the mapped shape carries for severity, since the real
 * engine's score is a 0-100 pressure value (higher = worse), the opposite
 * convention from this page's legacy demo-only score.
 */
describe('fetchEmergencyCapacityDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, headers: new Headers() } as any);
  });

  it('calls the real, always-available /api/emergency/capacity endpoint, not the Mongoose-only dashboard route', async () => {
    vi.mocked(parseApiResponse).mockResolvedValue({
      data: {
        capacity: {
          score: 72,
          band: 'Orange',
          totalRooms: 20,
          occupiedRooms: 17,
          boardingCount: 3,
        },
      },
    } as any);

    await fetchEmergencyCapacityDashboard();

    expect(apiFetch).toHaveBeenCalledWith('/api/emergency/capacity');
  });

  it('maps EmergencyOsCapacityOutput onto the flat KPI shape consumers render, preserving band as the severity source', async () => {
    vi.mocked(parseApiResponse).mockResolvedValue({
      data: {
        capacity: {
          score: 72,
          band: 'Orange',
          totalRooms: 20,
          occupiedRooms: 17,
          boardingCount: 3,
        },
      },
    } as any);

    const result = await fetchEmergencyCapacityDashboard();

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({
      score: 72,
      band: 'Orange',
      diversion: false,
      totalBeds: 20,
      occupiedBeds: 17,
      availableBeds: 3,
      boardingPatients: 3,
      source: 'live',
    });
  });

  it('never maps the engine\'s own `units` (measurement-unit labels) onto a hospital-ward breakdown', async () => {
    vi.mocked(parseApiResponse).mockResolvedValue({
      data: {
        capacity: {
          score: 40,
          band: 'Green',
          totalRooms: 10,
          occupiedRooms: 4,
          boardingCount: 0,
          units: { totalPatients: 'patients', occupiedRooms: 'rooms' },
        },
      },
    } as any);

    const result = await fetchEmergencyCapacityDashboard();

    expect((result.data as any).units).toBeUndefined();
  });

  it('clamps occupiedRooms so availableBeds is never negative on a malformed payload', async () => {
    vi.mocked(parseApiResponse).mockResolvedValue({
      data: { capacity: { score: 90, band: 'Red', totalRooms: 10, occupiedRooms: 999, boardingCount: 5 } },
    } as any);

    const result = await fetchEmergencyCapacityDashboard();

    expect(result.data).toEqual(
      expect.objectContaining({ totalBeds: 10, occupiedBeds: 10, availableBeds: 0 }),
    );
  });

  it('degrades to ok:false, not fabricated data, when the capacity payload is missing from a 200 response', async () => {
    vi.mocked(parseApiResponse).mockResolvedValue({ data: {} } as any);

    const result = await fetchEmergencyCapacityDashboard();

    expect(result.ok).toBe(false);
    expect(result.data).toBeNull();
  });

  it('degrades to ok:false, not fabricated data, on a network/API failure', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: false, status: 503, headers: new Headers() } as any);
    vi.mocked(parseApiResponse).mockResolvedValue({ message: 'Service unavailable' } as any);

    const result = await fetchEmergencyCapacityDashboard();

    expect(result.ok).toBe(false);
    expect(result.data).toBeNull();
  });
});
