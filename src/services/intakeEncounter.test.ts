import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient } from '../types/emergency';
import {
  buildEncounterArtifacts,
  ensureEncounterAfterIntake,
  getExistingEncounterId,
  isAutoCreateEncounterEnabled,
} from './intakeEncounter';

const patient: Patient = {
  id: 'patient-1',
  mrn: 'ED-100001',
  firstName: 'Avery',
  lastName: 'Stone',
  dob: '1978-03-01',
  age: 47,
  sex: 'F',
  arrivalTime: '2026-06-17T12:00:00.000Z',
  chiefComplaint: 'Chest pain',
  complaintCategory: 'Chest Pain',
  state: PatientState.Triage,
  priority: Priority.P2,
  vitals: [],
  flags: [],
  notes: [],
  timeline: [],
};

describe('intakeEncounter', () => {
  it('defaults auto-create encounter to enabled', () => {
    expect(isAutoCreateEncounterEnabled({})).toBe(true);
    expect(isAutoCreateEncounterEnabled({ intakeSettings: { autoCreateEncounter: false } })).toBe(
      false,
    );
  });

  it('builds encounter timeline artifacts', () => {
    const { encounterId, timelineEvent } = buildEncounterArtifacts(patient, 'walk-in');
    expect(encounterId).toBe('encounter-patient-1');
    expect(timelineEvent.type).toBe('EncounterCreated');
    expect(timelineEvent.metadata?.encounterId).toBe(encounterId);
  });

  it('creates an encounter after intake when configured', () => {
    const updates: Array<{ patientId: string; timeline: Patient['timeline'] }> = [];
    const workflow: string[] = [];
    const store = {
      patients: [patient],
      emergencySettings: { intakeSettings: { autoCreateEncounter: true } },
      updatePatient: (patientId: string, patch: Partial<Patient>) => {
        if (patch.timeline) updates.push({ patientId, timeline: patch.timeline });
      },
      recordWorkflowAction: (input: { type: string }) => {
        workflow.push(input.type);
        return { id: 'wf-1' };
      },
    };

    const result = ensureEncounterAfterIntake(store, {
      patientId: patient.id,
      source: 'quick-intake',
    });

    expect(result.created).toBe(true);
    expect(result.encounterId).toBe('encounter-patient-1');
    expect(updates[0]?.timeline).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'EncounterCreated' })]),
    );
    expect(workflow).toEqual(['encounter_created']);
    expect(getExistingEncounterId({ ...patient, timeline: updates[0]?.timeline || [] })).toBe(
      'encounter-patient-1',
    );
  });

  it('skips duplicate encounter creation', () => {
    const patientWithEncounter: Patient = {
      ...patient,
      timeline: [
        {
          id: 'evt-existing',
          type: 'EncounterCreated',
          timestamp: patient.arrivalTime,
          to: patient.state,
          metadata: { encounterId: 'encounter-existing' },
        },
      ],
    };

    const store = {
      patients: [patientWithEncounter],
      emergencySettings: { intakeSettings: { autoCreateEncounter: true } },
      updatePatient: () => undefined,
      recordWorkflowAction: () => ({ id: 'wf-2' }),
    };

    const result = ensureEncounterAfterIntake(store, {
      patientId: patient.id,
      source: 'smart-intake',
    });

    expect(result).toEqual({ encounterId: 'encounter-existing', created: false });
  });
});
