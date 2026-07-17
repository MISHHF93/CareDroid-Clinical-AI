/**
 * FE emergency board → NeutralBoardDto (PR-2b).
 *
 * Duck-typed inputs — no Zustand, no window, no import from src/store.
 * Callers pass emergencyStore slices (or test fixtures with the same shape).
 */

import type {
  NeutralBoardAlert,
  NeutralBoardDepartment,
  NeutralBoardDiagnostic,
  NeutralBoardDto,
  NeutralBoardEmsUnit,
  NeutralBoardPatient,
  NeutralBoardQueue,
  NeutralBoardRecommendation,
  NeutralBoardRoom,
  NeutralBoardService,
  NeutralBoardStaff,
  NeutralBoardWorkflowStep,
} from '../neutralBoardDto';

/** Minimal patient fields read from emergencyStore.patients */
export type FePatientLike = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  mrn?: string | null;
  state: string;
  priority?: string | number | null;
  chiefComplaint?: string | null;
  assignedStaffId?: string | null;
  assignedPhysicianId?: string | null;
  roomId?: string | null;
  queueId?: string | null;
  arrivalTime?: string | null;
  updatedAt?: string | null;
  dischargedAt?: string | null;
};

export type FeStaffLike = {
  id: string;
  name?: string | null;
  role?: string | null;
  status?: string | null;
  active?: boolean | null;
  activePatients?: number | null;
  assignedPatientIds?: readonly string[] | null;
};

export type FeRoomLike = {
  id: string;
  name?: string | null;
  type?: string | null;
  status: string;
  patientId?: string | null;
  currentPatientId?: string | null;
  updatedAt?: string | null;
};

export type FeQueueLike = {
  id: string;
  label?: string | null;
  name?: string | null;
  type?: string | null;
  count?: number | null;
  patientCount?: number | null;
  breached?: boolean | null;
  oldestWaitMinutes?: number | null;
};

export type FeAlertLike = {
  id: string;
  title?: string | null;
  message?: string | null;
  severity?: string | null;
  type?: string | null;
  source?: string | null;
  patientId?: string | null;
  acknowledged?: boolean | null;
  dismissed?: boolean | null;
  ownerRole?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type FeEmsLike = {
  id: string;
  unitName?: string | null;
  status?: string | null;
  eta?: number | null;
  chiefComplaint?: string | null;
  patientId?: string | null;
  updatedAt?: string | null;
};

export type FeRecommendationLike = {
  id: string;
  action?: string | null;
  title?: string | null;
  rationale?: string | null;
  summary?: string | null;
  patientId?: string | null;
  confidence?: number | null;
  humanReviewRequired?: boolean | null;
  type?: string | null;
  updatedAt?: string | null;
};

export type FeServiceSignalLike = {
  serviceName: string;
  status: string;
  errorRate?: number | null;
  latencyMs?: number | null;
  version?: string | null;
  dependencies?: readonly string[] | null;
};

export type FeDepartmentLike = {
  id: string;
  label: string;
  summary?: string | null;
};

export type FeEmergencyBoardSource = {
  /** Required for multi-tenant cig: ids — default session-local when omitted */
  tenantId?: string | null;
  organizationId?: string | null;
  workspaceId?: string | null;
  generatedAt?: string | null;
  snapshotVersion?: number | null;
  /** Mode B default session; only Mode A cutover should pass durable */
  durability?: 'durable' | 'session' | 'ephemeral';
  patients?: readonly FePatientLike[] | null;
  staff?: readonly FeStaffLike[] | null;
  rooms?: readonly FeRoomLike[] | null;
  queues?: readonly FeQueueLike[] | null;
  alerts?: readonly FeAlertLike[] | null;
  emsArrivals?: readonly FeEmsLike[] | null;
  recommendations?: readonly FeRecommendationLike[] | null;
  serviceSignals?: readonly FeServiceSignalLike[] | null;
  departments?: readonly FeDepartmentLike[] | null;
};

/** Pure state → workflow step map (avoids FE config imports). */
const WORKFLOW_BY_STATE: Readonly<
  Record<string, { id: string; label: string }>
> = Object.freeze({
  Arrival: { id: 'arrival', label: 'Arrival' },
  Registration: { id: 'registration', label: 'Registration & intake' },
  Triage: { id: 'triage', label: 'Triage' },
  Waiting: { id: 'waiting', label: 'Waiting' },
  Assessment: { id: 'assessment', label: 'Assessment' },
  Orders: { id: 'orders', label: 'Orders & diagnostics' },
  Results: { id: 'results', label: 'Results review' },
  Disposition: { id: 'disposition', label: 'Disposition' },
  Admission: { id: 'admission', label: 'Admission' },
  Discharge: { id: 'discharge', label: 'Discharge' },
  Deceased: { id: 'discharge', label: 'Discharge' },
});

function patientLabel(patient: FePatientLike): string {
  const name = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
  return name || patient.mrn || patient.id;
}

function normalizePriority(value: string | number | null | undefined): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return `P${value}`;
  const s = String(value);
  if (/^P[1-5]$/i.test(s)) return s.toUpperCase();
  if (s === 'Immediate') return 'P1';
  if (s === 'Emergent') return 'P2';
  if (s === 'Urgent') return 'P3';
  if (s === 'LessUrgent') return 'P4';
  if (s === 'NonUrgent') return 'P5';
  return s;
}

