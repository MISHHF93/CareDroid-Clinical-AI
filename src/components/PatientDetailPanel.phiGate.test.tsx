import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PatientDetailPanel from './PatientDetailPanel';
import { useEmergencyStore } from '../store/emergencyStore';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { PatientState, Priority, type Patient } from '../types/emergency';

// HEAL-206: PatientDetailPanel is mounted unconditionally in AppShell.tsx
// for every non-kiosk, non-registration route (including /settings,
// /admin, /audit) and previously rendered the full patient chart -- vitals,
// notes, flags -- as soon as selectedPatientId was set in the shared store,
// with no gate of its own. usePhiViewAudit only logged a phi-access-denied
// event; it never blocked rendering. This guards the new
// emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyPatients) check.

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
    id: 'phi-gate-patient-1',
    mrn: 'ED-HEAL206-1',
    firstName: 'Riley',
    lastName: 'Thompson',
    dob: '1990-01-01',
    age: 36,
    sex: 'F',
    arrivalTime: '2026-08-14T12:00:00.000Z',
    chiefComplaint: 'Chest pain',
    complaintCategory: 'Cardiac',
    state: PatientState.Triage,
    priority: Priority.P2,
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
  emergencyRoleMock.canAccessRoute = () => true;
  vi.clearAllMocks();
});

describe('PatientDetailPanel PHI gate (HEAL-206)', () => {
  it('renders nothing when the role cannot access the patients route', () => {
    emergencyRoleMock.canAccessRoute = (path: string) =>
      path !== CANONICAL_ROUTES.emergencyPatients;

    const { container } = renderWithPatient(makePatient());

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText('Riley Thompson')).toBeNull();
    expect(screen.queryByText(/Chest pain/)).toBeNull();
  });

  it('renders the patient chart when the role can access the patients route', () => {
    emergencyRoleMock.canAccessRoute = () => true;

    renderWithPatient(makePatient());

    expect(screen.getByText(/Chest pain/)).toBeInTheDocument();
  });
});
