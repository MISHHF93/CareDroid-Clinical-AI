import type { JourneyEvent, Patient, Staff, WorkflowActionLog } from '../types/emergency';
import { PatientFlag, PatientState } from '../types/emergency';
import { isQueueWorkflowLog } from '../config/operationalAuditModel';

export type WaitingRoomCommunicationKind =
  | 'patient-updated'
  | 'vitals-repeated'
  | 'reassessed'
  | 'delay-informed'
  | 'queue-status-moved'
  | 'concern-escalated';

export type CommunicationRecencyTone = 'fresh' | 'watch' | 'warning' | 'critical';

export type WaitingRoomCommunicationEvent = {
  id: string;
  kind: WaitingRoomCommunicationKind;
  label: string;
  summary: string;
  timestamp: string;
  actorStaffId?: string;
  actorName?: string;
  source: string;
};

export type CommunicationRecencySnapshot = {
  patientId: string;
  lastEventAt: string | null;
  lastEventKind: WaitingRoomCommunicationKind | null;
  lastEventLabel: string | null;
  minutesSinceContact: number | null;
  recencyLabel: string;
  shortRecencyLabel: string;
  tone: CommunicationRecencyTone;
  staffDetail: string;
  events: WaitingRoomCommunicationEvent[];
};

export type CommunicationLogContext = {
  now?: Date;
  workflowLogs?: WorkflowActionLog[];
  staff?: Staff[];
  limit?: number;
};

export const COMMUNICATION_KIND_METADATA_KEY = 'communicationKind';

export const WAITING_ROOM_COMMUNICATION_SOURCE = 'waiting-room-communication';

export const COMMUNICATION_KIND_LABELS: Record<WaitingRoomCommunicationKind, string> = {
  'patient-updated': 'Patient updated',
  'vitals-repeated': 'Vitals repeated',
  reassessed: 'Reassessed',
  'delay-informed': 'Delay informed',
  'queue-status-moved': 'Queue status moved',
  'concern-escalated': 'Concern escalated',
};

export const COMMUNICATION_KIND_SHORT_LABELS: Record<WaitingRoomCommunicationKind, string> = {
  'patient-updated': 'Updated',
  'vitals-repeated': 'Vitals',
  reassessed: 'Reassess',
  'delay-informed': 'Delay',
  'queue-status-moved': 'Queue',
  'concern-escalated': 'Escalated',
};

export const WAITING_ROOM_COMMUNICATION_KINDS = Object.freeze([
  'patient-updated',
  'vitals-repeated',
  'reassessed',
  'delay-informed',
  'queue-status-moved',
  'concern-escalated',
] as const satisfies readonly WaitingRoomCommunicationKind[]);

export const DEFAULT_COMMUNICATION_SUMMARIES: Record<WaitingRoomCommunicationKind, string> = {
  'patient-updated': 'Checked in with patient in the waiting room.',
  'vitals-repeated': 'Repeat vitals taken and reviewed with patient.',
  reassessed: 'Reassessment completed in the waiting room.',
  'delay-informed': 'Patient informed of wait delay.',
  'queue-status-moved': 'Queue status updated with patient.',
  'concern-escalated': 'Concern escalated for charge nurse review.',
};

export const WAITING_ROOM_COMMUNICATION_SURFACES = Object.freeze([
  'patient-detail',
  'waiting-room-board',
  'whiteboard',
  'notification-center',
]);

const DELAY_INFORMED_NOTE_PATTERN =
  /\b(delay|waiting|wait time|backlog|informed (the )?patient|patient (was )?informed|lwbs|left without)\b/i;

const ESCALATION_FLAGS = new Set<PatientFlag>([
  PatientFlag.HighRisk,
  PatientFlag.DeteriorationRisk,
  PatientFlag.SepsisAlert,
  PatientFlag.StrokeCode,
  PatientFlag.DeterioratingNeuro,
]);

const REASSESSMENT_TIMELINE_TYPES = new Set([
  'ReassessmentReminderCompleted',
  'Reassessment',
  'ReassessmentCompleted',
]);

const VITALS_TIMELINE_TYPES = new Set(['VitalsUpdated']);

function minutesSince(timestamp: string | null | undefined, now: Date): number | null {
  if (!timestamp) return null;
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.round((now.getTime() - parsed) / 60000));
}

