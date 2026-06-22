import type { Alert, Patient, Staff, WorkflowActionLog } from '../types/emergency';
import { PatientFlag, PatientState } from '../types/emergency';
import { createWaitingRoomCommunicationLogInput } from './waitingRoomCommunicationLog';

export type ReceptionEscalationReasonId =
  | 'worsening-symptoms'
  | 'collapse-distress'
  | 'duplicate-registration'
  | 'identity-mismatch'
  | 'urgent-triage-attention';

export type ReceptionEscalationNotifyTarget = 'triage' | 'charge';

export type ReceptionEscalationReason = {
  id: ReceptionEscalationReasonId;
  label: string;
  shortLabel: string;
  description: string;
  severity: Alert['severity'];
  notifyTargets: ReceptionEscalationNotifyTarget[];
  recommendPatient: boolean;
};

export type ReceptionEscalationInput = {
  reasonId: ReceptionEscalationReasonId;
  patientId?: string | null;
  detail?: string;
  actorStaffId?: string;
  actorName?: string;
  timestamp?: string;
};

export type ReceptionEscalationRecord = {
  id: string;
  alertId: string;
  reasonId: ReceptionEscalationReasonId;
  reasonLabel: string;
  patientId?: string;
  patientLabel?: string;
  detail?: string;
  actorStaffId?: string;
  actorName?: string;
  timestamp: string;
  notifyTargets: ReceptionEscalationNotifyTarget[];
};

export const RECEPTION_ESCALATION_ALERT_SOURCE = 'reception-escalation-workflow';

export const RECEPTION_ESCALATION_REASONS: ReceptionEscalationReason[] = [
  {
    id: 'worsening-symptoms',
    label: 'Worsening symptoms at desk',
    shortLabel: 'Worsening symptoms',
    description: 'Patient reports rapidly worsening symptoms while at the reception desk.',
    severity: 'Critical',
    notifyTargets: ['triage', 'charge'],
    recommendPatient: true,
  },
  {
    id: 'collapse-distress',
    label: 'Collapse / distress in waiting room',
    shortLabel: 'Collapse / distress',
    description: 'Patient collapse, severe distress, or acute change in the waiting room.',
    severity: 'Critical',
    notifyTargets: ['triage', 'charge'],
    recommendPatient: false,
  },
  {
    id: 'duplicate-registration',
    label: 'Duplicate registration confusion',
    shortLabel: 'Duplicate registration',
    description: 'Possible duplicate chart or conflicting registration needs charge review.',
    severity: 'Warning',
    notifyTargets: ['charge'],
    recommendPatient: true,
  },
  {
    id: 'identity-mismatch',
    label: 'Identity mismatch concern',
    shortLabel: 'Identity mismatch',
    description: 'ID, demographics, or chart identity do not match — triage attention needed.',
    severity: 'Warning',
    notifyTargets: ['triage', 'charge'],
    recommendPatient: true,
  },
  {
    id: 'urgent-triage-attention',
    label: 'Urgent triage attention requested',
    shortLabel: 'Urgent triage',
    description: 'Reception requests immediate triage review without leaving the desk workflow.',
    severity: 'Critical',
    notifyTargets: ['triage', 'charge'],
    recommendPatient: true,
  },
];

