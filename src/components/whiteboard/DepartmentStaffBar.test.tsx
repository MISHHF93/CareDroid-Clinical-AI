import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import DepartmentStaffBar from './DepartmentStaffBar';
import {
  PatientState,
  Priority,
  type ActiveShift,
  type Patient,
  type Staff,
} from '../../types/emergency';

const staff: Staff[] = [
  { id: 's-charge', name: 'Owen Clarke', role: 'Charge', status: 'OnShift', active: true },
  { id: 's-md', name: 'Dr. Priya Nair', role: 'MD', status: 'OnShift', active: true },
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
    chiefComplaint: 'Pain',
    complaintCategory: 'Other',
    state: PatientState.Assessment,
    priority: Priority.P3,
    assignedStaffId: 's-md',
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
  staffIds: ['s-charge', 's-md'],
};

describe('DepartmentStaffBar', () => {
  it('renders on-duty clinicians with titles and responsibilities', () => {
    render(<DepartmentStaffBar staff={staff} patients={patients} activeShift={activeShift} />);

    expect(
      screen.getByRole('region', { name: /on-duty departmental staff overview/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Owen Clarke')).toBeInTheDocument();
    expect(screen.getByText('Charge Nurse')).toBeInTheDocument();
    expect(screen.getByText('Dr. Priya Nair')).toBeInTheDocument();
    expect(screen.getByText('Attending Physician')).toBeInTheDocument();
    expect(screen.getByText(/Department flow & surge coordination/i)).toBeInTheDocument();
  });
});
