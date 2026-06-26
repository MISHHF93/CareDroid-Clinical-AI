import {
  PatientFlag,
  PatientState,
  type Alert,
  type JourneyEvent,
  type Patient,
  type PatientFlagRecord,
  type ReassessmentReminder,
  type Vitals,
  type VitalsAlert,
} from '../types/emergency';
import { deriveAlerts, isDerivedAlertId, normalizeAlert } from '../engine/alertEngineDerived';
import { triageOperationalAlerts } from '../engine/alertClassificationModel';
import { calculateCapacity } from '../engine/capacityEngine';
import {
  isLongWaitRescueReason,
  longWaitSeverityForPhase,
  longWaitStatus,
  LONG_WAIT_PHASE_RANK,
} from '../utils/longWaitRescue';
import { evaluateVitalsAlerts } from '../utils/vitalsAlertPipeline';
import { applyWhiteboardAutomationToPatients } from '../services/whiteboardAutomationEngine';

function nowIso(): string {
  return new Date().toISOString();
}

function getPatientFlagType(
  flag: PatientFlag | string | { type?: PatientFlag | string },
): PatientFlag {
  const candidate = typeof flag === 'object' ? flag.type : flag;
  return Object.values(PatientFlag).includes(candidate as PatientFlag)
    ? (candidate as PatientFlag)
    : PatientFlag.HighRisk;
}

function createPatientFlag(
  flag: PatientFlag | string,
  options: Partial<PatientFlagRecord> = {},
): PatientFlagRecord {
  const type = getPatientFlagType(flag);
  const severity =
    options.severity ||
    (type === PatientFlag.HighRisk ||
    type === PatientFlag.DeteriorationRisk ||
    type === PatientFlag.SepsisAlert
      ? 'Critical'
      : 'Warning');

  return {
    type,
    reason: options.reason || 'Flagged for human review.',
    detectedAt: options.detectedAt || nowIso(),
    severity,
  };
}

function hasPatientFlag(patient: Patient, flag: PatientFlag | string): boolean {
  const flags = Array.isArray(patient.flags) ? patient.flags : [];
  return flags.map(getPatientFlagType).includes(getPatientFlagType(flag));
}

export type EscalationInput = {
  staffId: string;
  staffName?: string;
  timestamp?: string;
};

export function updatePatients(
  patients: Patient[],
  patientId: string,
  updater: (patient: Patient) => Patient,
): Patient[] {
  return patients.map((patient) => (patient.id === patientId ? updater(patient) : patient));
}

function normalizeIncomingVitals(vitals: Vitals): Vitals {
  return {
    ...vitals,
    sbp: vitals.sbp ?? (vitals.bpSystolic as unknown as number | undefined),
    dbp: vitals.dbp ?? (vitals.bpDiastolic as unknown as number | undefined),
    bpSystolic: vitals.bpSystolic ?? vitals.sbp,
    bpDiastolic: vitals.bpDiastolic ?? vitals.dbp,
  };
}

function previousVitalsSnapshot(patient: Patient): Vitals | undefined {
  if (Array.isArray(patient.vitals)) {
    return patient.vitals.at(-1);
  }
  return patient.vitals;
}

function makeEvent(
  patientId: string,
  type: JourneyEvent['type'],
  summary: string,
  timestamp: string,
  extra: Partial<JourneyEvent> = {},
): JourneyEvent {
  return {
    id: `evt-${patientId}-${type}-${timestamp}`,
    patientId,
    type,
    timestamp,
    summary,
    ...extra,
  } as JourneyEvent;
}

const ACTIVE_REASSESSMENT_REMINDER_STATUSES = new Set(['pending', 'snoozed']);

export function hasDueReassessmentReminder(patient: Patient, now = new Date()): boolean {
  return (patient.reassessmentReminders || []).some((reminder) => {
    if (!ACTIVE_REASSESSMENT_REMINDER_STATUSES.has(reminder.status)) return false;
    const dueAt = new Date(reminder.dueAt).getTime();
    return Number.isFinite(dueAt) && now.getTime() >= dueAt;
  });
}

const isScheduledReminderFlag = (flag: PatientFlag | PatientFlagRecord | string): boolean =>
  getPatientFlagType(flag) === PatientFlag.ReassessmentDue &&
  (typeof flag === 'string' ? false : flag.reason === 'Scheduled recheck reminder due');

