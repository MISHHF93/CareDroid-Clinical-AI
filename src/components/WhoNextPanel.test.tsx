import { describe, expect, it } from 'vitest';
import {
  WHO_NEXT_SNOOZE_TTL_MS,
  buildWhoNextRecommendation,
  getReasonFactors,
  hasRunProtocolScores,
  isSnoozeActive,
  scorePatient,
  type SnoozedPatient,
} from './WhoNextPanel';
import { Patient, PatientFlag, PatientState, Priority } from '../types/emergency';

const now = new Date('2026-06-13T16:00:00.000Z').getTime();

function isoMinutesAgo(minutes: number): string {
  return new Date(now - minutes * 60_000).toISOString();
}

function patient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-1',
    mrn: 'ED-TEST-1',
    firstName: 'Marcus',
    lastName: 'Chen',
    dob: '1965-03-14',
    age: 59,
    sex: 'M',
    arrivalTime: isoMinutesAgo(68),
    chiefComplaint: 'Chest Pain',
    complaintCategory: 'Cardiac',
    state: PatientState.Assessment,
    priority: Priority.P2,
    vitals: [],
    flags: [],
    assignedStaffId: 'current-staff',
    notes: [],
    timeline: [],
    ...overrides,
  };
}

describe('WhoNextPanel helpers', () => {
  it('scores assigned patients with priority, wait, risk flags, and overdue protocol scores', () => {
    const scored = patient({ flags: [PatientFlag.DeteriorationRisk] });

    expect(scorePatient(scored, now)).toBe(111.5);
  });

  it('detects recent HEART, qSOFA, or NIHSS notes as protocol scores', () => {
    const scored = patient({
      notes: [
        {
          id: 'note-1',
          timestamp: isoMinutesAgo(30),
          text: 'HEART score completed: 5',
        },
      ],
    });

    expect(hasRunProtocolScores(scored, now)).toBe(true);
    expect(scorePatient(scored, now)).toBe(61.5);
  });

  it('returns the top two reason factors in score contribution order', () => {
    const reasons = getReasonFactors(patient({ flags: [PatientFlag.DeteriorationRisk] }), now)
      .slice(0, 2)
      .map((factor) => factor.label)
      .join(' · ');

    expect(reasons).toBe('Deterioration risk · Wait 68min');
  });

  it('expires snoozes after the TTL or when a critical flag appears', () => {
    const stablePatient = patient();
    const snooze: SnoozedPatient = {
      patientId: stablePatient.id,
      snoozedAt: now - 5 * 60_000,
      scoreAtSnooze: scorePatient(stablePatient, now - 5 * 60_000),
      flagsAtSnooze: [],
    };

    expect(isSnoozeActive(stablePatient, snooze, now)).toBe(true);
    expect(isSnoozeActive(stablePatient, { ...snooze, snoozedAt: now - WHO_NEXT_SNOOZE_TTL_MS }, now)).toBe(false);
    expect(isSnoozeActive(patient({ flags: [PatientFlag.SepsisAlert] }), snooze, now)).toBe(false);
  });

  it('sorts by score and skips active snoozes when recommending the next patient', () => {
    const highestScore = patient({
      id: 'patient-2',
      firstName: 'Dorothy',
      lastName: 'Walsh',
      priority: Priority.P3,
      arrivalTime: isoMinutesAgo(120),
      flags: [PatientFlag.ReassessmentDue],
    });
    const fallback = patient({ id: 'patient-3', priority: Priority.P2 });
    const snooze: SnoozedPatient = {
      patientId: highestScore.id,
      snoozedAt: now,
      scoreAtSnooze: scorePatient(highestScore, now),
      flagsAtSnooze: [...highestScore.flags],
    };

    expect(buildWhoNextRecommendation([fallback, highestScore], [], now)?.patient.id).toBe(highestScore.id);
    expect(buildWhoNextRecommendation([fallback, highestScore], [snooze], now)?.patient.id).toBe(fallback.id);
  });
});
