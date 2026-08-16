import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PatientDetailPanel from './PatientDetailPanel';
import { useEmergencyStore } from '../store/emergencyStore';
import { PatientState, Priority, type Patient } from '../types/emergency';
import { confirmCareDroidAction } from '../services/careDroidInteractionFeedback';

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

vi.mock('../services/careDroidInteractionFeedback', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/careDroidInteractionFeedback')>();
  return {
    ...actual,
    confirmCareDroidAction: vi.fn(),
  };
});

const originalState = useEmergencyStore.getState();

function makeDispositionPatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'discharge-confirm-patient-1',
    mrn: 'ED-HEAL228-1',
    firstName: 'Sam',
    lastName: 'Okafor',
    dob: '1985-01-01',
    age: 41,
    sex: 'M',
    arrivalTime: '2026-08-15T10:00:00.000Z',
    chiefComplaint: 'Ankle sprain',
    complaintCategory: 'Orthopedic',
    state: PatientState.Disposition,
    priority: Priority.P4,
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

describe('PatientDetailPanel "Move to next step" discharge confirmation (HEAL-228)', () => {
  it('requires a danger-tone confirmation before the generic advance button discharges a Disposition-state patient', async () => {
    vi.mocked(confirmCareDroidAction).mockResolvedValue(true);
    renderWithPatient(makeDispositionPatient());

    const advanceButton = await screen.findByTitle('Move to the next patient state');
    fireEvent.click(advanceButton);

    expect(confirmCareDroidAction).toHaveBeenCalledWith(
      expect.objectContaining({ tone: 'danger', confirmLabel: 'Confirm discharge' }),
    );

    await vi.waitFor(() => {
      expect(useEmergencyStore.getState().patients[0].state).toBe(PatientState.Discharge);
    });
  });

  it('does not discharge the patient when the confirmation is declined', async () => {
    vi.mocked(confirmCareDroidAction).mockResolvedValue(false);
    renderWithPatient(makeDispositionPatient());

    const advanceButton = await screen.findByTitle('Move to the next patient state');
    fireEvent.click(advanceButton);

    await vi.waitFor(() => expect(confirmCareDroidAction).toHaveBeenCalled());
    expect(useEmergencyStore.getState().patients[0].state).toBe(PatientState.Disposition);
  });
});
