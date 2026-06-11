import { describe, expect, it } from 'vitest';
import { getEMSPressureBand, minutesUntilEMSArrival } from './EMSPressureScore';

describe('EMSPressureScore', () => {
  it('maps EMS pressure score bands to the requested thresholds', () => {
    expect(getEMSPressureBand(0)).toEqual({ id: 'stable', label: 'EMS Stable', color: 'green' });
    expect(getEMSPressureBand(25)).toEqual({ id: 'stable', label: 'EMS Stable', color: 'green' });
    expect(getEMSPressureBand(26)).toEqual({
      id: 'moderate',
      label: 'EMS Moderate',
      color: 'yellow',
    });
    expect(getEMSPressureBand(51)).toEqual({
      id: 'elevated',
      label: 'EMS Elevated',
      color: 'orange',
    });
    expect(getEMSPressureBand(76)).toEqual({
      id: 'critical',
      label: 'EMS Critical',
      color: 'red',
    });
  });

  it('derives live ETA countdown minutes from estimated arrival time', () => {
    expect(
      minutesUntilEMSArrival(
        {
          estimatedArrivalTime: '2026-06-11T10:12:00.000Z',
          eta: 99,
        },
        new Date('2026-06-11T10:05:30.000Z')
      )
    ).toBe(7);
  });
});
