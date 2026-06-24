import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PatientState, type Patient } from '../types/emergency';
import { useEmergencyStore } from '../store/emergencyStore';
import { buildSelfCheckinPatient, createEmptySelfCheckinForm } from './selfCheckinService';
import { completeSelfCheckinWhiteboardHandoff } from './selfCheckinWhiteboardHandoff';
import { WHITEBOARD_QUEUE_FILTER } from './queueAssignment';
import { resolveWhiteboardStateLabel } from './whiteboardViewModel';
import WhiteboardView from '../components/whiteboard/WhiteboardView';
import PatientCard from '../components/PatientCard';

const originalState = useEmergencyStore.getState();
const CHECKIN_TIME = '2026-06-24T10:00:00.000Z';
const VIEW_TIME = '2026-06-24T10:12:00.000Z';

describe('selfCheckinWhiteboardHandoff', () => {
  beforeEach(() => {
    useEmergencyStore.setState(
      {
        ...originalState,
        patients: [],
        selectedPatientId: null,
        activeQueueFilter: null,
        rooms: originalState.rooms,
        staff: originalState.staff,
      },
      true,
    );
    vi.spyOn(Date, 'now').mockReturnValue(new Date(VIEW_TIME).getTime());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a whiteboard-ready patient with waiting-for-triage status and arrival timer', () => {
    const result = buildSelfCheckinPatient(
      {
        ...createEmptySelfCheckinForm(),
        firstName: 'Alex',
        lastName: 'Kim',
        complaint: 'Chest pain',
        noKnownAllergies: true,
      },
      { now: CHECKIN_TIME, patientId: 'self-arrival-test-1' },
    );

    const handoff = completeSelfCheckinWhiteboardHandoff(useEmergencyStore.getState(), result, {
      syncToBackend: false,
      actorName: 'self-arrival',
    });

    const store = useEmergencyStore.getState();
    const patient = store.patients.find((entry) => entry.id === 'self-arrival-test-1');

    expect(patient).toBeTruthy();
    expect(patient?.state).toBe(PatientState.Triage);
    expect(patient?.arrival).toMatchObject({
      arrivalMode: 'self-check-in',
      arrivalTimestamp: CHECKIN_TIME,
      waitingRoomStatus: 'waiting-for-triage',
      triagePending: true,
      queueDestination: 'triage-queue',
      chiefComplaint: 'Chest pain',
    });
    expect(resolveWhiteboardStateLabel(patient as Patient)).toBe('Waiting for Triage');
    expect(store.selectedPatientId).toBe('self-arrival-test-1');
    expect(store.activeQueueFilter).toBe(WHITEBOARD_QUEUE_FILTER.triage);
    expect(handoff.whiteboardPath).toContain('patient=self-arrival-test-1');
    expect(handoff.queue).toBe(WHITEBOARD_QUEUE_FILTER.triage);

    render(
      <MemoryRouter>
        <PatientCard patient={patient as Patient} layout="row" />
      </MemoryRouter>,
    );

    expect(screen.getByText('Waiting for Triage')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /wait 12 minutes/i })).toBeInTheDocument();
  });

  it('renders the new self-check-in patient on the whiteboard surface', () => {
    const result = buildSelfCheckinPatient(
      {
        ...createEmptySelfCheckinForm(),
        firstName: 'Sam',
        lastName: 'Lee',
        complaint: 'Abdominal pain',
        noKnownAllergies: true,
      },
      { now: CHECKIN_TIME, patientId: 'self-arrival-test-2' },
    );

    completeSelfCheckinWhiteboardHandoff(useEmergencyStore.getState(), result);

    const { patients, rooms, staff } = useEmergencyStore.getState();

    render(
      <MemoryRouter>
        <WhiteboardView patients={patients} rooms={rooms} staff={staff} layout="row" />
      </MemoryRouter>,
    );

    expect(screen.getByText('Sam Lee')).toBeInTheDocument();
    expect(screen.getByText('Waiting for Triage')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /wait 12 minutes/i })).toBeInTheDocument();
  });
});