const isGeneratedLongWaitFlag = (flag: PatientFlag | PatientFlagRecord | string): boolean =>
  (getPatientFlagType(flag) === PatientFlag.LongWait ||
    getPatientFlagType(flag) === PatientFlag.ReassessmentDue) &&
  isLongWaitRescueReason(typeof flag === 'string' ? '' : flag.reason || '');

export function ensureReminderReassessmentFlags(
  patients: Patient[],
  now = new Date(),
): Patient[] {
  let changed = false;
  const nextPatients = patients.map((patient) => {
    if (!hasDueReassessmentReminder(patient, now) || hasPatientFlag(patient, PatientFlag.ReassessmentDue)) {
      return patient;
    }
    changed = true;
    const flag = createPatientFlag(PatientFlag.ReassessmentDue, {
      reason: 'Scheduled recheck reminder due',
      severity: 'Warning',
      detectedAt: now.toISOString(),
    });
    return {
      ...patient,
      flags: [...patient.flags, flag] as import('../types/emergency').PatientFlag[],
      timeline: [
        ...patient.timeline,
        makeEvent(
          patient.id,
          'FlagAdded',
          'Scheduled recheck reminder moved patient to reassessment queue.',
          now.toISOString(),
          {
            metadata: {
              flagType: PatientFlag.ReassessmentDue,
              reason: 'Scheduled recheck reminder due',
            },
          },
        ),
      ],
    };
  });
  return changed ? nextPatients as import('../types/emergency').Patient[] : patients;
}

export function ensureLongWaitRescueFlags(patients: Patient[], now = new Date()): Patient[] {
  let changed = false;
  const nextPatients = patients.map((patient) => {
    const status = longWaitStatus(patient, now);
    const existingGenerated = patient.flags.filter(isGeneratedLongWaitFlag);
    if (status.phase === 'none') {
      if (!existingGenerated.length) return patient;
      changed = true;
      return {
        ...patient,
        flags: patient.flags.filter((flag) => !isGeneratedLongWaitFlag(flag)),
      };
    }

    const severity = longWaitSeverityForPhase(status.phase);
    const expectedFlags = [
      createPatientFlag(PatientFlag.LongWait, {
        reason: status.reason,
        detectedAt: now.toISOString(),
        severity,
      }),
      createPatientFlag(PatientFlag.ReassessmentDue, {
        reason: status.reason,
        detectedAt: now.toISOString(),
        severity,
      }),
    ];
    const currentManagedFlags = patient.flags.filter(isGeneratedLongWaitFlag);
    const isCurrent =
      currentManagedFlags.length === expectedFlags.length &&
      expectedFlags.every((expected) =>
        currentManagedFlags.some(
          (flag) =>
            getPatientFlagType(flag) === expected.type &&
            (typeof flag === 'string' ? false : (flag as unknown as { reason?: string }).reason === expected.reason) &&
            (typeof flag === 'string' ? true : (flag as unknown as { severity?: string }).severity === expected.severity),
        ),
      );
    if (isCurrent) return patient;

    changed = true;
    return {
      ...patient,
      flags: [...patient.flags.filter((flag) => !isGeneratedLongWaitFlag(flag)), ...expectedFlags] as import('../types/emergency').PatientFlag[],
    };
  });
  return changed ? nextPatients as import('../types/emergency').Patient[] : patients;
}

export const REASSESSMENT_MANAGED_FLAG_TYPES = new Set([
  PatientFlag.DeteriorationRisk,
  PatientFlag.HighRisk,
  PatientFlag.ReassessmentDue,
  PatientFlag.ScoreReassessmentRecommended,
]);

function minutesSince(timestamp?: string | null, now = new Date()): number {
  if (!timestamp) return 0;
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round((now.getTime() - parsed) / 60000));
}

