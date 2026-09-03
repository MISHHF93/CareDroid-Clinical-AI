import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PatientDetailPanel from './PatientDetailPanel';
import { hasPatientFlag, useEmergencyStore } from '../store/emergencyStore';
import { PatientFlag, PatientState, Priority, type Patient } from '../types/emergency';

const emergencyRoleMock = vi.hoisted(() => {
  const { withEmergencyRoleMock } = require('../test/permissiveEmergencyRoleMock.ts');
  return withEmergencyRoleMock({ switchDemoRole: vi.fn() });
});

vi.mock('../hooks/useEmergencyRolePermissions', () => ({
  useEmergencyRolePermissions: () => emergencyRoleMock,
  default: () => emergencyRoleMock,
}));

vi.mock('../hooks/usePatientTimelineContext', () => ({
  usePatientTimelineContext: () => ({ loading: false, error: '', context: {} }),
}));

vi.mock('../hooks/useEmergencyOs', () => ({
  useUpgradeHarnessPatientFlow: () => ({ data: { data: { signals: [] } } }),
}));

vi.mock('../services/emergencyOsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/emergencyOsApi')>();
  return {
    ...actual,
    createSmartIntakePatient: vi.fn(async (patient: Patient) => ({ data: { patient } })),
  };
});

const originalState = useEmergencyStore.getState();

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'vitals-validation-patient-1',
    mrn: 'ED-HEAL230-1',
    firstName: 'Casey',
    lastName: 'Morgan',
    dob: '1990-01-01',
    age: 35,
    sex: 'F',
    arrivalTime: '2026-08-15T10:00:00.000Z',
    chiefComplaint: 'Shortness of breath',
    complaintCategory: 'Respiratory',
    state: PatientState.Assessment,
    priority: Priority.P3,
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

function renderWithPatient(patient: Patient) {
  useEmergencyStore.setState(
    {
      ...originalState,
      patients: [patient],
      selectedPatientId: patient.id,
      ui: { ...originalState.ui, selectedPatientId: patient.id },
    },
    true,
  );

  return render(
    <MemoryRouter>
      <PatientDetailPanel />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  useEmergencyStore.setState(originalState, true);
  vi.clearAllMocks();
});

describe('PatientDetailPanel vitals-entry numeric validation (HEAL-230)', () => {
  it('clamps a negative typed respiration rate to 0 instead of storing it as-is', async () => {
    renderWithPatient(makePatient());

    fireEvent.click(await screen.findByRole('button', { name: /add vitals/i }));
    fireEvent.change(screen.getByLabelText('RR'), { target: { value: '-5' } });
    fireEvent.click(screen.getByRole('button', { name: /save vitals/i }));

    const stored = useEmergencyStore.getState().patients[0].vitals;
    const latest = stored[stored.length - 1];
    expect(latest.rr).toBe(0);
  });

  it('does not let a clamped negative vital silently score as NEWS2-normal', async () => {
    // rr=0 lands in the 0-8 band (score 3, the worst band) -- if the
    // negative value had been stored as-is or dropped to undefined,
    // scoreRange()'s fallback would have scored it 0 ("normal"),
    // suppressing the reassessment-due flag a genuinely severe/garbage
    // vital should trigger.
    renderWithPatient(makePatient());

    fireEvent.click(await screen.findByRole('button', { name: /add vitals/i }));
    fireEvent.change(screen.getByLabelText('RR'), { target: { value: '-5' } });
    fireEvent.click(screen.getByRole('button', { name: /save vitals/i }));

    await vi.waitFor(() => {
      expect(
        hasPatientFlag(useEmergencyStore.getState().patients[0], PatientFlag.ReassessmentDue),
      ).toBe(true);
    });
  });

  it('still accepts a normal positive value unchanged', async () => {
    renderWithPatient(makePatient());

    fireEvent.click(await screen.findByRole('button', { name: /add vitals/i }));
    fireEvent.change(screen.getByLabelText('HR'), { target: { value: '82' } });
    fireEvent.click(screen.getByRole('button', { name: /save vitals/i }));

    const stored = useEmergencyStore.getState().patients[0].vitals;
    const latest = stored[stored.length - 1];
    expect(latest.hr).toBe(82);
  });
});

describe('PatientDetailPanel vitals-entry ceiling validation (HEAL-242)', () => {
  it('clamps an out-of-scale SpO2 entry to 100 instead of storing it as-is', async () => {
    // HEAL-230's floor-only clamp let "500" through unchanged, where it
    // would read as a far-better-than-100% reading in NEWS2 scoring.
    renderWithPatient(makePatient());

    fireEvent.click(await screen.findByRole('button', { name: /add vitals/i }));
    fireEvent.change(screen.getByLabelText('SPO2'), { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: /save vitals/i }));

    const stored = useEmergencyStore.getState().patients[0].vitals;
    const latest = stored[stored.length - 1];
    expect(latest.spo2).toBe(100);
  });

  it('clamps an out-of-scale GCS entry to 15', async () => {
    renderWithPatient(makePatient());

    fireEvent.click(await screen.findByRole('button', { name: /add vitals/i }));
    fireEvent.change(screen.getByLabelText('GCS'), { target: { value: '99' } });
    fireEvent.click(screen.getByRole('button', { name: /save vitals/i }));

    const stored = useEmergencyStore.getState().patients[0].vitals;
    const latest = stored[stored.length - 1];
    expect(latest.gcs).toBe(15);
  });

  it('clamps an out-of-scale pain entry to 10', async () => {
    renderWithPatient(makePatient());

    fireEvent.click(await screen.findByRole('button', { name: /add vitals/i }));
    fireEvent.change(screen.getByLabelText('PAIN'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: /save vitals/i }));

    const stored = useEmergencyStore.getState().patients[0].vitals;
    const latest = stored[stored.length - 1];
    expect(latest.pain).toBe(10);
  });
});
