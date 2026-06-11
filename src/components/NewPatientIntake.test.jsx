import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewPatientIntake, { suggestPriority } from './NewPatientIntake';
import { useEmergencyStore } from '../../store/emergencyStore';
import { PatientState, Priority } from '../../types/emergency';

import './NewPatientIntake.css';

const originalState = useEmergencyStore.getState();

afterEach(() => {
  useEmergencyStore.setState(originalState, true);
});

describe('NewPatientIntake triage suggestions', () => {
  it('suggests P1 for critical vitals', () => {
    expect(suggestPriority('Shortness of Breath', { spo2: '89', hr: '90' })).toBe(Priority.P1);
    expect(suggestPriority('Other', { hr: '151' })).toBe(Priority.P1);
  });

  it('suggests P2 for chest pain with diaphoresis', () => {
    expect(suggestPriority('Chest Pain', { hr: '88', spo2: '98' }, 'diaphoretic and clammy')).toBe(
      Priority.P2
    );
  });
});

describe('NewPatientIntake flow', () => {
  it('adds a reviewed patient to the whiteboard in Triage state', async () => {
    const user = userEvent.setup();
    const beforeCount = useEmergencyStore.getState().patients.length;

    render(<NewPatientIntake open onClose={() => {}} />);

    await user.type(screen.getByLabelText(/first name/i), 'Avery');
    await user.type(screen.getByLabelText(/last name/i), 'Stone');
    fireEvent.change(screen.getByLabelText(/dob/i), { target: { value: '1988-04-12' } });
    await user.selectOptions(screen.getByLabelText(/sex/i), 'Female');

    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /^chest pain$/i }));

    expect(screen.getByText(/Suggest: HEART Score \+ ACS Protocol/i)).toBeInTheDocument();

    await user.type(
      screen.getByLabelText(/specific complaint description/i),
      'Chest pain with diaphoresis'
    );
    await user.click(screen.getByRole('button', { name: /next/i }));

    await user.type(screen.getByLabelText(/^HR/i), '96');
    await user.type(screen.getByLabelText(/^SBP/i), '142');
    await user.type(screen.getByLabelText(/^DBP/i), '84');
    await user.type(screen.getByLabelText(/SpO2/i), '97');
    await user.type(screen.getByLabelText(/Temp/i), '36.9');
    await user.type(screen.getByLabelText(/^RR/i), '18');
    await user.type(screen.getByLabelText(/^GCS/i), '15');
    await user.type(screen.getByLabelText(/^Pain/i), '7');

    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getAllByText(/CTAS 2 · Emergent/i).length).toBeGreaterThanOrEqual(1);

    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /add to department/i }));

    await waitFor(() => {
      expect(useEmergencyStore.getState().patients).toHaveLength(beforeCount + 1);
    });

    const patient = useEmergencyStore
      .getState()
      .patients.find((candidate) => candidate.firstName === 'Avery' && candidate.lastName === 'Stone');

    expect(patient).toEqual(
      expect.objectContaining({
        state: PatientState.Triage,
        priority: Priority.P2,
        chiefComplaint: 'Chest pain with diaphoresis',
        complaintCategory: 'Chest Pain',
      })
    );
    expect(patient?.mrn).toMatch(/^ED-\d{6}$/);
  });
});
