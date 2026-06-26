import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import EmergencyWhiteboard from './EmergencyWhiteboard';
import { useEmergencyStore } from '../store/emergencyStore';
import { PatientState, Priority } from '../types/emergency';

const originalState = useEmergencyStore.getState();

const malformedApiPatient = {
  id: 'api-malformed-1',
  mrn: 'MRN-API-1',
  firstName: 'Api',
  lastName: 'Patient',
  state: PatientState.Waiting,
  priority: Priority.P3,
  arrivalTime: '2026-06-24T12:00:00.000Z',
  chiefComplaint: 'Chest pain',
  arrival: {
    arrivalMode: 'walk-in',
    arrivalTimestamp: '2026-06-24T12:00:00.000Z',
    triageAcuity: { code: Priority.P3, status: 'unassigned' },
    waitingRoomStatus: 'waiting-for-clinician',
  },
};

vi.mock('../hooks/useEmergencyOs', async () => {
  const actual = await vi.importActual('../hooks/useEmergencyOs');
  return {
    ...actual,
    useEmergencyWhiteboard: () => ({
      data: {
        data: {
          patients: [malformedApiPatient],
          capacity: originalState.capacity,
        },
        generatedAt: '2026-06-24T12:00:00.000Z',
      },
      loading: false,
      error: null,
    }),
    useUpgradeHarnessPatientFlow: () => ({ data: null, loading: false, error: null }),
  };
});

afterEach(() => {
  act(() => {
    useEmergencyStore.setState(originalState, true);
  });
});

describe('EmergencyWhiteboard malformed API patients', () => {
  it('renders when API patients have partial arrival blocks', async () => {
    act(() => {
      useEmergencyStore.setState(
        {
          ...originalState,
          patients: [],
          selectedPatientId: null,
          activeQueueFilter: null,
          whiteboardSearchQuery: '',
        },
        true,
      );
    });

    render(
      <MemoryRouter>
        <EmergencyWhiteboard />
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText('CareDroid command center status')).toBeInTheDocument();
    expect(screen.queryByRole('alert', { name: /encountered an error/i })).not.toBeInTheDocument();
    expect(document.querySelector('[data-patient-card-id="api-malformed-1"]')).toBeTruthy();
  });
});