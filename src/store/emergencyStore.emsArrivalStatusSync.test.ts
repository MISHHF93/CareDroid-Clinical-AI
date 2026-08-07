import { afterEach, describe, expect, it, vi } from 'vitest';

// Regression coverage for the 2026-08-08 fix: converting an EMS arrival to a patient
// (the real trigger for the "arrived"/"handoff-started" transition -- see
// emsOffloadTracker.ts's own documented gap) only ever updated local Zustand state,
// never the backend, so the offload clock reset on reload / diverged across
// workstations. Verifies the store now fires the durable sync call, matching the
// established fire-and-forget pattern already used by EMSPipeline.tsx's completeHandoff.

const patchEmsArrivalStatus = vi.fn(() => Promise.resolve({ data: { ok: true } }));

vi.mock('../services/emergencyOsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/emergencyOsApi')>();
  return {
    ...actual,
    patchEmsArrivalStatus: (...args: unknown[]) => patchEmsArrivalStatus(...args),
  };
});

const { useEmergencyStore } = await import('./emergencyStore');

const originalState = useEmergencyStore.getState();

afterEach(() => {
  useEmergencyStore.setState(originalState, true);
  vi.clearAllMocks();
});

describe('emergencyStore EMS arrival status durable sync', () => {
  it('syncs the converted arrival status to the backend, not only local state', async () => {
    const store = useEmergencyStore.getState();
    const arrival = store.emsArrivals.find((candidate) => candidate.status === 'Inbound');
    expect(arrival).toBeTruthy();

    store.convertEMSArrivalToPatient(arrival!.id);

    // The sync call is fire-and-forget (queued as a microtask after set()) -- flush it.
    await Promise.resolve();
    await Promise.resolve();

    expect(patchEmsArrivalStatus).toHaveBeenCalledTimes(1);
    expect(patchEmsArrivalStatus).toHaveBeenCalledWith(
      arrival!.id,
      expect.objectContaining({ status: 'Handoff', patientId: expect.any(String) }),
    );
  });

  it('does not throw when the sync call rejects (network down) -- local state is still authoritative', async () => {
    patchEmsArrivalStatus.mockImplementationOnce(() => Promise.reject(new Error('network down')));
    const store = useEmergencyStore.getState();
    const arrival = store.emsArrivals.find((candidate) => candidate.status === 'Inbound');

    expect(() => store.convertEMSArrivalToPatient(arrival!.id)).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();

    const convertedArrival = useEmergencyStore
      .getState()
      .emsArrivals.find((candidate) => candidate.id === arrival!.id);
    expect(convertedArrival?.status).toBe('Handoff');
  });
});
