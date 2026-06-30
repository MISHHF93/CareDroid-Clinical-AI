/**
 * Emergency operational presentation — one design system, role-specific payloads.
 * Same AppShell and components; screen modes supply emphasis, copy, and strip layout.
 * Guided by CAREDROID_PRODUCT.oneScreenOneDecision — one primary decision per screen.
 */
import { CAREDROID_PRODUCT } from './caredroidProduct.config';
import {
  CARE_DROID_SCREEN_MODES,
  getScreenModeDensity,
  type CareDroidScreenMode,
  type ScreenModeDensity,
} from './careDroidScreenModes';
import { EMERGENCY_OS_BRANDING } from './emergencyOsBranding.config';
import { isPractitionerCleanupEnabled } from './practitionerCleanup.config';

export type OperationalPresentationEmphasis =
  | 'speed'
  | 'assessment'
  | 'flow'
  | 'patient'
  | 'throughput'
  | 'reassuring';

export type OperationalStripLayout = 'compact' | 'command';

export type OperationalStripAccent =
  | 'default'
  | 'reassessment'
  | 'referral'
  | 'ems'
  | 'shift-handoff';

export type OperationalStripMetric = {
  id: string;
  label: string;
  value: string | number;
  tone?: string;
  hint?: string;
  interactive?: boolean;
  queueTab?: string;
};

export type OperationalPresentationProfile = {
  screenMode: CareDroidScreenMode;
  emphasis: OperationalPresentationEmphasis;
  stripLayout: OperationalStripLayout;
  stripEyebrow: string;
  stripAriaLabel: string;
  pageEyebrow: string;
  pageTitle: string;
  pageSubtitle: string;
  emptyLabel: string;
  emptyHint: string;
  density: ScreenModeDensity;
  showStripEyebrow: boolean;
  showStripEmptyState: boolean;
  metricLabelsUppercase: boolean;
};

const DEFAULT_PROFILE: Omit<OperationalPresentationProfile, 'screenMode'> = Object.freeze({
  emphasis: 'flow',
  stripLayout: 'command',
  stripEyebrow: 'Operations',
  stripAriaLabel: 'Operational metrics',
  pageEyebrow: EMERGENCY_OS_BRANDING.platformLine,
  pageTitle: EMERGENCY_OS_BRANDING.productName,
  pageSubtitle: 'Shared CareDroid surface with role-aware operational payloads.',
  emptyLabel: 'All clear',
  emptyHint: 'No operational signals need attention right now.',
  density: 'comfortable',
  showStripEyebrow: true,
  showStripEmptyState: true,
  metricLabelsUppercase: true,
});

const PRESENTATION_BY_MODE: Readonly<
  Record<CareDroidScreenMode, Partial<Omit<OperationalPresentationProfile, 'screenMode'>>>
