import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import EmergencyWhiteboard from './EmergencyWhiteboard';
import { useEmergencyStore } from '../../store/emergencyStore';
import { PatientState } from '../types/emergency';

const originalState = useEmergencyStore.getState();

afterEach(() => {
  act(() => {
    useEmergencyStore.setState(originalState, true);
  });
});

describe('EmergencyWhiteboard store reactivity', () => {
  it('selects patients from the canonical whiteboard cards', async () => {
    const user = userEvent.setup();
    act(() => {
      useEmergencyStore.setState(
        {
          ...originalState,
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

    const commandStatus = await screen.findByLabelText('CareDroid command center status');
    expect(commandStatus).toHaveTextContent(/Central Node managed/i);
    expect(commandStatus).toHaveTextContent(/active ED records/i);
    const firstPatientCard = document.querySelector('[data-patient-card-id]');
    expect(firstPatientCard).toBeTruthy();
    await user.click(firstPatientCard);

    expect(useEmergencyStore.getState().selectedPatientId).toBe(
      firstPatientCard.dataset.patientCardId,
    );
  });

  it('updates canonical store state when simulation-style actions discharge a patient', async () => {
    act(() => {
      useEmergencyStore.setState(
        {
          ...originalState,
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

    let patientCard;
    await waitFor(() => {
      patientCard = document.querySelector('[data-patient-card-id]');
      expect(patientCard).toBeTruthy();
    });
    const patientId = patientCard.dataset.patientCardId;

    expect(patientId).toBeTruthy();

    act(() => {
      useEmergencyStore.getState().updatePatient(patientId, { state: PatientState.Discharge });
    });

    expect(
      useEmergencyStore.getState().patients.find((patient) => patient.id === patientId)?.state,
    ).toBe(PatientState.Discharge);
  });
});
