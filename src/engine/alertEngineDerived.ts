import {
  PatientState,
  type Alert,
  type AlertSeverity,
  type BottleneckAlert,
  type CapacitySnapshot,
  type EMSArrival,
  type Patient,
  type Queue,
  type Referral,
} from '../types/emergency';
import { getLongWaitPatients } from '../utils/longWaitRescue';
import { triageOperationalAlerts } from './alertClassificationModel';

export interface AlertEngineInputs {
  patients: Patient[];
  capacity: CapacitySnapshot;
  emsArrivals: EMSArrival[];
  referrals: Referral[];
  queues: Queue[];
  bottleneckAlert: BottleneckAlert | null;
}

export type AlertDispatchInput = Omit<Alert, 'id' | 'createdAt' | 'type' | 'severity'> &
  Partial<Pick<Alert, 'id' | 'createdAt' | 'type' | 'severity'>>;

const ACTIVE_EMS_STATUSES = new Set(['Inbound', 'Arrived', 'Handoff']);
const REFERRAL_ACCEPTANCE_CLOSED_STATUSES = new Set(['Accepted', 'Completed', 'Declined']);
const REFERRAL_RESPONSE_STATUSES = new Set([
  'Acknowledged',
  'Accepted',
  'Declined',
  'InfoRequested',
  'TransportArranged',
  'PatientDeparted',
  'Completed',
]);
const ACTIVE_REASSESSMENT_REMINDER_STATUSES = new Set(['pending', 'snoozed']);
const REASSESSMENT_REMINDER_WARNING_WINDOW_MS = 2 * 60 * 1000;
const REASSESSMENT_REMINDER_OVERDUE_MS = 10 * 60 * 1000;
const DEFAULT_TOAST_SECONDS: Record<AlertSeverity, number | undefined> = {
  Info: 5,
  Warning: 5,
  Critical: undefined,
};

function hasPatientFlag(patient: Patient, flagType: string): boolean {
  return patient.flags.some((flag) => {
    const value = typeof flag === 'string' ? flag : (flag as unknown as { type: string }).type;
    return value === flagType;
  });
}

function minutesSince(timestamp: string, now: Date): number {
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round((now.getTime() - parsed) / 60000));
}

function patientName(patient: Patient | undefined): string {
  if (!patient) return 'Unknown patient';
  return `${patient.firstName} ${patient.lastName}`.trim() || patient.mrn;
}

function preserveAlertState(alert: Alert, previousAlerts: Alert[]): Alert {
  const previous = previousAlerts.find((candidate) => candidate.id === alert.id);
  if (!previous) return alert;

  return {
    ...alert,
    createdAt: previous.createdAt || alert.createdAt,
    dismissedAt: previous.dismissedAt,
    dismissed: previous.dismissed ?? alert.dismissed,
  };
}

