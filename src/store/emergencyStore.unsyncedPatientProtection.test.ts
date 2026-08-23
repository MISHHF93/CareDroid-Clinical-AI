import { afterEach, describe, expect, it, vi } from 'vitest';

// Regression coverage for DOWNTIME-001: addVitals()/movePatientToState()/
// dischargePatient() all applied their mutation to local Zustand state
// synchronously, then fired a "durable sync" PATCH with no retry and only a
// console.warn on failure. If that sync silently failed (network blip,
// backend degraded) and the app later refreshed from the backend --
// initializeFromBackend()'s mount-time call on page reload, session-timeout
// reauth, or opening the app on a second workstation -- hydrateFromApi()
// unconditionally preferred the backend's (now stale, pre-sync-failure)
// copy of that patient over the local one, silently and permanently
// discarding the clinical mutation with zero indication to anyone.
//
// Fix: unsyncedPatientIds tracks patients with an unconfirmed backend sync;
// hydrateFromApi() now preserves the local copy for any patient in that set
// instead of trusting the backend payload.

const patchEmergencyPatient = vi.fn(() => Promise.resolve({ data: { ok: true } }));
const assignEmergencyPatientStaff = vi.fn(() => Promise.resolve({ data: { ok: true } }));
const escalateEmergencyPatient = vi.fn(() => Promise.resolve({ data: { ok: true } }));

vi.mock('../services/emergencyOsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/emergencyOsApi')>();
  return {
    ...actual,
    patchEmergencyPatient: (...args: unknown[]) => patchEmergencyPatient(...args),
    assignEmergencyPatientStaff: (...args: unknown[]) => assignEmergencyPatientStaff(...args),
    escalateEmergencyPatient: (...args: unknown[]) => escalateEmergencyPatient(...args),
  };
});

const { useEmergencyStore } = await import('./emergencyStore');

const originalState = useEmergencyStore.getState();

afterEach(() => {
  useEmergencyStore.setState(originalState, true);
  vi.clearAllMocks();
});

describe('emergencyStore unsynced-patient protection (DOWNTIME-001)', () => {
  it('marks a patient unsynced when the vitals sync fails, and hydrateFromApi preserves the local copy over a stale backend payload', async () => {
    const store = useEmergencyStore.getState();
    const patient = store.patients[0];
    expect(patient).toBeTruthy();

    patchEmergencyPatient.mockImplementationOnce(() => Promise.reject(new Error('network down')));

    store.addVitals(patient.id, { hr: 88, spo2: 97, sbp: 118, dbp: 76, recordedBy: 's1' } as any);
    await Promise.resolve();
    await Promise.resolve();

    expect(useEmergencyStore.getState().unsyncedPatientIds.has(patient.id)).toBe(true);
    const localVitalsCount = useEmergencyStore
      .getState()
      .patients.find((candidate) => candidate.id === patient.id)?.vitals?.length;

    // Simulate the exact danger scenario: a backend refresh (e.g. mount-time
    // initializeFromBackend()) returns this same patient with the OLD,
    // pre-sync-failure vitals array -- one entry shorter than local.
    const staleBackendCopy = {
      ...patient,
      vitals: patient.vitals?.slice(0, -1) ?? [],
    };
    useEmergencyStore.getState().hydrateFromApi({ patients: [staleBackendCopy] as any });

    const afterHydrate = useEmergencyStore
      .getState()
      .patients.find((candidate) => candidate.id === patient.id);
    expect(afterHydrate?.vitals?.length).toBe(localVitalsCount);
  });

  it('clears the unsynced flag once the sync succeeds, letting a later backend refresh apply normally', async () => {
    const store = useEmergencyStore.getState();
    const patient = store.patients[0];

    store.addVitals(patient.id, { hr: 90, spo2: 98, sbp: 120, dbp: 78, recordedBy: 's1' } as any);
    await Promise.resolve();
    await Promise.resolve();

    expect(useEmergencyStore.getState().unsyncedPatientIds.has(patient.id)).toBe(false);
    expect(patchEmergencyPatient).toHaveBeenCalledTimes(1);
  });

  // Same bug shape, two more real call sites found on a follow-up sweep for
  // every "Fire-and-forget durable sync (MB-P0-6)" site in this file --
  // assignStaff and escalatePatient had the identical unprotected pattern.
  it('protects assignStaff the same way: a failed staff-assignment sync marks the patient unsynced', async () => {
    const store = useEmergencyStore.getState();
    const patient = store.patients[0];
    const staffMember = store.staff[0];
    expect(staffMember).toBeTruthy();

    assignEmergencyPatientStaff.mockImplementationOnce(() =>
      Promise.reject(new Error('network down')),
    );

    store.assignStaff(patient.id, staffMember.id);
    await Promise.resolve();
    await Promise.resolve();

    expect(useEmergencyStore.getState().unsyncedPatientIds.has(patient.id)).toBe(true);

    const staleBackendCopy = { ...patient, assignedStaffId: null };
    useEmergencyStore.getState().hydrateFromApi({ patients: [staleBackendCopy] as any });

    const afterHydrate = useEmergencyStore
      .getState()
      .patients.find((candidate) => candidate.id === patient.id);
    expect(afterHydrate?.assignedStaffId).toBe(staffMember.id);
  });

  it('protects escalatePatient the same way: a failed escalation sync marks the patient unsynced', async () => {
    const store = useEmergencyStore.getState();
    const patient = store.patients[0];

    escalateEmergencyPatient.mockImplementationOnce(() =>
      Promise.reject(new Error('network down')),
    );

    store.escalatePatient(patient.id, { staffId: 's1' });
    await Promise.resolve();
    await Promise.resolve();

    expect(useEmergencyStore.getState().unsyncedPatientIds.has(patient.id)).toBe(true);
  });
});
