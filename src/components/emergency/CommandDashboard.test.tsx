import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CommandDashboard from './CommandDashboard';
import {
  PatientState,
  Priority,
  type ActiveShift,
  type CapacitySnapshot,
  type Patient,
  type Room,
  type Staff,
} from '../../types/emergency';

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
    triageTime: '2026-06-24T08:14:00.000Z',
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
  { id: 's-rn', name: 'Maya Thompson', role: 'RN', status: 'OnShift', active: true },
];

const activeShift: ActiveShift = {
  id: 'shift-1',
  label: 'ED Day Shift',
  startTime: '2026-06-24T07:00:00.000Z',
  status: 'Open',
  chargeStaffId: 's-charge',
  staffIds: ['s-charge', 's-md'],
};

const capacity: CapacitySnapshot = {
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
  availableRoomCount: 1,
  deductions: [],
  updatedAt: '2026-06-24T10:00:00.000Z',
};

describe('CommandDashboard', () => {
  it('renders live operational metrics and zone occupancy from whiteboard state', () => {
    render(
      <MemoryRouter>
        <CommandDashboard
          patients={patients}
          rooms={rooms}
          staff={staff}
          activeShift={activeShift}
          capacity={capacity}
          now={new Date('2026-06-24T10:00:00.000Z').getTime()}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('region', { name: /emergency department operational command dashboard/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Total patients')).toBeInTheDocument();
    expect(screen.getByText('Waiting room')).toBeInTheDocument();
    expect(screen.getByText('Doctors on duty')).toBeInTheDocument();
    expect(screen.getByText('Nurses available')).toBeInTheDocument();
    expect(screen.getByText('Beds available')).toBeInTheDocument();
    expect(screen.getByText('Critical patients')).toBeInTheDocument();
    expect(screen.getByText('Admissions today')).toBeInTheDocument();
    expect(screen.getByText('Discharges today')).toBeInTheDocument();
    expect(screen.getByText('Average triage time')).toBeInTheDocument();
    expect(screen.getByText('ER occupancy')).toBeInTheDocument();
    expect(screen.getByText('Boarding patients')).toBeInTheDocument();
    expect(screen.getByText('Average wait time')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /bed occupancy by zone/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Resus/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Green|Amber|Red/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('region', { name: /on-duty departmental staff overview/i })).toBeInTheDocument();
    expect(screen.getByText('Owen Clarke')).toBeInTheDocument();
  });

  it('shows AI decision support as clinician-owned recommendations', () => {
    render(
      <MemoryRouter>
        <CommandDashboard
          patients={patients}
          rooms={rooms}
          staff={staff}
          activeShift={activeShift}
          capacity={capacity}
          now={new Date('2026-06-24T10:00:00.000Z').getTime()}
          snapshot={{
            metrics: [],
            zoneOccupancy: [],
            bottleneckLabel: 'Department flow within green thresholds',
            summaryLine: '1 waiting',
            updatedAt: '2026-06-24T10:00:00.000Z',
            chargeNurseAlerts: [],
            resourceActivations: [],
            pendingBedAssignments: [
              {
                patientId: 'p1',
                patientLabel: 'Sam Lee',
                probabilityPercent: 82,
                admitScore: 8,
                action: 'Notify charge nurse and bed management.',
              },
            ],
            prolongedStayAlerts: [],
            orientationPredictions: [],
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('region', { name: /ai decision support recommendations/i })).toBeInTheDocument();
    expect(screen.getByText(/82% confidence/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /modify/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
  });

  // Regression coverage: the full, uncapped prediction lists below the top-5 AI
  // decision queue used to render with zero truthfulness disclosure -- and the
  // orientation section's own heading falsely claimed "(ML)" despite being the
  // same deterministic-rule computation the AI queue right above it correctly
  // labels. Both are real, user-visible AI-truthfulness defects.
  it('labels the prolonged-stay, orientation, and pending-bed sections as deterministic (Manual), not silently or falsely as ML', () => {
    render(
      <MemoryRouter>
        <CommandDashboard
          patients={patients}
          rooms={rooms}
          staff={staff}
          activeShift={activeShift}
          capacity={capacity}
          now={new Date('2026-06-24T10:00:00.000Z').getTime()}
          snapshot={{
            metrics: [],
            zoneOccupancy: [],
            bottleneckLabel: 'Department flow within green thresholds',
            summaryLine: '1 waiting',
            updatedAt: '2026-06-24T10:00:00.000Z',
            chargeNurseAlerts: [],
            resourceActivations: [],
            pendingBedAssignments: [
              {
                patientId: 'p1',
                patientLabel: 'Sam Lee',
                probabilityPercent: 82,
                admitScore: 8,
                action: 'Notify charge nurse and bed management.',
              },
            ],
            prolongedStayAlerts: [
              {
                patientId: 'p1',
                patientLabel: 'Sam Lee',
                probabilityPercent: 60,
                predictedHours: 6,
                action: 'Review disposition plan.',
              },
            ],
            orientationPredictions: [
              {
                patientId: 'p1',
                patientLabel: 'Sam Lee',
                orientation: 'ward',
                probabilityPercent: 70,
              },
            ],
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Prolonged ED stay risk' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Post-ED orientation' })).toBeInTheDocument();
    expect(screen.queryByText(/Post-ED orientation \(ML\)/i)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pending bed assignment' })).toBeInTheDocument();

    // AiTruthLabel's compact badge renders the state label text ("Manual") --
    // one for each of the 3 sections, plus the AI decision queue's own card above.
    expect(screen.getAllByText('Manual').length).toBeGreaterThanOrEqual(3);
  });
});