export function buildReassessmentQueueItems(patients: Patient[]) {
  return patients
    .filter((patient) => patient.state !== PatientState.Discharge)
    .filter((patient) =>
      patient.flags.some((flag) => REASSESSMENT_MANAGED_FLAG_TYPES.has(getPatientFlagType(flag))),
    )
    .map((patient) => {
      const reassessmentFlags = patient.flags.filter((flag) =>
        REASSESSMENT_MANAGED_FLAG_TYPES.has(getPatientFlagType(flag)),
      );
      const longWait = longWaitStatus(patient);
      const latestVitals = Array.isArray(patient.vitals) ? patient.vitals.at(-1) : patient.vitals;
      return {
        patientId: patient.id,
        patientName:
          patient.name || `${patient.firstName} ${patient.lastName}`.trim() || patient.mrn,
        state: patient.state,
        priority: patient.priority,
        waitingMinutes: longWait.waitMinutes || minutesSince(patient.arrivalTime),
        vitalsAgeMinutes: minutesSince(
          patient.vitalsUpdatedAt || latestVitals?.recordedAt || patient.arrivalTime,
        ),
        reasons: reassessmentFlags.map((flag) =>
          typeof flag === 'string' ? flag : (flag as unknown as { reason?: string }).reason || getPatientFlagType(flag),
        ),
        flaggedAt:
          (typeof reassessmentFlags[0] === 'string'
            ? undefined
            : (reassessmentFlags[0] as unknown as { detectedAt?: string })?.detectedAt) || new Date().toISOString(),
        longWaitPhase: longWait.phase,
      };
    })
    .sort(
      (a, b) => {
        const aEscalated = a.reasons.some((reason) => /manual escalation/i.test(reason));
        const bEscalated = b.reasons.some((reason) => /manual escalation/i.test(reason));
        if (aEscalated !== bEscalated) return aEscalated ? -1 : 1;
        return (
          ((LONG_WAIT_PHASE_RANK as Record<string, number>)[b.longWaitPhase] || 0) - ((LONG_WAIT_PHASE_RANK as Record<string, number>)[a.longWaitPhase] || 0) ||
          new Date(b.flaggedAt).getTime() - new Date(a.flaggedAt).getTime()
        );
      },
    );
}

type OperationalStateSlice = {
  patients: Patient[];
  alerts: Alert[];
  capacity?: ReturnType<typeof calculateCapacity>;
  activeQueueFilter?: string | null;
};

export function buildUpdateAlertsPatch(state: {
  patients: Patient[];
  referrals: import('../types/emergency').Referral[];
  emsArrivals: import('../types/emergency').EMSArrival[];
  capacity: import('../types/emergency').CapacitySnapshot;
  queues: Array<import('../types/emergency').Queue | import('../types/emergency').QueueSummary | Record<string, unknown>>;
  bottleneckAlert?: import('../types/emergency').BottleneckAlert | null;
  alerts: Alert[];
}): Partial<OperationalStateSlice> {
  const now = new Date();
  const patients = applyWhiteboardAutomationToPatients(
    ensureLongWaitRescueFlags(ensureReminderReassessmentFlags(state.patients, now), now),
    now,
  );
  const capacity = calculateCapacity();
  const normalizedQueues = (state.queues || []).map((queue) => {
    const record = queue as Record<string, unknown>;
    return {
      id: String(record.id || record.type || 'queue'),
      type: String(record.type || record.label || 'Queue') as import('../types/emergency').QueueType,
      name: String(record.name || record.label || record.type || 'Queue'),
      patientIds: Array.isArray(record.patientIds) ? record.patientIds.map(String) : [],
      targetWaitMinutes: Number(record.targetWaitMinutes ?? record.targetMinutes ?? 30),
      averageWaitMinutes: Number(record.averageWaitMinutes ?? 0),
      longestWaitMinutes: Number(record.longestWaitMinutes ?? record.oldestWaitMinutes ?? 0),
      criticalCount: Number(record.criticalCount ?? record.count ?? 0),
      updatedAt: String(record.updatedAt || now.toISOString()),
    } satisfies import('../types/emergency').Queue;
  });
  const derivedAlerts = deriveAlerts(
    {
      patients,
      capacity,
      emsArrivals: state.emsArrivals,
      referrals: state.referrals,
      queues: normalizedQueues,
      bottleneckAlert: state.bottleneckAlert || null,
    },
    state.alerts,
    now,
  );
  const derivedIds = new Set(derivedAlerts.map((alert) => alert.id));
  const manualAlerts = state.alerts.filter(
    (alert) => !derivedIds.has(alert.id) && !isDerivedAlertId(alert.id),
  );

  return {
    ...(patients === state.patients ? {} : { patients }),
    capacity,
    alerts: triageOperationalAlerts(
      [...derivedAlerts, ...manualAlerts].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    ).visible,
  };
}

