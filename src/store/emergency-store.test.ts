import { describe, expect, it } from 'vitest';
import { createInitialEmergencyStoreState, DEFAULT_EMERGENCY_THRESHOLDS, useEmergencyStore } from './emergency-store';

describe('Emergency OS store shim', () => {
  it('re-exports the canonical Emergency OS store', () => {
    expect(useEmergencyStore.getState().patients.length).toBeGreaterThan(0);
    expect(useEmergencyStore.getState().capacity).toEqual(
      expect.objectContaining({ score: expect.any(Number), band: expect.any(String) }),
    );
  });

  it('creates a canonical reset snapshot with merged frontend store fields', () => {
    const snapshot = createInitialEmergencyStoreState();

    expect(snapshot).toEqual(
      expect.objectContaining({
        patients: expect.any(Array),
        rooms: expect.any(Array),
        activeShift: expect.objectContaining({ chargeStaffId: expect.any(String) }),
        selectedPatientId: null,
        copilotOpen: false,
        activeQueueFilter: null,
        capacityMetrics: expect.objectContaining({ score: expect.any(Number) }),
        boardingMetrics: expect.objectContaining({ patientsBoarding: expect.any(Array) }),
        surgeStatus: expect.objectContaining({ active: false }),
        copilotMessages: expect.any(Array),
        emsIncomingPatients: expect.any(Array),
        ui: expect.objectContaining({ selectedPatientId: null }),
        websocket: expect.objectContaining({ status: expect.any(String) }),
        integrationEvents: expect.any(Array),
        flags: expect.any(Object),
        auditLog: expect.any(Array),
        thresholds: expect.objectContaining({
          waitTimeWarningMin: expect.any(Number),
          waitTimeCtiticalMin: expect.any(Number),
          capacityOrangePct: expect.any(Number),
          reassessP2Min: expect.any(Number),
        }),
      }),
    );
  });

  it('stores configurable operational thresholds and resets to defaults', () => {
    const store = useEmergencyStore.getState();

    store.setThreshold('capacityOrangePct', 0.82);
    expect(useEmergencyStore.getState().thresholds.capacityOrangePct).toBe(0.82);
    expect(useEmergencyStore.getState().emergencySettings.thresholds.capacityOrangePercent).toBe(82);

    useEmergencyStore.getState().resetThresholds();
    expect(useEmergencyStore.getState().thresholds).toEqual(DEFAULT_EMERGENCY_THRESHOLDS);
  });
});
