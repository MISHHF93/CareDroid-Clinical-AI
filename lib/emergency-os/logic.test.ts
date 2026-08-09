import { describe, expect, it } from 'vitest';
import {
  EMERGENCY_OS_CAPACITY_INPUT_SCHEMA,
  EMERGENCY_OS_CAPACITY_OUTPUT_SCHEMA,
  calculateEmergencyOsCapacity,
  isEmergencyOsBoarding,
} from './logic';

describe('CareDroid shared logic', () => {
  it('calculates one transparent capacity pressure score with units and factors', () => {
    const result = calculateEmergencyOsCapacity({
      totalPatients: 24,
      occupiedRooms: 18,
      totalRooms: 20,
      boardingCount: 4,
      reassessmentDue: 5,
      waitingCount: 8,
      dischargeReadyCount: 2,
      criticalEmsInboundCount: 1,
      now: '2026-06-13T20:00:00.000Z',
    });

    expect(result).toMatchObject({
      ok: true,
      score: 100,
      band: 'Red',
      occupancyPercent: 90,
      updatedAt: '2026-06-13T20:00:00.000Z',
      units: expect.objectContaining({
        score: 'points',
        occupancyPercent: 'percent',
      }),
    });
    expect(result.factors.map((factor) => factor.id)).toEqual([
      'occupancy',
      'boarding',
      'reassessment',
      'waiting',
      'discharge',
      'ems',
    ]);
    expect(EMERGENCY_OS_CAPACITY_INPUT_SCHEMA.totalRooms).toMatch(/rooms/);
    expect(EMERGENCY_OS_CAPACITY_OUTPUT_SCHEMA.score).toMatch(/higher means more operational pressure/);
  });

  it('returns safe validation errors and clamps impossible room counts', () => {
    const result = calculateEmergencyOsCapacity({
      totalPatients: -1,
      occupiedRooms: 12,
      totalRooms: 10,
      boardingCount: -2,
      reassessmentDue: 1,
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'occupiedRooms exceeded totalRooms and was clamped',
        'totalPatients must be a non-negative number',
        'boardingCount must be a non-negative number',
      ]),
    );
    expect(result.occupiedRooms).toBe(10);
    expect(result.totalPatients).toBe(0);
    expect(result.boardingCount).toBe(0);
  });
});

/**
 * Regression coverage for a repository-wide domain-model audit finding
 * (2026-08-08): 6 independent, disagreeing "is this patient boarding"
 * definitions existed across the backend and frontend -- some missing
 * Disposition, some missing the PendingAdmission flag, one checking a
 * boardingStatus field that doesn't exist on the live Patient type at all.
 * Consolidated onto this one function, matching the backend's own
 * canonical definition (the one the always-on, real UI traffic path uses).
 */
describe('isEmergencyOsBoarding', () => {
  it('is true for a patient in Admission state', () => {
    expect(isEmergencyOsBoarding({ state: 'Admission', flags: [] })).toBe(true);
  });

  it('is true for a patient in Disposition state (previously missed by 4 of the 6 old definitions)', () => {
    expect(isEmergencyOsBoarding({ state: 'Disposition', flags: [] })).toBe(true);
  });

  it('is true for a patient flagged PendingAdmission regardless of state', () => {
    expect(isEmergencyOsBoarding({ state: 'Waiting', flags: ['PendingAdmission'] })).toBe(true);
  });

  it('is false for a patient with none of the 3 boarding signals', () => {
    expect(isEmergencyOsBoarding({ state: 'Triage', flags: [] })).toBe(false);
    expect(isEmergencyOsBoarding({ state: 'Assessment', flags: ['HighRisk'] })).toBe(false);
  });

  it('treats a missing flags array as empty rather than throwing', () => {
    expect(isEmergencyOsBoarding({ state: 'Waiting' })).toBe(false);
    expect(isEmergencyOsBoarding({ state: 'Admission' })).toBe(true);
  });
});
