import { afterEach, describe, expect, it } from 'vitest';
import { selectReassessmentQueue, useEmergencyStore } from './emergencyStore';
import { FIRST_CUSTOMER_DEMO_MODE } from '../src/data/firstCustomerDemoMode';
import { PatientState } from '../types/emergency';

const originalState = useEmergencyStore.getState();

afterEach(() => {
  useEmergencyStore.setState(originalState, true);
});

describe('First Customer Demo Mode root store activation', () => {
  it('loads the 100-patient/day demo into the richer Emergency OS store', () => {
    useEmergencyStore.getState().setActiveScenario(FIRST_CUSTOMER_DEMO_MODE.id);

    const state = useEmergencyStore.getState();
    const activePatients = state.patients.filter(
      (patient) => ![PatientState.Discharge, PatientState.Deceased].includes(patient.state)
    );

    expect(state.activeScenarioId).toBe(FIRST_CUSTOMER_DEMO_MODE.id);
    expect(state.patients).toHaveLength(100);
    expect(activePatients).toHaveLength(42);
    expect(state.emsArrivals.filter((arrival) => arrival.status === 'Inbound').length).toBeGreaterThanOrEqual(4);
    expect(selectReassessmentQueue(state).length).toBeGreaterThanOrEqual(8);
    expect(state.capacity.boardingCount).toBeGreaterThanOrEqual(6);
    expect(state.emergencyAnalytics.data?.operationalCommand.dailyVolume.at(-1).count).toBe(100);
    expect(state.emergencySettings.demoMode).toEqual(
      expect.objectContaining({
        active: true,
        id: FIRST_CUSTOMER_DEMO_MODE.id,
        patientVolumePerDay: 100,
      })
    );
  });
});
