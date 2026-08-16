import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PatientDetailPanel from './PatientDetailPanel';
import { useEmergencyStore } from '../store/emergencyStore';
import { PatientState, Priority, type Patient } from '../types/emergency';

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

const originalState = useEmergencyStore.getState();

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'vitals-severity-patient-1',
    mrn: 'ED-HEAL260-1',
    firstName: 'Riley',
    lastName: 'Chen',
    dob: '1990-01-01',
    age: 35,
    sex: 'F',
    arrivalTime: '2026-08-16T10:00:00.000Z',
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

describe('PatientDetailPanel vitals severity indicator (HEAL-260)', () => {
  it('shows a text "Critical" badge for a critical SpO2, not just a color change', async () => {
    renderWithPatient(
      makePatient({
        vitals: [{ spo2: 85, recordedAt: '2026-08-16T10:05:00.000Z', recordedBy: 'triage' }],
      }),
    );

    expect(await screen.findByText('⚠ Critical')).toBeInTheDocument();
  });

  it('shows a text "Abnormal" badge for a borderline SBP', async () => {
    renderWithPatient(
      makePatient({
        vitals: [{ sbp: 200, recordedAt: '2026-08-16T10:05:00.000Z', recordedBy: 'triage' }],
      }),
    );

    expect(await screen.findByText('⚠ Abnormal')).toBeInTheDocument();
  });

  it('shows no severity badge for a normal reading', async () => {
    renderWithPatient(
      makePatient({
        vitals: [{ hr: 80, recordedAt: '2026-08-16T10:05:00.000Z', recordedBy: 'triage' }],
      }),
    );

    await screen.findByText('80');
    expect(screen.queryByText('⚠ Critical')).not.toBeInTheDocument();
    expect(screen.queryByText('⚠ Abnormal')).not.toBeInTheDocument();
  });
});
