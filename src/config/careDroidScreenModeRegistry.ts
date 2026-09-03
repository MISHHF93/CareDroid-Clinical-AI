/**
 * Canonical CareDroid screen mode registry — one CareDroid surface, role-driven layouts.
 * Same AppShell and routes; screen modes control widgets, actions, density, PHI, and landing.
 */
import { CANONICAL_ROUTES } from './routes.config';

/** Canonical screen mode identifiers */
export const CARE_DROID_SCREEN_MODES = Object.freeze({
  reception: 'RECEPTION_SCREEN',
  triage: 'TRIAGE_SCREEN',
  ems: 'EMS_SCREEN',
  chargeNurse: 'CHARGE_NURSE_SCREEN',
  physician: 'PHYSICIAN_SCREEN',
  commandCenter: 'COMMAND_CENTER_SCREEN',
  readOnlyWhiteboard: 'READ_ONLY_WHITEBOARD',
  publicWaiting: 'PUBLIC_WAITING_DISPLAY',
  admin: 'ADMIN_SCREEN',
} as const);

export type CareDroidScreenMode =
  (typeof CARE_DROID_SCREEN_MODES)[keyof typeof CARE_DROID_SCREEN_MODES];

export type ScreenModeDensity = 'comfortable' | 'compact' | 'wall';

export type ScreenModePhiVisibility = 'full' | 'staff' | 'operational' | 'public_redacted' | 'none';

export type ScreenModeAlertVisibility = 'all' | 'critical' | 'operational' | 'redacted';

export type ScreenModeActionDefinition = {
  id: string;
  permission?: string;
};

export type CareDroidScreenModeDefinition = {
  id: CareDroidScreenMode;
  label: string;
  description: string;
  legacyAliases: readonly string[];
  visibleWidgets: readonly string[];
  availableActions: readonly ScreenModeActionDefinition[];
  density: ScreenModeDensity;
  readOnly: boolean;
  publicDisplay: boolean;
  useMinimalAppChrome: boolean;
  phiVisibility: ScreenModePhiVisibility;
  alertVisibility: ScreenModeAlertVisibility;
  defaultLandingRoute: string;
  defaultFocus: string;
};

const K = {
  patientCreate: 'patient.create',
  patientDemographicsEdit: 'patient.demographics.edit',
  encounterCreate: 'encounter.create',
  intakeVerify: 'intake.verify',
  triageAssignAcuity: 'triage.assign_acuity',
  queueMove: 'queue.move',
  vitalsWrite: 'vitals.write',
  notesWrite: 'notes.write',
  flagsManage: 'flags.manage',
  reassessmentComplete: 'reassessment.complete',
  emsPrepareBay: 'ems.prepareBay',
  emsConvertArrival: 'ems.convertArrival',
  emsHandoffComplete: 'ems.handoff.complete',
  referralCreate: 'referral.create',
  transferManage: 'transfers.manage',
  capacityManage: 'capacity.manage',
  boardingManage: 'boarding.manage',
  workloadReassign: 'workload.reassign',
  patientEscalate: 'patient.escalate',
  receptionEscalate: 'reception.escalate',
  patientDischarge: 'patient.discharge',
  copilotUse: 'copilot.use',
  analyticsView: 'analytics.view',
  settingsManage: 'settings.manage',
} as const;
const M = CARE_DROID_SCREEN_MODES;

const action = (id: string, permission?: string): ScreenModeActionDefinition => ({
  id,
  permission,
});

