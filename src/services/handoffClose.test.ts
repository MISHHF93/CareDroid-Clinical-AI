import { describe, expect, it } from 'vitest';
import { isHandoffCloseComplete, mergeHandoffClosePatch } from './handoffClose';

describe('handoffClose', () => {
  it('marks checkpoint complete when all confirmations are recorded', () => {
    const record = mergeHandoffClosePatch(
      undefined,
      {
        receivingClinicianName: 'Dr. Lee',
        informationUnderstood: true,
        questionsClarified: true,
      },
      { staffName: 'Charge Nurse' },
    );
    expect(isHandoffCloseComplete(record)).toBe(true);
    expect(record.closedByStaffName).toBe('Charge Nurse');
  });
});