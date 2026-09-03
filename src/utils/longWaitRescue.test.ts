import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState, Priority } from '../types/emergency';
import {
  formatLongWaitAttentionForCopilot,
  longWaitShiftMetrics,
  longWaitStatus,
} from './longWaitRescue';

const now = new Date('2026-06-13T16:00:00.000Z');

function isoMinutesAgo(minutes) {
  return new Date(now.getTime() - minutes * 60_000).toISOString();
}

function patient(overrides: any = {}) {
  return {
    id: 'patient-1',
    mrn: 'ED-TEST-1',
    firstName: 'Long',
    lastName: 'One',
    arrivalTime: isoMinutesAgo(31),
    chiefComplaint: 'Back pain',
    complaintCategory: 'Musculoskeletal',
    state: PatientState.Waiting,
    priority: Priority.P3,
    flags: [],
    vitals: [],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

describe('long wait rescue helpers', () => {
  it('calculates warning, critical, and LWBS phases from configurable CTAS targets', () => {
    const settings = { ctasThresholds: { [Priority.P3]: 20 } };

    expect(
      longWaitStatus(patient({ arrivalTime: isoMinutesAgo(20) }), now, settings),
    ).toMatchObject({
      phase: 'warning',
      thresholdMinutes: 20,
      criticalAt: 30,
      lwbsAt: 40,
    });
    expect(longWaitStatus(patient({ arrivalTime: isoMinutesAgo(31) }), now, settings).phase).toBe(
      'critical',
    );
    expect(longWaitStatus(patient({ arrivalTime: isoMinutesAgo(41) }), now, settings).phase).toBe(
      'lwbs',
    );
  });

  it('formats the proactive Copilot attention line for the longest LongWait patient', () => {
    const line = formatLongWaitAttentionForCopilot(
      [
        patient({ id: 'short', arrivalTime: isoMinutesAgo(40), flags: [PatientFlag.LongWait] }),
        patient({ id: 'long', arrivalTime: isoMinutesAgo(80), flags: [PatientFlag.LongWait] }),
      ],
      now,
    );

    expect(line).toBe('ATTENTION: Longest waiting patient — Long One, 80min, P3, Back pain');
  });

  it('summarizes long-wait and LWBS shift metrics against CTAS targets', () => {
    const metrics = longWaitShiftMetrics(
      [
        patient({ id: 'p3', arrivalTime: isoMinutesAgo(45), flags: [PatientFlag.LongWait] }),
        patient({
          id: 'p4',
          arrivalTime: isoMinutesAgo(130),
          priority: Priority.P4,
          flags: [PatientFlag.LWBSRisk],
        }),
        patient({ id: 'seen', arrivalTime: isoMinutesAgo(200), state: PatientState.Assessment }),
      ],
      now,
    );

    expect(metrics).toMatchObject({
      longWaitEvents: 2,
      lwbsRiskEvents: 1,
      maxWaitMinutes: 200,
      exceedingTargetCount: 2,
      exceedingTargetPercent: 100,
    });
  });
});
