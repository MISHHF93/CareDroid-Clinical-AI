/**
 * Hallway / nurse-station monitor privacy — governs PHI exposure on wall displays.
 */
import type { CareDroidScreenMode } from './careDroidScreenModes';
import { shouldRedactCentralNodeForDisplayPrivacy } from './emergencyDisplayPrivacyPolicy';
import type {
  DepartmentStatusMetric,
  DepartmentStatusSnapshot,
} from '../components/whiteboard/departmentStatusScreenModel';

export const WALL_DISPLAY_MONITOR_PRIVACY = Object.freeze({
  operational: 'operational',
  restricted: 'restricted',
  minimal: 'minimal',
} as const);

export type WallDisplayMonitorPrivacy =
  (typeof WALL_DISPLAY_MONITOR_PRIVACY)[keyof typeof WALL_DISPLAY_MONITOR_PRIVACY];

export const WALL_DISPLAY_MONITOR_PRIVACY_OPTIONS: ReadonlyArray<{
  id: WallDisplayMonitorPrivacy;
  label: string;
  description: string;
}> = Object.freeze([
  {
    id: WALL_DISPLAY_MONITOR_PRIVACY.operational,
    label: 'Operational',
    description: 'Aggregate ED metrics with operational detail for staff hallway monitors.',
  },
  {
    id: WALL_DISPLAY_MONITOR_PRIVACY.restricted,
    label: 'Restricted',
    description: 'Aggregate counts only — hides timing and arrival detail that could imply patient identity.',
  },
  {
    id: WALL_DISPLAY_MONITOR_PRIVACY.minimal,
    label: 'Minimal',
    description: 'Highest privacy — bucketed wait ranges and generic labels for shared nurse stations.',
  },
]);

const METRIC_DETAIL_COPY: Record<WallDisplayMonitorPrivacy, string> = {
  operational: '',
  restricted: 'Aggregate operational count — no patient identifiers',
  minimal: 'Aggregate count only',
};

function bucketLongestWait(value: string | number): string {
  if (typeof value !== 'string') return '—';
  const match = value.match(/(\d+)h(?:\s+(\d+)m)?|(\d+)m/);
  if (!match) return value;
  const hours = match[1] ? Number(match[1]) : 0;
  const minutes = match[2]
    ? Number(match[2])
    : match[3]
      ? Number(match[3])
      : 0;
  const totalMinutes = hours * 60 + minutes;
  if (totalMinutes < 30) return 'Under 30 min';
  if (totalMinutes < 60) return '30–60 min';
  if (totalMinutes < 120) return '1–2 hr';
  return 'Over 2 hr';
}

function redactMetricForPrivacy(
  metric: DepartmentStatusMetric,
  privacy: WallDisplayMonitorPrivacy,
): DepartmentStatusMetric {
  if (privacy === WALL_DISPLAY_MONITOR_PRIVACY.operational) return metric;

  const detail = METRIC_DETAIL_COPY[privacy] || METRIC_DETAIL_COPY.restricted;
  let value = metric.value;

  if (privacy === WALL_DISPLAY_MONITOR_PRIVACY.minimal) {
    if (metric.id === 'longest-wait') {
      value = bucketLongestWait(metric.value);
    }
    if (metric.id === 'ems-inbound' && typeof metric.value === 'number') {
      value = metric.value > 0 ? `${metric.value} inbound` : metric.value;
    }
    if (metric.id === 'capacity-status' && typeof metric.value === 'string') {
      const band = metric.value.split('·').pop()?.trim();
      value = band || '—';
    }
  }

  if (privacy === WALL_DISPLAY_MONITOR_PRIVACY.restricted) {
    if (metric.id === 'ems-inbound') {
      return { ...metric, value, detail: 'Ambulance units en route — no unit identifiers' };
    }
    if (metric.id === 'offload-delays') {
      return { ...metric, value, detail: 'Units awaiting EMS handoff completion' };
    }
    if (metric.id === 'longest-wait') {
      return { ...metric, value, detail: 'Longest active wait — aggregate duration only' };
    }
  }

  return { ...metric, value, detail };
}

export function normalizeWallDisplayMonitorPrivacy(
  value: unknown,
  fallback: WallDisplayMonitorPrivacy = WALL_DISPLAY_MONITOR_PRIVACY.operational,
): WallDisplayMonitorPrivacy {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === WALL_DISPLAY_MONITOR_PRIVACY.restricted) {
    return WALL_DISPLAY_MONITOR_PRIVACY.restricted;
  }
  if (normalized === WALL_DISPLAY_MONITOR_PRIVACY.minimal) {
    return WALL_DISPLAY_MONITOR_PRIVACY.minimal;
  }
  if (normalized === WALL_DISPLAY_MONITOR_PRIVACY.operational) {
    return WALL_DISPLAY_MONITOR_PRIVACY.operational;
  }
  return fallback;
}

export function shouldRedactCentralNodeForMonitorPrivacy(
  screenMode: CareDroidScreenMode,
  monitorPrivacy?: WallDisplayMonitorPrivacy | string | null,
  readOnlyDisplayMode?: boolean,
): boolean {
  return shouldRedactCentralNodeForDisplayPrivacy(
    screenMode,
    monitorPrivacy,
    readOnlyDisplayMode,
  );
}

export function buildReadOnlyWhiteboardSummaryLine(
  metrics: DepartmentStatusMetric[],
  privacy: WallDisplayMonitorPrivacy,
): string {
  const waiting = metrics.find((metric) => metric.id === 'waiting-count')?.value ?? 0;
  const triage = metrics.find((metric) => metric.id === 'triage-pending')?.value ?? 0;
  const ems = metrics.find((metric) => metric.id === 'ems-inbound')?.value ?? 0;
  const capacity = metrics.find((metric) => metric.id === 'capacity-status')?.value ?? '—';

  if (privacy === WALL_DISPLAY_MONITOR_PRIVACY.minimal) {
    return `${waiting} waiting · ${triage} triage pending · ${capacity} capacity`;
  }

  return [
    `${waiting} waiting`,
    `${triage} triage pending`,
    Number(ems) ? `${ems} EMS inbound` : null,
    capacity !== '—' ? `${capacity} capacity` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function applyWallDisplayMonitorPrivacy(
  snapshot: DepartmentStatusSnapshot,
  monitorPrivacy: WallDisplayMonitorPrivacy | string = WALL_DISPLAY_MONITOR_PRIVACY.operational,
): DepartmentStatusSnapshot {
  const privacy = normalizeWallDisplayMonitorPrivacy(monitorPrivacy);
  if (privacy === WALL_DISPLAY_MONITOR_PRIVACY.operational) return snapshot;

  const metrics = snapshot.metrics.map((metric) => redactMetricForPrivacy(metric, privacy));

  return {
    ...snapshot,
    metrics,
    summaryLine: buildReadOnlyWhiteboardSummaryLine(metrics, privacy),
  };
}
