import { describe, expect, it } from 'vitest';
import {
  calculateCapacityScore,
  capacityBandForScore,
  deriveCapacityDeductions,
  type CapacityEngineInputs,
} from './capacityEngine';

const baseInputs: CapacityEngineInputs = {
  totalActivePatients: 12,
  roomOccupancy: {
    occupied: 8,
    total: 12,
    percent: 67,
    overagePatients: 0,
  },
  boardingPatients: 0,
  reassessmentQueueLength: 0,
  incomingEMSCount: 0,
  incomingEMSCriticalCount: 0,
  dischargeReadyCount: 0,
  dischargesPast60Minutes: 1,
};

describe('capacityEngine', () => {
  it('calculates the requested operational deductions and band', () => {
    const deductions = deriveCapacityDeductions({
      ...baseInputs,
      roomOccupancy: {
        occupied: 11,
        total: 12,
        percent: 92,
        overagePatients: 2,
      },
      boardingPatients: 2,
      reassessmentQueueLength: 4,
      incomingEMSCount: 3,
      incomingEMSCriticalCount: 1,
      dischargesPast60Minutes: 0,
    });

    expect(deductions.map((deduction) => [deduction.id, deduction.value])).toEqual([
      ['room-occupancy-over-80', 10],
      ['boarding-patients', 16],
      ['reassessment-queue', 10],
      ['incoming-critical-ems', 5],
      ['no-recent-discharges', 10],
    ]);
    expect(calculateCapacityScore(deductions)).toBe(49);
    expect(capacityBandForScore(49)).toEqual({
      riskLevel: 'Orange',
      label: 'Capacity Strained',
    });
  });

  it('keeps normal capacity at a green score', () => {
    const deductions = deriveCapacityDeductions(baseInputs);

    expect(deductions).toEqual([]);
    expect(calculateCapacityScore(deductions)).toBe(100);
    expect(capacityBandForScore(100)).toEqual({
      riskLevel: 'Green',
      label: 'Capacity Normal',
    });
  });
});
