import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import QuickIntake from './QuickIntake';
import PatientDetailPanel from './PatientDetailPanel';
import PatientCard from './PatientCard';
import { Header } from './Header';
import { useEmergencyStore } from '../store/emergencyStore';
import {
  PatientFlag,
  PatientState,
  Priority,
  type CapacitySnapshot,
  type Patient,
  type WorkflowActionLog,
} from '../types/emergency';

const mocks = vi.hoisted(() => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
    warning: vi.fn(),
  }),
  timelineContext: {
    loading: false,
    error: '',
    context: {},
  },
}));

vi.mock('sonner', () => ({
  toast: mocks.toast,
}));

const emergencyRoleMock = vi.hoisted(() => {
  const { withEmergencyRoleMock } = require('../test/permissiveEmergencyRoleMock.ts');
  return withEmergencyRoleMock({ switchDemoRole: vi.fn() });
});

vi.mock('../hooks/useEmergencyRolePermissions', () => ({
  useEmergencyRolePermissions: () => emergencyRoleMock,
  default: () => emergencyRoleMock,
}));

vi.mock('../hooks/usePatientTimelineContext', () => ({
  usePatientTimelineContext: () => mocks.timelineContext,
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
  mocks.timelineContext = {
    loading: false,
    error: '',
    context: {},
  };
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('R12 complaint routing', () => {
  it('debounces QuickIntake complaint text and shows routed score suggestions', () => {
    vi.useFakeTimers();

    render(<QuickIntake onClose={() => {}} onAdded={() => {}} />);

    expect(screen.getByRole('heading', { name: 'Central Node Intake' })).toBeTruthy();
    expect(screen.getByLabelText('Central node input mode')).toHaveTextContent(
      /Charge nurse input/i,
    );
    expect(screen.getByRole('button', { name: /Send to Central Node/i })).toBeTruthy();

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
  it('merges backend patient workflow logs with local and generated detail-panel logs', async () => {
    const patient = makePatient({
      timeline: [
        {
          id: 'journey-local-1',
          patientId: 'r12-patient-1',
          timestamp: '2026-06-13T12:05:00.000Z',
          from: PatientState.Waiting,
          to: PatientState.Assessment,
          staffId: 's1',
          note: 'Moved to assessment from local journey.',
        },
      ],
    });
    const localLog: WorkflowActionLog = {
      id: 'local-assignment-log',
      type: 'clinician_assigned',
      title: 'Clinician assigned',
      summary: 'Local clinician assignment preserved.',
      timestamp: '2026-06-13T12:10:00.000Z',
      actorStaffId: 's1',
      patientId: patient.id,
      source: 'emergency-os-ui',
      severity: 'Info',
      status: 'recorded',
      metadata: {},
    };
    const backendOnlyLog: WorkflowActionLog = {
      id: 'backend-provincial-log',
      type: 'provincial_data_viewed',
      title: 'Provincial data viewed',
      summary: 'Backend-only provincial chart audit.',
      timestamp: '2026-06-13T12:15:00.000Z',
      patientId: patient.id,
      source: 'backend-fixture',
      severity: 'Info',
      status: 'recorded',
      metadata: {},
    };
    const backendDuplicateLog: WorkflowActionLog = {
      ...localLog,
      id: 'backend-duplicate-assignment-log',
      summary: 'Backend duplicate should not render.',
      source: 'backend-fixture',
    };
    mocks.timelineContext = {
      loading: false,
      error: '',
      context: {
        workflowLogs: [backendOnlyLog, backendDuplicateLog],
      },
    };

    useEmergencyStore.setState(
      {
        ...originalState,
        patients: [patient],
        staff: [
          {
            id: 's1',
            name: 'Morgan RN',
            role: 'RN',
            active: true,
          },
        ],
        workflowLogs: [localLog],
        selectedPatientId: patient.id,
        ui: { ...originalState.ui, selectedPatientId: patient.id },
      },
      true,
    );

    render(<PatientDetailPanel />);

    expect(await screen.findAllByText('Backend-only provincial chart audit.')).not.toHaveLength(0);
    expect(screen.getAllByText('Local clinician assignment preserved.')).not.toHaveLength(0);
    expect(screen.getAllByText('Moved to assessment from local journey.')).not.toHaveLength(0);
    expect(screen.queryByText('Backend duplicate should not render.')).toBeNull();
  });

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
      const updatedPatient = useEmergencyStore
        .getState()
        .patients.find((candidate) => candidate.id === patient.id);
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

    render(
      <MemoryRouter>
        <PatientCard patient={patient} />
      </MemoryRouter>,
    );

    expect(screen.queryByLabelText(PatientFlag.DeteriorationRisk)).toBeNull();

    act(() => {
      useEmergencyStore.getState().addFlag(patient.id, PatientFlag.DeteriorationRisk);
    });

    expect(await screen.findByTitle(PatientFlag.DeteriorationRisk)).toBeTruthy();
    expect(
      document
        .querySelector('[data-patient-card-id="r12-patient-1"]')
        ?.classList.contains('patient-card--deterioration-risk'),
    ).toBe(true);
  });
});

describe('R12 capacity header flow', () => {
  it('updates the Header capacity badge when a patient state change recalculates capacity', async () => {
    const patient = makePatient();
    useEmergencyStore.setState(
      {
        ...originalState,
        patients: [patient],
        rooms: [
          {
            id: 'r1',
            name: 'Room 1',
            type: 'Treatment',
            status: 'Occupied',
            patientId: patient.id,
          },
        ],
        capacity: makeCapacity(),
      },
      true,
    );

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    expect(screen.getByTitle(/Capacity Score: 10 Green/i)).toBeTruthy();

    act(() => {
      useEmergencyStore.getState().movePatientToState(patient.id, PatientState.Admission, 's1');
    });

    expect(await screen.findByTitle(/Capacity Score: 71 Red/i)).toBeTruthy();
  });
});
