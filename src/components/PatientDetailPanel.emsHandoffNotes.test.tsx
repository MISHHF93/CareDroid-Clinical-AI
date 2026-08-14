import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PatientDetailPanel from './PatientDetailPanel';
import { useEmergencyStore } from '../store/emergencyStore';
import { PatientState, Priority, type EMSArrival, type Patient } from '../types/emergency';

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

function makeEmsArrival(overrides: Partial<EMSArrival> = {}): EMSArrival {
  return {
    id: 'ems-arrival-1',
    patientId: 'ems-handoff-patient-1',
    unitId: 'unit-12',
    unitName: 'Medic 12',
    crewNames: ['Crew A'],
    patientAge: 58,
    patientSex: 'M',
    chiefComplaint: 'Chest pain',
    vitals: undefined,
    eta: 0,
    severity: 'Critical',
    dispatchTime: '2026-08-13T12:00:00.000Z',
    estimatedArrivalTime: '2026-08-13T12:10:00.000Z',
    notes: '',
    status: 'Handoff',
    prearrivalComplaint: 'Chest pain',
    priority: Priority.P1,
    ...overrides,
  };
}

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'ems-handoff-patient-1',
    mrn: 'ED-HEAL189-1',
    firstName: 'Casey',
    lastName: 'Morgan',
    dob: '1968-01-01',
    age: 58,
    sex: 'M',
    arrivalTime: '2026-08-13T12:10:00.000Z',
    chiefComplaint: 'Chest pain',
    complaintCategory: 'Cardiac',
    state: PatientState.Waiting,
    priority: Priority.P1,
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

describe('PatientDetailPanel EMS handoff notes (HEAL-189)', () => {
  it('shows the EMS crew handoff notes when present', () => {
    renderWithPatient(
      makePatient({
        emsArrival: makeEmsArrival({
          ambulanceHandoffChecklist: {
            arrivalId: 'ems-arrival-1',
            identityStatus: 'verified',
            complaintSummary: 'Chest pain radiating to left arm',
            vitalsReceived: true,
            medicationsEnRoute: [],
            criticalFlags: [],
            handoffAccepted: true,
            patientDestination: 'room',
            handoffNotes: 'Patient became diaphoretic en route, given aspirin 324mg.',
            updatedAt: '2026-08-13T12:09:00.000Z',
          },
        }),
      }),
    );

    expect(screen.getByText('EMS handoff notes:')).toBeTruthy();
    expect(
      screen.getByText(/Patient became diaphoretic en route, given aspirin 324mg\./),
    ).toBeTruthy();
  });

  it('shows the receiving clinician\'s closing notes, with their name, when present', () => {
    renderWithPatient(
      makePatient({
        emsArrival: makeEmsArrival({
          handoffClose: {
            receivingClinicianName: 'R. Patel',
            informationUnderstood: true,
            questionsClarified: true,
            closedByStaffName: 'R. Patel',
            notes: 'Confirmed allergy history directly with crew before EMS departed.',
          },
        }),
      }),
    );

    const notesBlock = screen.getByText(/Confirmed allergy history directly with crew/).closest('div');
    expect(notesBlock).toHaveTextContent('Receiving clinician (R. Patel)');
  });

  it('renders nothing when there is no EMS arrival at all', () => {
    renderWithPatient(makePatient());

    expect(screen.queryByText('EMS handoff notes:')).toBeNull();
  });

  it('renders nothing when the EMS arrival has neither handoff notes nor closing notes', () => {
    renderWithPatient(makePatient({ emsArrival: makeEmsArrival() }));

    expect(screen.queryByText('EMS handoff notes:')).toBeNull();
  });
});
