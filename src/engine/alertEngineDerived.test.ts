import { describe, expect, it } from 'vitest';
import {
  deriveAlerts,
  isDerivedAlertId,
  normalizeAlert,
  type AlertDispatchInput,
  type AlertEngineInputs,
} from './alertEngineDerived';
import { PatientState, Priority, type Patient, type Referral } from '../types/emergency';

const now = new Date('2026-06-11T12:00:00.000Z');

const patient: Patient = {
  id: 'pt-alert-referral',
  mrn: 'MRN-REF-1',
  firstName: 'Test',
  lastName: 'Referral',
  dob: '1980-01-01',
  age: 46,
  sex: 'Female',
  arrivalTime: '2026-06-11T10:00:00.000Z',
  triageTime: '2026-06-11T10:05:00.000Z',
  lastAssessedTime: '2026-06-11T10:30:00.000Z',
  chiefComplaint: 'Chest pain',
  complaintCategory: 'Chest Pain',
  state: PatientState.Disposition,
  priority: Priority.P2,
  vitals: [
    {
      hr: 92,
      bpSystolic: 136,
      bpDiastolic: 82,
      spo2: 97,
      temp: 36.8,
      rr: 18,
      gcs: 15,
      pain: 4,
      recordedAt: '2026-06-11T10:30:00.000Z',
    },
  ],
  assignedStaffId: null,
  roomId: null,
  flags: [],
  timeline: [],
  notes: [],
};

const baseInputs: AlertEngineInputs = {
  patients: [patient],
  capacity: {
    id: 'capacity-test',
    generatedAt: now.toISOString(),
    updatedAt: now.toISOString(),
    band: 'Green',
    totalPatients: 1,
    occupiedRooms: 0,
    reassessmentDue: 0,
    totalActivePatients: 1,
    currentOccupancy: 0,
    maxCapacity: 1,
    occupancyPercent: 0,
    occupancyOveragePatients: 0,
    waitingCount: 0,
    triageCount: 0,
    assessmentCount: 0,
    boardingCount: 0,
    admissionPendingCount: 0,
    dischargePendingCount: 0,
    emsInboundCount: 0,
    isolationRequiredCount: 0,
    staffedRoomCount: 0,
    availableRoomCount: 1,
    reassessmentDueCount: 0,
    incomingEMSCount: 0,
    incomingEMSCriticalCount: 0,
    dischargeReadyCount: 0,
    dischargesPast60Minutes: 1,
    hasRecentDischarge: true,
    longestWaitMinutes: 0,
    averageWaitMinutes: 0,
    riskLevel: 'Green',
    label: 'Capacity Normal',
    deductions: [],
    score: 100,
  },
  emsArrivals: [],
  referrals: [],
  queues: [],
  bottleneckAlert: null,
};

function referral(overrides: Partial<Referral>): Referral {
  return {
    id: 'ref-test',
    patientId: patient.id,
    requestingStaffId: 'staff-test',
    targetDepartment: 'Cardiology',
    urgency: 'Routine',
    reason: 'Consult review',
    clinicalSummary: 'Summary',
    status: 'Sent',
    requestedAt: '2026-06-11T11:44:00.000Z',
    ...overrides,
  };
}

describe('deriveAlerts referral intelligence rules', () => {
  it('warns when a sent referral is unacknowledged after 15 minutes', () => {
    const alerts = deriveAlerts(
      {
        ...baseInputs,
        referrals: [referral({ id: 'ref-unacknowledged', urgency: 'Urgent' })],
      },
      [],
      now
    );

    expect(alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'alert-referral-unacknowledged-ref-unacknowledged',
          severity: 'Warning',
          actionType: 'VIEW_PATIENT',
        }),
      ])
    );
  });

  it('escalates an unaccepted urgent/emergent referral to a critical alert', () => {
    // Both referrals target the same patient, so triageOperationalAlerts()
    // collapses them to the single highest-priority surviving alert rather
    // than surfacing one alert per referral (noise reduction across the
    // shared patient) — see alertClassificationModel.ts.
    const alerts = deriveAlerts(
      {
        ...baseInputs,
        referrals: [
          referral({
            id: 'ref-urgent',
            urgency: 'Urgent',
            status: 'Sent',
            requestedAt: '2026-06-11T11:29:00.000Z',
          }),
          referral({
            id: 'ref-emergent',
            urgency: 'Emergent',
            status: 'Sent',
            requestedAt: '2026-06-11T11:49:00.000Z',
          }),
        ],
      },
      [],
      now
    );

    expect(alerts).toEqual([
      expect.objectContaining({
        id: 'alert-referral-critical-unacknowledged-ref-urgent',
        severity: 'Critical',
        title: 'Referral escalation required',
      }),
    ]);
  });
});

describe('deriveAlerts reassessment reminder rules', () => {
  it('surfaces the most severe reassessment reminder when a patient has multiple due', () => {
    const reminderPatient: Patient = {
      ...patient,
      id: 'pt-reminder',
      reassessmentReminders: [
        {
          id: 'reminder-upcoming',
          patientId: 'pt-reminder',
          scheduledBy: 'staff-rn',
          scheduledAt: '2026-06-11T11:20:00.000Z',
          dueAt: '2026-06-11T12:01:30.000Z',
          note: 'Recheck BP after metoprolol',
          status: 'pending',
        },
        {
          id: 'reminder-overdue',
          patientId: 'pt-reminder',
          scheduledBy: 'staff-rn',
          scheduledAt: '2026-06-11T11:20:00.000Z',
          dueAt: '2026-06-11T11:45:00.000Z',
          status: 'pending',
        },
      ],
    };

    const alerts = deriveAlerts(
      {
        ...baseInputs,
        patients: [reminderPatient],
      },
      [],
      now
    );

    // Both reminders belong to the same patient, so triageOperationalAlerts()
    // collapses them down to the single more urgent (overdue) alert.
    expect(alerts).toEqual([
      expect.objectContaining({
        id: 'alert-reassessment-reminder-overdue-reminder-overdue',
        severity: 'Critical',
        reminderId: 'reminder-overdue',
        actionType: 'REASSESSMENT_REMINDER',
      }),
    ]);
  });
});

describe('AlertEngine dispatch normalization', () => {
  it('normalizes dispatched alerts with default toast timing', () => {
    const alert = normalizeAlert(
      {
        type: 'System',
        severity: 'Warning',
        title: 'Connection warning',
        message: 'Unable to reach chat service.',
      } as unknown as AlertDispatchInput,
      now
    );

    expect(alert).toMatchObject({
      type: 'System',
      severity: 'Warning',
      title: 'Connection warning',
      message: 'Unable to reach chat service.',
      autoDismissAfter: 5,
      createdAt: now.toISOString(),
    });
    expect(alert.id).toMatch(/^alert-system-connection-warning-/);
  });

  it('identifies derived alert ids separately from manual dispatch ids', () => {
    expect(isDerivedAlertId('alert-capacity-red')).toBe(true);
    expect(isDerivedAlertId('alert-notification-warning')).toBe(false);
  });
});
