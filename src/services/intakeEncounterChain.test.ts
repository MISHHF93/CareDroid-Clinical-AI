import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient } from '../types/emergency';
import {
  buildEncounterLinkageMetadata,
  readIntakeEncounterChain,
} from './intakeEncounterChain';
import { ensureEncounterAfterIntake, getExistingEncounterId } from './intakeEncounter';
import { completeIntakeHandoff } from './receptionHandoff';

const patient: Patient = {
  id: 'patient-chain',
  mrn: 'ED-900',
  firstName: 'Sam',
  lastName: 'Riley',
  dob: '1990-01-01',
  age: 35,
  sex: 'F',
  arrivalTime: '2026-06-17T12:00:00.000Z',
  chiefComplaint: 'Chest pain',
  complaintCategory: 'Cardiac',
  state: PatientState.Triage,
  priority: Priority.P2,
  vitals: [],
  flags: [],
  notes: [],
  timeline: [],
};

describe('intake encounter chain', () => {
  it('links patient, arrival reason, queue, and encounter metadata', () => {
    const linkage = buildEncounterLinkageMetadata(patient, {
      encounterId: 'encounter-patient-chain',
      intakeSource: 'walk-in',
      queue: 'Triage',
    });

    expect(linkage).toEqual(
      expect.objectContaining({
        patientId: 'patient-chain',
        encounterId: 'encounter-patient-chain',
        arrivalReason: 'Chest pain',
        complaintCategory: 'Cardiac',
        queue: 'Triage',
      }),
    );
  });

  it('enriches pre-created vertical-slice encounters during handoff', () => {
    const patients: Patient[] = [
      {
        ...patient,
        timeline: [
          {
            id: 'evt-existing',
            type: 'EncounterCreated',
            timestamp: patient.arrivalTime,
            to: patient.state,
            metadata: { encounterId: 'encounter-patient-chain' },
          },
        ],
      },
    ];
    const store = {
      patients,
      emergencySettings: { intakeSettings: { autoAssignTriageQueue: true, autoCreateEncounter: true } },
      updatePatient: (patientId: string, patch: Partial<Patient>) => {
        const index = patients.findIndex((entry) => entry.id === patientId);
        if (index >= 0) patients[index] = { ...patients[index], ...patch };
      },
      movePatientToState: () => undefined,
      selectPatient: () => undefined,
      setQueueFilter: () => undefined,
      dispatchWebSocketEvent: () => undefined,
      recordWorkflowAction: () => ({ id: 'wf-1' }),
    };

    const handoff = completeIntakeHandoff(store as never, {
      patientId: patient.id,
      source: 'smart-intake',
    });

    const chain = readIntakeEncounterChain(patients[0], handoff.encounterId, handoff.queue);
    expect(chain.connected).toBe(true);
    expect(chain.arrivalReason).toBe('Chest pain');
    expect(getExistingEncounterId(patients[0])).toBe('encounter-patient-chain');
  });

  it('creates a connected chain for new intake patients', () => {
    const patients: Patient[] = [{ ...patient, timeline: [] }];
    const store = {
      patients,
      emergencySettings: { intakeSettings: { autoAssignTriageQueue: true, autoCreateEncounter: true } },
      updatePatient: (patientId: string, patch: Partial<Patient>) => {
        const index = patients.findIndex((entry) => entry.id === patientId);
        if (index >= 0) patients[index] = { ...patients[index], ...patch };
      },
      movePatientToState: () => undefined,
      selectPatient: () => undefined,
      setQueueFilter: () => undefined,
      dispatchWebSocketEvent: () => undefined,
      recordWorkflowAction: () => ({ id: 'wf-2' }),
    };

    ensureEncounterAfterIntake(store as never, {
      patientId: patient.id,
      source: 'walk-in',
      queue: 'Triage',
    });

    const chain = readIntakeEncounterChain(patients[0], null, 'Triage');
    expect(chain.connected).toBe(true);
    expect(chain.encounterId).toBe('encounter-patient-chain');
  });
});
