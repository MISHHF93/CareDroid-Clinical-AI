import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState } from '../types/emergency';
import {
  buildProvisionalPatient,
  completeProvisionalIntake,
  provisionalKindFromIntakeMode,
  PROVISIONAL_IDENTITY_PROFILES,
} from './provisionalIdentityIntake';

describe('provisionalIdentityIntake', () => {
  it('builds unknown, temporary, and identity-pending patients with shared pending flag', () => {
    const unknown = buildProvisionalPatient('unknown');
    const temporary = buildProvisionalPatient('temporary');
    const pending = buildProvisionalPatient('identity-pending');

    expect(unknown.mrn).toMatch(/^TEMP-UNK-/);
    expect(temporary.mrn).toMatch(/^TEMP-/);
    expect(pending.mrn).toMatch(/^TEMP-ID-/);
    expect(unknown.flags).toContain(PatientFlag.IdentityPending);
    expect(temporary.flags).toContain(PatientFlag.IdentityPending);
    expect(pending.flags).toContain(PatientFlag.IdentityPending);
    expect(unknown.state).toBe(PatientState.Triage);
    expect(unknown.arrival).toMatchObject({
      arrivalMode: 'walk-in',
      waitingRoomStatus: 'waiting-for-triage',
      registrationStatus: 'provisional',
    });
    expect(temporary.arrival?.arrivalMode).toBe('EMS');
  });

  it('completes non-blocking intake with triage handoff', () => {
    const calls: string[] = [];
    const patients: Array<{ id: string; state: PatientState; timeline: unknown[] }> = [];
    const store = {
      patients,
      emergencySettings: {
        intakeSettings: { autoAssignTriageQueue: true, autoCreateEncounter: true },
      },
      addPatient: (patient: { id: string; state: PatientState; timeline: unknown[] }) => {
        patients.push(patient);
        calls.push('addPatient');
      },
      updatePatient: () => calls.push('updatePatient'),
      movePatientToState: () => calls.push('move'),
      selectPatient: () => calls.push('select'),
      setQueueFilter: () => calls.push('queue'),
      dispatchWebSocketEvent: () => calls.push('websocket'),
      recordWorkflowAction: (input: { source?: string }) => {
        calls.push(`workflow:${input.source}`);
        return { id: 'log-1' };
      },
    };

    const result = completeProvisionalIntake(store as never, 'unknown');

    expect(result.provisionalIdentityKind).toBe('unknown');
    expect(result.patient.firstName).toBe('Unknown');
    expect(calls).toContain('addPatient');
    expect(calls).toContain('workflow:provisional-intake');
    expect(result.encounterId).toBeTruthy();
  });

  it('maps intake modes to provisional kinds', () => {
    expect(provisionalKindFromIntakeMode('unknown')).toBe('unknown');
    expect(provisionalKindFromIntakeMode('temporary')).toBe('temporary');
    expect(provisionalKindFromIntakeMode('identity-pending')).toBe('identity-pending');
    expect(provisionalKindFromIntakeMode('ems-prearrival')).toBe('temporary');
    expect(PROVISIONAL_IDENTITY_PROFILES['identity-pending'].label).toBe('Identity pending');
  });
});
