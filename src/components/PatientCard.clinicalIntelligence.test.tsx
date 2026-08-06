import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PatientCard from './PatientCard';
import PatientDetailPanel from './PatientDetailPanel';
import { useEmergencyStore, type EmergencyStoreState } from '../store/emergencyStore';
import { PatientFlag, PatientState, Priority, type Patient } from '../types/emergency';
import { PERMISSIVE_EMERGENCY_ROLE_MOCK } from '../test/permissiveEmergencyRoleMock';

vi.mock('../hooks/useEmergencyRolePermissions', () => ({
  useEmergencyRolePermissions: () => PERMISSIVE_EMERGENCY_ROLE_MOCK,
  default: () => PERMISSIVE_EMERGENCY_ROLE_MOCK,
}));

const originalState = useEmergencyStore.getState();

function selectedPatient() {
  return {
    id: 'patient-ai-panel-test',
    mrn: 'MRN-AI-1',
    firstName: 'Avery',
    lastName: 'Stone',
    dob: '1970-01-01',
    age: 56,
    sex: 'Female' as const,
    arrivalTime: '2026-06-12T08:40:00-04:00',
    triageTime: null,
    lastAssessedTime: null,
    chiefComplaint: 'Shortness of breath',
    complaintCategory: 'Respiratory',
    state: PatientState.Assessment,
    priority: Priority.P2,
    vitals: [
      {
        recordedAt: '2026-06-12T08:55:00-04:00',
        recordedBy: 'staff-1',
        hr: 118,
        sbp: 108,
        dbp: 66,
        spo2: 88,
        temp: 37.5,
        rr: 30,
        gcs: 15,
        pain: 2,
      },
    ],
    assignedStaffId: 'staff-1',
    roomId: null,
    flags: [],
    timeline: [],
    notes: [],
  };
}

function seedPatientDetail() {
  const patient = selectedPatient();
  act(() => {
    useEmergencyStore.setState(
      {
        ...originalState,
        patients: [patient],
        selectedPatientId: patient.id,
        referrals: [],
        patientBackendDetails: {
          [patient.id]: {
            patientId: patient.id,
            status: 'ready',
            loadedAt: '2026-06-12T08:59:00-04:00',
            data: {
              medications: [{ id: 'med-1', name: 'Albuterol', status: 'Active' }],
              allergies: [],
              labs: [{ id: 'lab-1', name: 'ABG pH', value: '7.31', unit: '' }],
              visits: [],
              imaging: [],
              documents: [],
              observations: [],
              orders: [],
              diagnoses: [],
            },
          },
        },
        loadPatientBackendDetails: vi.fn(() => Promise.resolve(null)),
      } as unknown as EmergencyStoreState,
      true
    );
  });
}

function timelinePatient(): Patient {
  return {
    ...selectedPatient(),
    id: 'patient-timeline-test',
    mrn: 'MRN-TL-1',
    firstName: 'Taylor',
    lastName: 'Timeline',
    triageTime: '2026-06-12T08:45:00-04:00',
    state: PatientState.Discharge,
    roomId: 'r3',
    flags: [
      PatientFlag.EMSArrival,
      PatientFlag.HighRisk,
      PatientFlag.ReassessmentDue,
      PatientFlag.PendingAdmission,
    ],
    timeline: [
      {
        id: 'timeline-state-assessment',
        type: 'StateChange',
        from: PatientState.Triage,
        to: PatientState.Assessment,
        timestamp: '2026-06-12T09:00:00-04:00',
        staffId: 'staff-1',
        note: 'Moved to assessment.',
      },
      {
        id: 'timeline-discharge',
        type: 'DispositionUpdated',
        from: PatientState.Admission,
        to: PatientState.Discharge,
        timestamp: '2026-06-12T10:00:00-04:00',
        staffId: 'staff-1',
        note: 'Discharged home.',
      },
    ],
  } as unknown as Patient;
}

afterEach(() => {
  act(() => {
    useEmergencyStore.setState(originalState, true);
  });
  vi.clearAllMocks();
});

describe('PatientDetailPanel clinical intelligence', () => {
  it('renders patient-scoped details and records new vitals from the panel', async () => {
    const user = userEvent.setup();
    seedPatientDetail();

    render(
      <MemoryRouter>
        <PatientDetailPanel />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 2, name: /Avery Stone/i })).toBeInTheDocument();
    expect(screen.getByText('MRN-AI-1')).toBeInTheDocument();
    // The primary workflow action button now shows step-specific guidance
    // (from patientWorkflow.primaryAction) rather than a generic label.
    expect(screen.getByRole('button', { name: /begin assessment or order diagnostics/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /add vitals/i }));
    fireEvent.change(screen.getByLabelText(/^HR$/i), { target: { value: '122' } });
    await user.click(screen.getByRole('button', { name: /save vitals/i }));

    const updated = useEmergencyStore
      .getState()
      .patients.find((patient) => patient.id === 'patient-ai-panel-test');
    expect(updated?.vitals.at(-1)?.hr).toBe(122);
  });

  it('opens a patient-scoped timeline from the card and renders core event categories', async () => {
    const user = userEvent.setup();
    const patient = timelinePatient();
    act(() => {
      useEmergencyStore.setState(
        {
          ...originalState,
          patients: [patient],
          selectedPatientId: null,
          workflowLogs: [
            {
              id: 'workflow-copilot-test',
              type: 'copilot_used',
              title: 'Copilot used',
              summary: 'Copilot summarized high-risk patient context for human review.',
              timestamp: '2026-06-12T09:15:00-04:00',
              patientId: patient.id,
              source: 'ed-copilot',
              severity: 'Warning',
              status: 'recorded',
              metadata: {},
            },
          ],
        },
        true
      );
    });

    render(
      <MemoryRouter>
        <PatientCard patient={patient} />
        <PatientDetailPanel />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /open timeline for taylor timeline/i }));

    expect(screen.getByRole('heading', { name: /Patient Timeline/i })).toBeInTheDocument();
    [
      'Intake',
      'State transition',
      'Triage',
      'Queue movement',
      'Reassessment',
      'EMS',
      'Referral',
      'Boarding',
      'Discharge',
      'AI/Copilot',
      'Provincial health data',
    ].forEach((label) => {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    });
  });
});
