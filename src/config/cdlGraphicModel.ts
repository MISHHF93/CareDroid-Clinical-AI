/**
 * CDL graphic model — maps operational semantics to visual treatments.
 * Used by CdlGraphicKit to turn static labels into iconographic UI.
 */

export type SituationBriefGraphicId = 'status' | 'attention' | 'owner' | 'nextAction';

export const SITUATION_BRIEF_GRAPHICS: Record<
  SituationBriefGraphicId,
  Readonly<{ iconKey: string; accent: string; motif: 'pulse' | 'alert' | 'owner' | 'route' }>
> = Object.freeze({
  status: { iconKey: 'activity', accent: 'information', motif: 'pulse' },
  attention: { iconKey: 'alert', accent: 'warning', motif: 'alert' },
  owner: { iconKey: 'owner', accent: 'neutral', motif: 'owner' },
  nextAction: { iconKey: 'route', accent: 'action', motif: 'route' },
});

export const ROUTE_NAV_GRAPHIC_KEYS: Record<string, string> = Object.freeze({
  reception: 'user-check',
  whiteboard: 'layout-dashboard',
  patients: 'emergency-patients',
  intake: 'intake',
  ems: 'ems',
  copilot: 'ed-copilot',
  tools: 'clinical-tools',
  analytics: 'emergency-analytics',
  'command-center': 'journey',
  dispatch: 'send',
  alerts: 'alerts',
  diagnostics: 'stethoscope',
  handoffs: 'notes',
  reports: 'report',
  queues: 'queues',
  reassessment: 'reassessment',
  capacity: 'capacity',
  boarding: 'boarding',
  referrals: 'referrals',
  settings: 'settings',
  help: 'help',
  pulse: 'department-pulse',
  shift: 'list-check',
});

export const METRIC_GRAPHIC_DEFAULTS: Record<string, string> = Object.freeze({
  patient: 'emergency-patients',
  risk: 'alert',
  capacity: 'capacity',
  wait: 'activity',
  boarding: 'boarding',
  ems: 'ems',
  alert: 'alerts',
  staff: 'owner',
  default: 'activity',
});

export function resolveMetricGraphicKey(label: string): string {
  const normalized = label.toLowerCase();
  for (const [keyword, iconKey] of Object.entries(METRIC_GRAPHIC_DEFAULTS)) {
    if (keyword !== 'default' && normalized.includes(keyword)) {
      return iconKey;
    }
  }
  return METRIC_GRAPHIC_DEFAULTS.default;
}

export type EmptyStateGraphicVariant =
  | 'queue'
  | 'patients'
  | 'alerts'
  | 'tools'
  | 'copilot'
  | 'generic';

export const COMMAND_METRIC_GRAPHIC_KEYS: Record<string, string> = Object.freeze({
  'three-minute-compliance': 'activity',
  'active-patients': 'emergency-patients',
  'waiting-count': 'queues',
  'boarding-count': 'boarding',
  'ems-inbound': 'ems',
  'unresolved-alerts': 'alerts',
  'staff-coverage': 'owner',
  'capacity-band': 'capacity',
  default: 'activity',
});

export function resolveCommandMetricGraphicKey(metricId: string): string {
  return COMMAND_METRIC_GRAPHIC_KEYS[metricId] || COMMAND_METRIC_GRAPHIC_KEYS.default;
}

export const EMS_PHASE_GRAPHIC_ORDER = Object.freeze([
  'dispatch',
  'inbound',
  'on-scene',
  'arrival',
  'handoff',
  'complete',
] as const);

export function resolveEmsPhaseProgress(status: string): number {
  // Defensive guard (mirrors HEAL-321's EMSArrival.severity fix): `status`
  // is typed required, but real EMS/CAD-fed records have reached this
  // function without one -- degrade to the earliest phase instead of
  // crashing the whole /emergency/ems route to an error boundary.
  const normalized = (status || '').toLowerCase();
  if (normalized.includes('complete') || normalized === 'handoff complete') return 100;
  if (normalized.includes('handoff') || normalized === 'arrived') return 80;
  if (normalized.includes('scene')) return 55;
  if (normalized.includes('inbound') || normalized === 'dispatched') return 35;
  return 15;
}

export function resolveEmptyStateGraphic(title: string): EmptyStateGraphicVariant {
  const normalized = title.toLowerCase();
  if (normalized.includes('queue') || normalized.includes('waiting')) return 'queue';
  if (normalized.includes('patient') || normalized.includes('select')) return 'patients';
  if (normalized.includes('alert')) return 'alerts';
  if (normalized.includes('tool') || normalized.includes('calculator')) return 'tools';
  if (normalized.includes('copilot') || normalized.includes('message')) return 'copilot';
  return 'generic';
}