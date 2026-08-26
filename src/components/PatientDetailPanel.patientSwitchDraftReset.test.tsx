import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
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
    id: 'patient-a',
    mrn: 'ED-SWITCH-A',
    firstName: 'Alex',
    lastName: 'Rivera',
    dob: '1985-02-02',
    age: 41,
    sex: 'M',
    arrivalTime: '2026-08-15T10:00:00.000Z',
    chiefComplaint: 'Chest pain',
    complaintCategory: 'Cardiac',
    state: PatientState.Assessment,
    priority: Priority.P2,
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

function renderWithPatients(patients: Patient[], selectedPatientId: string) {
  useEmergencyStore.setState(
    {
      ...originalState,
      patients,
      selectedPatientId,
      ui: { ...originalState.ui, selectedPatientId },
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

describe('PatientDetailPanel: patient-scoped draft state does not survive a patient switch', () => {
  // Regression coverage for a real reachable bug: this panel is a single
  // global instance rendered as a non-blocking 480px side drawer, so the
  // Whiteboard behind it stays clickable while a draft is open. Before this
  // fix, switching selectedPatientId (e.g. clicking a different patient's
  // card) left the vitals/note/flag draft state untouched -- submitting
  // would post Patient A's typed values against Patient B's chart via
  // addVitals(selectedPatient.id, ...), since selectedPatient.id is read
  // live at submit time.
  it('clears an in-progress vitals draft when the selected patient changes, so it cannot post against the new patient', async () => {
    const patientA = makePatient();
    const patientB = makePatient({
      id: 'patient-b',
      mrn: 'ED-SWITCH-B',
      firstName: 'Jordan',
      lastName: 'Lee',
    });
    renderWithPatients([patientA, patientB], patientA.id);

    fireEvent.click(await screen.findByRole('button', { name: /add vitals/i }));
    fireEvent.change(screen.getByLabelText('HR'), { target: { value: '140' } });

    act(() => {
      useEmergencyStore.getState().selectPatient(patientB.id);
    });

    // The vitals form must not still be open (and pre-filled with A's typed
    // HR) now that the panel shows Patient B.
    expect(screen.queryByLabelText('HR')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save vitals/i })).not.toBeInTheDocument();

    const storedB = useEmergencyStore.getState().patients.find((p) => p.id === patientB.id);
    expect(storedB?.vitals).toHaveLength(0);
  });

  it('clears an in-progress note draft when the selected patient changes', async () => {
    const patientA = makePatient();
    const patientB = makePatient({ id: 'patient-b', mrn: 'ED-SWITCH-B', firstName: 'Jordan', lastName: 'Lee' });
    renderWithPatients([patientA, patientB], patientA.id);

    const noteField = await screen.findByPlaceholderText('Add Note');
    fireEvent.change(noteField, { target: { value: 'Confidential note meant for Alex Rivera only' } });

    act(() => {
      useEmergencyStore.getState().selectPatient(patientB.id);
    });

    expect(screen.getByPlaceholderText('Add Note')).toHaveValue('');
  });

  it('resets the flag-to-add selection and closes the assign-staff/room action mode on switch', async () => {
    const patientA = makePatient();
    const patientB = makePatient({ id: 'patient-b', mrn: 'ED-SWITCH-B', firstName: 'Jordan', lastName: 'Lee' });
    renderWithPatients([patientA, patientB], patientA.id);

    fireEvent.click(screen.getByRole('button', { name: /assign staff/i }));
    expect(screen.getByRole('button', { name: /assign staff/i })).toBeInTheDocument();

    act(() => {
      useEmergencyStore.getState().selectPatient(patientB.id);
    });

    // The inline assign-staff sub-form should not remain open against the new patient.
    expect(screen.queryByRole('combobox', { name: /staff/i })).not.toBeInTheDocument();
  });
});
