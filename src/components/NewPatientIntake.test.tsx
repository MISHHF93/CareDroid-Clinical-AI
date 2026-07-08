import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewPatientIntake, { suggestPriority } from './NewPatientIntake';
import {
  hasPatientFlag,
  selectQueueCounts,
  selectReassessmentCount,
  selectReassessmentQueue,
  useEmergencyStore,
} from '../../store/emergencyStore';
import { PatientState, Priority } from '../types/emergency';

import './NewPatientIntake.css';

vi.mock('../services/emergencyOsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/emergencyOsApi')>();
  return {
    ...actual,
    runSmartIntakeVerticalSlice: vi.fn().mockResolvedValue({ data: {} }),
  };
});

const originalState = useEmergencyStore.getState();

afterEach(() => {
  useEmergencyStore.setState(originalState, true);
  vi.restoreAllMocks();
});

describe('NewPatientIntake triage suggestions', () => {
  it('suggests P1 for critical vitals', () => {
    expect(suggestPriority('Breathing', { spo2: '87', hr: '90' })).toBe(Priority.P1);
    expect(suggestPriority('Other', { hr: '161' })).toBe(Priority.P1);
  });

  it('suggests P2 for chest pain with diaphoresis', () => {
    expect(suggestPriority('Chest Pain', { hr: '88', spo2: '98' }, 'diaphoretic and clammy')).toBe(
      Priority.P2,
    );
  });
});

describe('NewPatientIntake quick flow', () => {
  it('shows a live P2 reason for chest pain with HR over 120 before submit', async () => {
    const user = userEvent.setup();

    render(<NewPatientIntake open onClose={() => {}} />);

    await user.click(screen.getByRole('button', { name: /chest pain/i }));
    await user.type(screen.getByLabelText(/free-text complaint/i), 'Chest pressure');
    await user.type(screen.getByLabelText(/^HR/i), '128');

    expect(screen.getByText(/CTAS 2 · Emergent/i)).toBeInTheDocument();
    expect(screen.getByText('P2 suggested - chest pain with HR 128')).toBeVisible();
  });

  it('adds a Smart Intake vertical-slice patient to whiteboard, queues, reassessment, and capacity', async () => {
    const user = userEvent.setup();
    const beforeCount = useEmergencyStore.getState().patients.length;
    const onClose = vi.fn();
    const onPatientAdded = vi.fn();

    render(<NewPatientIntake open onClose={onClose} onPatientAdded={onPatientAdded} />);

    await user.click(screen.getByRole('button', { name: /chest pain/i }));
    expect(screen.getByLabelText(/free-text complaint/i)).toHaveFocus();

    await user.type(
      screen.getByLabelText(/free-text complaint/i),
      'Chest pressure with diaphoresis',
    );
    await user.type(screen.getByLabelText(/first name/i), 'Avery');
    await user.type(screen.getByLabelText(/last name/i), 'Stone');
    await user.click(screen.getByRole('button', { name: /send to central node/i }));

    await waitFor(() => {
      expect(useEmergencyStore.getState().patients).toHaveLength(beforeCount + 1);
    });

    const patient = useEmergencyStore
      .getState()
      .patients.find(
        (candidate) => candidate.firstName === 'Avery' && candidate.lastName === 'Stone',
      );

    expect(patient).toEqual(
      expect.objectContaining({
        state: PatientState.Triage,
        priority: Priority.P2,
        chiefComplaint: 'Chest pressure with diaphoresis',
        complaintCategory: 'Chest Pain',
        lastAssessedTime: null,
      }),
    );
    expect(patient?.mrn).toMatch(/^ED-\d{6}$/);
    expect(patient?.timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'Arrival' }),
        expect.objectContaining({ type: 'EncounterCreated' }),
        expect.objectContaining({
          type: 'StateChange',
          from: PatientState.Arrival,
          to: PatientState.Triage,
        }),
      ]),
    );
    expect(patient && hasPatientFlag(patient, 'ReassessmentDue')).toBe(true);
    expect(selectQueueCounts(useEmergencyStore.getState()).Triage).toBeGreaterThan(0);
    await waitFor(() => {
      expect(
        selectReassessmentQueue(useEmergencyStore.getState()).some(
          (item) => item.patientId === patient?.id,
        ),
      ).toBe(true);
    });
    expect(selectReassessmentCount(useEmergencyStore.getState())).toBeGreaterThan(0);
    expect(onPatientAdded).toHaveBeenCalledWith(patient?.id);
    expect(onClose).toHaveBeenCalled();
  });

  it('lets staff override the suggested priority and logs it in the patient timeline', async () => {
    const user = userEvent.setup();
    const beforeCount = useEmergencyStore.getState().patients.length;

    render(<NewPatientIntake open onClose={() => {}} />);

    await user.click(screen.getByRole('button', { name: /chest pain/i }));
    await user.type(screen.getByLabelText(/free-text complaint/i), 'Chest pressure');
    await user.type(screen.getByLabelText(/^HR/i), '128');
    await user.click(screen.getByRole('button', { name: /central CTAS suggestion/i }));
    await user.click(screen.getByRole('button', { name: /P4/i }));
    await user.type(screen.getByLabelText(/first name/i), 'Morgan');
    await user.click(screen.getByRole('button', { name: /send to central node/i }));

    await waitFor(() => {
      expect(useEmergencyStore.getState().patients).toHaveLength(beforeCount + 1);
    });

    const patient = useEmergencyStore
      .getState()
      .patients.find((candidate) => candidate.firstName === 'Morgan');

    expect(patient?.priority).toBe(Priority.P4);
    expect(patient?.timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          summary: 'Priority override applied: P4 selected instead of P2.',
          metadata: expect.objectContaining({
            suggestedPriority: Priority.P2,
            selectedPriority: Priority.P4,
            override: true,
          }),
        }),
      ]),
    );
  });

  it('keeps tab order complaint first and confirms discard on Escape', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onClose = vi.fn();

    render(<NewPatientIntake open onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/free-text complaint/i)).toHaveFocus();
    });

    await user.type(screen.getByLabelText(/free-text complaint/i), 'Cough');
    await user.tab();
    expect(screen.getByLabelText(/first name/i)).toHaveFocus();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    // confirmCareDroidAction falls back to window.confirm(title + message) when
    // no ConfirmDialogProvider is mounted, and resolves asynchronously.
    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith('Discard intake draft?\n\nUnsaved intake details will be lost.');
    });
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});
