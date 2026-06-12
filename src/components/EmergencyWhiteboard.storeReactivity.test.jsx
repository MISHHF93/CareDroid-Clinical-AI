import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
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
