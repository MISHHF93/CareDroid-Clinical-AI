import { describe, expect, it } from 'vitest';
import type { Patient, Staff } from '../types/emergency';
import { resolveAssignedCareTeamNames, waitMinutes } from './patientWhiteboardSharedModel';

// Regression guard: this logic used to be duplicated byte-for-byte across
// patientRoomWhiteboardModel.ts (clinical bedside display) and
// patientWhiteboardModel.ts (plain-language bedside display) before being
// extracted here.

function patient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'p1',
    assignedStaffId: undefined,
    assignedPhysicianId: undefined,
    ...overrides,
  } as Patient;
}

function staffMember(overrides: Partial<Staff> = {}): Staff {
  return {
    id: 's1',
    name: 'Jordan Rivera',
    role: 'RN',
    active: true,
    ...overrides,
  } as Staff;
}

describe('waitMinutes', () => {
  it('computes elapsed minutes from an ISO timestamp', () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString();
    expect(waitMinutes(tenMinutesAgo)).toBeGreaterThanOrEqual(9);
    expect(waitMinutes(tenMinutesAgo)).toBeLessThanOrEqual(11);
  });

  it('floors at 0 for a malformed or future timestamp', () => {
    expect(waitMinutes('not-a-date')).toBe(0);
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(waitMinutes(future)).toBe(0);
  });
});

describe('resolveAssignedCareTeamNames', () => {
  it('returns an empty array when nothing is assigned', () => {
    expect(resolveAssignedCareTeamNames(patient(), [])).toEqual([]);
  });

  it('resolves the assigned staff member by id', () => {
    const staff = [staffMember({ id: 'nurse-1', name: 'Alex Chen' })];
    const result = resolveAssignedCareTeamNames(
      patient({ assignedStaffId: 'nurse-1' }),
      staff,
    );
    expect(result).toEqual(['Alex Chen']);
  });

  it('resolves both assigned staff and physician, in that order', () => {
    const staff = [
      staffMember({ id: 'nurse-1', name: 'Alex Chen' }),
      staffMember({ id: 'doc-1', name: 'Dr. Sam Okafor', role: 'MD' }),
    ];
    const result = resolveAssignedCareTeamNames(
      patient({ assignedStaffId: 'nurse-1', assignedPhysicianId: 'doc-1' }),
      staff,
    );
    expect(result).toEqual(['Alex Chen', 'Dr. Sam Okafor']);
  });

  it('does not duplicate a name assigned as both staff and physician', () => {
    const staff = [staffMember({ id: 'shared-1', name: 'Dr. Casey Nolan' })];
    const result = resolveAssignedCareTeamNames(
      patient({ assignedStaffId: 'shared-1', assignedPhysicianId: 'shared-1' }),
      staff,
    );
    expect(result).toEqual(['Dr. Casey Nolan']);
  });
});
