import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import CommandDashboard from './CommandDashboard';
import { PatientState, Priority, type ActiveShift, type Patient, type Room, type Staff } from '../../types/emergency';

const rooms: Room[] = [
  { id: 'r1', name: 'Resus 1', type: 'Resus', status: 'Occupied', patientId: 'p1' },
  { id: 'r2', name: 'Room 2', type: 'Treatment', status: 'Available' },
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
    state: PatientState.Waiting,
    priority: Priority.P3,
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
  },
];

const staff: Staff[] = [
  { id: 's-charge', name: 'Owen Clarke', role: 'Charge', status: 'OnShift', active: true },
  { id: 's-md', name: 'Dr. Priya Nair', role: 'MD', status: 'OnShift', active: true },
];

const activeShift: ActiveShift = {
  id: 'shift-1',
  label: 'ED Day Shift',
  startTime: '2026-06-24T07:00:00.000Z',
  status: 'Open',
  chargeStaffId: 's-charge',
  staffIds: ['s-charge', 's-md'],
};

const capacity = {
  score: 55,
  band: 'Yellow',
  label: 'Yellow capacity',
  riskLevel: 'Yellow',
  totalPatients: 1,
  occupiedRooms: 1,
  boardingCount: 0,
  reassessmentDue: 0,
  currentOccupancy: 1,
  maxCapacity: 2,
  occupancyPercent: 50,
  waitingCount: 1,
  dischargeReadyCount: 0,
  incomingEMSCriticalCount: 0,
  deductions: [],
  updatedAt: '2026-06-24T10:00:00.000Z',
};

describe('CommandDashboard', () => {
  it('renders live operational metrics and zone occupancy from whiteboard state', () => {
    render(
      <CommandDashboard
        patients={patients}
        rooms={rooms}
        staff={staff}
        activeShift={activeShift}
        capacity={capacity}
        now={new Date('2026-06-24T10:00:00.000Z').getTime()}
      />,
    );

    expect(
      screen.getByRole('region', { name: /emergency department operational command dashboard/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Total patients')).toBeInTheDocument();
    expect(screen.getByText('Waiting room')).toBeInTheDocument();
    expect(screen.getByText('Boarding patients')).toBeInTheDocument();
    expect(screen.getByText('Average wait time')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /bed occupancy by zone/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Resus/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Green|Amber|Red/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('region', { name: /on-duty departmental staff overview/i })).toBeInTheDocument();
    expect(screen.getByText('Owen Clarke')).toBeInTheDocument();
  });
});