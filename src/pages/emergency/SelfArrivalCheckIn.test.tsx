import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SelfArrivalCheckIn from './SelfArrivalCheckIn';
import { useEmergencyStore } from '../../store/emergencyStore';
import { PatientState } from '../../types/emergency';
import { WHITEBOARD_QUEUE_FILTER } from '../../services/queueAssignment';

const originalState = useEmergencyStore.getState();

describe('SelfArrivalCheckIn', () => {
  beforeEach(() => {
    useEmergencyStore.setState(
      {
        ...originalState,
        patients: [],
        selectedPatientId: null,
        activeQueueFilter: null,
      },
      true,
    );
  });

  it('creates a self-check-in patient and hands off to the whiteboard triage queue', () => {
    render(<SelfArrivalCheckIn />);

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Alex' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Kim' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    fireEvent.change(screen.getByLabelText(/reason for visit/i), {
      target: { value: 'Chest pain' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    fireEvent.click(screen.getByRole('button', { name: /penicillin/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.click(screen.getByRole('button', { name: /complete check-in/i }));

    const patient = useEmergencyStore.getState().patients[0];
    expect(patient).toBeTruthy();
    expect(patient.arrival).toMatchObject({
      arrivalMode: 'self-check-in',
      chiefComplaint: 'Chest pain',
      waitingRoomStatus: 'waiting-for-triage',
      queueDestination: 'triage-queue',
    });
    expect(patient.state).toBe(PatientState.Triage);
    expect(patient.source).toBe('Self-arrival');
    expect(patient.notes[0]?.body).toContain('Penicillin');
    expect(useEmergencyStore.getState().selectedPatientId).toBe(patient.id);
    expect(useEmergencyStore.getState().activeQueueFilter).toBe(WHITEBOARD_QUEUE_FILTER.triage);

    expect(screen.getByText(/whiteboard with a waiting-for-triage status/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open department whiteboard/i })).toBeInTheDocument();
  });
});