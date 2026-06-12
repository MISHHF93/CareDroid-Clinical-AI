import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import EmergencyWhiteboard from './EmergencyWhiteboard';
import { useEmergencyStore } from '../../store/emergencyStore';
import { PatientState } from '../../types/emergency';

const originalState = useEmergencyStore.getState();

afterEach(() => {
  act(() => {
    useEmergencyStore.setState(originalState, true);
  });
});

describe('EmergencyWhiteboard store reactivity', () => {
  it('surfaces ED AI command actions from the central dashboard', async () => {
    const user = userEvent.setup();
    act(() => {
      useEmergencyStore.setState(
        { ...originalState, selectedPatientId: null, activeQueueFilter: null, whiteboardSearchQuery: '' },
        true
      );
    });

    render(
      <MemoryRouter>
        <EmergencyWhiteboard />
      </MemoryRouter>
    );

    expect(screen.getByRole('region', { name: /ED AI command node/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ED Copilot/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Patient AI/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Patient AI/i }));

    expect(useEmergencyStore.getState().selectedPatientId).toBeTruthy();
  });

  it('re-renders when simulation-style store actions move a patient out of the active board', async () => {
    act(() => {
      useEmergencyStore.setState(
        { ...originalState, selectedPatientId: null, activeQueueFilter: null, whiteboardSearchQuery: '' },
        true
      );
    });

    render(
      <MemoryRouter>
        <EmergencyWhiteboard />
      </MemoryRouter>
    );

    let patientCard;
    await waitFor(() => {
      patientCard = document.querySelector('[data-patient-card-id]');
      expect(patientCard).toBeTruthy();
    });
    const patientId = patientCard.dataset.patientCardId;

    expect(patientId).toBeTruthy();

    act(() => {
      useEmergencyStore.getState().movePatientToState(patientId, PatientState.Discharge);
    });

    await waitFor(() => {
      expect(document.querySelector(`[data-patient-card-id="${patientId}"]`)).not.toBeInTheDocument();
    });
  });
});
