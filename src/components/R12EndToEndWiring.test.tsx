import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import QuickIntake from './QuickIntake';
import PatientDetailPanel from './PatientDetailPanel';
import PatientCard from './PatientCard';
import { Header } from './Header';
import { useEmergencyStore } from '../store/emergencyStore';
import { PatientFlag, PatientState, Priority, type CapacitySnapshot, type Patient } from '../types/emergency';

const mocks = vi.hoisted(() => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
    warning: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({
  toast: mocks.toast,
}));

vi.mock('../hooks/useEmergencyRolePermissions', () => ({
  useEmergencyRolePermissions: () => ({
    role: 'charge-nurse',
    roleLabel: 'Charge Nurse',
    demoRoles: [{ id: 'charge-nurse', label: 'Charge Nurse' }],
    switchDemoRole: vi.fn(),
    can: () => true,
    canAccessRoute: () => true,
    nearestRoute: (path: string) => path,
  }),
}));

vi.mock('../hooks/usePatientTimelineContext', () => ({
  usePatientTimelineContext: () => ({
    loading: false,
    error: null,
    context: {},
  }),
}));

vi.mock('../services/emergencyOsApi', () => ({
  createSmartIntakePatient: vi.fn(async (patient: Patient) => ({ data: { patient } })),
}));

vi.mock('./calculators/HEARTScore', () => ({
  default: () => null,
}));

vi.mock('./calculators/qSOFA', () => ({
  default: () => null,
}));

vi.mock('./calculators/PediatricDrugCalc', () => ({
  default: () => null,
}));

vi.mock('./WorkloadBalancePanel', () => ({
  default: () => null,
}));

const originalState = useEmergencyStore.getState();

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'r12-patient-1',
    mrn: 'ED-R12-1',
    firstName: 'Avery',
    lastName: 'Stone',
    dob: '1970-01-01',
    age: 56,
    sex: 'F',
    arrivalTime: '2026-06-13T12:00:00.000Z',
    chiefComplaint: 'Chest pain radiating to left arm',
    complaintCategory: 'Cardiac',
    state: PatientState.Waiting,
    priority: Priority.P2,
    vitals: [],
    flags: [],
    assignedStaffId: 's1',
    notes: [],
    timeline: [],
    ...overrides,
  };
}

function makeCapacity(overrides: Partial<CapacitySnapshot> = {}): CapacitySnapshot {
  return {
    score: 10,
    band: 'Green',
    totalPatients: 1,
    occupiedRooms: 0,
    boardingCount: 0,
    reassessmentDue: 0,
    updatedAt: '2026-06-13T12:00:00.000Z',
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  useEmergencyStore.setState(originalState, true);
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('R12 complaint routing', () => {
  it('debounces QuickIntake complaint text and shows routed score suggestions', () => {
    vi.useFakeTimers();

    render(<QuickIntake onClose={() => {}} onAdded={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/describe complaint/i), {
      target: { value: 'Crushing chest pain with diaphoresis' },
    });

    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(screen.queryByText('heart-score')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.getByText('heart-score')).toBeTruthy();
  });

  it('suggests unruns scores when PatientDetailPanel opens for a routed complaint', async () => {
    const patient = makePatient();
    useEmergencyStore.setState(
      {
        ...originalState,
        patients: [patient],
        selectedPatientId: patient.id,
        ui: { ...originalState.ui, selectedPatientId: patient.id },
      },
      true,
    );

    render(<PatientDetailPanel />);

    expect(await screen.findByText('heart-score')).toBeTruthy();
  });
});

describe('R12 critical vitals and flag reactivity', () => {
  it('dispatches a critical vitals alert and adds DeteriorationRisk after vitals save', async () => {
    const patient = makePatient();
    useEmergencyStore.setState(
      {
        ...originalState,
        patients: [patient],
        alerts: [],
        selectedPatientId: patient.id,
        ui: { ...originalState.ui, selectedPatientId: patient.id },
      },
      true,
    );

    render(<PatientDetailPanel />);

    fireEvent.click(screen.getByRole('button', { name: /add vitals/i }));
    fireEvent.change(screen.getByLabelText('SPO2'), { target: { value: '87' } });
    fireEvent.change(screen.getByLabelText('HR'), { target: { value: '151' } });
    fireEvent.change(screen.getByLabelText('SBP'), { target: { value: '79' } });
    fireEvent.click(screen.getByRole('button', { name: /save vitals/i }));

    await waitFor(() => {
      const updatedPatient = useEmergencyStore.getState().patients.find((candidate) => candidate.id === patient.id);
      expect(updatedPatient?.flags).toContain(PatientFlag.DeteriorationRisk);
    });

    expect(useEmergencyStore.getState().alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'Critical',
          title: 'Critical Vitals — Avery',
          message: 'SpO2 87%, HR 151, BP 79',
          patientId: patient.id,
        }),
      ]),
    );
  });

  it('updates PatientCard visuals immediately when the canonical store adds a flag', async () => {
    const patient = makePatient();
    useEmergencyStore.setState({ ...originalState, patients: [patient] }, true);

    render(<PatientCard patient={patient} />);

    expect(screen.queryByLabelText(PatientFlag.DeteriorationRisk)).toBeNull();

    act(() => {
      useEmergencyStore.getState().addFlag(patient.id, PatientFlag.DeteriorationRisk);
    });

    expect(await screen.findByLabelText(PatientFlag.DeteriorationRisk)).toBeTruthy();
    expect(document.querySelector('[data-patient-card-id="r12-patient-1"]')?.classList.contains(
      'patient-card--deterioration-risk',
    )).toBe(true);
  });
});

describe('R12 capacity header flow', () => {
  it('updates the Header capacity badge when a patient state change recalculates capacity', async () => {
    const patient = makePatient();
    useEmergencyStore.setState(
      {
        ...originalState,
        patients: [patient],
        rooms: [{ id: 'r1', name: 'Room 1', type: 'Treatment', status: 'Occupied', patientId: patient.id }],
        capacity: makeCapacity(),
      },
      true,
    );

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /capacity: 10 green/i }).style.transition).toBe(
      'background 180ms ease, border-color 180ms ease, color 180ms ease',
    );

    act(() => {
      useEmergencyStore.getState().movePatientToState(patient.id, PatientState.Admission, 's1');
    });

    expect(await screen.findByRole('button', { name: /capacity: 71 orange/i })).toBeTruthy();
  });
});
