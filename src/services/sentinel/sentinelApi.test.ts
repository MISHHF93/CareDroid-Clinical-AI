import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetchJson = vi.hoisted(() => vi.fn());
const isBackendCapabilityEnabled = vi.hoisted(() => vi.fn());

vi.mock('../apiClient', () => ({
  apiFetchJson,
  getApiErrorMessage: (error: unknown) => (error as Error)?.message || 'API error',
}));

vi.mock('../../config/backendApiCapabilities', () => ({
  isBackendCapabilityEnabled,
}));

const {
  fetchSentinelCommandSnapshot,
  loadSentinelCommandSnapshotWithFallback,
  cacheSentinelCommandSnapshot,
  readCachedSentinelCommandSnapshot,
} = await import('./sentinelApi');

const validSnapshot = {
  units: [{ id: 'u1', status: 'transporting', freshness: 'fresh' }],
  geofences: [],
  episodes: [],
  inboundPatients: [{ id: 'i1' }],
  openAlarms: [{ id: 'a1', severity: 'critical' }],
  aiRecommendations: [{ id: 'r1' }],
};

// The dev-only offline shim (apiClient.ts's buildDevOfflineJsonBody) has no
// Sentinel-specific case, so an unreachable backend in dev mode returns this
// generic placeholder with a 200 status — the exact shape that crashed
// HospitalCommandCenter with "Cannot read properties of undefined (reading
// 'filter')" (Cycle 108), since none of these fields match SentinelCommandSnapshot.
const devOfflinePlaceholder = {
  data: null,
  items: [],
  patients: [],
  results: [],
  logs: [],
  status: 'dev-offline',
};

describe('sentinelApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    isBackendCapabilityEnabled.mockReturnValue(true);
  });

  describe('loadSentinelCommandSnapshotWithFallback', () => {
    it('returns the live snapshot when the response is well-shaped', async () => {
      apiFetchJson.mockResolvedValue({
        response: { ok: true, status: 200 },
        data: { data: validSnapshot },
      });

      const result = await loadSentinelCommandSnapshotWithFallback();

      expect(result.source).toBe('live');
      expect(result.snapshot?.units).toEqual(validSnapshot.units);
      expect(result.snapshot?.openAlarms).toEqual(validSnapshot.openAlarms);
    });

    it('treats a truthy-but-implausible response (the dev-offline placeholder shape) as unavailable, not a fabricated empty snapshot', async () => {
      apiFetchJson.mockResolvedValue({
        response: { ok: true, status: 200 },
        data: { data: devOfflinePlaceholder },
      });

      const result = await loadSentinelCommandSnapshotWithFallback();

      expect(result.snapshot).toBeNull();
      expect(result.source).toBe('unavailable');
    });

    it('normalizes a partially-shaped live snapshot instead of crashing on missing arrays', async () => {
      apiFetchJson.mockResolvedValue({
        response: { ok: true, status: 200 },
        // Real backends can add/omit fields across versions — `units` present,
        // everything else missing rather than an empty array.
        data: { data: { units: validSnapshot.units } },
      });

      const result = await loadSentinelCommandSnapshotWithFallback();

      expect(result.source).toBe('live');
      expect(result.snapshot?.units).toEqual(validSnapshot.units);
      expect(result.snapshot?.openAlarms).toEqual([]);
      expect(result.snapshot?.aiRecommendations).toEqual([]);
      expect(result.snapshot?.inboundPatients).toEqual([]);
    });

    it('falls back to a cached snapshot when the live fetch fails', async () => {
      cacheSentinelCommandSnapshot(validSnapshot as never);
      apiFetchJson.mockResolvedValue({
        response: { ok: false, status: 503 },
        data: { message: 'offline' },
      });

      const result = await loadSentinelCommandSnapshotWithFallback();

      expect(result.source).toBe('cache');
      expect(result.snapshot?.units).toEqual(validSnapshot.units);
    });

    it('throws SentinelCapabilityUnavailableError when the capability is gated off and there is no cache', async () => {
      isBackendCapabilityEnabled.mockReturnValue(false);

      await expect(loadSentinelCommandSnapshotWithFallback()).rejects.toThrow(
        /Sentinel backend capability is disabled/,
      );
    });

    it('returns unavailable, not a throw, when the capability is enabled but the live call itself fails and there is no cache', async () => {
      apiFetchJson.mockResolvedValue({
        response: { ok: false, status: 503 },
        data: { message: 'CareDroid API is not running.' },
      });

      const result = await loadSentinelCommandSnapshotWithFallback();

      expect(result.snapshot).toBeNull();
      expect(result.source).toBe('unavailable');
    });
  });

  describe('readCachedSentinelCommandSnapshot', () => {
    it('rejects a malformed cached snapshot instead of returning it as-is', () => {
      localStorage.setItem(
        'caredroid.sentinel.commandSnapshot.v1',
        JSON.stringify({ savedAt: new Date().toISOString(), snapshot: devOfflinePlaceholder }),
      );

      expect(readCachedSentinelCommandSnapshot()).toBeNull();
    });

    it('normalizes a plausible-but-partial cached snapshot on read', () => {
      localStorage.setItem(
        'caredroid.sentinel.commandSnapshot.v1',
        JSON.stringify({
          savedAt: new Date().toISOString(),
          snapshot: { units: validSnapshot.units },
        }),
      );

      const cached = readCachedSentinelCommandSnapshot();

      expect(cached?.snapshot.units).toEqual(validSnapshot.units);
      expect(cached?.snapshot.openAlarms).toEqual([]);
    });
  });

  describe('fetchSentinelCommandSnapshot', () => {
    it('is gated by isBackendCapabilityEnabled', async () => {
      isBackendCapabilityEnabled.mockReturnValue(false);

      const result = await fetchSentinelCommandSnapshot();

      expect(result.ok).toBe(false);
      expect(apiFetchJson).not.toHaveBeenCalled();
    });
  });
});
