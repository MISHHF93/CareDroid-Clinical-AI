import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type ActiveShift, type Patient, type Room, type Staff } from '../types/emergency';
import { buildDepartmentStaffBarSnapshot } from './departmentStaffBarModel';

const rooms: Room[] = [
  { id: 'r-resus', name: 'Resus 1', type: 'Resus', status: 'Occupied', patientId: 'p1' },
  { id: 'r-triage', name: 'Triage 1', type: 'Triage', status: 'Occupied', patientId: 'p2' },
];

const staff: Staff[] = [
  { id: 's-charge', name: 'Owen Clarke', role: 'Charge', status: 'OnShift', active: true },
  { id: 's-triage', name: 'Maya Thompson', role: 'TriageNurse', status: 'OnShift', active: true },
  { id: 's-md', name: 'Dr. Priya Nair', role: 'MD', status: 'OnShift', active: true },
  { id: 's-rn', name: 'Leo Fraser', role: 'RN', status: 'OnShift', active: true },
  { id: 's-off', name: 'Off Duty', role: 'RN', status: 'OffShift', active: false },
];

const patients: Patient[] = [
  {
    id: 'p1',
    mrn: 'ED-1',
    firstName: 'Sam',
    lastName: 'Lee',
    dob: '1990-01-01',
    age: 35,
    sex: 'F',
    arrivalTime: '2026-06-24T08:00:00.000Z',
    chiefComplaint: 'Chest pain',
    complaintCategory: 'Cardiac',
    state: PatientState.Assessment,
    priority: Priority.P2,
    roomId: 'r-resus',
    assignedStaffId: 's-md',
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
  },
  {
    id: 'p2',
    mrn: 'ED-2',
    firstName: 'Alex',
    lastName: 'Kim',
    dob: '1992-01-01',
    age: 33,
    sex: 'M',
    arrivalTime: '2026-06-24T08:10:00.000Z',
    chiefComplaint: 'Abdominal pain',
    complaintCategory: 'Abdominal',
    state: PatientState.Triage,
    priority: Priority.P3,
    roomId: 'r-triage',
    assignedStaffId: 's-triage',
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
  },
  {
    id: 'p3',
    mrn: 'ED-3',
    firstName: 'Riya',
    lastName: 'Patel',
    dob: '1988-01-01',
    age: 37,
    sex: 'F',
    arrivalTime: '2026-06-24T08:20:00.000Z',
    chiefComplaint: 'Laceration',
    complaintCategory: 'Trauma',
    state: PatientState.Waiting,
    priority: Priority.P4,
    assignedStaffId: 's-rn',
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
  },
];

const activeShift: ActiveShift = {
  id: 'shift-1',
  label: 'ED Day Shift',
  startTime: '2026-06-24T07:00:00.000Z',
  status: 'Open',
  chargeStaffId: 's-charge',
  staffIds: ['s-charge', 's-triage', 's-md', 's-rn', 's-off'],
};

describe('departmentStaffBarModel', () => {
  it('builds on-duty staff entries with titles and responsibilities', () => {
    const snapshot = buildDepartmentStaffBarSnapshot({ staff, patients, rooms, activeShift });

    expect(snapshot.onDutyCount).toBe(4);
    expect(snapshot.shiftLabel).toBe('ED Day Shift');

    const charge = snapshot.entries.find((entry) => entry.staffId === 's-charge');
    expect(charge?.title).toBe('Charge Nurse');
    expect(charge?.responsibilities).toContain('Department flow & surge coordination');

    const triage = snapshot.entries.find((entry) => entry.staffId === 's-triage');
    expect(triage?.title).toBe('Triage Nurse');
    expect(triage?.responsibilities.some((item) => item.includes('Triage queue'))).toBe(true);

    const physician = snapshot.entries.find((entry) => entry.staffId === 's-md');
    expect(physician?.title).toBe('Attending Physician');
    expect(physician?.responsibilities.some((item) => item.includes('Resuscitation coverage'))).toBe(
      true,
    );
    expect(physician?.patientCount).toBe(1);

    expect(snapshot.entries[0]?.staffId).toBe('s-charge');
    expect(snapshot.entries.some((entry) => entry.staffId === 's-off')).toBe(false);
  });

  it('falls back to active staff when shift staffing is not configured', () => {
    const snapshot = buildDepartmentStaffBarSnapshot({
      staff,
      patients,
      rooms,
      activeShift: { ...activeShift, staffIds: undefined },
    });

    expect(snapshot.onDutyCount).toBe(4);
  });
});