const CLINICAL_REASONS = new Set<ReceptionEscalationReasonId>([
  'worsening-symptoms',
  'collapse-distress',
  'urgent-triage-attention',
]);

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function patientDisplayName(patient: Patient | null | undefined): string {
  if (!patient) return 'Unknown patient';
  return (
    [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim() ||
    patient.name ||
    patient.mrn ||
    'Unknown patient'
  );
}

function staffDisplayName(staff: Staff[] = [], staffId?: string, fallback?: string): string {
  if (fallback) return fallback;
  if (!staffId) return 'Reception';
  const member = staff.find((candidate) => candidate.id === staffId);
  return member?.displayName || member?.name || staffId;
}

export function resolveReceptionEscalationReason(
  reasonId: ReceptionEscalationReasonId | null | undefined,
): ReceptionEscalationReason | null {
  if (!reasonId) return null;
  return RECEPTION_ESCALATION_REASONS.find((reason) => reason.id === reasonId) || null;
}

export function buildReceptionEscalationTargetsLabel(
  targets: ReceptionEscalationNotifyTarget[] = [],
): string {
  const labels = targets.map((target) => (target === 'triage' ? 'Triage nurse' : 'Charge nurse'));
  return labels.join(' · ');
}

export function buildReceptionEscalationAlert(
  input: ReceptionEscalationInput,
  context: {
    patient?: Patient | null;
    staff?: Staff[];
  } = {},
): Alert {
  const reason = resolveReceptionEscalationReason(input.reasonId);
  if (!reason) {
    throw new Error(`Unknown reception escalation reason: ${input.reasonId}`);
  }

  const timestamp = input.timestamp || new Date().toISOString();
  const patient = context.patient || null;
  const patientLabel = patientDisplayName(patient);
  const actorName = staffDisplayName(context.staff, input.actorStaffId, input.actorName);
  const detail = input.detail?.trim();
  const locationHint =
    patient?.location ||
    (patient?.state === PatientState.Waiting ? 'Waiting room' : patient?.state) ||
    'Reception desk';

  const messageParts = [
    `Flagged by ${actorName}`,
    patient ? patientLabel : 'No patient linked',
    locationHint,
    detail,
    `Notify: ${buildReceptionEscalationTargetsLabel(reason.notifyTargets)}`,
  ].filter(Boolean);

  return {
    id: createId('reception-escalation'),
    type: 'Queue',
    severity: reason.severity,
    title: `Reception escalation — ${reason.shortLabel}`,
    message: messageParts.join(' · '),
    patientId: patient?.id,
    createdAt: timestamp,
    dismissed: false,
    read: false,
    acknowledged: false,
    source: RECEPTION_ESCALATION_ALERT_SOURCE,
    actionLabel: patient?.id ? 'View Patient' : undefined,
    actionType: patient?.id ? 'VIEW_PATIENT' : undefined,
    metadata: {
      receptionEscalationReason: reason.id,
      receptionEscalationTargets: reason.notifyTargets.join(','),
      actorStaffId: input.actorStaffId || null,
      actorName,
      detail: detail || null,
      suppressToast: true,
    },
  };
}

export function buildReceptionEscalationWorkflowLog(
  input: ReceptionEscalationInput,
  context: {
    patient?: Patient | null;
    escalationId: string;
  },
): Omit<WorkflowActionLog, 'id' | 'timestamp' | 'status'> & { timestamp?: string } {
  const reason = resolveReceptionEscalationReason(input.reasonId);
  const patient = context.patient || null;
  const detail = input.detail?.trim();
  const summary = [
    reason?.label || input.reasonId,
    patient ? patientDisplayName(patient) : 'Desk escalation',
    detail,
  ]
    .filter(Boolean)
    .join(' · ');

  return {
    type: 'integration_event_received',
    title: 'Reception escalation',
    summary,
    patientId: patient?.id,
    actorStaffId: input.actorStaffId,
    actorName: input.actorName,
    timestamp: input.timestamp,
    source: RECEPTION_ESCALATION_ALERT_SOURCE,
    severity: reason?.severity || 'Warning',
    metadata: {
      receptionEscalationId: context.escalationId,
      receptionEscalationReason: input.reasonId,
      detail: detail || null,
    },
  };
}

function applyClinicalEscalationFlags(patient: Patient, reasonId: ReceptionEscalationReasonId, timestamp: string): Patient {
  if (!CLINICAL_REASONS.has(reasonId)) return patient;

  const flagsToAdd =
    reasonId === 'collapse-distress'
      ? [PatientFlag.HighRisk, PatientFlag.DeteriorationRisk, PatientFlag.ReassessmentDue]
      : [PatientFlag.HighRisk, PatientFlag.ReassessmentDue];

  const existing = new Set(
    (patient.flags || []).map((flag) => (typeof flag === 'string' ? flag : flag.type)),
  );

  return {
    ...patient,
    flags: [
      ...patient.flags,
      ...flagsToAdd.filter((flag) => !existing.has(flag)).map((flag) => flag),
    ],
    timeline: [
      ...(patient.timeline || []),
      {
        id: createId('timeline-reception-escalation'),
        type: 'ReceptionEscalation',
        timestamp,
        to: patient.state,
        summary: `Reception escalation — ${resolveReceptionEscalationReason(reasonId)?.shortLabel || reasonId}`,
        note: reasonId,
        metadata: { reasonId },
      },
    ],
  };
}

export function buildReceptionEscalationSubmission(
  input: ReceptionEscalationInput,
  context: {
    patients?: Patient[];
    staff?: Staff[];
  } = {},
): {
  alert: Alert;
  workflowLog: ReturnType<typeof buildReceptionEscalationWorkflowLog>;
  communicationLog: ReturnType<typeof createWaitingRoomCommunicationLogInput> | null;
  patients: Patient[];
  record: ReceptionEscalationRecord;
} | null {
  const reason = resolveReceptionEscalationReason(input.reasonId);
  if (!reason) return null;

  const timestamp = input.timestamp || new Date().toISOString();
  const escalationId = createId('reception-escalation-record');
  const patients = context.patients || [];
  const patient = input.patientId
    ? patients.find((candidate) => candidate.id === input.patientId) || null
    : null;

  const alert = buildReceptionEscalationAlert(input, { patient, staff: context.staff });
  const workflowLog = buildReceptionEscalationWorkflowLog(input, {
    patient,
    escalationId,
  });
  const communicationLog = patient
    ? createWaitingRoomCommunicationLogInput({
        kind: 'concern-escalated',
        patientId: patient.id,
        summary: workflowLog.summary,
        actorStaffId: input.actorStaffId,
        actorName: input.actorName,
        timestamp,
        severity: reason.severity,
      })
    : null;

  const nextPatients = patient
    ? patients.map((candidate) =>
        candidate.id === patient.id
          ? applyClinicalEscalationFlags(candidate, input.reasonId, timestamp)
          : candidate,
      )
    : patients;

  const record: ReceptionEscalationRecord = {
    id: escalationId,
    alertId: alert.id,
    reasonId: input.reasonId,
    reasonLabel: reason.label,
    patientId: patient?.id,
    patientLabel: patient ? patientDisplayName(patient) : undefined,
    detail: input.detail?.trim() || undefined,
    actorStaffId: input.actorStaffId,
    actorName: input.actorName,
    timestamp,
    notifyTargets: reason.notifyTargets,
  };

  return {
    alert,
    workflowLog,
    communicationLog,
    patients: nextPatients,
    record,
  };
}

export function isReceptionEscalationAlert(alert: Alert | null | undefined): boolean {
  return alert?.source === RECEPTION_ESCALATION_ALERT_SOURCE;
}

export function listActiveReceptionEscalations(alerts: Alert[] = []): Alert[] {
  return alerts
    .filter((alert) => isReceptionEscalationAlert(alert) && !alert.dismissed && !alert.acknowledged)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function summarizeReceptionEscalationBoard(alerts: Alert[] = []): {
  activeCount: number;
  criticalCount: number;
  triageCount: number;
  chargeCount: number;
} {
  const active = listActiveReceptionEscalations(alerts);
  return {
    activeCount: active.length,
    criticalCount: active.filter((alert) => alert.severity === 'Critical').length,
    triageCount: active.filter((alert) =>
      String(alert.metadata?.receptionEscalationTargets || '').includes('triage'),
    ).length,
    chargeCount: active.filter((alert) =>
      String(alert.metadata?.receptionEscalationTargets || '').includes('charge'),
    ).length,
  };
}

export function buildReceptionEscalationNotificationAlerts(alerts: Alert[] = []): Alert[] {
  return listActiveReceptionEscalations(alerts).map((alert) => ({
    ...alert,
    metadata: {
      ...alert.metadata,
      suppressToast: false,
    },
  }));
}

export function broadcastReceptionEscalation(alert: Alert): void {
  if (typeof document === 'undefined') return;
  document.dispatchEvent(
    new CustomEvent('reception-escalation-raised', {
      detail: { alert },
    }),
  );
}

export function isClinicalEscalationRecipientRole(roleId: string | null | undefined): boolean {
  return ['charge_nurse', 'triage_nurse', 'ed_manager', 'admin', 'physician'].includes(
    String(roleId || ''),
  );
}

export function escalationAlertTargets(
  alert: Alert | null | undefined,
): ReceptionEscalationNotifyTarget[] {
  const raw = String(alert?.metadata?.receptionEscalationTargets || '');
  return raw
    .split(',')
    .map((target) => target.trim())
    .filter(
      (target): target is ReceptionEscalationNotifyTarget =>
        target === 'triage' || target === 'charge',
    );
}

export function filterReceptionEscalationsForTarget(
  alerts: Alert[] = [],
  target: ReceptionEscalationNotifyTarget,
): Alert[] {
  return listActiveReceptionEscalations(alerts).filter((alert) =>
    escalationAlertTargets(alert).includes(target),
  );
}

export function filterReceptionEscalationsForRole(
  alerts: Alert[] = [],
  roleId: string | null | undefined,
): Alert[] {
  const role = String(roleId || '');
  if (role === 'triage_nurse') return filterReceptionEscalationsForTarget(alerts, 'triage');
  if (role === 'charge_nurse') return filterReceptionEscalationsForTarget(alerts, 'charge');
  if (isClinicalEscalationRecipientRole(role)) return listActiveReceptionEscalations(alerts);
  return [];
}

export type ReceptionEscalationAttentionRow = {
  alertId: string;
  patientId?: string;
  title: string;
  message: string;
  severity: Alert['severity'];
  reasonId: ReceptionEscalationReasonId | null;
  reasonLabel: string | null;
  targetsLabel: string;
  createdAt: string;
};

export type ReceptionEscalationAttentionSnapshot = {
  summary: ReturnType<typeof summarizeReceptionEscalationBoard>;
  rows: ReceptionEscalationAttentionRow[];
  previewRows: ReceptionEscalationAttentionRow[];
};

export function buildReceptionEscalationAttentionSnapshot(
  alerts: Alert[] = [],
  context: { roleId?: string | null; limit?: number } = {},
): ReceptionEscalationAttentionSnapshot {
  const filtered = context.roleId
    ? filterReceptionEscalationsForRole(alerts, context.roleId)
    : listActiveReceptionEscalations(alerts);
  const limit = context.limit ?? 6;

  const rows = filtered.map((alert) => {
    const reasonId = (alert.metadata?.receptionEscalationReason as ReceptionEscalationReasonId) || null;
    const reason = resolveReceptionEscalationReason(reasonId);
    return {
      alertId: alert.id,
      patientId: alert.patientId,
      title: alert.title,
      message: alert.message,
      severity: alert.severity,
      reasonId,
      reasonLabel: reason?.shortLabel || null,
      targetsLabel: buildReceptionEscalationTargetsLabel(escalationAlertTargets(alert)),
      createdAt: alert.createdAt,
    };
  });

  return {
    summary: summarizeReceptionEscalationBoard(alerts),
    rows,
    previewRows: rows.slice(0, limit),
  };
}

export const RECEPTION_ESCALATION_SURFACES = Object.freeze([
  'reception-workspace',
  'triage-screen',
  'charge-nurse',
  'whiteboard',
  'notification-center',
]);

export function syncReceptionEscalationOperationalSurfaces(
  alerts: Alert[] = [],
  options: {
    roleId?: string | null;
    dispatchWebSocketEvent?: (event: {
      type: string;
      payload: Record<string, unknown>;
    }) => void;
    source?: string;
  } = {},
): ReceptionEscalationAttentionSnapshot {
  const snapshot = buildReceptionEscalationAttentionSnapshot(alerts, {
    roleId: options.roleId,
  });

  options.dispatchWebSocketEvent?.({
    type: 'reception_escalation_sync',
    payload: {
      source: options.source || 'reception-escalation-workflow',
      surfaces: [...RECEPTION_ESCALATION_SURFACES],
      summary: snapshot.summary,
      rows: snapshot.previewRows,
      generatedAt: new Date().toISOString(),
    },
  });

  return snapshot;
}

export function selectReceptionEscalationPatientOptions(
  patients: Patient[] = [],
): Array<{ id: string; label: string; state: PatientState }> {
  const priorityStates = new Set([
    PatientState.Registration,
    PatientState.Triage,
    PatientState.Waiting,
  ]);

  return patients
    .filter((patient) => priorityStates.has(patient.state))
    .map((patient) => ({
      id: patient.id,
      label: `${patientDisplayName(patient)} · ${patient.mrn || 'No MRN'} · ${patient.state}`,
      state: patient.state,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}