export function formatCommunicationDuration(minutes: number | null, { unknownLabel = '—' } = {}): string {
  if (minutes === null || !Number.isFinite(minutes)) return unknownLabel;
  if (minutes < 1) return '<1m ago';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m ago` : `${hours}h ago`;
}

function resolveRecencyTone(minutes: number | null): CommunicationRecencyTone {
  if (minutes === null) return 'critical';
  if (minutes < 15) return 'fresh';
  if (minutes < 30) return 'watch';
  if (minutes < 60) return 'warning';
  return 'critical';
}

function staffName(staff: Staff[] = [], staffId?: string): string | undefined {
  if (!staffId) return undefined;
  const member = staff.find((candidate) => candidate.id === staffId);
  return member?.displayName || member?.name || undefined;
}

export function isDelayInformedNoteText(text: string | null | undefined): boolean {
  if (!text) return false;
  return DELAY_INFORMED_NOTE_PATTERN.test(text);
}

export function isWaitingRoomCommunicationEligible(patient: Patient | null | undefined): boolean {
  if (!patient?.id) return false;
  return patient.state === PatientState.Waiting || patient.state === PatientState.Triage;
}

function explicitCommunicationKind(log: WorkflowActionLog): WaitingRoomCommunicationKind | null {
  const kind = log.metadata?.[COMMUNICATION_KIND_METADATA_KEY];
  if (typeof kind === 'string' && kind in COMMUNICATION_KIND_LABELS) {
    return kind as WaitingRoomCommunicationKind;
  }
  return null;
}

export function classifyWorkflowCommunicationKind(
  log: WorkflowActionLog,
): WaitingRoomCommunicationKind | null {
  const explicit = explicitCommunicationKind(log);
  if (explicit) return explicit;

  if (log.source === WAITING_ROOM_COMMUNICATION_SOURCE) {
    return 'patient-updated';
  }

  if (log.type === 'journey_state_changed' || isQueueWorkflowLog(log)) {
    return 'queue-status-moved';
  }

  if (log.type === 'reassessment_completed') {
    const summary = `${log.summary || ''} ${log.title || ''}`.toLowerCase();
    if (summary.includes('vitals')) return 'vitals-repeated';
    return 'reassessed';
  }

  if (log.type === 'clinician_assigned') return 'patient-updated';

  if (log.type === 'copilot_used' && log.metadata?.flag) {
    const flag = String(log.metadata.flag);
    if (ESCALATION_FLAGS.has(flag as PatientFlag)) return 'concern-escalated';
  }

  if (log.severity === 'Critical' && /escalat/i.test(`${log.title} ${log.summary}`)) {
    return 'concern-escalated';
  }

  if (log.type === 'integration_event_received' && log.metadata?.handoff) {
    return 'patient-updated';
  }

  return null;
}

function classifyTimelineCommunicationKind(event: JourneyEvent): WaitingRoomCommunicationKind | null {
  const type = String(event.type || '');
  if (VITALS_TIMELINE_TYPES.has(type)) return 'vitals-repeated';
  if (REASSESSMENT_TIMELINE_TYPES.has(type)) return 'reassessed';
  if (type === 'StateChange' || type === 'JourneyStateChanged') return 'queue-status-moved';
  if (type === 'StaffAssignment') return 'patient-updated';
  if (type === 'NoteAdded' || type === 'NursingNote') {
    const text = `${event.note || ''} ${event.summary || ''}`;
    return isDelayInformedNoteText(text) ? 'delay-informed' : 'patient-updated';
  }
  return null;
}

function classifyNoteCommunicationKind(note: {
  text?: string;
  body?: string;
  type?: string;
}): WaitingRoomCommunicationKind | null {
  const text = note.text || note.body || '';
  if (!text.trim()) return null;
  if (isDelayInformedNoteText(text)) return 'delay-informed';
  if (note.type === 'Nursing' || note.type === 'Score' || note.type === 'Clinical') {
    return 'patient-updated';
  }
  return isDelayInformedNoteText(text) ? 'delay-informed' : 'patient-updated';
}

function toCommunicationEvent(input: {
  id: string;
  kind: WaitingRoomCommunicationKind;
  summary: string;
  timestamp: string;
  actorStaffId?: string;
  actorName?: string;
  source: string;
}): WaitingRoomCommunicationEvent {
  return {
    id: input.id,
    kind: input.kind,
    label: COMMUNICATION_KIND_LABELS[input.kind],
    summary: input.summary,
    timestamp: input.timestamp,
    actorStaffId: input.actorStaffId,
    actorName: input.actorName,
    source: input.source,
  };
}

export function buildCommunicationEvents(
  patient: Patient,
  context: CommunicationLogContext = {},
): WaitingRoomCommunicationEvent[] {
  const limit = context.limit ?? 24;
  const staff = context.staff || [];
  const events: WaitingRoomCommunicationEvent[] = [];

  for (const log of context.workflowLogs || []) {
    if (log.patientId && log.patientId !== patient.id) continue;
    const kind = classifyWorkflowCommunicationKind(log);
    if (!kind) continue;
    events.push(
      toCommunicationEvent({
        id: log.id,
        kind,
        summary: log.summary || log.title,
        timestamp: log.timestamp,
        actorStaffId: log.actorStaffId,
        actorName: log.actorName || staffName(staff, log.actorStaffId),
        source: log.source,
      }),
    );
  }

  for (const event of patient.timeline || []) {
    const kind = classifyTimelineCommunicationKind(event);
    if (!kind || !event.timestamp) continue;
    events.push(
      toCommunicationEvent({
        id: `timeline-${event.id}`,
        kind,
        summary: event.summary || event.note || COMMUNICATION_KIND_LABELS[kind],
        timestamp: event.timestamp,
        actorStaffId: event.actorStaffId || event.staffId,
        actorName: staffName(staff, event.actorStaffId || event.staffId),
        source: 'patient-timeline',
      }),
    );
  }

  for (const note of patient.notes || []) {
    const kind = classifyNoteCommunicationKind(note);
    const timestamp = note.timestamp || note.createdAt;
    if (!kind || !timestamp) continue;
    events.push(
      toCommunicationEvent({
        id: `note-${note.id}`,
        kind,
        summary: note.text || note.body || COMMUNICATION_KIND_LABELS[kind],
        timestamp: String(timestamp),
        actorStaffId: note.authorStaffId || note.authorId,
        actorName: staffName(staff, note.authorStaffId || note.authorId),
        source: 'patient-note',
      }),
    );
  }

  const deduped = new Map<string, WaitingRoomCommunicationEvent>();
  for (const event of events.sort(
    (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
  )) {
    const key = `${event.kind}:${event.timestamp}:${event.summary.slice(0, 48)}`;
    if (!deduped.has(key)) deduped.set(key, event);
  }

  return Array.from(deduped.values())
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .slice(0, limit);
}

export function resolveCommunicationRecency(
  patient: Patient,
  context: CommunicationLogContext = {},
): CommunicationRecencySnapshot {
  const now = context.now || new Date();
  const events = buildCommunicationEvents(patient, context);
  const latest = events[0] || null;
  const minutesSinceContact = minutesSince(latest?.timestamp, now);
  const tone = resolveRecencyTone(minutesSinceContact);
  const recencyLabel = latest
    ? `${formatCommunicationDuration(minutesSinceContact)} · ${COMMUNICATION_KIND_SHORT_LABELS[latest.kind]}`
    : 'No staff contact logged';
  const shortRecencyLabel = latest
    ? formatCommunicationDuration(minutesSinceContact).replace(' ago', '')
    : '—';

  const actor = latest?.actorName || latest?.actorStaffId || 'Staff';
  const staffDetail = latest
    ? `Last ${COMMUNICATION_KIND_LABELS[latest.kind].toLowerCase()} by ${actor} · ${formatCommunicationDuration(minutesSinceContact)}`
    : 'No waiting-room communication events recorded for this patient yet.';

  return {
    patientId: patient.id,
    lastEventAt: latest?.timestamp || null,
    lastEventKind: latest?.kind || null,
    lastEventLabel: latest ? COMMUNICATION_KIND_LABELS[latest.kind] : null,
    minutesSinceContact,
    recencyLabel,
    shortRecencyLabel,
    tone,
    staffDetail,
    events,
  };
}

export function summarizeCommunicationBoard(
  patients: Patient[] = [],
  context: CommunicationLogContext = {},
): {
  staleContactCount: number;
  overdueContactCount: number;
  noContactCount: number;
} {
  let staleContactCount = 0;
  let overdueContactCount = 0;
  let noContactCount = 0;

  for (const patient of patients) {
    if (!isWaitingRoomCommunicationEligible(patient)) continue;
    const recency = resolveCommunicationRecency(patient, context);
    if (!recency.lastEventAt) {
      noContactCount += 1;
      continue;
    }
    const minutes = recency.minutesSinceContact;
    if (minutes === null || minutes >= 60) overdueContactCount += 1;
    else if (minutes >= 30) staleContactCount += 1;
  }

  return { staleContactCount, overdueContactCount, noContactCount };
}

export function createWaitingRoomCommunicationLogInput(input: {
  kind: WaitingRoomCommunicationKind;
  patientId: string;
  summary: string;
  actorStaffId?: string;
  actorName?: string;
  timestamp?: string;
  severity?: WorkflowActionLog['severity'];
}): Omit<WorkflowActionLog, 'id' | 'timestamp' | 'status'> & {
  timestamp?: string;
} {
  return {
    type: 'integration_event_received',
    title: COMMUNICATION_KIND_LABELS[input.kind],
    summary: input.summary,
    patientId: input.patientId,
    actorStaffId: input.actorStaffId,
    actorName: input.actorName,
    timestamp: input.timestamp,
    source: WAITING_ROOM_COMMUNICATION_SOURCE,
    severity: input.severity || 'Info',
    metadata: {
      [COMMUNICATION_KIND_METADATA_KEY]: input.kind,
    },
  };
}

export type WaitingRoomCommunicationLogStore = {
  patients?: Patient[];
  workflowLogs?: WorkflowActionLog[];
  recordWorkflowAction?: (input: ReturnType<typeof createWaitingRoomCommunicationLogInput>) => WorkflowActionLog;
  dispatchWebSocketEvent?: (event: {
    type: string;
    payload: Record<string, unknown>;
  }) => void;
};

/** Record a staff communication event through workflow audit infrastructure. */
export function recordWaitingRoomCommunication(
  store: WaitingRoomCommunicationLogStore,
  input: {
    kind: WaitingRoomCommunicationKind;
    patientId: string;
    summary?: string;
    actorStaffId?: string;
    actorName?: string;
    severity?: WorkflowActionLog['severity'];
    timestamp?: string;
  },
): WorkflowActionLog | null {
  const patient = store.patients?.find((candidate) => candidate.id === input.patientId);
  if (patient && !isWaitingRoomCommunicationEligible(patient)) return null;

  const logInput = createWaitingRoomCommunicationLogInput({
    kind: input.kind,
    patientId: input.patientId,
    summary: input.summary || DEFAULT_COMMUNICATION_SUMMARIES[input.kind],
    actorStaffId: input.actorStaffId,
    actorName: input.actorName,
    severity: input.severity,
    timestamp: input.timestamp,
  });

  return store.recordWorkflowAction?.(logInput) || null;
}

/** Broadcast communication recency snapshot to connected operational surfaces. */
export function syncWaitingRoomCommunicationOperationalSurfaces(
  store: WaitingRoomCommunicationLogStore,
  options: { patientId?: string; source?: string } = {},
): {
  summary: ReturnType<typeof summarizeCommunicationBoard>;
  patientSnapshots: CommunicationRecencySnapshot[];
} {
  const patients = (store.patients || []).filter(isWaitingRoomCommunicationEligible);
  const context = { workflowLogs: store.workflowLogs };
  const summary = summarizeCommunicationBoard(patients, context);
  const patientSnapshots = options.patientId
    ? patients
        .filter((patient) => patient.id === options.patientId)
        .map((patient) => resolveCommunicationRecency(patient, context))
    : patients.map((patient) => resolveCommunicationRecency(patient, context));

  store.dispatchWebSocketEvent?.({
    type: 'waiting_room_communication_sync',
    payload: {
      patientId: options.patientId || null,
      source: options.source || 'waiting-room-communication-log',
      surfaces: [...WAITING_ROOM_COMMUNICATION_SURFACES],
      summary,
      snapshots: patientSnapshots.map((snapshot) => ({
        patientId: snapshot.patientId,
        lastEventKind: snapshot.lastEventKind,
        recencyLabel: snapshot.recencyLabel,
        tone: snapshot.tone,
        minutesSinceContact: snapshot.minutesSinceContact,
      })),
      generatedAt: new Date().toISOString(),
    },
  });

  return { summary, patientSnapshots };
}
