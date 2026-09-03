import { describe, expect, it } from 'vitest';
import {
  calculateBedOccupancy,
  calculateResourceUtilizationIndex,
  calculateStaffingRatio,
  calculateTurnaroundTime,
} from './hospitalOperationsCalculators';

describe('hospital operations calculators', () => {
  it('calculates bed occupancy with blocked-bed adjustment', () => {
    const result = calculateBedOccupancy({ occupiedBeds: 82, totalBeds: 100, blockedBeds: 4 });

    expect(result).toMatchObject({
      usableBeds: 96,
      availableBeds: 14,
      occupancyPercent: 85.4,
      severity: 'warning',
    });
  });

  it('calculates staffing ratio without issuing staffing decisions', () => {
    const result = calculateStaffingRatio({
      patientCount: 31,
      staffCount: 7,
      targetPatientsPerStaff: 4,
    });

    expect(result?.patientsPerStaff).toBe(4.43);
    expect(result?.targetStaff).toBe(8);
    expect(result?.staffDelta).toBe(-1);
    expect(result?.interpretation).toContain('planning indicator');
  });

  it('calculates turnaround variance from workflow segments', () => {
    const result = calculateTurnaroundTime({
      requestToAssignMinutes: 8,
      travelMinutes: 14,
      serviceMinutes: 26,
      cleanupMinutes: 7,
      targetMinutes: 60,
    });

    expect(result).toMatchObject({
      totalMinutes: 55,
      varianceMinutes: -5,
      severity: 'normal',
    });
  });

  it('calculates resource utilization index and highest driver', () => {
    const result = calculateResourceUtilizationIndex({
      bedUtilizationPercent: 86,
      staffUtilizationPercent: 78,
      deviceUtilizationPercent: 72,
      fleetUtilizationPercent: 64,
    });

    expect(result?.index).toBe(75);
    expect(result?.maxDriver).toEqual({ label: 'Beds', value: 86 });
    expect(result?.interpretation).toContain('human approval');
  });
});
