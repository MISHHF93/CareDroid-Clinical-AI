import { describe, expect, it } from 'vitest';
import {
  PatientFlag,
  PatientState,
  Priority,
  type Patient,
  type Referral,
} from '../types/emergency';
import {
  WHAT_HAPPENS_NEXT_STEPS,
  buildWhatHappensNextCopilotLines,
  isInArrivalWaitingFlow,
  resolveWhatHappensNext,
  summarizeWhatHappensNextBoard,
} from './whatHappensNextGuidance';

function buildPatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-1',
    mrn: 'ED-100',
    firstName: 'Alex',
    lastName: 'Kim',
    dob: '1990-01-01',
    age: 35,
    sex: 'F',
    arrivalTime: '2026-06-20T09:55:00.000Z',
    triageTime: '2026-06-20T09:56:00.000Z',
    lastAssessedTime: '2026-06-20T09:58:00.000Z',
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

const testNow = new Date('2026-06-20T10:00:00.000Z');
const testContext = { now: testNow };

describe('whatHappensNextGuidance', () => {
  it('defines all requested next-step categories', () => {
    expect(WHAT_HAPPENS_NEXT_STEPS.map((step) => step.label)).toEqual([
      'Triage needed',
      'Reassessment due',
      'Provider review pending',
      'Test pending',
      'Result review pending',
      'Referral pending',
      'Admission decision pending',
      'Discharge workflow pending',
    ]);
  });

  it('limits guidance to arrival and waiting flow states', () => {
    expect(isInArrivalWaitingFlow(buildPatient({ state: PatientState.Waiting }))).toBe(true);
    expect(isInArrivalWaitingFlow(buildPatient({ state: PatientState.Deceased }))).toBe(false);
  });

  it('prioritizes triage before provider review for triage queue patients', () => {
    const snapshot = resolveWhatHappensNext(
      buildPatient({ state: PatientState.Triage, triagePending: true, triageTime: null }),
      testContext,
    );
    expect(snapshot?.stepId).toBe('triage-needed');
  });

  it('detects reassessment due ahead of provider review', () => {
    const snapshot = resolveWhatHappensNext(
      buildPatient({
        state: PatientState.Waiting,
        flags: [PatientFlag.ReassessmentDue],
        assignedStaffId: null,
      }),
      testContext,
    );
    expect(snapshot?.stepId).toBe('reassessment-due');
  });

  it('detects referral, admission, and discharge next steps', () => {
    expect(
      resolveWhatHappensNext(buildPatient({ state: PatientState.Assessment }), {
        ...testContext,
        referrals: [
          {
            id: 'ref-1',
            patientId: 'patient-1',
            status: 'Sent',
            service: 'Cardiology',
          } as Referral,
        ],
      })?.stepId,
    ).toBe('referral-pending');

    expect(
      resolveWhatHappensNext(
        buildPatient({ state: PatientState.Waiting, flags: [PatientFlag.PendingAdmission] }),
        testContext,
      )?.stepId,
    ).toBe('admission-decision-pending');

    expect(
      resolveWhatHappensNext(buildPatient({ state: PatientState.Disposition }), testContext)
        ?.stepId,
    ).toBe('discharge-workflow-pending');
  });

  it('builds copilot context lines with selected patient guidance', () => {
    const lines = buildWhatHappensNextCopilotLines(
      [
        buildPatient({ id: 'patient-1', state: PatientState.Orders }),
        buildPatient({ id: 'patient-2', state: PatientState.Triage, triageTime: null }),
      ],
      { ...testContext, selectedPatientId: 'patient-1' },
    );

    expect(lines.some((line) => line.includes('Selected patient next step: Test pending'))).toBe(
      true,
    );
    expect(lines.some((line) => line.includes('What happens next queue'))).toBe(true);
  });

  it('summarizes board counts by primary next step', () => {
    const summary = summarizeWhatHappensNextBoard(
      [
        buildPatient({ id: 'a', state: PatientState.Triage, triageTime: null }),
        buildPatient({ id: 'b', state: PatientState.Results }),
        buildPatient({ id: 'c', state: PatientState.Waiting, assignedStaffId: null }),
      ],
      testContext,
    );

    expect(summary['triage-needed']).toBe(1);
    expect(summary['result-review-pending']).toBe(1);
    expect(summary['provider-review-pending']).toBe(1);
  });
});
