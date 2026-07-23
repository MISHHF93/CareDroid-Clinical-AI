import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PatientCard from './PatientCard';
import { useEmergencyStore } from '../store/emergencyStore';
import { PatientState, Priority } from '../types/emergency';

const originalState = useEmergencyStore.getState();

function patientWithArrival() {
  return {
    id: 'wb-patient-1',
    mrn: 'ED-9001',
    firstName: 'Jordan',
    lastName: 'Lee',
    dob: '1988-04-02',
    age: 38,
    sex: 'Male' as const,
    arrivalTime: '2026-06-20T08:00:00.000Z',
    chiefComplaint: 'Chest pain',
    complaintCategory: 'Chest pain',
    state: PatientState.Triage,
    priority: Priority.P3,
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
    arrival: {
      arrivalMode: 'self-check-in' as const,
      arrivalTimestamp: '2026-06-20T08:00:00.000Z',
      chiefComplaint: 'Chest pain',
      triageAcuity: {
        code: Priority.P3,
        system: 'PRIORITY' as const,
        level: 3 as const,
        status: 'suggested' as const,
      },
      waitingRoomStatus: 'waiting-for-triage' as const,
      registrationStatus: 'complete' as const,
      queueDestination: 'triage-queue' as const,
      triagePending: true,
    },
  };
}

describe('PatientCard core whiteboard row', () => {
  beforeEach(() => {
    useEmergencyStore.setState(
      {
        ...originalState,
        patients: [patientWithArrival()],
        selectedPatientId: null,
      },
      true,
    );
  });

  it('renders normalized arrival fields in row layout', () => {
    render(
      <MemoryRouter>
        <PatientCard patient={patientWithArrival()} layout="row" />
      </MemoryRouter>,
    );

    expect(screen.getByText('Jordan Lee')).toBeInTheDocument();
    expect(screen.getByText('ED-9001')).toBeInTheDocument();
    expect(screen.getByText(/self check-in/i)).toBeInTheDocument();
    expect(screen.getByText(/chest pain/i)).toBeInTheDocument();
    expect(screen.getByText('P3')).toBeInTheDocument();
    expect(screen.getByText('Waiting for Triage')).toBeInTheDocument();
  });

  it('selects patient on row click to open detail context', () => {
    const selectPatient = vi.fn();
    useEmergencyStore.setState({ selectPatient } as never);

    render(
      <MemoryRouter>
        <PatientCard patient={patientWithArrival()} layout="row" />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /jordan lee/i }));
    expect(selectPatient).toHaveBeenCalledWith('wb-patient-1');
  });

  it('wires the Room display action to /emergency/patient-room?patientId=<id> (Cycle 153 — was orphaned, no UI reached it)', () => {
    render(
      <MemoryRouter>
        <PatientCard patient={patientWithArrival()} layout="card" />
      </MemoryRouter>,
    );

    const roomDisplayButton = screen.getByRole('button', { name: /open room display for jordan lee/i });
    fireEvent.click(roomDisplayButton);

    expect(window.location.pathname).toBe('/emergency/patient-room');
    expect(window.location.search).toBe('?patientId=wb-patient-1');
  });
});