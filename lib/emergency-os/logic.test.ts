import { describe, expect, it } from 'vitest';
import {
  EMERGENCY_OS_CAPACITY_INPUT_SCHEMA,
  EMERGENCY_OS_CAPACITY_OUTPUT_SCHEMA,
  calculateEmergencyOsCapacity,
} from './logic';

describe('Emergency OS shared logic', () => {
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