export function buildEscalatePatientPatch(
  state: {
    patients: Patient[];
    rooms: Array<{ id: string; name?: string }>;
    alerts: Alert[];
  },
  patientId: string,
  input: EscalationInput,
): Partial<OperationalStateSlice> | null {
  const timestamp = input.timestamp || new Date().toISOString();
  const patient = state.patients.find((candidate) => candidate.id === patientId);
  if (!patient) return null;

  const staffName = input.staffName || input.staffId || 'staff';
  const reason = `Manual escalation by ${staffName}`;
  const roomName =
    patient.location ||
    state.rooms.find((room) => room.id === patient.roomId)?.name ||
    patient.roomId ||
    'No bed';
  const patientLabel = patient.name || `${patient.firstName} ${patient.lastName}`.trim();
  const nextFlags = [
    createPatientFlag(PatientFlag.HighRisk, { reason, severity: 'Critical', detectedAt: timestamp }),
    createPatientFlag(PatientFlag.DeteriorationRisk, {
      reason,
      severity: 'Critical',
      detectedAt: timestamp,
    }),
    createPatientFlag(PatientFlag.ReassessmentDue, {
      reason,
      severity: 'Critical',
      detectedAt: timestamp,
    }),
  ];
  const nextAlert = normalizeAlert(
    {
      id: `alert-escalation-${patient.id}`,
      type: 'System',
      severity: 'Critical',
      title: `ESCALATION — ${patientLabel}`,
      message: `${roomName} · ${patient.chiefComplaint || patient.complaintCategory} · Escalated by ${staffName}`,
      patientId: patient.id,
      dismissed: false,
      actionLabel: 'View Patient',
      actionType: 'VIEW_PATIENT',
    },
    new Date(timestamp),
  );

  const patients = updatePatients(state.patients, patientId, (current) => ({
    ...current,
    flags: [
      ...current.flags.filter(
        (flag) =>
          ![PatientFlag.HighRisk, PatientFlag.DeteriorationRisk, PatientFlag.ReassessmentDue].includes(
            getPatientFlagType(flag),
          ),
      ),
      ...nextFlags,
    ] as import('../types/emergency').PatientFlag[],
    timeline: [
      ...current.timeline,
      makeEvent(current.id, 'ESCALATION', `Manual escalation by ${staffName}.`, timestamp, {
        by: input.staffId,
        actorStaffId: input.staffId,
        staffId: input.staffId,
        reason: 'Manual',
        metadata: { reason: 'Manual', staffName },
      }),
    ],
  }));

  return {
    patients,
    alerts: [nextAlert, ...state.alerts.filter((alert) => alert.id !== nextAlert.id)].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
    activeQueueFilter: 'Reassessment',
  };
}

export function buildCancelEscalationPatch(
  state: {
    patients: Patient[];
    staff: Array<{ id: string; role?: string; roleLabel?: string }>;
    activeShift: { chargeStaffId: string };
    alerts: Alert[];
  },
  patientId: string,
  input: EscalationInput,
): Partial<OperationalStateSlice> | null {
  const timestamp = input.timestamp || new Date().toISOString();
  const patient = state.patients.find((candidate) => candidate.id === patientId);
  if (!patient) return null;

  const latestEscalation = [...patient.timeline]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .find((event) => event.type === 'ESCALATION');
  const cancellingStaff = state.staff.find((member) => member.id === input.staffId);
  const isCharge =
    input.staffId === state.activeShift.chargeStaffId ||
    /charge/i.test(String(cancellingStaff?.role || cancellingStaff?.roleLabel || ''));
  const escalatedBy =
    latestEscalation?.by || latestEscalation?.staffId || latestEscalation?.actorStaffId;
  if (!latestEscalation || (escalatedBy !== input.staffId && !isCharge)) return null;

  const staffName = input.staffName || input.staffId || 'staff';
  const patients = updatePatients(state.patients, patientId, (current) => ({
    ...current,
    flags: current.flags.filter(
      (flag) =>
        ![PatientFlag.HighRisk, PatientFlag.DeteriorationRisk, PatientFlag.ReassessmentDue].includes(
          getPatientFlagType(flag),
        ),
    ),
    timeline: [
      ...current.timeline,
      makeEvent(current.id, 'ESCALATION_CANCELLED', `Escalation cancelled by ${staffName}.`, timestamp, {
        by: input.staffId,
        actorStaffId: input.staffId,
        staffId: input.staffId,
        reason: 'Manual cancellation',
        metadata: { reason: 'Manual cancellation', staffName },
      }),
    ],
  }));

  return {
    patients,
    alerts: state.alerts.map((alert) =>
      alert.id === `alert-escalation-${patientId}` && !alert.dismissedAt
        ? { ...alert, dismissedAt: timestamp, dismissed: true }
        : alert,
    ),
  };
}