function mapAlertSeverity(
  severity: string | null | undefined,
): NeutralBoardAlert['severity'] {
  if (severity === 'Critical' || severity === 'critical') return 'critical';
  if (severity === 'Warning' || severity === 'warning') return 'warning';
  if (severity === 'Info' || severity === 'info') return 'info';
  return 'neutral';
}

function mapServiceHealth(
  status: string,
): NeutralBoardService['health'] {
  const s = status.toLowerCase();
  if (s === 'down' || s === 'critical') return 'critical';
  if (s === 'degraded' || s === 'warning') return 'degraded';
  if (s === 'healthy' || s === 'up' || s === 'ok') return 'healthy';
  return 'unknown';
}

function isTerminal(state: string): boolean {
  const s = state.toLowerCase();
  return s === 'discharge' || s === 'discharged' || s === 'deceased';
}

function mapPatients(patients: readonly FePatientLike[]): NeutralBoardPatient[] {
  return patients.map((patient) => {
    const step = WORKFLOW_BY_STATE[patient.state];
    const priority = normalizePriority(patient.priority);
    return {
      id: patient.id,
      label: patientLabel(patient),
      mrn: patient.mrn ?? null,
      state: patient.state,
      priority,
      chiefComplaint: patient.chiefComplaint ?? null,
      assignedStaffId: patient.assignedStaffId ?? null,
      assignedPhysicianId: patient.assignedPhysicianId ?? null,
      roomId: patient.roomId ?? null,
      queueId: patient.queueId ?? null,
      workflowStepId: step?.id ?? null,
      workflowStepLabel: step?.label ?? null,
      arrivedAt: patient.arrivalTime ?? null,
      updatedAt: patient.updatedAt ?? patient.arrivalTime ?? null,
      discharged: isTerminal(patient.state),
      dischargedAt: patient.dischargedAt ?? (isTerminal(patient.state) ? patient.updatedAt : null),
    };
  });
}

function mapStaff(staff: readonly FeStaffLike[]): NeutralBoardStaff[] {
  return staff.map((member) => ({
    id: member.id,
    label: member.name || member.id,
    role: member.role ?? null,
    status: member.status ?? (member.active === false ? 'OffShift' : 'OnShift'),
    activePatientCount:
      member.activePatients ?? member.assignedPatientIds?.length ?? 0,
  }));
}

function mapRooms(rooms: readonly FeRoomLike[]): NeutralBoardRoom[] {
  return rooms.map((room) => ({
    id: room.id,
    label: room.name || room.id,
    type: room.type ?? null,
    status: room.status,
    patientId: room.patientId || room.currentPatientId || null,
    updatedAt: room.updatedAt ?? null,
  }));
}

function mapQueues(queues: readonly FeQueueLike[]): NeutralBoardQueue[] {
  return queues.map((queue) => ({
    id: queue.id,
    label: queue.label || queue.name || queue.id,
    count: queue.count ?? queue.patientCount ?? 0,
    breached: queue.breached ?? false,
    oldestWaitMinutes: queue.oldestWaitMinutes ?? null,
    matchState: queue.type || queue.label || null,
  }));
}

function mapAlerts(alerts: readonly FeAlertLike[]): NeutralBoardAlert[] {
  return alerts.map((alert) => ({
    id: alert.id,
    label: alert.title || 'Alert',
    summary: alert.message ?? null,
    severity: mapAlertSeverity(alert.severity),
    patientId: alert.patientId ?? null,
    acknowledged: alert.acknowledged ?? false,
    dismissed: alert.dismissed ?? false,
    ownerRole: alert.ownerRole ?? null,
    category: alert.type || alert.source || null,
    createdAt: alert.createdAt ?? null,
    updatedAt: alert.updatedAt ?? alert.createdAt ?? null,
  }));
}

