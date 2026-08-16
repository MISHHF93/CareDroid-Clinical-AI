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
      expect(hasPatientFlag(useEmergencyStore.getState().patients[0], PatientFlag.ReassessmentDue)).toBe(
        true,
      );
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
