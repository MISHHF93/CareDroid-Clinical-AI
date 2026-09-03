import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import PatientCard from './PatientCard';
import { PatientState, Priority, type Patient } from '../types/emergency';

const malformedPatient = {
  id: 'api-patient-1',
  mrn: 'MRN-API-1',
  firstName: 'Api',
  lastName: 'Patient',
  state: PatientState.Waiting,
  priority: Priority.P3,
  arrivalTime: new Date().toISOString(),
  chiefComplaint: 'Chest pain',
  arrival: {
    arrivalMode: 'walk-in',
    arrivalTimestamp: new Date().toISOString(),
    triageAcuity: { code: Priority.P3, status: 'unassigned' },
    waitingRoomStatus: 'waiting-for-clinician',
  },
} as Patient;

describe('PatientCard malformed API patients', () => {
  it('renders when vitals and flags are missing', () => {
    render(
      <MemoryRouter>
        <PatientCard patient={malformedPatient} layout="row" />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Api Patient/i)).toBeInTheDocument();
    expect(screen.getByText(/Chest pain/i)).toBeInTheDocument();
  });
});
