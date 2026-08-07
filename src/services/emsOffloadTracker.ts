import {
  type Alert,
  type EMSArrival,
  type EMSArrivalStatus,
  type Patient,
  type Staff,
} from '../types/emergency';
import {
  formatAmbulanceHandoffDestination,
  resolveAmbulanceHandoffChecklist,
} from './ambulanceHandoffChecklist';
import {
  etaTone,
  formatEta,
  isInboundEmsArrival,
  minutesRemaining,
} from '../utils/emsArrivalDisplay';

export type EmsOffloadTone = 'stable' | 'watch' | 'critical';
export type EmsOffloadPhase = 'inbound' | 'on-scene' | 'handoff' | 'complete';

export type EmsOffloadTrackerRow = {
  arrivalId: string;
  patientId?: string;
  unitLabel: string;
  complaint: string;
  phase: EmsOffloadPhase;
  status: EMSArrivalStatus;
  dispatchEtaMinutes: number | null;
  dispatchEtaLabel: string | null;
  ambulanceArrivalTime: string | null;
  ambulanceArrivalLabel: string;
  triageHandoffStart: string | null;
  triageHandoffStartLabel: string;
  handoffCompleteTime: string | null;
  handoffCompleteLabel: string;
  offloadDelayMinutes: number | null;
  offloadDelayLabel: string;
  assignedReceivingArea: string | null;
  handoffOwner: string | null;
  tone: EmsOffloadTone;
  isDelayed: boolean;
};

export type EmsOffloadTrackerSummary = {
  activeCount: number;
  inboundCount: number;
  awaitingOffloadCount: number;
  averageOffloadMinutes: number;
  longestOffloadMinutes: number;
  delayedCount: number;
  offloadTargetMinutes: number;
  rows: EmsOffloadTrackerRow[];
};

type RoomLike = { id: string; name?: string; type?: string };

function activeArrivals(emsArrivals: EMSArrival[] = []): EMSArrival[] {
  return emsArrivals.filter((arrival) => !['Complete', 'Cancelled'].includes(arrival.status));
}

