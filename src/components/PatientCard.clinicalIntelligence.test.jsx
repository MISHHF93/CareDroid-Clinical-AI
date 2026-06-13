import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PatientDetailPanel from './PatientDetailPanel';
import { useEmergencyStore } from '../store/emergencyStore';
import { PatientState, Priority } from '../types/emergency';

const originalState = useEmergencyStore.getState();

function selectedPatient() {
  return {
    id: 'patient-ai-panel-test',
    mrn: 'MRN-AI-1',
    firstName: 'Avery',
    lastName: 'Stone',
    dob: '1970-01-01',
    age: 56,
    sex: 'Female',
    arrivalTime: '2026-06-12T08:40:00-04:00',
    triageTime: null,
    lastAssessedTime: null,
    chiefComplaint: 'Shortness of breath',
    complaintCategory: 'Respiratory',
    state: PatientState.Assessment,
    priority: Priority.P2,
    vitals: [
      {
        recordedAt: '2026-06-12T08:55:00-04:00',
        recordedBy: 'staff-1',
        hr: 118,
        sbp: 108,
        dbp: 66,
        spo2: 88,
        temp: 37.5,
        rr: 30,
        gcs: 15,
        pain: 2,
      },
    ],
    assignedStaffId: 'staff-1',
    roomId: null,
    flags: [],
    timeline: [],
    notes: [],
  };
}

function seedPatientDetail() {
  const patient = selectedPatient();
  act(() => {
    useEmergencyStore.setState(
      {
        ...originalState,
        patients: [patient],
        selectedPatientId: patient.id,
        referrals: [],
        patientBackendDetails: {
          [patient.id]: {
            patientId: patient.id,
            status: 'ready',
            loadedAt: '2026-06-12T08:59:00-04:00',
            data: {
              medications: [{ id: 'med-1', name: 'Albuterol', status: 'Active' }],
              allergies: [],
              labs: [{ id: 'lab-1', name: 'ABG pH', value: '7.31', unit: '' }],
              visits: [],
              imaging: [],
              documents: [],
              observations: [],
              orders: [],
              diagnoses: [],
            },
          },
        },
        loadPatientBackendDetails: vi.fn(() => Promise.resolve(null)),
      },
      true
    );
  });
}

afterEach(() => {
  act(() => {
    useEmergencyStore.setState(originalState, true);
  });
  vi.clearAllMocks();
});

describe('PatientDetailPanel clinical intelligence', () => {
  it('renders patient-scoped details and records new vitals from the panel', async () => {
    const user = userEvent.setup();
    seedPatientDetail();

    render(
      <MemoryRouter>
        <PatientDetailPanel />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Avery Stone/i })).toBeInTheDocument();
    expect(screen.getByText('MRN-AI-1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /move to next state/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /add vitals/i }));
    await user.clear(screen.getByLabelText(/^HR$/i));
    await user.type(screen.getByLabelText(/^HR$/i), '122');
    await user.click(screen.getByRole('button', { name: /save vitals/i }));

    const updated = useEmergencyStore
      .getState()
      .patients.find((patient) => patient.id === 'patient-ai-panel-test');
    expect(updated?.vitals.at(-1)?.hr).toBe(122);
  });
});
