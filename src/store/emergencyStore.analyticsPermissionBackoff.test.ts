import { afterEach, describe, expect, it, vi } from 'vitest';

// HEAL-101: GET /api/emergency/analytics requires VIEW_ANALYTICS, a permission only
// ADMIN holds (role-permissions.config.ts) -- PHYSICIAN/NURSE never have it.
// QueueIntelligencePanel calls loadEmergencyAnalytics({ force: true }) from an effect
// keyed on live queue data, which changes on nearly every realtime tick, so every
// non-admin session repeated this doomed request continuously. loadEmergencyAnalytics
// already degrades gracefully per-call (falls back to buildLocalEmergencyAnalytics) --
// this only verifies the wasted repeat network traffic stops, matching HEAL-100's
// session-level back-off for operational-intelligence.

const fetchEmergencyAnalytics = vi.fn();

vi.mock('../services/emergencyOsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/emergencyOsApi')>();
  return {
    ...actual,
    fetchEmergencyAnalytics: (...args: unknown[]) => fetchEmergencyAnalytics(...args),
  };
});

const { useEmergencyStore } = await import('./emergencyStore');

const originalState = useEmergencyStore.getState();

afterEach(() => {
  useEmergencyStore.setState(originalState, true);
  vi.clearAllMocks();
});

describe('emergencyStore loadEmergencyAnalytics 403 back-off (HEAL-101)', () => {
  // Order matters here: `analyticsPermissionDenied` is a module-level flag, not
  // Zustand state, so `useEmergencyStore.setState(originalState, true)` in afterEach
  // cannot reset it. The 403 test permanently flips it for the rest of this module's
  // lifetime, so tests exercising the still-open, still-retrying path must run first.
  it('de-dupes overlapping in-flight calls instead of firing a second request (QueueIntelligencePanel can fire its effect twice during hydration before the first call resolves)', async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    fetchEmergencyAnalytics.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const store = useEmergencyStore.getState();

    const first = store.loadEmergencyAnalytics();
    const second = store.loadEmergencyAnalytics();
    expect(fetchEmergencyAnalytics).toHaveBeenCalledTimes(1);

    resolveFetch({ data: {} });
    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(fetchEmergencyAnalytics).toHaveBeenCalledTimes(1);
    expect(firstResult).toBe(secondResult);

    // Once the in-flight request settles, a genuinely new call must fire fresh.
    fetchEmergencyAnalytics.mockResolvedValueOnce({ data: {} });
    await store.loadEmergencyAnalytics();
    expect(fetchEmergencyAnalytics).toHaveBeenCalledTimes(2);
  });

  it('keeps retrying on a non-403 failure (transient/network errors are not permission denials)', async () => {
    fetchEmergencyAnalytics.mockRejectedValue(new Error('network error'));

    const store = useEmergencyStore.getState();

    await store.loadEmergencyAnalytics();
    await store.loadEmergencyAnalytics();

    expect(fetchEmergencyAnalytics).toHaveBeenCalledTimes(2);
  });

  it('stops retrying after a 403 instead of repeating the doomed request on every call', async () => {
    const forbidden: any = new Error('You do not have permission to access this resource.');
    forbidden.status = 403;
    fetchEmergencyAnalytics.mockRejectedValue(forbidden);

    const store = useEmergencyStore.getState();

    const first = await store.loadEmergencyAnalytics();
    expect(fetchEmergencyAnalytics).toHaveBeenCalledTimes(1);
    expect(first.source).toBe('client-fallback');

    // Simulates QueueIntelligencePanel's effect re-firing on every queue-data tick.
    await store.loadEmergencyAnalytics();
    await store.loadEmergencyAnalytics();

    expect(fetchEmergencyAnalytics).toHaveBeenCalledTimes(1);
  });
});
