import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import WhiteboardView from './WhiteboardView';
import {
  PatientFlag,
  PatientState,
  Priority,
  type Patient,
  type Room,
  type Staff,
} from '../../types/emergency';
import { useEmergencyStore } from '../../store/emergencyStore';

const originalState = useEmergencyStore.getState();

const rooms: Room[] = [
  { id: 'r-resus-1', name: 'Resus 1', type: 'Resus', status: 'Occupied', patientId: 'p1' },
  { id: 'r-treat-2', name: 'Room 2', type: 'Treatment', status: 'Occupied', patientId: 'p2' },
  { id: 'r-wait-1', name: 'WR Chair 1', type: 'Waiting', status: 'Occupied', patientId: 'p3' },
];

const staff: Staff[] = [
  { id: 'md-1', name: 'Dr. Patel', role: 'MD', status: 'OnShift', active: true },
  { id: 'md-2', name: 'Dr. Chen', role: 'MD', status: 'OnShift', active: true },
];

function patient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-base',
    mrn: 'ED-1',
    firstName: 'Alex',
    lastName: 'Kim',
    dob: '1990-01-01',
    age: 35,
    sex: 'F',
    arrivalTime: '2026-06-20T08:00:00.000Z',
    chiefComplaint: 'Pain',
    complaintCategory: 'Other',
    state: PatientState.Waiting,
    priority: Priority.P3,
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

const boardPatients = [
  patient({
    id: 'p1',
    lastName: 'Lee',
    firstName: 'Sam',
    priority: Priority.P2,
    roomId: 'r-resus-1',
    assignedStaffId: 'md-1',
    state: PatientState.Assessment,
  }),
  patient({
    id: 'p2',
    lastName: 'Nguyen',
    firstName: 'Tina',
    priority: Priority.P4,
    roomId: 'r-treat-2',
    assignedStaffId: 'md-2',
    state: PatientState.Waiting,
    arrivalTime: '2026-06-20T09:00:00.000Z',
  }),
  patient({
    id: 'p3',
    lastName: 'Singh',
    firstName: 'Raj',
    priority: Priority.P3,
    roomId: 'r-wait-1',
    state: PatientState.Waiting,
    flags: [PatientFlag.ReassessmentDue],
    arrivalTime: '2026-06-20T06:00:00.000Z',
  }),
];

describe('WhiteboardView', () => {
  beforeEach(() => {
    useEmergencyStore.setState(
      {
        ...originalState,
        patients: boardPatients,
        rooms,
        staff,
        selectedPatientId: null,
      },
      true,
    );
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-06-20T12:00:00.000Z').getTime());
  });

  it('renders dry-erase board chrome and patient rows', () => {
    render(
      <MemoryRouter>
        <WhiteboardView patients={boardPatients} rooms={rooms} staff={staff} />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: /emergency department whiteboard/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/3 of 3 patients on board/i)).toBeInTheDocument();
    expect(screen.getByText('Sam Lee')).toBeInTheDocument();
    expect(screen.getByText('Tina Nguyen')).toBeInTheDocument();
    expect(screen.getByText('Raj Singh')).toBeInTheDocument();
  });

  it('filters patients by zone and attending physician', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <WhiteboardView patients={boardPatients} rooms={rooms} staff={staff} />
      </MemoryRouter>,
    );

    await user.selectOptions(screen.getByLabelText(/filter by zone/i), 'resus');
    expect(screen.getByText('Sam Lee')).toBeInTheDocument();
    expect(screen.queryByText('Tina Nguyen')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/filter by zone/i), 'all');
    await user.selectOptions(screen.getByLabelText(/filter by attending physician/i), 'md-2');
    expect(screen.getByText('Tina Nguyen')).toBeInTheDocument();
    expect(screen.queryByText('Sam Lee')).not.toBeInTheDocument();
  });

  it('sorts patients when a sortable column header is clicked', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <WhiteboardView patients={boardPatients} rooms={rooms} staff={staff} />
      </MemoryRouter>,
    );

    const rowHeader = screen.getByRole('row');
    const patientOrder = () =>
      Array.from(document.querySelectorAll('[data-patient-card-id]')).map((node) =>
        node.getAttribute('data-patient-card-id'),
      );

    expect(patientOrder()).toEqual(['p1', 'p3', 'p2']);

    await user.click(within(rowHeader).getByRole('columnheader', { name: /patient/i }));
    expect(patientOrder()).toEqual(['p1', 'p2', 'p3']);

    await user.click(within(rowHeader).getByRole('columnheader', { name: /patient/i }));
    expect(patientOrder()).toEqual(['p3', 'p2', 'p1']);
  });
});
