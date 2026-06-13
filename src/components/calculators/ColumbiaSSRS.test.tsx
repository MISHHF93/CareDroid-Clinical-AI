import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ColumbiaSSRS, { classifyRisk } from './ColumbiaSSRS';
import { useEmergencyStore } from '../../store/emergencyStore';
import { PatientFlag, PatientState, Priority, type Patient } from '../../types/emergency';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
  }),
}));

const originalState = useEmergencyStore.getState();

const patient: Patient = {
  id: 'cssrs-patient-1',
  mrn: 'ED-CSSRS-1',
  firstName: 'Jordan',
  lastName: 'Lee',
  dob: '1991-02-03',
  age: 35,
  sex: 'F',
  arrivalTime: '2026-06-13T12:00:00.000Z',
  chiefComplaint: 'Depression with safety concern',
  complaintCategory: 'Psych',
  state: PatientState.Assessment,
  priority: Priority.P2,
  vitals: [],
  flags: [],
  assignedStaffId: 'psych-rn',
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

function yesNoButton(question: string, answer: 'YES' | 'NO') {
  return within(screen.getByText(question).closest('section') as HTMLElement).getByRole('button', { name: new RegExp(answer, 'i') });
}

describe('ColumbiaSSRS calculator', () => {
  it('classifies risk according to C-SSRS answers', () => {
    expect(classifyRisk({})).toBe('NONE_REPORTED');
    expect(classifyRisk({ q1: 'yes' })).toBe('LOW');
    expect(classifyRisk({ q2: 'yes' })).toBe('MODERATE');
    expect(classifyRisk({ q3: 'yes' })).toBe('MODERATE');
    expect(classifyRisk({ q4: 'yes' })).toBe('HIGH');
    expect(classifyRisk({ q5: 'yes' })).toBe('HIGH');
    expect(classifyRisk({ q6: 'yes' })).toBe('HIGH');
  });

  it('asks ideation questions in order and stops after no to Q1', async () => {
    const user = userEvent.setup();
    render(<ColumbiaSSRS onClose={vi.fn()} />);

    expect(screen.getByText(/This tool is a clinical aid/i)).toBeTruthy();
    expect(screen.getByText(/1\. Wish to be dead/i)).toBeTruthy();
    expect(screen.queryByText(/2\. Suicidal ideation/i)).toBeNull();

    await user.click(yesNoButton('1. Wish to be dead — Have you wished you were dead or wished you could go to sleep and not wake up?', 'NO'));

    expect(screen.getByText('Ideation section complete')).toBeTruthy();
    expect(screen.queryByText(/2\. Suicidal ideation/i)).toBeNull();
    expect(screen.getByText(/6\. Have you done anything/i)).toBeTruthy();
    expect(screen.getByText('No suicidal ideation reported at this time.')).toBeTruthy();
  });

  it('dispatches critical alert, adds PsychAlert, and saves only after confirmation', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    seedPatient();

    render(<ColumbiaSSRS patientId={patient.id} onClose={onClose} />);

    await user.click(yesNoButton('1. Wish to be dead — Have you wished you were dead or wished you could go to sleep and not wake up?', 'YES'));
    await user.click(yesNoButton('2. Suicidal ideation — Have you had any actual thoughts of killing yourself?', 'YES'));

    expect(screen.getByText(/MODERATE RISK/i)).toBeTruthy();
    expect(useEmergencyStore.getState().alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'Critical',
          title: 'Suicide Risk Assessment — Jordan Lee',
          message: 'MODERATE risk identified. Physician review required.',
          patientId: patient.id,
        }),
      ]),
    );
    expect(useEmergencyStore.getState().patients[0].flags).toContain(PatientFlag.PsychAlert);

    await user.click(screen.getByRole('button', { name: /save to patient/i }));
    expect(screen.getByText(/Saving this score will alert the clinical team/i)).toBeTruthy();
    expect(useEmergencyStore.getState().patients[0].notes).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: /save and alert/i }));

    expect(useEmergencyStore.getState().patients[0].notes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: expect.stringContaining('Columbia SSR Scale: MODERATE RISK.'),
          authorId: 'psych-rn',
        }),
      ]),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