export const CARE_DROID_SCREEN_MODE_REGISTRY: readonly CareDroidScreenModeDefinition[] =
  Object.freeze([
    Object.freeze({
      id: M.reception,
      label: 'Reception screen',
      description: 'Front-door registration, identity verification, and arrival queues.',
      legacyAliases: ['REGISTRATION_SCREEN'],
      visibleWidgets: [
        'patient-search',
        'patient-lookup',
        'patient-creation',
        'smart-intake',
        'identity-verification',
        'encounter-creation',
        'queues',
        'queue-assignment',
        'arrival-reason-capture',
        'urgent-triage-escalation',
        'ems-pre-arrival',
        'arrival-banner',
        'prepare-chooser',
        'operational-strip',
        'process-education',
        'communication-status',
        'patient-answers',
        'triage-breach',
        'waiting-room-safety-escalation',
      ],
      availableActions: [
        action('search-patients'),
        action('create-patient', K.patientCreate),
        action('edit-demographics', K.patientDemographicsEdit),
        action('smart-intake', K.patientCreate),
        action('verify-identity', K.intakeVerify),
        action('create-encounter', K.encounterCreate),
        action('assign-queue', K.queueMove),
        action('capture-arrival-reason', K.patientCreate),
        action('reception-escalate', K.receptionEscalate),
        action('convert-ems-arrival', K.emsConvertArrival),
      ],
      density: 'comfortable',
      readOnly: false,
      publicDisplay: false,
      useMinimalAppChrome: true,
      phiVisibility: 'staff',
      alertVisibility: 'operational',
      defaultLandingRoute: CANONICAL_ROUTES.emergencyReception,
      defaultFocus: 'patient-lookup',
    }),
    Object.freeze({
      id: M.triage,
      label: 'Triage screen',
      description: 'Acuity assignment, vitals, reassessment, and intake handoff from reception.',
      legacyAliases: [],
      visibleWidgets: [
        'triage-pending-queue',
        'acuity-assignment',
        'initial-vitals',
        'reassessment-interval',
        'waiting-room-safety-board',
        'high-risk-complaint-flags',
        'ems-handoff-intake',
        'fit-to-wait-classification',
        'whiteboard',
        'smart-intake',
        'queues',
        'reassessment',
        'alerts',
        'triage-breach',
        'ai-triage-assist',
        'communication-status',
        'waiting-room-safety-escalation',
      ],
      availableActions: [
        action('open-triage-queue'),
        action('assign-acuity', K.triageAssignAcuity),
        action('record-vitals', K.vitalsWrite),
        action('set-reassessment-interval', K.flagsManage),
        action('flag-reassessment', K.flagsManage),
        action('complete-reassessment', K.reassessmentComplete),
        action('classify-fit-to-wait', K.queueMove),
        action('queue-move', K.queueMove),
        action('accept-ems-handoff', K.emsHandoffComplete),
        action('create-patient', K.patientCreate),
      ],
      density: 'comfortable',
      readOnly: false,
      publicDisplay: false,
      useMinimalAppChrome: false,
      phiVisibility: 'full',
      alertVisibility: 'all',
      defaultLandingRoute: `${CANONICAL_ROUTES.emergencyQueues}?queue=pretriage`,
      defaultFocus: 'triage-pending-queue',
    }),
    Object.freeze({
      id: M.ems,
      label: 'EMS screen',
      description:
        'Inbound ambulances, ETA, handoff checklist, offload timers, receiving area, and encounter conversion.',
      legacyAliases: [],
      visibleWidgets: [
        'inbound-ambulances',
        'eta-display',
        'handoff-checklist',
        'offload-timers',
        'receiving-area',
        'encounter-conversion',
        'ems-pressure',
        'operational-strip',
        'alerts',
      ],
      availableActions: [
        action('prepare-ems-bay', K.emsPrepareBay),
        action('convert-arrival', K.emsConvertArrival),
        action('complete-handoff', K.emsHandoffComplete),
        action('create-patient', K.patientCreate),
        action('focus-receiving-area', K.emsHandoffComplete),
        action('open-offload-tracker', K.emsHandoffComplete),
      ],
      density: 'compact',
      readOnly: false,
      publicDisplay: false,
      useMinimalAppChrome: false,
      phiVisibility: 'staff',
      alertVisibility: 'critical',
      defaultLandingRoute: CANONICAL_ROUTES.emergencyEms,
      defaultFocus: 'inbound-ambulances',
    }),
    Object.freeze({
      id: M.chargeNurse,
      label: 'Charge nurse screen',
      description:
        'Flow command — full whiteboard, waiting-room safety, queue health, reassessment, EMS, boarding, and capacity.',
      legacyAliases: [],
      visibleWidgets: [
        'whiteboard',
        'waiting-room-board',
        'queue-health',
        'reassessments-due',
        'provider-wait-breaches',
        'triage-breach',
        'ems-offload-aggregate',
        'waiting-room-safety-escalation',
        'ems-inbound',
        'offload-delays',
        'boarders',
        'referrals-pending',
        'capacity-status',
        'operational-strip',
        'communication-status',
        'alerts',
        'shift-handoff',
      ],
      availableActions: [
        action('create-patient', K.patientCreate),
        action('prepare-ems-bay', K.emsPrepareBay),
        action('move-patient', K.queueMove),
        action('staffing-request', K.workloadReassign),
        action('complete-reassessment', K.reassessmentComplete),
        action('manage-capacity', K.capacityManage),
        action('open-referrals', K.referralCreate),
        action('focus-offload', K.emsHandoffComplete),
      ],
      density: 'compact',
      readOnly: false,
      publicDisplay: false,
      useMinimalAppChrome: false,
      phiVisibility: 'full',
      alertVisibility: 'all',
      defaultLandingRoute: CANONICAL_ROUTES.emergencyWhiteboard,
      defaultFocus: 'queue-health',
    }),
    Object.freeze({
      id: M.physician,
      label: 'Physician screen',
      description:
        'Clinical review — assigned patients, provider queue, results, referrals, disposition boarders, journey, and Copilot.',
      legacyAliases: [],
      visibleWidgets: [
        'assigned-patients',
        'provider-waiting-queue',
        'provider-wait-breaches',
        'results-pending',
        'referrals-pending',
        'disposition-boarders',
        'patient-journey-timeline',
        'copilot-actions',
        'complaint-workflow-launchers',
        'whiteboard',
        'patient-detail',
        'reassessment',
        'operational-strip',
      ],
      availableActions: [
        action('review-patient', K.notesWrite),
        action('write-note', K.notesWrite),
        action('refer', K.referralCreate),
        action('discharge-with-review', K.patientDischarge),
        action('complete-reassessment', K.reassessmentComplete),
        action('queue-move', K.queueMove),
        action('open-copilot', K.copilotUse),
        action('launch-complaint-workflow', K.copilotUse),
      ],
      density: 'comfortable',
      readOnly: false,
      publicDisplay: false,
      useMinimalAppChrome: false,
      phiVisibility: 'full',
      alertVisibility: 'all',
      defaultLandingRoute: CANONICAL_ROUTES.emergencyWhiteboard,
      defaultFocus: 'assigned-patients',
    }),
    Object.freeze({
      id: M.commandCenter,
      label: 'Command center screen',
      description: 'Department throughput view for managers, directors, and flow leads.',
      legacyAliases: ['COMMAND_CENTER_DISPLAY'],
      visibleWidgets: [
        'triage-awaiting',
        'longest-untriaged-wait',
        'triage-approaching-breach',
        'triage-breached',
        'rapid-review-flags',
        'provider-awaiting',
        'longest-provider-wait',
        'provider-approaching-breach',
        'provider-breached',
        'ems-inbound',
        'ems-offload-delays',
        'offload-duration',
        'handoff-pending',
        'arrivals-by-hour',
        'waiting-count',
        'longest-wait',
        'avg-wait-triage',
        'avg-wait-provider',
        'ems-offload-delays',
        'boarding-duration',
        'referrals-backlog',
        'capacity-score',
        'crowd-level',
        'trend-indicators',
        'lwbs-risk',
        'crowding-forecast',
        'system-health',
      ],
      availableActions: [
        action('central-review', K.analyticsView),
        action('open-command-palette', K.copilotUse),
        action('manage-capacity', K.capacityManage),
        action('queue-move', K.queueMove),
      ],
      density: 'wall',
      readOnly: false,
      publicDisplay: false,
      useMinimalAppChrome: false,
      phiVisibility: 'operational',
      alertVisibility: 'all',
      defaultLandingRoute: CANONICAL_ROUTES.emergencyCommandCenter,
      defaultFocus: 'arrivals-by-hour',
    }),
    Object.freeze({
      id: M.readOnlyWhiteboard,
      label: 'Read-only whiteboard',
      description: 'Departmental wall display — operational awareness without mutations.',
      legacyAliases: ['READ_ONLY_DISPLAY'],
      visibleWidgets: [
        'waiting-count',
        'longest-wait',
        'triage-pending',
        'reassessments-due',
        'ems-inbound',
        'offload-delays',
        'offload-duration',
        'handoff-pending',
        'boarders',
        'referrals-pending',
        'capacity-status',
      ],
      availableActions: [],
      density: 'wall',
      readOnly: true,
      publicDisplay: false,
      useMinimalAppChrome: true,
      phiVisibility: 'operational',
      alertVisibility: 'redacted',
      defaultLandingRoute: `${CANONICAL_ROUTES.emergencyWhiteboard}?display=readonly`,
      defaultFocus: 'waiting-count',
    }),
    Object.freeze({
      id: M.publicWaiting,
      label: 'Public waiting display',
      description: 'Aggregate queue health for waiting-room walls — no PHI.',
      legacyAliases: ['WAITING_ROOM_DISPLAY'],
      visibleWidgets: [
        'wait-range',
        'crowd-level',
        'triage-wait',
        'care-process-stages',
        'patient-guidance',
        'symptom-escalation',
        'ems-crowding-impact',
      ],
      availableActions: [],
      density: 'wall',
      readOnly: true,
      publicDisplay: true,
      useMinimalAppChrome: true,
      phiVisibility: 'public_redacted',
      alertVisibility: 'redacted',
      defaultLandingRoute: `${CANONICAL_ROUTES.emergencyWhiteboard}?display=waiting-room`,
      defaultFocus: 'wait-range',
    }),
    Object.freeze({
      id: M.admin,
      label: 'Admin screen',
      description: 'Tenant configuration, analytics, audit, and integrations.',
      legacyAliases: [],
      visibleWidgets: ['settings', 'analytics', 'audit', 'integrations'],
      availableActions: [
        action('manage-settings', K.settingsManage),
        action('review-audit', K.analyticsView),
        action('configure-modules', K.settingsManage),
      ],
      density: 'comfortable',
      readOnly: false,
      publicDisplay: false,
      useMinimalAppChrome: false,
      phiVisibility: 'operational',
      alertVisibility: 'operational',
      defaultLandingRoute: CANONICAL_ROUTES.emergencySettings,
      defaultFocus: 'settings',
    }),
  ]);

