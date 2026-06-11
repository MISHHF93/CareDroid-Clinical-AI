import { describe, expect, it } from 'vitest';
import { hasPatientFlag, useEmergencyStore } from './emergencyStore';
import { PatientState } from '../types/emergency';

describe('emergencyStore EMS arrival conversion', () => {
  it('converts an EMS arrival into an Arrival-state whiteboard patient with EMS flag', () => {
    const store = useEmergencyStore.getState();
    const arrival = store.emsArrivals.find((candidate) => candidate.status === 'Inbound');

    expect(arrival).toBeTruthy();

    store.prepareEMSBay(arrival!.id);
    const preparedArrival = useEmergencyStore
      .getState()
      .emsArrivals.find((candidate) => candidate.id === arrival!.id);

    useEmergencyStore.getState().convertEMSArrivalToPatient(arrival!.id);

    const nextState = useEmergencyStore.getState();
    const convertedArrival = nextState.emsArrivals.find((candidate) => candidate.id === arrival!.id);
    const patient = nextState.patients.find((candidate) => candidate.id === convertedArrival?.patientId);

    expect(convertedArrival).toEqual(
      expect.objectContaining({
        status: 'Handoff',
        patientId: expect.any(String),
      })
    );
    expect(patient).toEqual(
      expect.objectContaining({
        state: PatientState.Arrival,
        chiefComplaint: arrival!.chiefComplaint,
        roomId: preparedArrival?.preparedRoomId,
      })
    );
    expect(patient && hasPatientFlag(patient, 'EMSArrival')).toBe(true);
  });
});
