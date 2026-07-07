import { summarizeEmsAwareness } from '../components/whiteboard/emsAwarenessModel';
import type { EMSArrival, Patient, Staff } from '../types/emergency';

export type EmsOffloadVisibilityMetricId =
  | 'ems-inbound'
  | 'offload-delays'
  | 'offload-duration'
  | 'handoff-pending';

export type EmsOffloadVisibilitySnapshot = {
  inboundCount: number;
  offloadDelaysCount: number;
  averageOffloadMinutes: number;
  longestOffloadMinutes: number;
  offloadDurationLabel: string;
  handoffPendingCount: number;
  offloadTargetMinutes: number;
};

export type EmsOffloadVisibilityStripMetric = {
  id: string;
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'neutral' | 'info' | 'watch' | 'warning' | 'critical';
};

export type PublicEmsCrowdingImpact = {
  active: boolean;
  label: string;
  detail: string;
  tone: 'stable' | 'info' | 'watch' | 'warning' | 'critical';
};

const METRIC_LABELS: Readonly<Record<EmsOffloadVisibilityMetricId, string>> = Object.freeze({
  'ems-inbound': 'EMS inbound',
  'offload-delays': 'Offload delays',
  'offload-duration': 'Offload duration',
  'handoff-pending': 'Handoff pending',
});

export const EMS_OFFLOAD_VISIBILITY_STAFF_SURFACES = Object.freeze([
  'whiteboard',
  'charge-nurse',
  'ems',
  'triage',
  'reception',
  'command-center',
  'read-only-whiteboard',
]);

function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes) || minutes < 1) return '—';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

export function buildEmsOffloadVisibilitySnapshot(
  emsArrivals: EMSArrival[] = [],
  {
    patients = [] as any[],
    staff = [] as any[],
    rooms = [] as any[],
    now = new Date(),
    offloadTargetMinutes = 15,
  }: {
    patients?: Patient[];
    staff?: Staff[];
    rooms?: Array<{ id: string; name?: string }>;
    now?: Date;
    offloadTargetMinutes?: number;
  } = {},
): EmsOffloadVisibilitySnapshot {
  const awareness = summarizeEmsAwareness(emsArrivals, now.getTime(), {
    patients,
    staff,
    rooms,
    offloadTargetMinutes,
  });

  const averageOffloadMinutes = awareness.offloadMinutes || 0;
  const longestOffloadMinutes = awareness.longestOffloadMinutes || 0;
  const offloadDurationLabel =
    averageOffloadMinutes > 0
      ? formatDuration(averageOffloadMinutes)
      : longestOffloadMinutes > 0
        ? formatDuration(longestOffloadMinutes)
        : '—';

  return {
    inboundCount: awareness.inboundCount,
    offloadDelaysCount: awareness.delayedOffloadCount,
    averageOffloadMinutes,
    longestOffloadMinutes,
    offloadDurationLabel,
    handoffPendingCount: awareness.awaitingHandoff,
    offloadTargetMinutes,
  };
}

function metricTone(
  id: EmsOffloadVisibilityMetricId,
  snapshot: EmsOffloadVisibilitySnapshot,
): EmsOffloadVisibilityStripMetric['tone'] {
  switch (id) {
    case 'ems-inbound':
      return snapshot.inboundCount >= 3
        ? 'warning'
        : snapshot.inboundCount
          ? 'info'
          : 'neutral';
    case 'offload-delays':
      return snapshot.offloadDelaysCount >= 2
        ? 'critical'
        : snapshot.offloadDelaysCount
          ? 'warning'
          : 'neutral';
    case 'offload-duration':
      if (snapshot.longestOffloadMinutes >= snapshot.offloadTargetMinutes) return 'critical';
      if (
        snapshot.averageOffloadMinutes >= Math.max(5, snapshot.offloadTargetMinutes - 5) ||
        snapshot.longestOffloadMinutes >= Math.max(5, snapshot.offloadTargetMinutes - 5)
      ) {
        return 'warning';
      }
      return snapshot.handoffPendingCount ? 'watch' : 'neutral';
    case 'handoff-pending':
      return snapshot.handoffPendingCount >= 2
        ? 'warning'
        : snapshot.handoffPendingCount
          ? 'watch'
          : 'neutral';
    default:
      return 'neutral';
  }
}

function metricValue(
  id: EmsOffloadVisibilityMetricId,
  snapshot: EmsOffloadVisibilitySnapshot,
): string | number {
  switch (id) {
    case 'ems-inbound':
      return snapshot.inboundCount;
    case 'offload-delays':
      return snapshot.offloadDelaysCount;
    case 'offload-duration':
      return snapshot.offloadDurationLabel;
    case 'handoff-pending':
      return snapshot.handoffPendingCount;
    default:
      return '—';
  }
}

function metricHint(
  id: EmsOffloadVisibilityMetricId,
  snapshot: EmsOffloadVisibilitySnapshot,
): string {
  switch (id) {
    case 'ems-inbound':
      return 'Ambulance units en route to the department';
    case 'offload-delays':
      return `Units past ${snapshot.offloadTargetMinutes}m offload target`;
    case 'offload-duration':
      return snapshot.longestOffloadMinutes
        ? `Average ${formatDuration(snapshot.averageOffloadMinutes)} · longest ${formatDuration(snapshot.longestOffloadMinutes)}`
        : 'Mean scene-to-handoff offload time';
    case 'handoff-pending':
      return 'Crews on scene awaiting triage handoff completion';
    default:
      return '';
  }
}

export const EMS_OFFLOAD_VISIBILITY_STRIP_ID_ALIASES: Readonly<
  Record<EmsOffloadVisibilityMetricId, Record<string, string>>