const REGISTRY_BY_ID = new Map<CareDroidScreenMode, CareDroidScreenModeDefinition>(
  CARE_DROID_SCREEN_MODE_REGISTRY.map((entry) => [entry.id, entry]),
);

const ALIAS_TO_CANONICAL = new Map<string, CareDroidScreenMode>();
for (const entry of CARE_DROID_SCREEN_MODE_REGISTRY) {
  ALIAS_TO_CANONICAL.set(entry.id, entry.id);
  for (const alias of entry.legacyAliases) {
    ALIAS_TO_CANONICAL.set(alias, entry.id);
  }
}

export const CARE_DROID_SCREEN_MODE_OPTIONS: CareDroidScreenMode[] =
  CARE_DROID_SCREEN_MODE_REGISTRY.map((entry) => entry.id);

/** Backward-compatible config shape used by central node and capabilities hooks */
export type CareDroidScreenModeConfig = {
  label: string;
  visibleWidgets: string[];
  availableActions: string[];
  density: ScreenModeDensity;
  readOnly: boolean;
  publicDisplay: boolean;
  defaultFocus: string;
  alertVisibility: ScreenModeAlertVisibility;
  phiVisibility: ScreenModePhiVisibility;
  defaultLandingRoute: string;
  useMinimalAppChrome: boolean;
};

