import { beforeEach, describe, expect, it } from 'vitest';
import { useEmergencyStore } from '../store/emergencyStore';
import { PatientFlag, PatientState } from '../types/emergency';
import {
  buildEmsArrivalFromPreArrivalForm,
  emptyPreArrivalFormInput,
  submitPreArrivalIntake,
  validatePreArrivalForm,
} from './preArrivalMistModel';
import { isPreArrivalPlaceholder } from './preArrivalWorkflow';
import { resolveWhiteboardStateLabel } from './whiteboardViewModel';

describe('preArrivalMistModel', () => {
  beforeEach(() => {
    useEmergencyStore.setState((state) => ({
      ...state,
      emsArrivals: [],
      patients: state.patients.filter((patient) => !patient.flags.includes(PatientFlag.EMSArrival)),
    }));
  });

  it('validates required dispatch and clinical fields', () => {
    const result = validatePreArrivalForm(emptyPreArrivalFormInput());
    expect(result.ok).toBe(false);
    expect(result.errors.unitId).toBeTruthy();
    expect(result.errors.complaint).toBeTruthy();
  });

  it('builds inbound EMS arrivals from MIST form input', () => {
    const arrival = buildEmsArrivalFromPreArrivalForm({
      ...emptyPreArrivalFormInput(),
      unitId: 'Medic 9',
      etaMinutes: 8,
      patientAge: 54,
      mist: {
        mechanism: 'MVC',
        injuries: 'Chest pain',
        signs: 'HR 110',
        treatments: 'O2',
      },
    });

    expect(arrival.status).toBe('Inbound');
    expect(arrival.chiefComplaint).toContain('Chest pain');
    expect(arrival.eta).toBe(8);
    expect(arrival.preArrivalNotification?.framework).toBe('mist');
  });

  it('posts a placeholder patient card to the whiteboard with ETA', () => {
    const store = useEmergencyStore.getState();
    const result = submitPreArrivalIntake(
      store,
      {
        ...emptyPreArrivalFormInput(),
        unitId: 'Medic 3',
        etaMinutes: 12,
        patientAge: 41,
        mist: {
          mechanism: 'Fall',
          injuries: 'Hip pain',
          signs: 'Alert, tachycardic',
          treatments: 'Splinted',
        },
      },
      { staffName: 'Charge Nurse' },
    );

    expect(result.patient.id).toBeTruthy();
    expect(isPreArrivalPlaceholder(result.patient)).toBe(true);
    expect(result.patient.emsArrival?.eta).toBe(12);
    expect(result.patient.state).toBe(PatientState.Arrival);
    expect(resolveWhiteboardStateLabel(result.patient)).toBe('Inbound EMS · 12 min');

    const nextState = useEmergencyStore.getState();
    const posted = nextState.patients.find((patient) => patient.id === result.patient.id);
    expect(posted?.emsArrival?.status).toBe('Inbound');
    expect(nextState.emsArrivals.some((arrival) => arrival.id === result.arrival.id)).toBe(true);
  });
});
