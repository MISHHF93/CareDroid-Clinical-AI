import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HEARTScore from './HEARTScore';
import { useEmergencyStore } from '../../store/emergencyStore';
import { PatientState, Priority, type Patient } from '../../types/emergency';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
  }),
}));

const originalState = useEmergencyStore.getState();

const patient: Patient = {
  id: 'heart-patient-1',
  mrn: 'ED-HEART-1',
  firstName: 'Jordan',
  lastName: 'Reyes',
  dob: '1950-03-01',
  age: 76,
  sex: 'M',
  arrivalTime: '2026-06-13T12:00:00.000Z',
  chiefComplaint: 'Chest pain',
  complaintCategory: 'Cardiac',
  state: PatientState.Assessment,
  priority: Priority.P2,
  vitals: [],
  flags: [],
  assignedStaffId: 'cardiac-rn',
  notes: [],
  timeline: [],
};

afterEach(() => {
  useEmergencyStore.setState(originalState, true);
  vi.clearAllMocks();
});

function seedPatient() {
  useEmergencyStore.setState({ ...originalState, patients: [patient], alerts: [] }, true);
}

describe('HEARTScore calculator', () => {
  it('auto-fills the age score from the patient DOB and renders a low-risk default total', () => {
    seedPatient();
    render(<HEARTScore patientId={patient.id} onClose={vi.fn()} />);

    expect(screen.getByText('2/10')).toBeTruthy();
    expect(screen.getByText('Low risk')).toBeTruthy();
    expect(screen.getByText('Consider early discharge')).toBeTruthy();
  });

  it('updates the live total as each field is selected and reflects the high-risk band', async () => {
    const user = userEvent.setup();
    seedPatient();
    render(<HEARTScore patientId={patient.id} onClose={vi.fn()} />);

    await user.click(screen.getByRole('radio', { name: /highly suspicious/i }));
    await user.click(screen.getByRole('radio', { name: /significant st deviation/i }));
    await user.click(screen.getByRole('radio', { name: /≥3 or atherosclerotic disease/i }));
    await user.click(screen.getByRole('radio', { name: />3× normal limit/i }));

    expect(screen.getByText('10/10')).toBeTruthy();
    expect(screen.getByText('High risk')).toBeTruthy();
    expect(screen.getByText('Consider early invasive strategy')).toBeTruthy();
  });

  it('saves a high-risk score to the patient, dispatches a critical alert, and closes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    seedPatient();
    render(<HEARTScore patientId={patient.id} onClose={onClose} />);

    await user.click(screen.getByRole('radio', { name: /highly suspicious/i }));
    await user.click(screen.getByRole('radio', { name: /significant st deviation/i }));
    await user.click(screen.getByRole('radio', { name: /≥3 or atherosclerotic disease/i }));
    await user.click(screen.getByRole('radio', { name: />3× normal limit/i }));

    await user.click(screen.getByRole('button', { name: /save to patient/i }));

    const savedPatient = useEmergencyStore.getState().patients.find((candidate) => candidate.id === patient.id);
    expect(savedPatient?.notes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: 'HEART Score: 10/10 — High risk',
          authorId: 'cardiac-rn',
          type: 'Score',
          metadata: expect.objectContaining({
            scoreId: 'heart-score',
            scoreTotal: '10',
          }),
        }),
      ]),
    );
    expect(useEmergencyStore.getState().alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'Warning',
          title: 'HEART Score — High risk risk',
          patientId: patient.id,
        }),
      ]),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