export const CARE_DROID_SCREEN_MODE_CONFIG: Record<CareDroidScreenMode, CareDroidScreenModeConfig> =
  Object.fromEntries(
    CARE_DROID_SCREEN_MODE_REGISTRY.map((entry) => [
      entry.id,
      {
        label: entry.label,
        visibleWidgets: [...entry.visibleWidgets],
        availableActions: entry.availableActions.map((item) => item.id),
        density: entry.density,
        readOnly: entry.readOnly,
        publicDisplay: entry.publicDisplay,
        defaultFocus: entry.defaultFocus,
        alertVisibility: entry.alertVisibility,
        phiVisibility: entry.phiVisibility,
        defaultLandingRoute: entry.defaultLandingRoute,
        useMinimalAppChrome: entry.useMinimalAppChrome,
      },
    ]),
  ) as Record<CareDroidScreenMode, CareDroidScreenModeConfig>;

export function normalizeCareDroidScreenMode(
  mode: string | null | undefined,
): CareDroidScreenMode | null {
  const normalized = String(mode || '').trim();
  if (!normalized) return null;
  return (
    ALIAS_TO_CANONICAL.get(normalized) ||
    (REGISTRY_BY_ID.has(normalized as CareDroidScreenMode)
      ? (normalized as CareDroidScreenMode)
      : null)
  );
}

