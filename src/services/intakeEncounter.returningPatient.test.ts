import { describe, expect, it } from 'vitest';
import { buildEncounterArtifacts, ensureEncounterAfterIntake } from './intakeEncounter';
import type { Patient } from '../types/emergency';

/**
 * CHARACTERIZATION TESTS -- these document what the system does TODAY for a
 * returning patient, which is not what a returning patient needs.
 *
 * An "encounter" here is not a record. There is no encounters table; an
 * encounter is an `EncounterCreated` event on the patient's own timeline, and
 * its id is derived as `encounter-${patient.id}`. Two consequences follow, and
 * both are asserted below so they cannot regress silently while the real fix
 * is scoped:
 *
 *   1. A patient is structurally incapable of having more than one encounter
 *      id, because the id is a pure function of the patient id.
 *   2. ensureEncounterAfterIntake() short-circuits when an encounter already
 *      exists, so a second ED visit is folded into the first visit's
 *      encounter rather than opening a new one.
 *
 * Meanwhile the visit-level columns live on the patient row itself
 * (arrivalTime, triageTime, chiefComplaint, state, priority, vitals, roomId,
 * registrationStatus...), so a returning patient's new visit overwrites the
 * previous one in place. The prior visit's complaint, acuity and arrival time
 * are not preserved anywhere queryable -- only partial traces survive in the
 * timeline.
 *
 * These tests deliberately assert the CURRENT behaviour. When encounters
 * become first-class, they should be rewritten to assert the correct
 * behaviour, and their failure is the signal that the migration landed.
 */

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-1',
    mrn: 'MRN-1',
    firstName: 'Returning',
    lastName: 'Visitor',
    state: 'Triage',
    timeline: [],
    ...overrides,
  } as unknown as Patient;
}

function makeStore(patients: Patient[]) {
  const updates: Array<{ id: string; patch: Partial<Patient> }> = [];
  return {
    patients,
    emergencySettings: {},
    updatePatient: (id: string, patch: Partial<Patient>) => {
      updates.push({ id, patch });
      const target = patients.find((p) => p.id === id);
      if (target) Object.assign(target, patch);
    },
    recordWorkflowAction: () => undefined,
    updates,
  };
}

describe('returning patient encounters (characterization)', () => {
  it('derives the encounter id from the patient id, so one patient can only ever have one', () => {
    const patient = makePatient();

    const first = buildEncounterArtifacts(patient, 'reception' as never);
    const second = buildEncounterArtifacts(patient, 'reception' as never);

    expect(first.encounterId).toBe('encounter-patient-1');
    // A genuinely new visit would need a distinct id. It cannot have one.
    expect(second.encounterId).toBe(first.encounterId);
  });

  it('folds a returning patient’s second arrival into the first visit’s encounter', () => {
    // Visit 1 already happened: the patient carries an EncounterCreated event.
    const patient = makePatient({
      timeline: [
        {
          id: 'evt-1',
          patientId: 'patient-1',
          type: 'EncounterCreated',
          timestamp: '2026-01-01T10:00:00.000Z',
          metadata: { encounterId: 'encounter-patient-1' },
        },
      ] as never,
    });
    const store = makeStore([patient]);

    // Visit 2: the patient comes back weeks later.
    const result = ensureEncounterAfterIntake(store as never, {
      patientId: 'patient-1',
      source: 'reception' as never,
    });

    // No new encounter is opened -- the old one is reused.
    expect(result.created).toBe(false);
    expect(result.encounterId).toBe('encounter-patient-1');

    // And the only write is a timeline enrichment on the SAME encounter,
    // not the creation of a second one.
    const encounterEvents = (patient.timeline || []).filter(
      (event: { type?: string }) => event.type === 'EncounterCreated',
    );
    expect(encounterEvents).toHaveLength(1);
  });

  it('opens an encounter on a genuinely first visit', () => {
    const patient = makePatient({ timeline: [] as never });
    const store = makeStore([patient]);

    const result = ensureEncounterAfterIntake(store as never, {
      patientId: 'patient-1',
      source: 'reception' as never,
    });

    expect(result.created).toBe(true);
    expect(result.encounterId).toBe('encounter-patient-1');
  });
});
