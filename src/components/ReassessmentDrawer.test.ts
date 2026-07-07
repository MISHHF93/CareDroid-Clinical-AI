import { describe, expect, it, vi } from 'vitest';
import { PatientFlag, PatientState, Priority, type Patient } from '../types/emergency';

vi.mock('../store/emergencyStore', () => ({
  useEmergencyStore: vi.fn(),
}));

import {
  filterFlaggedReassessmentPatients,
  formatCompactWaitTime,
  getFlagTimestampInfo,
  getMostSevereReassessmentFlag,
  sortFlaggedReassessmentPatients,
} from './ReassessmentDrawer';

const NOW = Date.parse('2026-06-13T20:00:00.000Z');

function minutesAgo(minutes: number): string {
  return new Date(NOW - minutes * 60000).toISOString();
}

function makePatient(id: string, flags: unknown[], arrivalMinutesAgo: number, overrides: Partial<Patient> = {}): Patient {
  return {
    id,
    mrn: `ED-${id}`,
    firstName: id,
    lastName: 'Patient',
    dob: '1980-01-01',
    age: 45,
    sex: 'F',
    arrivalTime: minutesAgo(arrivalMinutesAgo),
    chiefComplaint: 'Chest pain',
    complaintCategory: 'Cardiac',
    state: PatientState.Waiting,
    priority: Priority.P3,
    vitals: [],
    flags: flags as Patient['flags'],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

describe('ReassessmentDrawer helpers', () => {
  it('filters patients with any reassessment attention flag including object-shaped flags', () => {
    const patients = [
      makePatient('none', [PatientFlag.LongWait], 30),
      makePatient('due', [PatientFlag.ReassessmentDue], 45),
      makePatient('object', [{ type: PatientFlag.SepsisAlert, detectedAt: minutesAgo(5) }], 20),
    ];

    expect(filterFlaggedReassessmentPatients(patients).map((patient) => patient.id)).toEqual(['due', 'object']);
  });

  it('selects the most severe flag and sorts by configured severity then longest wait', () => {
    const patients = [
      makePatient('high-risk', [PatientFlag.HighRisk], 300),
      makePatient('due-short', [PatientFlag.ReassessmentDue], 40),
      makePatient('sepsis', [PatientFlag.SepsisAlert], 60),
      makePatient('due-long', [PatientFlag.ReassessmentDue], 140),
      makePatient('deterioration', [PatientFlag.HighRisk, PatientFlag.DeteriorationRisk], 20),
    ];

    expect(getMostSevereReassessmentFlag(patients[4])).toBe(PatientFlag.DeteriorationRisk);
    expect(sortFlaggedReassessmentPatients(patients, 'severity', NOW).map((patient) => patient.id)).toEqual([
      'deterioration',
      'sepsis',
      'high-risk',
      'due-long',
      'due-short',
    ]);
  });

  it('sorts by wait time when requested', () => {
    const patients = [
      makePatient('sepsis', [PatientFlag.SepsisAlert], 60),
      makePatient('due', [PatientFlag.ReassessmentDue], 140),
      makePatient('deterioration', [PatientFlag.DeteriorationRisk], 20),
    ];

    expect(sortFlaggedReassessmentPatients(patients, 'wait', NOW).map((patient) => patient.id)).toEqual([
      'due',
      'sepsis',
      'deterioration',
    ]);
  });

  it('reports exact flag time when available and falls back to note or arrival timestamps', () => {
    const timelineTimestamp = minutesAgo(12);
    const noteTimestamp = minutesAgo(25);
    const exact = makePatient('exact', [PatientFlag.SepsisAlert], 90, {
      timeline: [
        {
          id: 'journey-1',
          type: 'FlagAdded',
          timestamp: timelineTimestamp,
          to: PatientState.Waiting,
          metadata: { flag: PatientFlag.SepsisAlert },
        },
      ],
    });
    const noteFallback = makePatient('note', [PatientFlag.HighRisk], 80, {
      notes: [{ id: 'note-1', type: 'Clinical', text: 'Reassessment concern persists', timestamp: noteTimestamp }],
    });
    const arrivalFallback = makePatient('arrival', [PatientFlag.ReassessmentDue], 70);

    expect(getFlagTimestampInfo(exact, PatientFlag.SepsisAlert)).toMatchObject({
      exact: true,
      source: 'FlagAdded timeline event',
      timestamp: timelineTimestamp,
    });
    expect(getFlagTimestampInfo(noteFallback, PatientFlag.HighRisk)).toMatchObject({
      exact: false,
      source: 'related note fallback',
      timestamp: noteTimestamp,
    });
    expect(getFlagTimestampInfo(arrivalFallback, PatientFlag.ReassessmentDue)).toMatchObject({
      exact: false,
      source: 'arrival time fallback',
      timestamp: arrivalFallback.arrivalTime,
    });
  });

  it('formats wait times compactly', () => {
    expect(formatCompactWaitTime(0)).toBe('<1m');
    expect(formatCompactWaitTime(42)).toBe('42m');
    expect(formatCompactWaitTime(95)).toBe('1h 35m');
    expect(formatCompactWaitTime(120)).toBe('2h');
  });
});
