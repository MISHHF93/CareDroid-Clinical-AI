import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import CrisisMode from './CrisisMode';
import { useEmergencyStore } from '../../store/emergencyStore';
import { PatientState, Priority } from '../types/emergency';

vi.mock('../services/clinicalChatService', () => ({
  sendClinicalChatMessage: vi.fn(() =>
    Promise.resolve({
      ok: true,
      data: {
        response:
          'Prioritize admission calls, then move discharge-ready patients, then prepare bays for inbound EMS.',
      },
    })
  ),
}));

const originalState = useEmergencyStore.getState();

function patient(id, state, overrides = {}) {
  return {
    id,
    name: overrides.name || `Patient ${id}`,
    firstName: 'Patient',
    lastName: id,
    mrn: `MRN-${id}`,
    dob: '1980-01-01',
    age: 46,
    sex: 'Other',
    arrivalTime: '2026-06-11T18:00:00-04:00',
    triageTime: null,
    lastAssessedTime: '2026-06-11T19:00:00-04:00',
    chiefComplaint: 'Capacity test',
    complaintCategory: 'Other',
    state,
    priority: Priority.P3,
    vitals: { recordedAt: '2026-06-11T19:00:00-04:00' },
    assignedStaffId: null,
    roomId: null,
    flags: [],
    timeline: [],
    notes: [],
    ...overrides,
  };
}

afterEach(() => {
  useEmergencyStore.setState(originalState, true);
  vi.clearAllMocks();
});

describe('CrisisMode', () => {
  it('shows Orange banner and auto-opens deterministic action panel', async () => {
    useEmergencyStore.setState((state) => ({
      capacity: {
        ...state.capacity,
        riskLevel: 'Orange',
        label: 'Capacity Strained',
        score: 68,
        boardingCount: 1,
        dischargeReadyCount: 1,
        deductions: [{ id: 'boarding', label: '1 boarding patient', value: 8 }],
      },
      patients: [
        patient('boarding', PatientState.Admission, {
          referral: { targetDepartment: 'Cardiology' },
        }),
        patient('discharge', PatientState.Disposition),
      ],
      emsArrivals: [
        {
          id: 'ems-1',
          unitName: 'Medic 1',
          status: 'Inbound',
          eta: 8,
          chiefComplaint: 'Respiratory distress',
        },
      ],
    }));

    render(<CrisisMode />);

    expect(screen.getByText(/CAPACITY STRAINED - 68\/100 - Orange/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('complementary', { name: /Capacity Crisis Actions/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/Contact 1 boarding patients' admitting teams/i)).toBeInTheDocument();
    expect(screen.getByText(/Expedite 1 discharge-ready patients/i)).toBeInTheDocument();
    expect(screen.getByText(/Prepare 1 bays for incoming EMS/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Discharge now/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Assign bay/i })).toBeInTheDocument();
  });
});
