import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NIHSS, { NIHSS_ITEMS } from './NIHSS';
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
  id: 'nihss-patient-1',
  mrn: 'ED-NIHSS-1',
  firstName: 'Sam',
  lastName: 'Rivera',
  dob: '1965-01-01',
  age: 61,
  sex: 'M',
  arrivalTime: '2026-06-13T12:00:00.000Z',
  chiefComplaint: 'Right sided weakness and aphasia',
  complaintCategory: 'Neuro',
  state: PatientState.Assessment,
  priority: Priority.P2,
  vitals: [],
  flags: [],
  assignedStaffId: 'stroke-rn',
  notes: [],
  timeline: [],
};

afterEach(() => {
  useEmergencyStore.setState(originalState, true);
  vi.clearAllMocks();
});

function seedPatient() {
  useEmergencyStore.setState({ ...originalState, patients: [patient] }, true);
}

describe('NIHSS calculator', () => {
  it('renders every NIHSS item and updates the score live', async () => {
    const user = userEvent.setup();
    render(<NIHSS onClose={vi.fn()} />);

    expect(NIHSS_ITEMS).toHaveLength(15);
    expect(screen.getByText('⏱ Document time of symptom onset or last known well')).toBeTruthy();
    expect(screen.getByText('0/42')).toBeTruthy();

    const locGroup = screen.getByRole('group', { name: '1a. Level of Consciousness' });
    await user.click(within(locGroup).getByLabelText('3 - Unresponsive, reflex only'));

    const leftArmGroup = screen.getByRole('group', { name: '5a. Motor Arm — Left' });
    await user.click(within(leftArmGroup).getByLabelText('4 - No movement'));

    expect(screen.getByText('7/42')).toBeTruthy();
    expect(screen.getByText('Moderate stroke')).toBeTruthy();
  });

  it('saves NIHSS summary and detail notes and dispatches warning alert for significant scores', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    seedPatient();

    render(<NIHSS patientId={patient.id} onClose={onClose} />);

    await user.type(screen.getByLabelText(/last known well time/i), '2026-06-13T08:30');
    await user.click(within(screen.getByRole('group', { name: '1a. Level of Consciousness' })).getByLabelText('3 - Unresponsive, reflex only'));
    await user.click(within(screen.getByRole('group', { name: '5a. Motor Arm — Left' })).getByLabelText('4 - No movement'));
    await user.click(screen.getByRole('button', { name: /save to patient/i }));

    const savedPatient = useEmergencyStore.getState().patients.find((candidate) => candidate.id === patient.id);
    expect(savedPatient?.notes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: expect.stringContaining('NIHSS: 7/42 — Moderate stroke'),
          authorId: 'stroke-rn',
          type: 'Score',
          metadata: expect.objectContaining({
            scoreId: 'nihss',
            scoreTotal: '7',
            band: 'Moderate stroke',
          }),
        }),
      ]),
    );
    expect(
      savedPatient?.timeline.some((event) => event.type === 'ClinicalScoreSaved'),
    ).toBe(true);
    expect(useEmergencyStore.getState().alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'Warning',
          title: 'NIHSS — Moderate stroke risk',
          message: 'Sam Rivera scored 7/42',
          patientId: patient.id,
          source: 'clinical-calculator-hub',
        }),
      ]),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
