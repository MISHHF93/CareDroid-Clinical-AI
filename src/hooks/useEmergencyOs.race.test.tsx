import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useEmergencyPatients } from './useEmergencyOs';
import { useEmergencyStore } from '../store/emergencyStore';

const mocks = vi.hoisted(() => ({
  fetchEmergencyPatients: vi.fn(),
}));

vi.mock('../services/emergencyOsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/emergencyOsApi')>();
  return {
    ...actual,
    fetchEmergencyPatients: (...args: unknown[]) => mocks.fetchEmergencyPatients(...args),
  };
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const originalState = useEmergencyStore.getState();

describe('useEmergencyOs refresh() race (HEAL-249)', () => {
  it('does not let a slower, superseded refresh() re-hydrate the store with stale patient data', async () => {
    useEmergencyStore.setState({ ...originalState, patients: [], activeScenarioId: '' }, true);

    const deferredA = deferred<any>();
    mocks.fetchEmergencyPatients.mockImplementationOnce(() => deferredA.promise);

    const { result } = renderHook(() => useEmergencyPatients());

    await waitFor(() => expect(mocks.fetchEmergencyPatients).toHaveBeenCalledTimes(1));

    // A second, faster call (a manual refresh() while the mount fetch is
    // still pending on deferredA) resolves immediately.
    mocks.fetchEmergencyPatients.mockResolvedValueOnce({
      data: { patients: [{ id: 'p1', firstName: 'Fresh' }] },
    });
    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      const patient = useEmergencyStore.getState().patients.find((p) => p.id === 'p1');
      expect(patient?.firstName).toBe('Fresh');
    });

    // The original mount fetch's slower response now resolves, after the
    // manual refresh already won.
    await act(async () => {
      deferredA.resolve({ data: { patients: [{ id: 'p1', firstName: 'Stale' }] } });
      await new Promise((r) => setTimeout(r, 20));
    });

    const patient = useEmergencyStore.getState().patients.find((p) => p.id === 'p1');
    expect(patient?.firstName).toBe('Fresh');

    useEmergencyStore.setState(originalState, true);
  });
});