> = Object.freeze({
  'ems-inbound': Object.freeze({
    whiteboard: 'ems-inbound',
    chargeNurse: 'ems-inbound',
    ems: 'inbound',
    triage: 'ems-inbound',
    reception: 'ems-inbound',
    commandCenter: 'ems-inbound',
    readOnlyWhiteboard: 'ems-inbound',
  }),
  'offload-delays': Object.freeze({
    whiteboard: 'offload-delays',
    chargeNurse: 'offload-delays',
    ems: 'offload',
    triage: 'offload-delays',
    reception: 'offload-delays',
    commandCenter: 'ems-offload-delays',
    readOnlyWhiteboard: 'offload-delays',
  }),
  'offload-duration': Object.freeze({
    whiteboard: 'offload-duration',
    chargeNurse: 'offload-duration',
    ems: 'offload-duration',
    triage: 'offload-duration',
    reception: 'offload-duration',
    commandCenter: 'offload-duration',
    readOnlyWhiteboard: 'offload-duration',
  }),
  'handoff-pending': Object.freeze({
    whiteboard: 'handoff-pending',
    chargeNurse: 'handoff-pending',
    ems: 'receiving',
    triage: 'ems-handoffs-pending',
    reception: 'handoff-pending',
    commandCenter: 'handoff-pending',
    readOnlyWhiteboard: 'handoff-pending',
  }),
});

export function selectEmsOffloadVisibilityMetrics(
  emsArrivals: EMSArrival[] = [],
  {
    metricIds = null,
    patients = [] as any[],
    staff = [] as any[],
    rooms = [] as any[],
    now = new Date(),
    offloadTargetMinutes = 15,
    surface = 'whiteboard',
  }: {
    metricIds?: readonly EmsOffloadVisibilityMetricId[] | null;
    patients?: Patient[];
    staff?: Staff[];
    rooms?: Array<{ id: string; name?: string }>;
    now?: Date;
    offloadTargetMinutes?: number;
    surface?:
      | 'whiteboard'
      | 'chargeNurse'
      | 'ems'
      | 'triage'
      | 'reception'
      | 'commandCenter'
      | 'readOnlyWhiteboard';
  } = {},
): EmsOffloadVisibilityStripMetric[] {
  const snapshot = buildEmsOffloadVisibilitySnapshot(emsArrivals, {
    patients,
    staff,
    rooms,
    now,
    offloadTargetMinutes,
  });

  const ids: EmsOffloadVisibilityMetricId[] = metricIds?.length
    ? [...metricIds]
    : ['ems-inbound', 'offload-delays', 'offload-duration', 'handoff-pending'];

  const aliasMap = EMS_OFFLOAD_VISIBILITY_STRIP_ID_ALIASES;
  const surfaceKey =
    surface === 'whiteboard' ||
    surface === 'chargeNurse' ||
    surface === 'ems' ||
    surface === 'triage' ||
    surface === 'reception' ||
    surface === 'commandCenter' ||
    surface === 'readOnlyWhiteboard'
      ? surface
      : 'whiteboard';

  return ids.map((canonicalId) => ({
    id: aliasMap[canonicalId][surfaceKey],
    label: METRIC_LABELS[canonicalId],
    value: metricValue(canonicalId, snapshot),
    hint: metricHint(canonicalId, snapshot),
    tone: metricTone(canonicalId, snapshot),
  }));
}

export function hasEmsOffloadVisibilityActivity(
  snapshot: EmsOffloadVisibilitySnapshot,
): boolean {
  return Boolean(
    snapshot.inboundCount ||
      snapshot.offloadDelaysCount ||
      snapshot.handoffPendingCount ||
      snapshot.averageOffloadMinutes ||
      snapshot.longestOffloadMinutes,
  );
}

/** PHI-safe aggregate crowding message for public waiting displays. */
export function buildPublicEmsCrowdingImpact(
  emsArrivals: EMSArrival[] = [],
  {
    enabled = true,
    patients = [] as any[],
    now = new Date(),
    offloadTargetMinutes = 15,
  }: {
    enabled?: boolean;
    patients?: Patient[];
    now?: Date;
    offloadTargetMinutes?: number;
  } = {},
): PublicEmsCrowdingImpact {
  if (!enabled) {
    return {
      active: false,
      label: 'Ambulance activity',
      detail: 'Ambulance crowding impact messaging is disabled for this display.',
      tone: 'stable',
    };
  }

  const snapshot = buildEmsOffloadVisibilitySnapshot(emsArrivals, {
    patients,
    now,
    offloadTargetMinutes,
  });

  if (!hasEmsOffloadVisibilityActivity(snapshot)) {
    return {
      active: false,
      label: 'Ambulance activity',
      detail: 'No elevated ambulance crowding impact at this time.',
      tone: 'stable',
    };
  }

  if (snapshot.offloadDelaysCount > 0) {
    return {
      active: true,
      label: 'Higher crowding',
      detail:
        'Ambulance offload delays may temporarily increase department crowding and wait times.',
      tone: snapshot.offloadDelaysCount >= 2 ? 'critical' : 'warning',
    };
  }

  if (snapshot.handoffPendingCount > 0 || snapshot.inboundCount > 0) {
    return {
      active: true,
      label: 'Elevated activity',
      detail:
        'Additional ambulance arrivals may extend overall wait times. Patients are seen by urgency.',
      tone: snapshot.inboundCount >= 2 ? 'warning' : 'watch',
    };
  }

  return {
    active: true,
    label: 'Routine activity',
    detail: 'Ambulance activity is present. Wait times may vary.',
    tone: 'info',
  };
}
