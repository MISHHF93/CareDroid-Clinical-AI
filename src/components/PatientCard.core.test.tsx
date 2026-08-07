import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PatientCard from './PatientCard';
import { useEmergencyStore } from '../store/emergencyStore';
import { PatientState, Priority } from '../types/emergency';

const originalState = useEmergencyStore.getState();

function patientWithArrival() {
  return {
    id: 'wb-patient-1',
    mrn: 'ED-9001',
    firstName: 'Jordan',
    lastName: 'Lee',
    dob: '1988-04-02',
    age: 38,
    sex: 'Male' as const,
    arrivalTime: '2026-06-20T08:00:00.000Z',
    chiefComplaint: 'Chest pain',
    complaintCategory: 'Chest pain',
    state: PatientState.Triage,
    priority: Priority.P3,
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
    arrival: {
      arrivalMode: 'self-check-in' as const,
      arrivalTimestamp: '2026-06-20T08:00:00.000Z',
      chiefComplaint: 'Chest pain',
      triageAcuity: {
        code: Priority.P3,
        system: 'PRIORITY' as const,
        level: 3 as const,
        status: 'suggested' as const,
      },
      waitingRoomStatus: 'waiting-for-triage' as const,
      registrationStatus: 'complete' as const,
      queueDestination: 'triage-queue' as const,
      triagePending: true,
    },
  };
}

describe('PatientCard core whiteboard row', () => {
  beforeEach(() => {
    useEmergencyStore.setState(
      {
        ...originalState,
        patients: [patientWithArrival()],
        selectedPatientId: null,
      },
      true,
    );
  });

  it('renders normalized arrival fields in row layout', () => {
    render(
      <MemoryRouter>
        <PatientCard patient={patientWithArrival()} layout="row" />
      </MemoryRouter>,
    );

    expect(screen.getByText('Jordan Lee')).toBeInTheDocument();
    expect(screen.getByText('ED-9001')).toBeInTheDocument();
    expect(screen.getByText(/self check-in/i)).toBeInTheDocument();
    expect(screen.getByText(/chest pain/i)).toBeInTheDocument();
    expect(screen.getByText('P3')).toBeInTheDocument();
    expect(screen.getByText('Waiting for Triage')).toBeInTheDocument();
  });

  it('selects patient on row click to open detail context', () => {
    const selectPatient = vi.fn();
    useEmergencyStore.setState({ selectPatient } as never);

    render(
      <MemoryRouter>
        <PatientCard patient={patientWithArrival()} layout="row" />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /jordan lee/i }));
    expect(selectPatient).toHaveBeenCalledWith('wb-patient-1');
  });

  it('wires the Room display action to /emergency/patient-room?patientId=<id> (Cycle 153 — was orphaned, no UI reached it)', () => {
    render(
      <MemoryRouter>
        <PatientCard patient={patientWithArrival()} layout="card" />
      </MemoryRouter>,
    );

    const roomDisplayButton = screen.getByRole('button', { name: /open room display for jordan lee/i });
    fireEvent.click(roomDisplayButton);

    expect(window.location.pathname).toBe('/emergency/patient-room');
    expect(window.location.search).toBe('?patientId=wb-patient-1');
  });
});

describe('PatientCard complaint recognition (2026-08-08)', () => {
  beforeEach(() => {
    useEmergencyStore.setState(
      { ...originalState, patients: [patientWithArrival()], selectedPatientId: null },
      true,
    );
  });

  const FULL_VISIBILITY_POLICY = {
    tier: 'clinical' as const,
    source: 'test',
    showPatientName: true,
    showMrn: true,
    showHealthCard: true,
    showDemographics: true,
    showChiefComplaint: true,
    showComplaintFlags: true,
    showVitals: true,
    showRoomAssignment: true,
    showStaffAssignment: true,
    showClinicalFlags: true,
    showNotes: true,
    showStaffComments: true,
    pseudonymizePatients: false,
    aggregateMetricsOnly: false,
    centralNodeRedaction: 'none' as const,
    redactOperationalAlerts: false,
  };

  it('flags a genuinely unrecognized complaint with a visible hint when no high-risk flag already covers it', () => {
    // PatientCard resolves the live patient from the store by id (falling back to the
    // prop only if not found), so the store — not just the prop — must carry the
    // modified complaint for the render to reflect it.
    const patient = { ...patientWithArrival(), chiefComplaint: 'xyzzy purple wombat requisition' };
    patient.arrival = { ...patient.arrival, chiefComplaint: 'xyzzy purple wombat requisition' };
    useEmergencyStore.setState({ ...originalState, patients: [patient], selectedPatientId: null }, true);

    render(
      <MemoryRouter>
        <PatientCard patient={patient as never} layout="row" privacyPolicy={FULL_VISIBILITY_POLICY} />
      </MemoryRouter>,
    );

    expect(screen.getByText(/unrecognized/i)).toBeInTheDocument();
  });

  it('does not show the unrecognized hint for a recognized complaint like the default fixture ("Chest pain")', () => {
    render(
      <MemoryRouter>
        <PatientCard patient={patientWithArrival() as never} layout="row" privacyPolicy={FULL_VISIBILITY_POLICY} />
      </MemoryRouter>,
    );

    expect(screen.queryByText(/unrecognized/i)).not.toBeInTheDocument();
  });

  it('does not show the unrecognized hint when the patient already has a high-risk complaint flag (avoids a duplicate signal)', () => {
    const patient = {
      ...patientWithArrival(),
      chiefComplaint: 'xyzzy purple wombat requisition',
      highRiskComplaintFlags: [
        { id: 'chest-pain' as const, label: 'Chest pain', detectedAt: '2026-06-20T08:00:00.000Z', source: 'staff-selected' as const },
      ],
    };
    patient.arrival = { ...patient.arrival, chiefComplaint: 'xyzzy purple wombat requisition' };
    useEmergencyStore.setState({ ...originalState, patients: [patient], selectedPatientId: null }, true);

    render(
      <MemoryRouter>
        <PatientCard patient={patient as never} layout="row" privacyPolicy={FULL_VISIBILITY_POLICY} />
      </MemoryRouter>,
    );

    expect(screen.queryByText(/unrecognized/i)).not.toBeInTheDocument();
  });

  it('never computes or shows recognition info when the display privacy policy hides the chief complaint', () => {
    const patient = { ...patientWithArrival(), chiefComplaint: 'xyzzy purple wombat requisition' };
    patient.arrival = { ...patient.arrival, chiefComplaint: 'xyzzy purple wombat requisition' };
    useEmergencyStore.setState({ ...originalState, patients: [patient], selectedPatientId: null }, true);
    const hiddenPolicy = { ...FULL_VISIBILITY_POLICY, showChiefComplaint: false };

    render(
      <MemoryRouter>
        <PatientCard patient={patient as never} layout="row" privacyPolicy={hiddenPolicy} />
      </MemoryRouter>,
    );

    expect(screen.queryByText(/unrecognized/i)).not.toBeInTheDocument();
  });
});