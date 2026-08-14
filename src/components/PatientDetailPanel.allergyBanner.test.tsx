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
    id: 'allergy-banner-patient-1',
    mrn: 'ED-HEAL188-1',
    firstName: 'Jordan',
    lastName: 'Reyes',
    dob: '1985-01-01',
    age: 41,
    sex: 'F',
    arrivalTime: '2026-08-12T12:00:00.000Z',
    chiefComplaint: 'Sore throat',
    complaintCategory: 'General',
    state: PatientState.Waiting,
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

describe('PatientDetailPanel allergy/medication banners (HEAL-188)', () => {
  it('shows an alert-role allergy banner and a medications banner when both are populated', () => {
    renderWithPatient(
      makePatient({
        allergies: ['Penicillin', 'Latex'],
        medications: ['Metformin'],
      }),
    );

    const allergyAlert = screen.getByRole('alert');
    expect(allergyAlert).toHaveTextContent('Allergies:');
    expect(allergyAlert).toHaveTextContent('Penicillin, Latex');
    expect(screen.getByText('Current medications:').closest('div')).toHaveTextContent('Metformin');
  });

  it('renders neither banner when allergies/medications are empty', () => {
    renderWithPatient(makePatient({ allergies: [], medications: [] }));

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText('Current medications:')).toBeNull();
  });

  it('renders neither banner when allergies/medications are undefined', () => {
    renderWithPatient(makePatient());

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText('Current medications:')).toBeNull();
  });

  it('shows only the medications banner when no allergies are recorded', () => {
    renderWithPatient(makePatient({ medications: ['Lisinopril'] }));

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Current medications:').closest('div')).toHaveTextContent('Lisinopril');
  });
});