function mapEms(units: readonly FeEmsLike[]): NeutralBoardEmsUnit[] {
  return units.map((unit) => ({
    id: unit.id,
    label: unit.unitName || unit.id,
    status: unit.status || 'Unknown',
    etaMinutes: unit.eta ?? null,
    patientId: unit.patientId ?? null,
    chiefComplaint: unit.chiefComplaint ?? null,
    updatedAt: unit.updatedAt ?? null,
  }));
}

function mapRecommendations(
  recs: readonly FeRecommendationLike[],
): NeutralBoardRecommendation[] {
  return recs
    .filter((r) => r.id)
    .map((rec) => ({
      id: rec.id,
      label: rec.action || rec.title || 'Recommendation',
      summary: rec.rationale || rec.summary || null,
      patientId: rec.patientId ?? null,
      confidence: rec.confidence ?? null,
      humanReviewRequired: rec.humanReviewRequired ?? true,
      updatedAt: rec.updatedAt ?? null,
    }));
}

function mapServices(signals: readonly FeServiceSignalLike[]): NeutralBoardService[] {
  return signals.map((service) => ({
    id: service.serviceName,
    label: service.serviceName,
    health: mapServiceHealth(service.status),
    latencyMs: service.latencyMs ?? null,
    errorRate: service.errorRate ?? null,
    version: service.version ?? null,
  }));
}

function mapDepartments(
  departments: readonly FeDepartmentLike[] | null | undefined,
): NeutralBoardDepartment[] {
  if (departments?.length) {
    return departments.map((d) => ({
      id: d.id,
      label: d.label,
      summary: d.summary ?? null,
    }));
  }
  // Minimal default so patients can attach department edges later via adapters that pass ids
  return [{ id: 'ed', label: 'Emergency Department', summary: 'Default ED department' }];
}

function deriveDiagnostics(patients: readonly FePatientLike[]): NeutralBoardDiagnostic[] {
  const out: NeutralBoardDiagnostic[] = [];
  for (const patient of patients) {
    if (patient.state !== 'Orders' && patient.state !== 'Results') continue;
    const pending = patient.state === 'Orders' || patient.state === 'Results';
    out.push({
      id: `diag-${patient.id}`,
      label: `Diagnostics — ${patientLabel(patient)}`,
      patientId: patient.id,
      status: patient.state === 'Results' ? 'pending' : 'ordered',
      summary:
        patient.state === 'Results'
          ? 'Results review in progress.'
          : 'Orders and diagnostics in progress.',
      blocking: pending,
      updatedAt: patient.updatedAt ?? patient.arrivalTime ?? null,
    });
  }
  return out;
}

function deriveWorkflowSteps(
  patients: readonly FePatientLike[],
): NeutralBoardWorkflowStep[] {
  const seen = new Map<string, NeutralBoardWorkflowStep>();
  for (const patient of patients) {
    const step = WORKFLOW_BY_STATE[patient.state];
    if (!step || seen.has(step.id)) continue;
    seen.set(step.id, {
      id: step.id,
      label: step.label,
      summary: null,
      route: null,
    });
  }
  return [...seen.values()];
}

/**
 * Map FE emergency board slices into a neutral DTO for projectFromNeutralDto.
 */
export function adaptFeEmergencyBoardToNeutralDto(
  source: FeEmergencyBoardSource,
): NeutralBoardDto {
  const patients = source.patients ?? [];
  const generatedAt = source.generatedAt || new Date().toISOString();
  const tenantId = (source.tenantId && String(source.tenantId).trim()) || 'session-local';

  return {
    tenantId,
    organizationId: source.organizationId ?? undefined,
    workspaceId: source.workspaceId ?? undefined,
    generatedAt,
    snapshotVersion: source.snapshotVersion ?? 1,
    durability: source.durability ?? 'session',
    patients: mapPatients(patients),
    staff: mapStaff(source.staff ?? []),
    rooms: mapRooms(source.rooms ?? []),
    queues: mapQueues(source.queues ?? []),
    alerts: mapAlerts(source.alerts ?? []),
    emsUnits: mapEms(source.emsArrivals ?? []),
    recommendations: mapRecommendations(source.recommendations ?? []),
    services: mapServices(source.serviceSignals ?? []),
    departments: mapDepartments(source.departments),
    diagnostics: deriveDiagnostics(patients),
    workflowSteps: deriveWorkflowSteps(patients),
  };
}
