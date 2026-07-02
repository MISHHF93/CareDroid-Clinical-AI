import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HandoffBriefGenerator, {
  buildHandoffBriefRequest,
  buildHandoffContext,
  countBriefText,
} from './HandoffBriefGenerator';
import { useEmergencyStore } from '../store/emergencyStore';
import {
  PatientFlag,
  PatientState,
  Priority,
  type ActiveShift,
  type CapacitySnapshot,
  type EmsUnit,
  type Patient,
  type Referral,
  type Staff,
} from '../types/emergency';
import { invokeUnifiedAiHandoffBrief } from '../services/careDroidUnifiedAiNode';

const emergencyStoreMock = vi.hoisted(() => ({
  state: {} as Record<string, unknown>,
}));

vi.mock('../services/careDroidUnifiedAiNode', () => ({
  invokeUnifiedAiHandoffBrief: vi.fn(),
}));

vi.mock('../store/emergencyStore', () => {
  const useEmergencyStoreMock = ((selector: (state: Record<string, unknown>) => unknown) =>
    selector(emergencyStoreMock.state)) as unknown as typeof useEmergencyStore;

  useEmergencyStoreMock.getState = (() => emergencyStoreMock.state) as unknown as typeof useEmergencyStore.getState;
  useEmergencyStoreMock.setState = ((patch: Record<string, unknown>, replace?: boolean) => {
    emergencyStoreMock.state = replace ? patch : { ...emergencyStoreMock.state, ...patch };
  }) as unknown as typeof useEmergencyStore.setState;

  return { useEmergencyStore: useEmergencyStoreMock };
});

function setMockEmergencyStore(patch: Record<string, unknown>, replace = false): void {
  (useEmergencyStore.setState as unknown as (next: Record<string, unknown>, replace?: boolean) => void)(
    patch,
    replace,
  );
}

const shift: ActiveShift = {
  id: 'shift-c16',
  label: 'C16 Shift',
  startTime: '2026-06-13T12:00:00.000Z',
  status: 'Open',
  chargeStaffId: 'staff-1',
};

const staff: Staff[] = [
  { id: 'staff-1', name: 'Dr. Lane', role: 'MD', active: true },
  { id: 'staff-2', name: 'Nurse Bell', role: 'RN', active: true, shiftId: 'other-shift' },
  { id: 'staff-3', name: 'Clerk Away', role: 'Clerk', active: false },
];

const capacity: CapacitySnapshot = {
  score: 72,
  band: 'Orange',
  totalPatients: 4,
  occupiedRooms: 3,
  boardingCount: 1,
  reassessmentDue: 1,
  updatedAt: '2026-06-13T15:55:00.000Z',
};