export function isValidCareDroidScreenMode(mode: unknown): mode is CareDroidScreenMode {
  if (typeof mode !== 'string') return false;
  const canonical = normalizeCareDroidScreenMode(mode);
  return Boolean(canonical && REGISTRY_BY_ID.has(canonical));
}

/**
 * Coerces a screen mode to one of a tenant's enabled modes, falling back to
 * the first enabled mode if the requested one isn't allowed.
 * Lives here (not emergencyRoleScreenMatrix.ts, its original home) because
 * moving it broke a real circular dependency: it only ever depended on
 * normalizeCareDroidScreenMode, already canonical to this file, and
 * emergencyDeviceContextModel.ts needed only this one function from
 * emergencyRoleScreenMatrix.ts — a clean split with no functional change.
 */
export function coerceEnabledScreenMode(
  mode: CareDroidScreenMode | string,
  enabledScreenModes: string[] | undefined,
): CareDroidScreenMode {
  const canonical = normalizeCareDroidScreenMode(mode) || (mode as CareDroidScreenMode);
  if (!enabledScreenModes?.length) return canonical;
  const enabled = enabledScreenModes
    .map((entry) => normalizeCareDroidScreenMode(entry))
    .filter((entry): entry is CareDroidScreenMode => Boolean(entry));
  if (!enabled.length) return canonical;
  if (enabled.includes(canonical)) return canonical;
  return enabled[0];
}

export function getScreenModeDefinition(
  mode: string | CareDroidScreenMode,
): CareDroidScreenModeDefinition | undefined {
  const canonical = normalizeCareDroidScreenMode(mode);
  return canonical ? REGISTRY_BY_ID.get(canonical) : undefined;
}

export function isScreenWidgetVisible(
  mode: string | CareDroidScreenMode,
  widgetId: string,
): boolean {
  const definition = getScreenModeDefinition(mode);
  if (!definition) return false;
  return definition.visibleWidgets.includes(widgetId);
}

export function isScreenActionAvailable(
  mode: string | CareDroidScreenMode,
  actionId: string,
): boolean {
  const definition = getScreenModeDefinition(mode);
  if (!definition) return false;
  return definition.availableActions.some((entry) => entry.id === actionId);
}

export function getScreenModeActionPermission(
  mode: string | CareDroidScreenMode,
  actionId: string,
): string | undefined {
  const definition = getScreenModeDefinition(mode);
  return definition?.availableActions.find((entry) => entry.id === actionId)?.permission;
}

export function canEditInScreenMode(mode: string | CareDroidScreenMode): boolean {
  return !getScreenModeDefinition(mode)?.readOnly;
}

export function getScreenModePhiVisibility(
  mode: string | CareDroidScreenMode,
): ScreenModePhiVisibility {
  return getScreenModeDefinition(mode)?.phiVisibility || 'staff';
}

export function getScreenModeDefaultLandingRoute(mode: string | CareDroidScreenMode): string {
  return getScreenModeDefinition(mode)?.defaultLandingRoute || CANONICAL_ROUTES.emergencyReception;
}

export function getScreenModeDensity(mode: string | CareDroidScreenMode): ScreenModeDensity {
  return getScreenModeDefinition(mode)?.density || 'comfortable';
}

export function shouldUseMinimalAppChromeForMode(mode: string | CareDroidScreenMode): boolean {
  return Boolean(getScreenModeDefinition(mode)?.useMinimalAppChrome);
}

export function isPublicDisplayScreenModeForRegistry(mode: string | CareDroidScreenMode): boolean {
  return Boolean(getScreenModeDefinition(mode)?.publicDisplay);
}

export function listScreenModesForSettings(): Array<{ id: CareDroidScreenMode; label: string }> {
  return CARE_DROID_SCREEN_MODE_REGISTRY.map((entry) => ({
    id: entry.id,
    label: entry.label,
  }));
}
