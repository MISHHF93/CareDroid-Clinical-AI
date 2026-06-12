import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import EmergencyWhiteboard from './EmergencyWhiteboard';
import { selectFilteredPatients, useEmergencyStore } from '../../store/emergencyStore';
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

    const patient = selectFilteredPatients(useEmergencyStore.getState())[0];
    const patientName = `${patient.firstName} ${patient.lastName}`;
    const patientButtonName = `Open details for ${patientName}`;

    render(
      <MemoryRouter>
        <EmergencyWhiteboard />
      </MemoryRouter>
    );

    expect(await screen.findByRole('button', { name: patientButtonName })).toBeInTheDocument();

    act(() => {
      useEmergencyStore.getState().movePatientToState(patient.id, PatientState.Discharge);
    });

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: patientButtonName })).not.toBeInTheDocument();
    });
  });
});