function makePatient(overrides: Partial<Patient>): Patient {
  return {
    id: 'patient-base',
    mrn: 'ED-BASE',
    firstName: 'Base',
    lastName: 'Patient',
    dob: '1970-01-01',
    age: 56,
    sex: 'F',
    arrivalTime: '2026-06-13T15:00:00.000Z',
    chiefComplaint: 'Chest pain',
    complaintCategory: 'Cardiac',
    state: PatientState.Assessment,
    priority: Priority.P3,
    vitals: [
      {
        hr: 92,
        sbp: 132,
        dbp: 78,
        spo2: 98,
        temp: 36.8,
        rr: 18,
        gcs: 15,
        recordedAt: '2026-06-13T15:05:00.000Z',
      },
    ],
    flags: [],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

const patients: Patient[] = [
  makePatient({
    id: 'p-high',
    mrn: 'ED-HIGH',
    firstName: 'Avery',
    lastName: 'Stone',
    arrivalTime: '2026-06-13T15:30:00.000Z',
    priority: Priority.P2,
    flags: [PatientFlag.HighRisk],
  }),
  makePatient({
    id: 'p-reassess',
    mrn: 'ED-REASSESS',
    firstName: 'Morgan',
    lastName: 'Reed',
    chiefComplaint: 'Abdominal pain',
    priority: Priority.P4,
    flags: [PatientFlag.ReassessmentDue],
  }),
  makePatient({
    id: 'p-discharge',
    mrn: 'ED-DISCHARGE',
    firstName: 'Discharged',
    lastName: 'Patient',
    state: PatientState.Discharge,
  }),
  makePatient({
    id: 'p-admit',
    mrn: 'ED-ADMIT',
    firstName: 'Boarding',
    lastName: 'Patient',
    state: PatientState.Admission,
  }),
];

const referrals: Referral[] = [
  {
    id: 'ref-sent',
    patientId: 'p-high',
    status: 'Sent',
    service: 'Cardiology',
    summary: 'Awaiting cardiology callback.',
  },
  {
    id: 'ref-accepted',
    patientId: 'p-reassess',
    status: 'Accepted',
    service: 'Surgery',
  },
];

const emsUnits: EmsUnit[] = [
  { id: 'ems-1', unitNumber: 'EMS 1', status: 'Inbound', etaMinutes: 8, acuity: Priority.P2 },
  { id: 'ems-2', unitNumber: 'EMS 2', status: 'Arrived', etaMinutes: 0, acuity: Priority.P3 },
];

afterEach(() => {
  vi.clearAllMocks();
  setMockEmergencyStore({}, true);
});

describe('HandoffBriefGenerator', () => {
  it('builds a handoff context from current ED store shapes', () => {
    const context = buildHandoffContext({
      shift,
      staff,
      patients,
      referrals,
      emsUnits,
      capacity,
      now: new Date('2026-06-13T16:00:00.000Z'),
    });

    expect(context.shiftDuration).toBe('4h');
    expect(context.staffOnDuty).toBe('Dr. Lane (MD)');
    expect(context.patientsActive).toBe(3);
    expect(context.patientsDischargedThisShift).toBe(1);
    expect(context.patientsAdmittedThisShift).toBe(1);
    expect(context.highRiskPatients).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Avery Stone',
          priority: Priority.P2,
          waitMins: 30,
          activeReferrals: [referrals[0]],
        }),
        expect.objectContaining({
          name: 'Morgan Reed',
          flags: [PatientFlag.ReassessmentDue],
        }),
      ]),
    );
    expect(context.pendingActions).toEqual(expect.arrayContaining([referrals[0], patients[1]]));
    expect(context.emsInbound).toEqual([emsUnits[0]]);
    expect(context.capacityBand).toBe('Orange');
    expect(context.bottleneck).toMatch(/Orange capacity pressure/i);
  });

  it('counts characters and words for generated or edited text', () => {
    expect(countBriefText('One two\nthree.')).toEqual({ characters: 14, words: 3 });
    expect(countBriefText('   ')).toEqual({ characters: 3, words: 0 });
  });

  it('builds the unified AI request with HANDOFF_BRIEF details', () => {
    const context = buildHandoffContext({
      shift,
      staff,
      patients,
      referrals,
      emsUnits,
      capacity,
      now: new Date('2026-06-13T16:00:00.000Z'),
    });
    const request = buildHandoffBriefRequest(context);

    expect(request.requestType).toBe('HANDOFF_BRIEF');
    expect(request.systemPrompt).toContain('Never fabricate clinical details');
    expect(request.systemPrompt).toContain('SHIFT HANDOFF');
    expect(request.message).toBe(`Generate a handoff brief from this data:\n${JSON.stringify(context, null, 2)}`);
    expect(request.context).toEqual(
      expect.objectContaining({
        aiRequest: expect.objectContaining({
          requestType: 'HANDOFF_BRIEF',
          handoffContext: context,
        }),
      }),
    );
  });

  it('calls the unified AI client when generating a brief', async () => {
    vi.mocked(invokeUnifiedAiHandoffBrief).mockResolvedValue({
      ok: true,
      status: 200,
      content: 'SHIFT HANDOFF - generated brief',
      data: {},
      toolCalls: [],
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      requestType: 'HANDOFF_BRIEF',
    });
    setMockEmergencyStore({
      activeShift: shift,
      staff,
      patients,
      referrals,
      emsUnits,
      capacity,
    });

    render(<HandoffBriefGenerator />);
    await userEvent.click(screen.getByRole('button', { name: /generate handoff brief/i }));

    expect(invokeUnifiedAiHandoffBrief).toHaveBeenCalledWith(
      expect.objectContaining({ requestType: 'HANDOFF_BRIEF' }),
    );
    expect(await screen.findByDisplayValue(/SHIFT HANDOFF - generated brief/i)).toBeInTheDocument();
    expect(screen.getByText(/31 characters .* 5 words/i)).toBeInTheDocument();
  });
});
