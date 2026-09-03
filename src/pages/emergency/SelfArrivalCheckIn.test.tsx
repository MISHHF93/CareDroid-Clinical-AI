import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useEmergencyStore } from '../../store/emergencyStore';
import { PatientState } from '../../types/emergency';
import { WHITEBOARD_QUEUE_FILTER } from '../../services/queueAssignment';

const createSmartIntakePatient = vi.fn();

vi.mock('../../config/backendApiCapabilities', () => ({
  isBackendCapabilityEnabled: () => true,
}));

vi.mock('../../services/emergencyOsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/emergencyOsApi')>();
  return {
    ...actual,
    createSmartIntakePatient: (...args: unknown[]) => createSmartIntakePatient(...args),
  };
});

const { default: SelfArrivalCheckIn } = await import('./SelfArrivalCheckIn');

const originalState = useEmergencyStore.getState();

async function completeKioskSteps() {
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
}

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
    createSmartIntakePatient.mockReset();
  });

  it('creates a self-check-in patient, syncs it to the backend, and hands off to the whiteboard triage queue', async () => {
    createSmartIntakePatient.mockResolvedValue({ data: { patient: { id: 'backend-1' } } });
    render(<SelfArrivalCheckIn />);

    await completeKioskSteps();

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

    expect(
      await screen.findByText(/whiteboard with a waiting-for-triage status/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open department whiteboard/i })).toBeInTheDocument();
    expect(createSmartIntakePatient).toHaveBeenCalledTimes(1);
  });

  it('shows the "see the front desk" failure state and does not falsely claim success when the backend write fails', async () => {
    // The real bug this guards against: self-arrival has no staff device
    // present at submission (unlike reception's own desk), so a failed
    // backend write must not be presented to the patient as "you are checked
    // in" -- the patient existing only in this kiosk's own local store is
    // invisible to every other device.
    createSmartIntakePatient.mockRejectedValue(new Error('Network down'));
    render(<SelfArrivalCheckIn />);

    await completeKioskSteps();

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t finish your check-in/i);
    expect(screen.queryByText(/you are checked in/i)).not.toBeInTheDocument();
  });
});
