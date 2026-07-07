import { afterEach, describe, expect, it } from 'vitest';
import { selectReassessmentQueue, useEmergencyStore } from './emergencyStore';
import { FIRST_CUSTOMER_DEMO_MODE } from '../data/firstCustomerDemoMode';
import { PRACTITIONER_WALKTHROUGH_ACTIVE_CENSUS } from '../config/practitionerCleanup.constants';
import { PatientState } from '../types/emergency';

const originalState = useEmergencyStore.getState();

afterEach(() => {
  useEmergencyStore.setState(originalState, true);
});

describe('First Customer Demo Mode root store activation', () => {
  it('loads the practitioner walkthrough census into the richer CareDroid store', () => {
    useEmergencyStore.getState().setActiveScenario(FIRST_CUSTOMER_DEMO_MODE.id);

    const state = useEmergencyStore.getState();
    const activePatients = state.patients.filter(
      (patient) => ![PatientState.Discharge, PatientState.Deceased].includes(patient.state)
    );

    // The demo represents a 100-patient/day department, but only keeps the
    // practitioner-cleanup walkthrough census (PRACTITIONER_WALKTHROUGH_ACTIVE_CENSUS)
    // as live Patient objects on the board — the rest of the daily volume is
    // reflected in aggregate analytics, not literal patient records.
    expect(state.activeScenarioId).toBe(FIRST_CUSTOMER_DEMO_MODE.id);
    expect(state.patients).toHaveLength(PRACTITIONER_WALKTHROUGH_ACTIVE_CENSUS);
    expect(activePatients).toHaveLength(PRACTITIONER_WALKTHROUGH_ACTIVE_CENSUS);
    expect(state.emsArrivals.filter((arrival) => arrival.status === 'Inbound').length).toBeGreaterThanOrEqual(4);
    expect(selectReassessmentQueue(state).length).toBeGreaterThanOrEqual(8);
    expect(state.capacity.boardingCount).toBeGreaterThanOrEqual(2);
  });
});
