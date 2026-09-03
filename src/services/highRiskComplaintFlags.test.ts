import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient } from '../types/emergency';
import {
  applyHighRiskComplaintFlags,
  buildHighRiskComplaintAlerts,
  buildHighRiskComplaintBoardSummary,
  buildHighRiskComplaintPatch,
  detectHighRiskComplaintFlags,
  patientNeedsRapidReview,
  HIGH_RISK_COMPLAINT_FLAG_DEFINITIONS,
} from './highRiskComplaintFlags';

function buildPatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-1',
    mrn: 'ED-123456',
    firstName: 'Jane',
    lastName: 'Doe',
    dob: '1990-01-01',
    age: 35,
    sex: 'F',
    arrivalTime: '2026-06-20T10:00:00.000Z',
    chiefComplaint: 'Follow-up',
    complaintCategory: 'Other',
    state: PatientState.Registration,
    priority: Priority.P3,
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

describe('highRiskComplaintFlags', () => {
  it('defines all ten fast-flag complaint categories', () => {
    expect(HIGH_RISK_COMPLAINT_FLAG_DEFINITIONS).toHaveLength(10);
  });

  it('detects flags from complaint text and category without changing priority', () => {
    const flags = detectHighRiskComplaintFlags({
      complaint: 'Sudden chest pain with diaphoresis',
      complaintCategory: 'Chest pain',
    });

    expect(flags.map((flag) => flag.id)).toEqual(['chest-pain']);
  });

  it('detects stroke, sepsis, anaphylaxis, and pregnancy flags from keywords', () => {
    expect(
      detectHighRiskComplaintFlags({
        complaint: 'Facial droop and slurred speech since breakfast',
      }).map((flag) => flag.id),
    ).toContain('stroke-symptoms');

    expect(
      detectHighRiskComplaintFlags({ complaint: 'Fever with hypotension and confusion' }).map(
        (flag) => flag.id,
      ),
    ).toContain('sepsis-concern');

    expect(
      detectHighRiskComplaintFlags({ complaint: 'Anaphylaxis after peanut exposure' }).map(
        (flag) => flag.id,
      ),
    ).toContain('anaphylaxis-concern');

    expect(
      detectHighRiskComplaintFlags({
        complaint: 'Heavy vaginal bleeding at 32 weeks pregnant',
      }).map((flag) => flag.id),
    ).toContain('pregnancy-emergency');
  });

  it('builds operational patch for rapid review without assigning triage priority', () => {
    const patch = buildHighRiskComplaintPatch({
      chiefComplaint: 'Passed out at home',
      complaintCategory: 'Other',
      state: PatientState.Registration,
      priority: Priority.P3,
    });

    expect(patch.highRiskComplaintFlags?.map((flag) => flag.id)).toEqual(['syncope']);
    expect(patch.queueDestination).toBe('rapid-review');
    expect(patch.triagePending).toBe(true);
    expect(patch.priority).toBeUndefined();
  });

  it('identifies patients needing rapid review before formal triage', () => {
    const flagged = buildPatient({
      highRiskComplaintFlags: [
        {
          id: 'chest-pain',
          label: 'Chest pain',
          detectedAt: '2026-06-20T10:00:00.000Z',
          source: 'complaint-text',
        },
      ],
      triagePending: true,
    });

    expect(patientNeedsRapidReview(flagged)).toBe(true);
    expect(
      patientNeedsRapidReview(
        buildPatient({
          highRiskComplaintFlags: flagged.highRiskComplaintFlags,
          triageTime: '2026-06-20T10:30:00.000Z',
          state: PatientState.Waiting,
        }),
      ),
    ).toBe(false);
  });

  it('builds staff alerts marked advisory-only', () => {
    const alerts = buildHighRiskComplaintAlerts([
      buildPatient({
        chiefComplaint: 'Shortness of breath',
        highRiskComplaintFlags: detectHighRiskComplaintFlags({
          complaint: 'Shortness of breath',
        }),
        triagePending: true,
      }),
    ]);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('Critical');
    expect(alerts[0].metadata?.advisoryOnly).toBe(true);
    expect(alerts[0].message).toMatch(/do not assign triage/i);
  });

  it('merges staff-selected flags with text detection', () => {
    const flags = detectHighRiskComplaintFlags({
      complaint: 'Routine follow-up',
      selectedFlagIds: ['syncope', 'severe-bleeding'],
    });

    expect(flags.map((flag) => flag.id).sort()).toEqual(['severe-bleeding', 'syncope']);
    expect(flags.every((flag) => flag.source === 'staff-selected')).toBe(true);
  });

  it('summarizes flagged and rapid-review patients for board surfaces', () => {
    const summary = buildHighRiskComplaintBoardSummary([
      buildPatient({
        chiefComplaint: 'Chest pain',
        highRiskComplaintFlags: detectHighRiskComplaintFlags({ complaint: 'Chest pain' }),
        triagePending: true,
      }),
      buildPatient({
        id: 'patient-2',
        chiefComplaint: 'Headache',
        highRiskComplaintFlags: detectHighRiskComplaintFlags({
          complaint: 'Headache',
          selectedFlagIds: ['stroke-symptoms'],
        }),
        triageTime: '2026-06-20T10:30:00.000Z',
        state: PatientState.Waiting,
      }),
    ]);

    expect(summary.flaggedCount).toBe(2);
    expect(summary.rapidReviewCount).toBe(1);
    expect(summary.byFlagId['chest-pain']).toBe(1);
    expect(summary.byFlagId['stroke-symptoms']).toBe(1);
    expect(summary.patients[0].id).toBe('patient-1');
  });

  it('applies flags through store without changing clinical priority', () => {
    const patient = buildPatient({ chiefComplaint: 'Mild cough' });
    let stored = patient;
    const actions: string[] = [];

    applyHighRiskComplaintFlags(
      {
        patients: [patient],
        updatePatient: (_patientId, patch) => {
          stored = { ...stored, ...patch };
        },
        recordWorkflowAction: (input) => {
          actions.push(input.type);
        },
      },
      patient.id,
      { selectedFlagIds: ['shortness-of-breath'], source: 'test' },
    );

    expect(stored.highRiskComplaintFlags?.map((flag) => flag.id)).toEqual(['shortness-of-breath']);
    expect(stored.queueDestination).toBe('rapid-review');
    expect(stored.triagePending).toBe(true);
    expect(stored.priority).toBe(Priority.P3);
    expect(actions).toEqual(['high_risk_complaint_flagged']);
    expect(patientNeedsRapidReview(stored)).toBe(true);
  });
});
