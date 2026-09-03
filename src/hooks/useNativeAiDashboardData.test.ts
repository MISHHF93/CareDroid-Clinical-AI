import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useNativeAiDashboardData } from './useNativeAiDashboardData';

const mocks = vi.hoisted(() => ({
  fetchClinicalAcuityLeaderboard: vi.fn(),
  fetchNativeAiRegistry: vi.fn().mockResolvedValue({ models: [] }),
  fetchNativeAiDriftEnvelope: vi.fn().mockResolvedValue({ alerts: [] }),
}));

vi.mock('../services/nativeAiApi', () => ({
  fetchClinicalAcuityLeaderboard: (...args: unknown[]) =>
    mocks.fetchClinicalAcuityLeaderboard(...args),
  fetchNativeAiRegistry: () => mocks.fetchNativeAiRegistry(),
  fetchNativeAiDriftEnvelope: () => mocks.fetchNativeAiDriftEnvelope(),
}));

vi.mock('../services/nativeAiCore', () => ({
  buildClinicalAcuityLeaderboard: () => [],
}));

vi.mock('../services/devBackendAuth', () => ({
  ensureDevBackendSession: vi.fn().mockResolvedValue(undefined),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('useNativeAiDashboardData (HEAL-243)', () => {
  it('does not let a slower, superseded refresh() overwrite a faster, more recent one', async () => {
    const deferredA = deferred<{ entries: unknown[] }>();
    mocks.fetchClinicalAcuityLeaderboard.mockImplementationOnce(() => deferredA.promise);

    const { result, rerender } = renderHook(
      ({ patients }: { patients: unknown[] }) => useNativeAiDashboardData(patients as never, true),
      { initialProps: { patients: [{ id: 'p1' }] } },
    );

    // Wait for the first (call A) refresh to actually start.
    await waitFor(() => expect(mocks.fetchClinicalAcuityLeaderboard).toHaveBeenCalledTimes(1));

    // A new `patients` array reference re-triggers refresh() (call B) while
    // call A is still pending on deferredA -- call B resolves immediately.
    mocks.fetchClinicalAcuityLeaderboard.mockResolvedValueOnce({
      entries: [{ patientId: 'fresh', score: 9 }],
    });
    rerender({ patients: [{ id: 'p1' }, { id: 'p2' }] });

    await waitFor(() => expect(result.current.acuitySource).toBe('api'));
    await waitFor(() =>
      expect(result.current.acuityEntries).toEqual([{ patientId: 'fresh', score: 9 }]),
    );

    // Call A's slower response now lands, after B already won.
    await act(async () => {
      deferredA.resolve({ entries: [{ patientId: 'stale', score: 1 }] });
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(result.current.acuityEntries).toEqual([{ patientId: 'fresh', score: 9 }]);
  });
});
