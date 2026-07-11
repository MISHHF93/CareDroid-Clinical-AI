import { describe, expect, it } from 'vitest';
import { PatientState } from '../types/emergency';
import { buildStaffWorkloads, getStaffRebalanceSuggestion, workloadTone } from './staffManagement';

const staff = [
  {
    id: 'staff-okonkwo',
    firstName: 'Ada',
    lastName: 'Okonkwo',
    role: 'Attending',
    status: 'OnShift',
    shiftId: 'shift-1',
    assignedPatientIds: [],
  },
  {
    id: 'staff-singh',
    firstName: 'Nina',
    lastName: 'Singh',
    role: 'Attending',
    status: 'OnShift',
    shiftId: 'shift-1',
    assignedPatientIds: [],
  },
];

function patient(id, assignedStaffId, state = PatientState.Assessment) {
  return {
    id,
    firstName: 'Patient',
    lastName: id,
    state,
    assignedStaffId,
  };
}

describe('staff workload management', () => {
  it('uses workload tones requested by charge nurse thresholds', () => {
    expect(workloadTone(0)).toBe('gray');
    expect(workloadTone(3)).toBe('green');
    expect(workloadTone(4)).toBe('yellow');
    expect(workloadTone(5)).toBe('yellow');
    expect(workloadTone(6)).toBe('red');
  });

  it('includes active assigned patient lists and detects 2x team average imbalance', () => {
    const patients = [
      ...Array.from({ length: 8 }, (_, index) => patient(`ok-${index}`, 'staff-okonkwo')),
      ...Array.from({ length: 2 }, (_, index) => patient(`si-${index}`, 'staff-singh')),
      patient('unassigned', null),
      patient('discharged', 'staff-okonkwo', PatientState.Discharge),
    ];

    const workloads = buildStaffWorkloads(staff, patients, {
      status: 'Active',
      staffIds: ['staff-okonkwo', 'staff-singh'],
    } as any);
    const overloaded = workloads.find((member) => member.id === 'staff-okonkwo');
    const suggestion = getStaffRebalanceSuggestion(workloads);

    expect(overloaded).toMatchObject({
      assignedCount: 8,
      workloadTone: 'red',
    });
    expect(overloaded.assignedPatients).toHaveLength(8);
    expect(suggestion).toMatchObject({
      staffId: 'staff-okonkwo',
      assignedCount: 8,
      teamAverage: 5,
    });
  });
});
