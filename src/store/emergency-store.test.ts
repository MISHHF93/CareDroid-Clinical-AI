import { describe, expect, it } from 'vitest';
import { createInitialEmergencyStoreState, useEmergencyStore } from './emergency-store';

describe('Emergency OS store shim', () => {
  it('re-exports the canonical Emergency OS store', () => {
    expect(useEmergencyStore.getState().patients.length).toBeGreaterThan(0);
    expect(useEmergencyStore.getState().capacity).toEqual(
      expect.objectContaining({ score: expect.any(Number), band: expect.any(String) }),
    );
  });

  it('creates a canonical reset snapshot without legacy frontend store fields', () => {
    const snapshot = createInitialEmergencyStoreState();

    expect(snapshot).toEqual(
      expect.objectContaining({
        patients: expect.any(Array),
        rooms: expect.any(Array),
        activeShift: expect.objectContaining({ chargeStaffId: expect.any(String) }),
        selectedPatientId: null,
        copilotOpen: false,
      }),
    );
    expect('capacityMetrics' in snapshot).toBe(false);
    expect('emsIncomingPatients' in snapshot).toBe(false);
  });
});