export function buildAddVitalsPatch(
  state: {
    patients: Patient[];
    rooms: Array<{ id: string; name?: string }>;
    alerts: Alert[];
  },
  patientId: string,
  nextVitalsInput: Vitals,
): Partial<OperationalStateSlice> | null {
  const nextVitals = normalizeIncomingVitals(nextVitalsInput);
  const timestamp = nextVitals.recordedAt || new Date().toISOString();
  const patient = state.patients.find((candidate) => candidate.id === patientId);
  if (!patient) return null;

  const previousVitals = previousVitalsSnapshot(patient);
  const triggeredAlerts = evaluateVitalsAlerts(nextVitals, previousVitals || {});
  const patientLabel = patient.name || `${patient.firstName} ${patient.lastName}`.trim();
  const roomName =
    patient.location ||
    state.rooms.find((room) => room.id === patient.roomId)?.name ||
    patient.roomId ||
    'No bed';
  const bedLabel =
    /^bed\b/i.test(String(roomName)) || roomName === 'No bed' ? roomName : `Bed ${roomName}`;
  const vitalsAlerts: VitalsAlert[] = triggeredAlerts.map((alert, index) => ({
    id: `vitals-alert-${patientId}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    patientId,
    severity: alert.severity,
    status: 'active',
    vital: alert.vital,
    value: alert.value,
    unit: alert.unit,
    reason: alert.reason,
    recordedAt: timestamp,
  }));
  const criticalAlerts = vitalsAlerts.filter((alert) => alert.severity === 'critical');
  const warningAlerts = vitalsAlerts.filter((alert) => alert.severity === 'warning');
  const criticalSummary = criticalAlerts.map((alert) => `${alert.vital} ${alert.value}${alert.unit}`).join(', ');
  const warningSummary = warningAlerts.map((alert) => `${alert.vital} ${alert.value}${alert.unit}`).join(', ');
  const criticalReason = criticalSummary ? `Critical vitals: ${criticalSummary}` : 'Critical vitals';
  const warningReason = warningSummary ? `Abnormal vitals: ${warningSummary}` : 'Abnormal vitals';
  const nextAlertRecords = [
    ...criticalAlerts.map((alert) =>
      normalizeAlert(
        {
          id: `alert-vitals-critical-${alert.id}`,
          type: 'System',
          severity: 'Critical',
          title: `CRITICAL: ${alert.vital} ${alert.value}${alert.unit} - ${patientLabel} ${bedLabel}`,
          message: `${patientLabel} requires immediate reassessment. ${criticalReason}`,
          patientId,
          dismissed: false,
          actionLabel: 'Go to Patient',
          actionType: 'VITALS_CRITICAL',
          autoDismissAfter: undefined,
        },
        new Date(timestamp),
      ),
    ),
    ...warningAlerts.map((alert) =>
      normalizeAlert(
        {
          id: `alert-vitals-warning-${alert.id}`,
          type: 'Reassessment',
          severity: 'Warning',
          title: `Vitals warning - ${patientLabel}`,
          message: `${warningReason}. Assigned clinician notified.`,
          patientId,
          dismissed: false,
          actionLabel: 'Go to Patient',
          actionType: 'VITALS_WARNING',
          autoDismissAfter: 30,
        },
        new Date(timestamp),
      ),
    ),
  ];

  const patients = updatePatients(state.patients, patientId, (current) => {
    const existingFlagTypes = new Set(current.flags.map((flag) => getPatientFlagType(flag)));
    const pipelineFlags: PatientFlagRecord[] = [];
    if (criticalAlerts.length) {
      if (!existingFlagTypes.has(PatientFlag.HighRisk)) {
        pipelineFlags.push(
          createPatientFlag(PatientFlag.HighRisk, {
            reason: criticalReason,
            severity: 'Critical',
            detectedAt: timestamp,
          }),
        );
      }
      if (!existingFlagTypes.has(PatientFlag.DeteriorationRisk)) {
        pipelineFlags.push(
          createPatientFlag(PatientFlag.DeteriorationRisk, {
            reason: criticalReason,
            severity: 'Critical',
            detectedAt: timestamp,
          }),
        );
      }
      if (!existingFlagTypes.has(PatientFlag.ReassessmentDue)) {
        pipelineFlags.push(
          createPatientFlag(PatientFlag.ReassessmentDue, {
            reason: criticalReason,
            severity: 'Critical',
            detectedAt: timestamp,
          }),
        );
      }
    } else if (warningAlerts.length && !existingFlagTypes.has(PatientFlag.ReassessmentDue)) {
      pipelineFlags.push(
        createPatientFlag(PatientFlag.ReassessmentDue, {
          reason: warningReason,
          severity: 'Warning',
          detectedAt: timestamp,
        }),
      );
    }

    const existingVitals = Array.isArray(current.vitals)
      ? current.vitals
      : current.vitals
        ? [current.vitals]
        : [];

    return {
      ...current,
      vitals: [...existingVitals, nextVitals],
      vitalsUpdatedAt: timestamp,
      lastAssessedTime: timestamp,
      flags: [...current.flags, ...pipelineFlags] as import('../types/emergency').PatientFlag[],
      vitalsAlerts: [...(current.vitalsAlerts || []), ...vitalsAlerts],
      timeline: [
        ...current.timeline,
        makeEvent(current.id, 'VitalsUpdated', 'Updated patient vitals.', timestamp, {
          staffId: nextVitals.recordedBy,
        }),
        ...vitalsAlerts.map((alert) =>
          makeEvent(
            current.id,
            'VitalsAlertFired',
            `${alert.severity.toUpperCase()} vitals alert: ${alert.reason}.`,
            timestamp,
            {
              metadata: {
                alertId: alert.id,
                severity: alert.severity,
                vital: alert.vital,
                value: alert.value,
                unit: alert.unit,
              },
            },
          ),
        ),
      ],
    };
  });

  return {
    patients,
    alerts: [...nextAlertRecords, ...state.alerts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
    ...(criticalAlerts.length || warningAlerts.length ? { activeQueueFilter: 'Reassessment' } : {}),
  };
}

export function buildSnoozeReassessmentReminderPatch(
  state: { patients: Patient[]; alerts: Alert[] },
  patientId: string,
  reminderId: string,
  minutes = 10,
): Partial<OperationalStateSlice> | null {
  const now = new Date();
  const dueAt = new Date(now.getTime() + minutes * 60 * 1000).toISOString();
  const alerts = state.alerts.map((alert) =>
    alert.reminderId === reminderId && !alert.dismissedAt
      ? { ...alert, dismissedAt: now.toISOString(), dismissed: true }
      : alert,
  );
  const patients = updatePatients(state.patients, patientId, (patient) => {
    const reassessmentReminders = (patient.reassessmentReminders || []).map((reminder) =>
      reminder.id === reminderId ? { ...reminder, status: 'snoozed' as const, dueAt } : reminder,
    );
    const hasOtherDueReminder = hasDueReassessmentReminder(
      { ...patient, reassessmentReminders },
      now,
    );
    return {
      ...patient,
      reassessmentReminders,
      flags: hasOtherDueReminder
        ? patient.flags
        : patient.flags.filter((flag) => !isScheduledReminderFlag(flag)),
      timeline: [
        ...patient.timeline,
        makeEvent(
          patient.id,
          'ReassessmentReminderSnoozed',
          `Snoozed recheck reminder ${minutes} minutes.`,
          now.toISOString(),
          { metadata: { reminderId, snoozedMinutes: minutes, dueAt } },
        ),
      ],
    };
  });
  return { patients, alerts };
}

export function buildAcknowledgeVitalsAlertPatch(
  state: { patients: Patient[]; alerts: Alert[] },
  patientId: string,
  alertId: string,
  acknowledgedBy: string,
): Partial<OperationalStateSlice> {
  const timestamp = new Date().toISOString();
  const patients = updatePatients(state.patients, patientId, (patient) => ({
    ...patient,
    vitalsAlerts: (patient.vitalsAlerts || []).map((alert) =>
      alert.id === alertId
        ? { ...alert, status: 'addressed' as const, acknowledgedAt: timestamp, acknowledgedBy }
        : alert,
    ),
    timeline: [
      ...patient.timeline,
      makeEvent(patient.id, 'VitalsAlertAddressed', 'Vitals alert marked addressed.', timestamp, {
        actorStaffId: acknowledgedBy,
        metadata: { alertId },
      }),
    ],
  }));
  const alerts = state.alerts.map((alert) =>
    alert.id.includes(alertId) && !alert.dismissedAt
      ? { ...alert, dismissedAt: timestamp, dismissed: true }
      : alert,
  );
  return { patients, alerts };
}

export type { ReassessmentReminder };
