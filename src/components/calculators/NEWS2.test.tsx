import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NEWS2 from './NEWS2';
import { hasPatientFlag, useEmergencyStore } from '../../store/emergencyStore';
import { PatientFlag, PatientState, Priority, type Patient, type Vitals } from '../../types/emergency';
import { calculateNews2FromVitals, news2Response, scoreNews2, valueFromVitals } from '../../utils/news2';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
  }),
}));

const originalState = useEmergencyStore.getState();

const stableVitals: Vitals = {
  rr: 16,
  spo2: 98,
  sbp: 122,
  hr: 72,
  temp: 36.8,
  gcs: 15,
  recordedAt: '2026-06-13T12:10:00.000Z',
  recordedBy: 'news-rn',
};

const patient: Patient = {
  id: 'news2-patient-1',
  mrn: 'ED-NEWS2-1',
  firstName: 'Riley',
  lastName: 'Nguyen',
  dob: '1972-01-01',
  age: 54,
  sex: 'F',
  arrivalTime: '2026-06-13T12:00:00.000Z',
  chiefComplaint: 'Deterioration watch',
  complaintCategory: 'Respiratory',
  state: PatientState.Assessment,
  priority: Priority.P2,
  vitals: [stableVitals],
  flags: [],
  assignedStaffId: 'news-rn',
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

function seedHighRiskPatient() {
  useEmergencyStore.setState({
    ...originalState,
    patients: [
      {
        ...patient,
        vitals: [
          {
            ...stableVitals,
            rr: 30,
            spo2: 90,
            sbp: 86,
          },
        ],
      },
    ],
    alerts: [],
  }, true);
}

describe('NEWS2 calculator and auto scoring', () => {
  it('scores NEWS2 ranges and clinical response bands', () => {
    const stable = scoreNews2(valueFromVitals(stableVitals));
    expect(stable.total).toBe(0);
    expect(news2Response(stable.total, stable.hasSingleRed).band).toBe('Low');

    const severe = calculateNews2FromVitals({
      rr: 30,
      spo2: 90,
      sbp: 86,
      hr: 136,
      temp: 39.2,
      gcs: 14,
      recordedAt: '2026-06-13T12:30:00.000Z',
    });
    expect(severe.total).toBeGreaterThanOrEqual(7);
    expect(severe.response.alertSeverity).toBe('Critical');
  });

  it('prefills all numeric parameters from patient vitals and updates live response', () => {
    seedPatient();
    render(<NEWS2 patientId={patient.id} onClose={vi.fn()} />);

    expect(screen.getByText('Auto-filled from vitals')).toBeTruthy();
    expect(screen.getByLabelText('Respiration Rate (/min)')).toHaveProperty('value', '16');
    expect(screen.getByLabelText('SpO2 Scale 1 (%)')).toHaveProperty('value', '98');
    expect(screen.getByLabelText('Systolic BP (mmHg)')).toHaveProperty('value', '122');
    expect(screen.getByLabelText('Heart Rate (/min)')).toHaveProperty('value', '72');
    expect(screen.getByLabelText('Temperature (°C)')).toHaveProperty('value', '36.8');
    expect(screen.getByText('0/20')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Respiration Rate (/min)'), { target: { value: '30' } });

    expect(screen.getByText('3/20')).toBeTruthy();
    expect(screen.getByText('Medium — Urgent ward review')).toBeTruthy();
  });

  it('dispatches alert, flags reassessment, and saves NEWS2 notes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    seedHighRiskPatient();
    render(<NEWS2 patientId={patient.id} onClose={onClose} />);

    await waitFor(() => expect(screen.getByText('9/20')).toBeTruthy());
    expect(useEmergencyStore.getState().patients[0].flags).toContain(PatientFlag.ReassessmentDue);
    expect(useEmergencyStore.getState().alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'Critical',
          title: 'NEWS2 High deterioration risk — Riley Nguyen',
          patientId: patient.id,
        }),
      ]),
    );

    await user.click(screen.getByRole('button', { name: /save to patient/i }));

    expect(useEmergencyStore.getState().patients[0].notes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: 'NEWS2: 9/20 — High',
          authorId: 'news-rn',
          type: 'Score',
          metadata: expect.objectContaining({
            scoreId: 'news2',
            scoreTotal: '9',
          }),
        }),
      ]),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('runs silent NEWS2 scoring on addVitals and flags high scores automatically', () => {
    seedPatient();
    useEmergencyStore.getState().addVitals(patient.id, {
      rr: 30,
      spo2: 90,
      sbp: 86,
      hr: 136,
      temp: 39.2,
      gcs: 14,
      recordedAt: '2026-06-13T12:30:00.000Z',
      recordedBy: 'news-rn',
    });

    const state = useEmergencyStore.getState();
    expect(hasPatientFlag(state.patients[0], PatientFlag.ReassessmentDue)).toBe(true);
    expect(
      state.alerts.some(
        (alert) =>
          alert.patientId === patient.id &&
          (alert.source === 'news2-auto-score' || alert.title?.includes('Vitals warning')),
      ),
    ).toBe(true);
  });
});
