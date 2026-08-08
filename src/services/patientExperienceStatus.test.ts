import { describe, expect, it } from 'vitest';
import {
  PatientFlag,
  PatientState,
  Priority,
  type Patient,
  type Referral,
} from '../types/emergency';
import {
  PATIENT_EXPERIENCE_STATUS_DEFINITIONS,
  assertPublicPatientExperienceViewIsPhiSafe,
  buildPatientExperienceBoardSummary,
  resolvePatientExperienceStatus,
  resolvePublicPatientExperienceStatus,
  summarizePatientExperienceStatuses,
  toPublicPatientExperienceStatusView,
} from './patientExperienceStatus';

function buildPatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-1',
    mrn: 'ED-100',
    firstName: 'Alex',
    lastName: 'Kim',
    dob: '1990-01-01',
    age: 35,
    sex: 'F',
    arrivalTime: '2026-06-20T08:00:00.000Z',
    chiefComplaint: 'Abdominal pain',
    complaintCategory: 'Abdominal',
    state: PatientState.Waiting,
    priority: Priority.P3,
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

describe('patientExperienceStatus', () => {
  it('defines all requested patient-facing statuses', () => {
    expect(PATIENT_EXPERIENCE_STATUS_DEFINITIONS.map((entry) => entry.label)).toEqual([
      'Registered',
      'Waiting for triage',
      'Waiting for clinician',
      'Tests in progress',
      'Waiting for results',
      'Waiting for specialist review',
      'Preparing discharge',
      'Awaiting admission bed',
    ]);
  });

  it('maps registration journey states to Registered', () => {
    expect(resolvePatientExperienceStatus(buildPatient({ state: PatientState.Registration })).id).toBe(
      'registered',
    );
    expect(
      resolvePatientExperienceStatus(
        buildPatient({
          state: PatientState.Registration,
          flags: [PatientFlag.EMSArrival],
          queueDestination: 'ems-registration',
        }),
      ).id,
    ).toBe('registered');
  });

  it('maps triage queue states to Waiting for triage', () => {
    expect(resolvePatientExperienceStatus(buildPatient({ state: PatientState.Triage })).id).toBe(
      'waiting-for-triage',
    );
    expect(
      resolvePatientExperienceStatus(
        buildPatient({ state: PatientState.Registration, triagePending: true, queueDestination: 'rapid-review' }),
      ).id,
    ).toBe('waiting-for-triage');
  });

  it('maps waiting and clinical workup states', () => {
    expect(resolvePatientExperienceStatus(buildPatient({ state: PatientState.Waiting })).id).toBe(
      'waiting-for-clinician',
    );
    expect(
      resolvePatientExperienceStatus(
        buildPatient({
          state: PatientState.Orders,
          timeline: [{ id: 'o1', type: 'OrderPlaced', timestamp: '2026-06-20T09:00:00.000Z', to: PatientState.Orders }],
        }),
      ).id,
    ).toBe('tests-in-progress');
    expect(resolvePatientExperienceStatus(buildPatient({ state: PatientState.Results })).id).toBe(
      'waiting-for-results',
    );
  });

  it('prioritizes active referrals for specialist review', () => {
    const referrals: Referral[] = [
      {
        id: 'ref-1',
        patientId: 'patient-1',
        status: 'Sent',
        service: 'Cardiology',
        createdAt: '2026-06-20T08:30:00.000Z',
      },
    ];

    expect(
      resolvePatientExperienceStatus(buildPatient({ state: PatientState.Assessment }), { referrals }).id,
    ).toBe('waiting-for-specialist-review');
  });

  it('maps disposition and admission states', () => {
    expect(resolvePatientExperienceStatus(buildPatient({ state: PatientState.Disposition })).id).toBe(
      'preparing-discharge',
    );
    expect(
      resolvePatientExperienceStatus(
        buildPatient({ state: PatientState.Waiting, flags: [PatientFlag.PendingAdmission] }),
      ).id,
    ).toBe('awaiting-admission-bed');
  });

  it('exposes PHI-safe public status views', () => {
    const snapshot = resolvePatientExperienceStatus(buildPatient({ state: PatientState.Waiting }));
    expect(toPublicPatientExperienceStatusView(snapshot)).toEqual({
      id: 'waiting-for-clinician',
      label: 'Waiting for clinician',
    });
    expect(Object.keys(toPublicPatientExperienceStatusView(snapshot))).toEqual(['id', 'label']);
  });

  it('summarizes experience status counts across patients', () => {
    const summary = summarizePatientExperienceStatuses([
      buildPatient({ id: 'a', state: PatientState.Waiting }),
      buildPatient({ id: 'b', state: PatientState.Triage }),
      buildPatient({ id: 'c', state: PatientState.Disposition }),
    ]);

    expect(summary['waiting-for-clinician']).toBe(1);
    expect(summary['waiting-for-triage']).toBe(1);
    expect(summary['preparing-discharge']).toBe(1);
  });

  it('builds staff board summary with active status lines only', () => {
    const summary = buildPatientExperienceBoardSummary([
      buildPatient({ id: 'a', state: PatientState.Waiting }),
      buildPatient({ id: 'b', state: PatientState.Disposition }),
    ]);

    expect(summary.statusLines.map((line) => line.id)).toEqual([
      'waiting-for-clinician',
      'preparing-discharge',
    ]);
  });

  it('resolves PHI-safe public views for wall displays', () => {
    const publicView = resolvePublicPatientExperienceStatus(
      buildPatient({ firstName: 'Secret', lastName: 'Patient', mrn: 'MRN-999' }),
    );
    expect(assertPublicPatientExperienceViewIsPhiSafe(publicView)).toBe(true);
    expect(publicView.label).toBe('Waiting for clinician');
    expect(JSON.stringify(publicView)).not.toContain('Secret');
    expect(JSON.stringify(publicView)).not.toContain('MRN-999');
  });
});