> = Object.freeze({
  [CARE_DROID_SCREEN_MODES.reception]: Object.freeze({
    emphasis: 'speed',
    stripLayout: 'compact',
    stripEyebrow: 'Front desk',
    stripAriaLabel: 'Reception speed metrics',
    pageEyebrow: 'Front desk operations',
    pageTitle: EMERGENCY_OS_BRANDING.receptionName,
    pageSubtitle: EMERGENCY_OS_BRANDING.receptionSummary,
    emptyHint: 'Queues are clear — ready for the next arrival.',
    density: 'comfortable',
    showStripEyebrow: false,
    showStripEmptyState: false,
  }),
  [CARE_DROID_SCREEN_MODES.triage]: Object.freeze({
    emphasis: 'assessment',
    stripLayout: 'compact',
    stripEyebrow: 'Triage desk',
    stripAriaLabel: 'Triage assessment metrics',
    pageEyebrow: 'Triage operations',
    pageTitle: 'Triage assessment',
    pageSubtitle: 'Acuity, untriaged waits, rapid review flags, and EMS handoffs.',
    emptyHint: 'No patients waiting for triage assessment.',
    density: 'comfortable',
    showStripEyebrow: false,
    showStripEmptyState: false,
  }),
  [CARE_DROID_SCREEN_MODES.chargeNurse]: Object.freeze({
    emphasis: 'flow',
    stripEyebrow: 'Flow command',
    stripAriaLabel: 'Charge nurse flow metrics',
    pageEyebrow: 'Department flow',
    pageTitle: 'Department Whiteboard',
    pageSubtitle: 'Waiting volume, provider breaches, reassessments, capacity, and offload pressure.',
    emptyHint: 'No flow signals need charge nurse attention right now.',
    density: 'compact',
  }),
  [CARE_DROID_SCREEN_MODES.physician]: Object.freeze({
    emphasis: 'patient',
    stripEyebrow: 'Clinical queue',
    stripAriaLabel: 'Physician patient queue metrics',
    pageEyebrow: 'Clinical review',
    pageTitle: 'Physician workspace',
    pageSubtitle: 'Patient-focused queue signals — ready charts, results, and consults.',
    emptyHint: 'No clinical queue signals need attention right now.',
    density: 'comfortable',
  }),
  [CARE_DROID_SCREEN_MODES.commandCenter]: Object.freeze({
    emphasis: 'throughput',
    stripEyebrow: 'Throughput',
    stripAriaLabel: 'Department throughput metrics',
    pageEyebrow: EMERGENCY_OS_BRANDING.platformLine,
    pageTitle: EMERGENCY_OS_BRANDING.commandCenterName,
    pageSubtitle: EMERGENCY_OS_BRANDING.commandCenterSummary,
    emptyHint: 'Throughput indicators are within expected ranges.',
    density: 'comfortable',
    showStripEmptyState: false,
  }),
  [CARE_DROID_SCREEN_MODES.publicWaiting]: Object.freeze({
    emphasis: 'reassuring',
    stripLayout: 'compact',
    stripEyebrow: 'Waiting room',
    stripAriaLabel: 'Public waiting room status',
    pageEyebrow: 'Waiting room information',
    pageTitle: 'Emergency waiting room',
    pageSubtitle: 'General wait information only · no names or clinical details',
    emptyHint: 'We are ready to help you when it is your turn.',
    density: 'wall',
    showStripEyebrow: false,
    showStripEmptyState: false,
    metricLabelsUppercase: false,
  }),
  [CARE_DROID_SCREEN_MODES.readOnlyWhiteboard]: Object.freeze({
    emphasis: 'flow',
    stripEyebrow: 'Department status',
    stripAriaLabel: 'Department wall metrics',
    pageEyebrow: 'Department status',
    pageTitle: 'Emergency Department Status',
    pageSubtitle: 'Live departmental metrics for wall display — aggregate counts only, no patient identifiers.',
    density: 'wall',
    showStripEmptyState: false,
  }),
  [CARE_DROID_SCREEN_MODES.ems]: Object.freeze({
    emphasis: 'speed',
    stripEyebrow: 'EMS command',
    stripAriaLabel: 'EMS inbound metrics',
    pageEyebrow: 'EMS operations',
    pageTitle: 'EMS pipeline',
    pageSubtitle: 'Inbound EMS, offload pressure, and handoff readiness.',
    emptyHint: 'No inbound or receiving EMS signals right now.',
    density: 'compact',
  }),
  [CARE_DROID_SCREEN_MODES.admin]: Object.freeze({
    emphasis: 'throughput',
    stripEyebrow: 'Administration',
    stripAriaLabel: 'Administrative operational metrics',
    pageEyebrow: 'Emergency administration',
    pageTitle: 'Emergency settings',
    pageSubtitle: 'Tenant, module, and threshold controls.',
    density: 'comfortable',
    showStripEmptyState: false,
  }),
});

export function resolveOperationalPresentation(
  screenMode: CareDroidScreenMode | null | undefined,
): OperationalPresentationProfile {
  const mode = screenMode || CARE_DROID_SCREEN_MODES.chargeNurse;
  const patch = PRESENTATION_BY_MODE[mode] || {};
  const profile = Object.freeze({
    screenMode: mode,
    ...DEFAULT_PROFILE,
    ...patch,
    density: getScreenModeDensity(mode),
  });

  if (!isPractitionerCleanupEnabled()) {
    return profile;
  }

  return Object.freeze({
    ...profile,
    stripLayout: 'compact' as OperationalStripLayout,
    showStripEyebrow: false,
    metricLabelsUppercase: false,
    density: profile.density === 'wall' ? profile.density : 'compact',
  });
}

export function resolveOperationalStripAccentClass(
  accent: OperationalStripAccent = 'default',
): string {
  if (accent === 'default') return '';
  return `operational-strip--accent-${accent}`;
}

export const OPERATIONAL_DESIGN_PRINCIPLE = CAREDROID_PRODUCT.oneScreenOneDecision;

export function normalizeOperationalStripMetrics(
  metrics: Array<{
    id: string;
    label: string;
    value: string | number;
    tone?: string;
    hint?: string;
    queueTab?: string;
  }>,
  options: { onMetricSelect?: ((metric: unknown) => void) | null } = {},
): OperationalStripMetric[] {
  return metrics.map((metric) => ({
    id: metric.id,
    label: metric.label,
    value: metric.value,
    tone: metric.tone,
    hint: metric.hint,
    queueTab: metric.queueTab,
    interactive: Boolean(metric.queueTab && options.onMetricSelect),
  }));
}
