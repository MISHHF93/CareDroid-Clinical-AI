import { describe, expect, it } from 'vitest';
import { PatientState, Priority } from '../types/emergency';
import {
  createSnooze,
  formatWhoNextForCopilot,
  getWhoNextRecommendation,
  scoreWhoNextPatient,
} from './whoNext';

const now = new Date('2026-06-11T20:30:00-04:00');

function patient(overrides: any = {}) {
  return {
    id: overrides.id || 'pt-test',
    firstName: overrides.firstName || 'Sarah',
    lastName: overrides.lastName || 'Miller',
    mrn: overrides.mrn || 'MRN-1',
    dob: '1980-01-01',
    age: 46,
    sex: 'Female',
    arrivalTime: overrides.arrivalTime || '2026-06-11T19:42:00-04:00',
    triageTime: null,
    lastAssessedTime: null,
    chiefComplaint: overrides.chiefComplaint || 'Chest pain',
    complaint: overrides.complaint || overrides.chiefComplaint || 'Chest pain',
    complaintCategory: overrides.complaintCategory || 'Chest Pain',
    state: overrides.state || PatientState.Waiting,
    priority: overrides.priority || Priority.P2,
    vitals: {
      hr: null,
      bpSystolic: null,
      bpDiastolic: null,
      spo2: null,
      temp: null,
      rr: null,
      gcs: null,
      pain: null,
      recordedAt: '2026-06-11T20:00:00-04:00',
    },
    assignedStaffId: Object.prototype.hasOwnProperty.call(overrides, 'assignedStaffId')
      ? overrides.assignedStaffId
      : 'staff-md',
    roomId: overrides.roomId || 'bed-7',
    flags: overrides.flags || [],
    timeline: overrides.timeline || [],
    notes: [],
  };
}

describe('whoNext scoring', () => {
  it('scores priority, wait time, flags, and missing protocol score with top reason factors', () => {
    const result = scoreWhoNextPatient(
      patient({
        flags: [{ type: 'HighRisk', reason: 'Chest pain', detectedAt: now.toISOString(), severity: 'Critical' }],
      }),
      { now }
    );

    expect(result.score).toBe(30 + 23 + 15 + 30);
    expect(result.reason).toBe('P2 priority + high risk flag');
  });

  it('recommends the highest-scored assigned physician patient', () => {
    const recommendation = getWhoNextRecommendation({
      patients: [
        patient({ id: 'lower', firstName: 'Alex', priority: Priority.P3 }),
        patient({
          id: 'winner',
          firstName: 'Sarah',
          priority: Priority.P2,
          flags: [{ type: 'ReassessmentDue', reason: 'Overdue', detectedAt: now.toISOString(), severity: 'Warning' }],
        }),
        patient({ id: 'other-staff', firstName: 'Other', assignedStaffId: 'staff-rn', priority: Priority.P1 }),
      ],
      rooms: [{ id: 'bed-7', name: 'Bed 7' }],
      staff: [{ id: 'staff-md', role: 'Attending', firstName: 'Priya', lastName: 'Nair' }],
      activeShift: { staffIds: ['staff-md'], chargeStaffId: 'staff-md' },
      now,
    });

    expect(recommendation.patient.id).toBe('winner');
    expect(recommendation.room).toBe('Bed 7');
    expect(formatWhoNextForCopilot(recommendation)).toBe(
      'Suggested next: Sarah Miller (Bed 7) — P2 priority + reassessment due'
    );
  });

  it('snoozes skipped patients for 15 minutes unless they deteriorate', () => {
    const skipped = patient({ id: 'skipped', priority: Priority.P2 });
    const next = patient({ id: 'next', firstName: 'Next', priority: Priority.P3 });
    const snoozes = { skipped: createSnooze('skipped', now) };

    const recommendation = getWhoNextRecommendation({
      patients: [skipped, next],
      staff: [{ id: 'staff-md', role: 'Attending' }],
      activeShift: { staffIds: ['staff-md'] },
      snoozes,
      now,
    });
    expect(recommendation.patient.id).toBe('next');

    const deteriorated = getWhoNextRecommendation({
      patients: [
        {
          ...skipped,
          flags: [{ type: 'DeteriorationRisk', reason: 'Worse', detectedAt: now.toISOString(), severity: 'Critical' }],
        },
        next,
      ],
      staff: [{ id: 'staff-md', role: 'Attending' }],
      activeShift: { staffIds: ['staff-md'] },
      snoozes,
      now,
    });
    expect(deteriorated.patient.id).toBe('skipped');
  });

  it('falls back to unassigned P1/P2 patients when no assigned patients exist', () => {
    const recommendation = getWhoNextRecommendation({
      patients: [
        patient({ id: 'assigned-other', assignedStaffId: 'staff-rn', priority: Priority.P1 }),
        patient({ id: 'unassigned-p2', assignedStaffId: null, priority: Priority.P2 }),
      ],
      staff: [{ id: 'staff-md', role: 'Attending' }],
      activeShift: { staffIds: ['staff-md'] },
      now,
    });

    expect(recommendation.scope).toBe('department');
    expect(recommendation.patient.id).toBe('unassigned-p2');
  });
});
