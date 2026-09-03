import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CIWAAr, { CIWA_ITEMS, protocolFor } from './CIWAAr';
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
  id: 'ciwa-patient-1',
  mrn: 'ED-CIWA-1',
  firstName: 'Taylor',
  lastName: 'Morgan',
  dob: '1980-01-01',
  age: 46,
  sex: 'M',
  arrivalTime: '2026-06-13T12:00:00.000Z',
  chiefComplaint: 'Alcohol withdrawal symptoms',
  complaintCategory: 'Psych',
  state: PatientState.Assessment,
  priority: Priority.P2,
  vitals: [
    {
      hr: 118,
      sbp: 148,
      dbp: 86,
      spo2: 96,
      temp: 37.2,
      rr: 20,
      gcs: 14,
      recordedAt: '2026-06-13T12:10:00.000Z',
    },
  ],
  flags: [],
  assignedStaffId: 'withdrawal-rn',
  notes: [
    {
      id: 'note-1',
      text: 'Patient is diaphoretic with visible tremor.',
      authorId: 'withdrawal-rn',
      type: 'Clinical',
      timestamp: '2026-06-13T12:12:00.000Z',
    },
  ],
  timeline: [],
};

afterEach(() => {
  useEmergencyStore.setState(originalState, true);
  vi.clearAllMocks();
});

function seedPatient() {
  useEmergencyStore.setState({ ...originalState, patients: [patient], alerts: [] }, true);
}

describe('CIWAAr calculator', () => {
  it('classifies protocol recommendations at score thresholds', () => {
    expect(protocolFor(0).band).toBe('Mild');
    expect(protocolFor(8).band).toBe('Moderate');
    expect(protocolFor(16).alertSeverity).toBe('Warning');
    expect(protocolFor(21).alertSeverity).toBe('Critical');
  });

  it('prefills diaphoresis and low GCS findings from patient context', () => {
    seedPatient();
    render(<CIWAAr patientId={patient.id} onClose={vi.fn()} />);

    expect(CIWA_ITEMS).toHaveLength(10);
    expect(screen.getByText('6/67')).toBeTruthy();
    expect(screen.getByLabelText('Paroxysmal Sweats')).toHaveProperty('value', '4');
    expect(screen.getByLabelText('Orientation and Clouding')).toHaveProperty('value', '2');
    expect(screen.getByText('Mild - No medication needed. Monitor q4h.')).toBeTruthy();
  });

  it('updates live score, dispatches threshold alert, and saves notes to patient', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    seedPatient();
    render(<CIWAAr patientId={patient.id} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText('Tremor (arms extended, fingers spread)'), {
      target: { value: '7' },
    });
    fireEvent.change(screen.getByLabelText('Anxiety'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('Agitation'), { target: { value: '7' } });

    expect(screen.getByText('27/67')).toBeTruthy();
    expect(screen.getByText(/Severe - Lorazepam 4mg IV immediately/i)).toBeTruthy();
    expect(useEmergencyStore.getState().alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'Critical',
          title: 'CIWA-Ar Severe withdrawal risk - Taylor Morgan',
          patientId: patient.id,
        }),
      ]),
    );

    await user.click(screen.getByRole('button', { name: /save to patient/i }));

    const savedPatient = useEmergencyStore
      .getState()
      .patients.find((candidate) => candidate.id === patient.id);
    expect(savedPatient?.notes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: expect.stringContaining('CIWA-Ar: 27/67 — Severe'),
          authorId: 'withdrawal-rn',
          type: 'Score',
          metadata: expect.objectContaining({
            scoreId: 'ciwa-ar',
            scoreTotal: '27',
          }),
        }),
      ]),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