function formatClock(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '—';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function minutesBetween(start?: string | null, end?: string | null, now = Date.now()): number | null {
  if (!start) return null;
  const startMs = new Date(start).getTime();
  const endMs = end ? new Date(end).getTime() : now;
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return null;
  return Math.max(0, Math.round((endMs - startMs) / 60000));
}

function roomLabel(rooms: RoomLike[], roomId?: string | null): string | null {
  if (!roomId) return null;
  return rooms.find((room) => room.id === roomId)?.name || roomId;
}

function staffLabel(staff: Staff[], staffId?: string | null, fallback?: string | null): string | null {
  if (fallback?.trim()) return fallback.trim();
  if (!staffId) return null;
  const member = staff.find((entry) => entry.id === staffId);
  return member?.displayName || member?.name || staffId;
}

function deriveTriageHandoffStart(
  arrival: EMSArrival,
  patient?: Patient | null,
): string | null {
  if (arrival.handoffStartedAt) return arrival.handoffStartedAt;
  if (patient?.firstContactAt) return patient.firstContactAt;
  if (patient?.triageTime) return patient.triageTime;
  if (['Handoff', 'Complete'].includes(arrival.status) && arrival.arrivedAt) {
    return arrival.arrivedAt;
  }
  const convertedEvent = patient?.timeline?.find(
    (event) =>
      event.type === 'QueueMovement' ||
      event.summary?.toLowerCase().includes('ems') ||
      event.metadata?.arrivalId === arrival.id,
  );
  return convertedEvent?.timestamp || null;
}

function deriveReceivingArea(
  arrival: EMSArrival,
  patient: Patient | undefined,
  rooms: RoomLike[],
): string | null {
  const checklist = resolveAmbulanceHandoffChecklist(arrival, { patient, rooms: rooms as unknown as any[] });
  if (checklist.patientDestination !== 'pending') {
    return formatAmbulanceHandoffDestination(checklist);
  }
  return (
    roomLabel(rooms, arrival.preparedRoomId) ||
    arrival.criticalChecklist?.assignedRoomName ||
    roomLabel(rooms, patient?.roomId) ||
    patient?.location ||
    null
  );
}

function deriveHandoffOwner(
  arrival: EMSArrival,
  patient: Patient | undefined,
  staff: Staff[],
): string | null {
  return (
    staffLabel(staff, patient?.assignedStaffId, patient?.assignedTo) ||
    arrival.criticalChecklist?.completedByStaffName ||
    null
  );
}

function resolvePhase(arrival: EMSArrival, now: number): EmsOffloadPhase {
  if (arrival.status === 'Complete') return 'complete';
  if (arrival.status === 'Handoff' || arrival.patientId) return 'handoff';
  if (arrival.status === 'Arrived' || arrival.arrivedAt) return 'on-scene';
  if (isInboundEmsArrival(arrival, now)) return 'inbound';
  return 'on-scene';
}

function resolveOffloadTone(
  offloadMinutes: number | null,
  targetMinutes: number,
  phase: EmsOffloadPhase,
  etaMinutes: number | null,
): EmsOffloadTone {
  if (offloadMinutes !== null && offloadMinutes >= targetMinutes) return 'critical';
  if (offloadMinutes !== null && offloadMinutes >= Math.max(5, targetMinutes - 5)) return 'watch';
  if (phase === 'inbound' && etaMinutes !== null && etaMinutes <= 5) return 'watch';
  if (phase === 'handoff' || phase === 'on-scene') return 'watch';
  return 'stable';
}

export function buildEmsOffloadTrackerRow(
  arrival: EMSArrival,
  options: {
    patients?: Patient[];
    staff?: Staff[];
    rooms?: RoomLike[];
    now?: number;
    offloadTargetMinutes?: number;
  } = {},
): EmsOffloadTrackerRow {
  const now = options.now ?? Date.now();
  const patients = options.patients || [];
  const staff = options.staff || [];
  const rooms = options.rooms || [];
  const patient = arrival.patientId
    ? patients.find((entry) => entry.id === arrival.patientId)
    : undefined;
  const phase = resolvePhase(arrival, now);
  const dispatchEtaMinutes =
    phase === 'inbound' ? minutesRemaining(arrival, now) : arrival.eta ?? null;
  const dispatchEtaLabel =
    phase === 'inbound'
      ? formatEta(dispatchEtaMinutes ?? 0, arrival.status)
      : arrival.arrivedAt
        ? 'On scene'
        : null;
  const ambulanceArrivalTime = arrival.arrivedAt || null;
  const triageHandoffStart = deriveTriageHandoffStart(arrival, patient);
  const handoffCompleteTime = arrival.handoffCompletedAt || null;
  const offloadDelayMinutes = minutesBetween(
    ambulanceArrivalTime,
    handoffCompleteTime,
    now,
  );
  const targetMinutes = options.offloadTargetMinutes ?? 15;
  const tone = resolveOffloadTone(offloadDelayMinutes, targetMinutes, phase, dispatchEtaMinutes);

  return {
    arrivalId: arrival.id,
    patientId: arrival.patientId,
    unitLabel: arrival.unitName || arrival.unitId,
    complaint: arrival.chiefComplaint || arrival.prearrivalComplaint || 'Unspecified complaint',
    phase,
    status: arrival.status,
    dispatchEtaMinutes,
    dispatchEtaLabel,
    ambulanceArrivalTime,
    ambulanceArrivalLabel: formatClock(ambulanceArrivalTime),
    triageHandoffStart,
    triageHandoffStartLabel: formatClock(triageHandoffStart),
    handoffCompleteTime,
    handoffCompleteLabel: formatClock(handoffCompleteTime),
    offloadDelayMinutes,
    offloadDelayLabel:
      offloadDelayMinutes !== null ? `${offloadDelayMinutes}m` : phase === 'inbound' ? '—' : 'Pending',
    assignedReceivingArea: deriveReceivingArea(arrival, patient, rooms),
    handoffOwner: deriveHandoffOwner(arrival, patient, staff),
    tone,
    isDelayed: offloadDelayMinutes !== null && offloadDelayMinutes >= targetMinutes,
  };
}

export function buildEmsOffloadTrackerSummary(
  emsArrivals: EMSArrival[] = [],
  options: {
    patients?: Patient[];
    staff?: Staff[];
    rooms?: RoomLike[];
    now?: number;
    offloadTargetMinutes?: number;
  } = {},
): EmsOffloadTrackerSummary {
  const now = options.now ?? Date.now();
  const targetMinutes = options.offloadTargetMinutes ?? 15;
  const rows = activeArrivals(emsArrivals)
    .map((arrival) => buildEmsOffloadTrackerRow(arrival, { ...options, now, offloadTargetMinutes: targetMinutes }))
    .sort((left, right) => {
      const leftDelay = left.offloadDelayMinutes ?? -1;
      const rightDelay = right.offloadDelayMinutes ?? -1;
      if (leftDelay !== rightDelay) return rightDelay - leftDelay;
      const leftEta = left.dispatchEtaMinutes ?? Number.POSITIVE_INFINITY;
      const rightEta = right.dispatchEtaMinutes ?? Number.POSITIVE_INFINITY;
      return leftEta - rightEta;
    });

  const offloadSamples = rows
    .map((row) => row.offloadDelayMinutes)
    .filter((value): value is number => value !== null);
  const awaitingOffloadCount = rows.filter(
    (row) => row.phase === 'on-scene' || row.phase === 'handoff',
  ).length;

  return {
    activeCount: rows.length,
    inboundCount: rows.filter((row) => row.phase === 'inbound').length,
    awaitingOffloadCount,
    averageOffloadMinutes: offloadSamples.length
      ? Math.round(offloadSamples.reduce((sum, value) => sum + value, 0) / offloadSamples.length)
      : 0,
    longestOffloadMinutes: offloadSamples.length ? Math.max(...offloadSamples) : 0,
    delayedCount: rows.filter((row) => row.isDelayed).length,
    offloadTargetMinutes: targetMinutes,
    rows,
  };
}

export function buildEmsOffloadAlerts(
  summary: EmsOffloadTrackerSummary,
  now = new Date(),
): Alert[] {
  return summary.rows
    .filter((row) => row.phase !== 'complete')
    .filter((row) => row.isDelayed || row.phase === 'handoff' || row.phase === 'on-scene')
    .slice(0, 8)
    .map((row) => ({
      id: `ems-offload-${row.arrivalId}`,
      type: 'EMS',
      severity: row.isDelayed ? 'Critical' : row.phase === 'handoff' ? 'Warning' : 'Info',
      title: row.isDelayed
        ? `EMS offload delayed — ${row.unitLabel}`
        : row.phase === 'handoff'
          ? `EMS handoff in progress — ${row.unitLabel}`
          : `EMS awaiting offload — ${row.unitLabel}`,
      message: [
        row.complaint,
        row.offloadDelayMinutes !== null ? `Offload ${row.offloadDelayMinutes}m` : null,
        row.dispatchEtaLabel ? `ETA ${row.dispatchEtaLabel}` : null,
        row.assignedReceivingArea ? `Bay ${row.assignedReceivingArea}` : null,
        row.handoffOwner ? `Owner ${row.handoffOwner}` : null,
      ]
        .filter(Boolean)
        .join(' · '),
      patientId: row.patientId,
      createdAt: row.ambulanceArrivalTime || now.toISOString(),
      dismissed: false,
      source: 'ems-offload-tracker',
      actionType: 'ems',
      metadata: {
        arrivalId: row.arrivalId,
        offloadDelayMinutes: row.offloadDelayMinutes,
        phase: row.phase,
        assignedReceivingArea: row.assignedReceivingArea,
        handoffOwner: row.handoffOwner,
      },
    }));
}

export function emsOffloadMetricTone(summary: EmsOffloadTrackerSummary): EmsOffloadTone {
  if (summary.delayedCount > 0 || summary.longestOffloadMinutes >= summary.offloadTargetMinutes) {
    return 'critical';
  }
  if (summary.awaitingOffloadCount > 0 || summary.averageOffloadMinutes >= 10) return 'watch';
  return 'stable';
}

export function formatEmsOffloadOperationalValue(summary: EmsOffloadTrackerSummary): string {
  if (summary.awaitingOffloadCount > 0 && summary.averageOffloadMinutes > 0) {
    return `${summary.averageOffloadMinutes}m avg`;
  }
  if (summary.inboundCount > 0) return `${summary.inboundCount} inbound`;
  return String(summary.activeCount);
}

export const EMS_OFFLOAD_TRACKER_SURFACES = Object.freeze([
  'ems-screen',
  'whiteboard',
  'notification-center',
  'operational-snapshot',
  'reception-operational-strip',
]);

export type EmsOffloadAttentionSnapshot = EmsOffloadTrackerSummary & {
  previewRows: EmsOffloadTrackerRow[];
};

/** Compact whiteboard / strip snapshot from canonical tracker rows. */
export function buildEmsOffloadAttentionSnapshot(
  emsArrivals: EMSArrival[] = [],
  options: Parameters<typeof buildEmsOffloadTrackerSummary>[1] = {},
): EmsOffloadAttentionSnapshot {
  const summary = buildEmsOffloadTrackerSummary(emsArrivals, options);
  return {
    ...summary,
    previewRows: summary.rows.slice(0, 4),
  };
}

export function normalizeEmsArrivalOffloadPatch(
  arrival: EMSArrival,
  patch: Partial<EMSArrival>,
  now = new Date().toISOString(),
): Partial<EMSArrival> {
  const nextStatus = patch.status ?? arrival.status;
  const normalized: Partial<EMSArrival> = { ...patch };

  if ((nextStatus === 'Arrived' || nextStatus === 'Handoff') && !arrival.arrivedAt && !patch.arrivedAt) {
    normalized.arrivedAt = now;
  }
  if (
    (nextStatus === 'Handoff' || patch.patientId) &&
    !arrival.handoffStartedAt &&
    !patch.handoffStartedAt
  ) {
    normalized.handoffStartedAt = normalized.arrivedAt || arrival.arrivedAt || now;
  }
  if (nextStatus === 'Complete' && !patch.handoffCompletedAt && !arrival.handoffCompletedAt) {
    normalized.handoffCompletedAt = now;
  }

  return normalized;
}

/**
 * The backend's EMSIntakeService.getEMSIntake() synthesizes EMS arrivals
 * fresh from patient records on every request -- it never tracks a real
 * arrived/handoff timestamp or status transition server-side (its own
 * comment: "Local whiteboard status remains the frontend source of truth
 * for unit tracking"). Every arrival it returns is status: 'Inbound' with
 * no arrivedAt/handoffStartedAt/handoffCompletedAt. Before this fix,
 * emergencyStore's hydrateFromApi did `emsArrivals: payload.emsArrivals ||
 * state.emsArrivals` -- a blind full-array replace, run on every real-time
 * whiteboard-update WebSocket push (emergency_snapshot/whiteboard_updated/
 * etc, which fire on ANY user's action across the app, not just a manual
 * refresh). That silently reset every EMS arrival's locally-tracked
 * "Arrived"/"Handoff" status and its offload timestamps back to the
 * backend's timestamp-free 'Inbound' baseline -- effectively breaking the
 * offload-timer feature (buildEmsOffloadTrackerSummary/normalizeEmsArrival
 * OffloadPatch above) under real-time multi-user load, since the clock
 * driving it kept getting wiped out from under it. Merges the backend's
 * fresh field values (chief complaint, vitals, eta, etc.) while preserving
 * locally-tracked workflow-progression fields the backend never reports;
 * an arrival the backend no longer lists (converted to a real patient,
 * cancelled) correctly drops out rather than being zombie-preserved.
 */
export function mergeEmsArrivalHydration(
  payloadArrivals: EMSArrival[],
  localArrivals: EMSArrival[],
): EMSArrival[] {
  const localById = new Map(localArrivals.map((arrival) => [arrival.id, arrival]));
  return payloadArrivals.map((arrival) => {
    const local = localById.get(arrival.id);
    if (!local) return arrival;
    return {
      ...arrival,
      status: local.status ?? arrival.status,
      patientId: local.patientId ?? arrival.patientId,
      arrivedAt: local.arrivedAt ?? arrival.arrivedAt,
      handoffStartedAt: local.handoffStartedAt ?? arrival.handoffStartedAt,
      handoffCompletedAt: local.handoffCompletedAt ?? arrival.handoffCompletedAt,
      preparedRoomId: local.preparedRoomId ?? arrival.preparedRoomId,
      criticalChecklist: local.criticalChecklist ?? arrival.criticalChecklist,
      handoffSummary: local.handoffSummary ?? arrival.handoffSummary,
      ambulanceHandoffChecklist: local.ambulanceHandoffChecklist ?? arrival.ambulanceHandoffChecklist,
      handoffClose: local.handoffClose ?? arrival.handoffClose,
    };
  });
}

export type EmsOffloadTrackerStore = {
  emsArrivals: EMSArrival[];
  patients?: Patient[];
  staff?: Staff[];
  rooms?: RoomLike[];
  emergencySettings?: { thresholds?: { emsOffloadTargetMinutes?: number; emsOffloadTargetMin?: number } };
  dispatchWebSocketEvent?: (event: {
    type: string;
    payload: Record<string, unknown>;
  }) => void;
};

/** Broadcast tracker snapshot to connected operational surfaces. */
export function syncEmsOffloadOperationalSurfaces(
  store: EmsOffloadTrackerStore,
  options: { arrivalId?: string; source?: string } = {},
): EmsOffloadAttentionSnapshot {
  const offloadTargetMinutes =
    Number(
      store.emergencySettings?.thresholds?.emsOffloadTargetMinutes ??
        store.emergencySettings?.thresholds?.emsOffloadTargetMin ??
        15,
    ) || 15;
  const snapshot = buildEmsOffloadAttentionSnapshot(store.emsArrivals, {
    patients: store.patients,
    staff: store.staff,
    rooms: store.rooms,
    offloadTargetMinutes,
  });

  store.dispatchWebSocketEvent?.({
    type: 'ems_offload_sync',
    payload: {
      arrivalId: options.arrivalId || null,
      source: options.source || 'ems-offload-tracker',
      surfaces: [...EMS_OFFLOAD_TRACKER_SURFACES],
      summary: {
        activeCount: snapshot.activeCount,
        inboundCount: snapshot.inboundCount,
        awaitingOffloadCount: snapshot.awaitingOffloadCount,
        averageOffloadMinutes: snapshot.averageOffloadMinutes,
        longestOffloadMinutes: snapshot.longestOffloadMinutes,
        delayedCount: snapshot.delayedCount,
        offloadTargetMinutes: snapshot.offloadTargetMinutes,
      },
      rows: snapshot.rows.map((row) => ({
        arrivalId: row.arrivalId,
        patientId: row.patientId,
        unitLabel: row.unitLabel,
        phase: row.phase,
        dispatchEtaLabel: row.dispatchEtaLabel,
        ambulanceArrivalLabel: row.ambulanceArrivalLabel,
        triageHandoffStartLabel: row.triageHandoffStartLabel,
        handoffCompleteLabel: row.handoffCompleteLabel,
        offloadDelayLabel: row.offloadDelayLabel,
        assignedReceivingArea: row.assignedReceivingArea,
        handoffOwner: row.handoffOwner,
        tone: row.tone,
        isDelayed: row.isDelayed,
      })),
      generatedAt: new Date().toISOString(),
    },
  });

  return snapshot;
}

/** Re-export for strip metrics that need ETA tone from tracker rows. */
export { etaTone, formatEta, minutesRemaining };
