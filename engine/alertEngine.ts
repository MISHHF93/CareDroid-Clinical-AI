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
const DEFAULT_TOAST_SECONDS: Record<AlertSeverity, number | undefined> = {
  Info: 5,
  Warning: 5,
  Critical: undefined,
};

let alertDispatchHandler: ((alert: AlertDispatchInput) => Alert) | null = null;

function hasPatientFlag(patient: Patient, flagType: string): boolean {
  return patient.flags.some((flag) => (typeof flag === 'string' ? flag : flag.type) === flagType);
}

function minutesSince(timestamp: string, now: Date): number {
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round((now.getTime() - parsed) / 60000));
}

function patientName(patient: Patient | undefined): string {
  if (!patient) return 'Unknown patient';
  return `${patient.firstName} ${patient.lastName}`;
}

function preserveAlertState(alert: Alert, previousAlerts: Alert[]): Alert {
  const previous = previousAlerts.find((candidate) => candidate.id === alert.id);
  if (!previous) return alert;

  return {
    ...alert,
    createdAt: previous.createdAt || alert.createdAt,
    dismissedAt: previous.dismissedAt,
  };
}

function makeAlert(input: Omit<Alert, 'createdAt'>, now: Date): Alert {
  return {
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
    autoDismissAfter: input.autoDismissAfter ?? DEFAULT_TOAST_SECONDS[severity],
  };
}

export function registerAlertDispatcher(handler: (alert: AlertDispatchInput) => Alert): void {
  alertDispatchHandler = handler;
}

export function dispatch(alert: AlertDispatchInput): Alert {
  if (alertDispatchHandler) return alertDispatchHandler(alert);
  return normalizeAlert(alert);
}

export function isDerivedAlertId(alertId: string): boolean {
  return /^alert-(reassessment|capacity|ems|referral|queue|bottleneck)-/.test(alertId);
}

function deriveReassessmentAlerts(patients: Patient[], now: Date): Alert[] {
  return patients
    .filter((patient) => patient.state !== PatientState.Discharge && hasPatientFlag(patient, 'DeteriorationRisk'))
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
        now
      )
    );
}

function capacitySeverity(capacity: CapacitySnapshot): AlertSeverity | null {
  if (capacity.riskLevel === 'Red') return 'Critical';
  if (capacity.riskLevel === 'Orange') return 'Warning';
  if (capacity.riskLevel === 'Yellow') return 'Info';
  return null;
}

function deriveCapacityAlerts(capacity: CapacitySnapshot, now: Date): Alert[] {
  const severity = capacitySeverity(capacity);
  if (!severity) return [];

  return [
    makeAlert(
      {
        id: `alert-capacity-${capacity.riskLevel.toLowerCase()}`,
        type: 'Capacity',
        severity,
        title: 'Capacity degradation detected',
        message: `${capacity.label}: score ${capacity.score}, occupancy ${capacity.currentOccupancy}/${capacity.maxCapacity}, boarding ${capacity.boardingCount}.`,
        actionLabel: 'Review Capacity',
        actionType: 'OPEN_CAPACITY',
        autoDismissAfter: severity === 'Critical' ? undefined : 5,
      },
      now
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
        now
      )
    );
}

function deriveReferralAlerts(referrals: Referral[], patients: Patient[], now: Date): Alert[] {
  const patientById = new Map(patients.map((patient) => [patient.id, patient]));
  const alerts: Alert[] = [];

  referrals.forEach((referral) => {
    const elapsed = minutesSince(referral.requestedAt, now);
    const patientLabel = patientName(patientById.get(referral.patientId));
    const isAwaitingAcceptance = !REFERRAL_ACCEPTANCE_CLOSED_STATUSES.has(referral.status);

    if (referral.status === 'Sent' && !referral.respondedAt && elapsed >= 15) {
      alerts.push(
        makeAlert(
          {
            id: `alert-referral-unacknowledged-${referral.id}`,
            type: 'Referral',
            severity: 'Warning',
            title: 'Referral unacknowledged',
            message: `${patientLabel} to ${referral.targetDepartment} has not been acknowledged after ${elapsed}m.`,
            patientId: referral.patientId,
            actionLabel: 'View Referral',
            actionType: 'OPEN_REFERRALS',
          },
          now
        )
      );
    }

    if (referral.urgency === 'Urgent' && isAwaitingAcceptance && elapsed >= 30) {
      alerts.push(
        makeAlert(
          {
            id: `alert-referral-urgent-${referral.id}`,
            type: 'Referral',
            severity: 'Warning',
            title: 'Referral escalation required',
            message: `${patientLabel} to ${referral.targetDepartment} has waited ${elapsed}m without acceptance.`,
            patientId: referral.patientId,
            actionLabel: 'View Referral',
            actionType: 'OPEN_REFERRALS',
          },
          now
        )
      );
    }

    if (referral.urgency === 'Emergent' && isAwaitingAcceptance && elapsed >= 10) {
      alerts.push(
        makeAlert(
          {
            id: `alert-referral-emergent-${referral.id}`,
            type: 'Referral',
            severity: 'Critical',
            title: 'Emergent referral not accepted',
            message: `${patientLabel} to ${referral.targetDepartment} has waited ${elapsed}m without acceptance.`,
            patientId: referral.patientId,
            actionLabel: 'View Referral',
            actionType: 'OPEN_REFERRALS',
          },
          now
        )
      );
    }
  });

  return alerts;
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
        now
      )
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
        now
      )
    );
  }

  return alerts;
}

export function deriveAlerts(
  inputs: AlertEngineInputs,
  previousAlerts: Alert[] = [],
  now = new Date()
): Alert[] {
  const nextAlerts = [
    ...deriveReassessmentAlerts(inputs.patients, now),
    ...deriveCapacityAlerts(inputs.capacity, now),
    ...deriveEMSAlerts(inputs.emsArrivals, now),
    ...deriveReferralAlerts(inputs.referrals, inputs.patients, now),
    ...deriveQueueAlerts(inputs.queues, inputs.bottleneckAlert, now),
  ].map((alert) => preserveAlertState(alert, previousAlerts));

  return nextAlerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