function makeAlert(input: Partial<Alert> & Pick<Alert, 'id' | 'severity' | 'title' | 'message'>, now: Date): Alert {
  return {
    dismissed: false,
    type: 'System',
    ...input,
    createdAt: now.toISOString(),
  };
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function normalizeAlert(input: AlertDispatchInput, now = new Date()): Alert {
  const severity = input.severity || 'Info';
  const type = input.type || 'System';
  return {
    ...input,
    id:
      input.id ||
      `alert-${slug(type)}-${slug(input.title || 'notification')}-${now.getTime()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,
    type,
    severity,
    title: input.title,
    message: input.message,
    createdAt: input.createdAt || now.toISOString(),
    dismissed: input.dismissed ?? false,
    autoDismissAfter: input.autoDismissAfter ?? DEFAULT_TOAST_SECONDS[severity],
  };
}

export function isDerivedAlertId(alertId: string): boolean {
  return /^alert-(reassessment|capacity|ems|referral|long-wait|queue|bottleneck)-/.test(alertId);
}

function deriveReassessmentAlerts(patients: Patient[], now: Date): Alert[] {
  return patients
    .filter(
      (patient) =>
        patient.state !== PatientState.Discharge && hasPatientFlag(patient, 'DeteriorationRisk'),
    )
    .map((patient) =>
      makeAlert(
        {
          id: `alert-reassessment-deterioration-${patient.id}`,
          type: 'Reassessment',
          severity: 'Critical',
          title: 'Deterioration risk flagged',
          message: `${patientName(patient)} has a deterioration risk flag and should be surfaced for reassessment review.`,
          patientId: patient.id,
          actionLabel: 'View Patient',
          actionType: 'VIEW_PATIENT',
        },
        now,
      ),
    );
}

function roomLabel(patient: Patient): string {
  return patient.location || patient.roomId || 'No room';
}

function reassessmentReminderStage(
  reminder: NonNullable<Patient['reassessmentReminders']>[number],
  now: Date,
): 'upcoming' | 'due' | 'overdue' | null {
  if (!ACTIVE_REASSESSMENT_REMINDER_STATUSES.has(reminder.status)) return null;
  const dueAt = new Date(reminder.dueAt).getTime();
  const nowMs = now.getTime();
  if (!Number.isFinite(dueAt)) return null;
  if (nowMs >= dueAt + REASSESSMENT_REMINDER_OVERDUE_MS) return 'overdue';
  if (nowMs >= dueAt) return 'due';
  if (dueAt - nowMs <= REASSESSMENT_REMINDER_WARNING_WINDOW_MS) return 'upcoming';
  return null;
}

function deriveReassessmentReminderAlerts(patients: Patient[], now: Date): Alert[] {
  return patients.flatMap((patient) =>
    (patient.reassessmentReminders || []).flatMap((reminder) => {
      const stage = reassessmentReminderStage(reminder, now);
      if (!stage) return [];
      const title =
        stage === 'upcoming'
          ? `Recheck due in 2min - ${patientName(patient)}`
          : stage === 'due'
            ? `Recheck due now - ${patientName(patient)}`
            : `Recheck overdue - ${patientName(patient)}`;
      return [
        makeAlert(
          {
            id: `alert-reassessment-reminder-${stage}-${reminder.id}`,
            type: 'Reassessment',
            severity: stage === 'overdue' ? 'Critical' : 'Warning',
            title,
            message: `${patient.chiefComplaint || patient.complaintCategory} - ${roomLabel(patient)}${reminder.note ? ` - ${reminder.note}` : ''}`,
            patientId: patient.id,
            reminderId: reminder.id,
            actionLabel: 'Go to Patient',
            actionType: 'REASSESSMENT_REMINDER',
            autoDismissAfter: undefined,
          },
          now,
        ),
      ];
    }),
  );
}

function capacitySeverity(capacity: CapacitySnapshot): AlertSeverity | null {
  const band = capacity.riskLevel || capacity.band;
  if (band === 'Red') return 'Critical';
  if (band === 'Orange') return 'Warning';
  if (band === 'Yellow') return 'Info';
  return null;
}

function deriveCapacityAlerts(capacity: CapacitySnapshot, now: Date): Alert[] {
  const severity = capacitySeverity(capacity);
  if (!severity) return [];

  const band = capacity.riskLevel || capacity.band || 'Unknown';
  return [
    makeAlert(
      {
        id: `alert-capacity-${String(band).toLowerCase()}`,
        type: 'Capacity',
        severity,
        title: 'Capacity degradation detected',
        message: `${capacity.label}: score ${capacity.score}, occupancy ${capacity.currentOccupancy ?? capacity.occupiedRooms}/${capacity.maxCapacity}, boarding ${capacity.boardingCount}.`,
        actionLabel: 'Review Capacity',
        actionType: 'OPEN_CAPACITY',
        autoDismissAfter: severity === 'Critical' ? undefined : 5,
      },
      now,
    ),
  ];
}

function deriveEMSAlerts(emsArrivals: EMSArrival[], now: Date): Alert[] {
  return emsArrivals
    .filter((arrival) => ACTIVE_EMS_STATUSES.has(arrival.status) && arrival.severity === 'Critical')
    .map((arrival) =>
      makeAlert(
        {
          id: `alert-ems-critical-${arrival.id}`,
          type: 'EMS',
          severity: 'Critical',
          title: 'Critical EMS inbound',
          message: `${arrival.unitName} inbound with ${arrival.chiefComplaint}. ETA ${arrival.eta}m.`,
          patientId: arrival.patientId,
          actionLabel: arrival.patientId ? 'View Patient' : 'Review EMS',
          actionType: arrival.patientId ? 'VIEW_PATIENT' : 'OPEN_EMS',
        },
        now,
      ),
    );
}

function deriveReferralAlerts(referrals: Referral[], patients: Patient[], now: Date): Alert[] {
  const patientById = new Map(patients.map((patient) => [patient.id, patient]));
  const alerts: Alert[] = [];

  referrals.forEach((referral) => {
    const elapsed = minutesSince(referral.requestedAt ?? '', now);
    const patientLabel = patientName(patientById.get(referral.patientId));
    const isAwaitingAcceptance = !REFERRAL_ACCEPTANCE_CLOSED_STATUSES.has(referral.status);
    const isUnacknowledged =
      referral.status === 'Sent' &&
      !referral.respondedAt &&
      !REFERRAL_RESPONSE_STATUSES.has(referral.status);
    const warningThreshold =
      referral.urgency === 'Emergent' ? 10 : referral.urgency === 'Urgent' ? 15 : null;
    const criticalThreshold =
      referral.urgency === 'Emergent' ? 20 : referral.urgency === 'Urgent' ? 30 : null;

    if (referral.status === 'Sent') {
      alerts.push(
        makeAlert(
          {
            id: `alert-referral-sent-${referral.id}`,
            type: 'Referral',
            severity: referral.urgency === 'Emergent' ? 'Warning' : 'Info',
            title: `Referral sent to ${referral.targetDepartment}`,
            message: `${patientLabel} referral is awaiting ${referral.targetDepartment} acknowledgement.`,
            patientId: referral.patientId,
            actionLabel: 'View Patient',
            actionType: 'VIEW_PATIENT',
            autoDismissAfter: referral.urgency === 'Routine' ? 5 : undefined,
          },
          now,
        ),
      );
    }

    if (
      isUnacknowledged &&
      warningThreshold !== null &&
      elapsed >= warningThreshold &&
      (criticalThreshold === null || elapsed < criticalThreshold)
    ) {
      alerts.push(
        makeAlert(
          {
            id: `alert-referral-unacknowledged-${referral.id}`,
            type: 'Referral',
            severity: 'Warning',
            title: 'Referral unacknowledged',
            message: `${referral.targetDepartment} - ${patientLabel} - ${elapsed}m unacknowledged.`,
            patientId: referral.patientId,
            actionLabel: 'View Patient',
            actionType: 'VIEW_PATIENT',
          },
          now,
        ),
      );
    }

    if (isUnacknowledged && criticalThreshold !== null && elapsed >= criticalThreshold) {
      alerts.push(
        makeAlert(
          {
            id: `alert-referral-critical-unacknowledged-${referral.id}`,
            type: 'Referral',
            severity: 'Critical',
            title: 'Referral escalation required',
            message: `${referral.targetDepartment} - ${patientLabel} has waited ${elapsed}m without acknowledgement. Charge nurse notified.`,
            patientId: referral.patientId,
            actionLabel: 'View Patient',
            actionType: 'VIEW_PATIENT',
          },
          now,
        ),
      );
    }

    if (referral.urgency === 'Emergent' && isAwaitingAcceptance && elapsed >= 10) {
      alerts.push(
        makeAlert(
          {
            id: `alert-referral-emergent-pager-${referral.id}`,
            type: 'Referral',
            severity: 'Critical',
            title: 'Emergent referral pager escalation',
            message: `${patientLabel} to ${referral.targetDepartment} has not been accepted after ${elapsed}m. On-call pager escalation attempt recorded.`,
            patientId: referral.patientId,
            actionLabel: 'View Patient',
            actionType: 'VIEW_PATIENT',
            autoDismissAfter: undefined,
          },
          now,
        ),
      );
    }
  });

  return alerts;
}

function deriveLongWaitAlerts(patients: Patient[], now: Date): Alert[] {
  return getLongWaitPatients(patients, now).map(({ patient, status }) => {
    const patientLabel = patientName(patient);
    const base = {
      type: 'Reassessment' as const,
      patientId: patient.id,
      actionLabel: 'View Patient',
      actionType: 'VIEW_PATIENT',
    };

    if (status.phase === 'lwbs') {
      return makeAlert(
        {
          ...base,
          id: `alert-long-wait-lwbs-${patient.id}`,
          severity: 'Critical',
          title: 'LWBS risk - waiting patient',
          message: `${patientLabel} has waited ${status.waitMinutes}m (${patient.priority} limit ${status.thresholdMinutes}m). Full team notification required.`,
          autoDismissAfter: undefined,
        },
        now,
      );
    }

    if (status.phase === 'critical') {
      return makeAlert(
        {
          ...base,
          id: `alert-long-wait-critical-${patient.id}`,
          severity: 'Critical',
          title: 'Critical long wait breach',
          message: `${patientLabel} has waited ${status.waitMinutes}m (${patient.priority} limit ${status.thresholdMinutes}m). Charge nurse and physician notification required.`,
          autoDismissAfter: undefined,
        },
        now,
      );
    }

    return makeAlert(
      {
        ...base,
        id: `alert-long-wait-warning-${patient.id}`,
        severity: 'Warning',
        title: 'Wait time approaching limit',
        message: `${patientLabel} has waited ${status.waitMinutes}m (${patient.priority} limit ${status.thresholdMinutes}m). Assigned RN reminder sent.`,
        autoDismissAfter: undefined,
      },
      now,
    );
  });
}

function deriveQueueAlerts(queues: Queue[], bottleneckAlert: BottleneckAlert | null, now: Date): Alert[] {
  const alerts = queues
    .filter((queue) => queue.longestWaitMinutes > queue.targetWaitMinutes)
    .map((queue) =>
      makeAlert(
        {
          id: `alert-queue-breach-${queue.type}`,
          type: 'Queue',
          severity: queue.longestWaitMinutes >= queue.targetWaitMinutes * 2 ? 'Critical' : 'Warning',
          title: `${queue.name} queue breach`,
          message: `Longest wait is ${queue.longestWaitMinutes}m against a ${queue.targetWaitMinutes}m target.`,
          actionLabel: 'Review Queue',
          actionType: 'OPEN_QUEUE',
        },
        now,
      ),
    );

  if (bottleneckAlert) {
    alerts.push(
      makeAlert(
        {
          id: `alert-bottleneck-${bottleneckAlert.queue}`,
          type: 'Queue',
          severity: bottleneckAlert.severity === 'Red' ? 'Critical' : 'Warning',
          title: `${bottleneckAlert.queue} bottleneck detected`,
          message: bottleneckAlert.reason,
          actionLabel: 'Review Queue',
          actionType: 'OPEN_QUEUE',
        },
        now,
      ),
    );
  }

  return alerts;
}

export function deriveAlerts(
  inputs: AlertEngineInputs,
  previousAlerts: Alert[] = [],
  now = new Date(),
): Alert[] {
  const nextAlerts = [
    ...deriveReassessmentAlerts(inputs.patients, now),
    ...deriveReassessmentReminderAlerts(inputs.patients, now),
    ...deriveCapacityAlerts(inputs.capacity, now),
    ...deriveEMSAlerts(inputs.emsArrivals, now),
    ...deriveReferralAlerts(inputs.referrals, inputs.patients, now),
    ...deriveLongWaitAlerts(inputs.patients, now),
    ...deriveQueueAlerts(inputs.queues, inputs.bottleneckAlert, now),
  ].map((alert) => preserveAlertState(alert, previousAlerts));

  return triageOperationalAlerts(nextAlerts).visible;
}
