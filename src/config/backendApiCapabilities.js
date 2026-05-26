/**
 * Which backend HTTP capabilities exist today (Nest controllers).
 * Frontend must not call routes marked false — use guarded clients or local fallbacks.
 *
 * @see docs/backend-exposure-report.md
 */

import { ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS } from '../data/clinicalToolIdContract';

/** POST /api/tools/:nluToolId/execute — registered orchestrator executors only. */
export const BACKEND_EXECUTOR_NLU_TOOL_IDS = Object.freeze([
  ...ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
]);

export function isBackendExecutorToolId(toolId) {
  return BACKEND_EXECUTOR_NLU_TOOL_IDS.includes(toolId);
}

export const BACKEND_CAPABILITY_STATUS = Object.freeze({
  REAL: 'real',
  DEMO: 'demo',
  DISABLED: 'disabled',
});

/**
 * Platform routes beyond clinical executors.
 * `demo` means a real backend route exists but currently returns labeled sample/demo contracts.
 * @type {Readonly<Record<string, 'real'|'demo'|'disabled'>>}
 */
export const BACKEND_API_CAPABILITY_STATUS = Object.freeze({
  chatMessage: BACKEND_CAPABILITY_STATUS.REAL,
  chatIntentClassify: BACKEND_CAPABILITY_STATUS.REAL,
  toolsList: BACKEND_CAPABILITY_STATUS.REAL,
  toolsExecute: BACKEND_CAPABILITY_STATUS.REAL,
  toolsResultsSync: BACKEND_CAPABILITY_STATUS.REAL,
  clinicalIntelligence: BACKEND_CAPABILITY_STATUS.REAL,
  complianceConsent: BACKEND_CAPABILITY_STATUS.REAL,
  complianceExport: BACKEND_CAPABILITY_STATUS.REAL,
  auditSync: BACKEND_CAPABILITY_STATUS.REAL,
  notificationsRest: BACKEND_CAPABILITY_STATUS.REAL,
  userProfile: BACKEND_CAPABILITY_STATUS.REAL,
  operationalProfile: BACKEND_CAPABILITY_STATUS.REAL,
  workspaces: BACKEND_CAPABILITY_STATUS.REAL,
  userActivity: BACKEND_CAPABILITY_STATUS.REAL,
  personalization: BACKEND_CAPABILITY_STATUS.REAL,
  memory: BACKEND_CAPABILITY_STATUS.REAL,
  trainingPipeline: BACKEND_CAPABILITY_STATUS.REAL,
  evaluationFramework: BACKEND_CAPABILITY_STATUS.REAL,
  costOptimization: BACKEND_CAPABILITY_STATUS.REAL,
  /** No Nest route — do not POST */
  toolsShareResults: BACKEND_CAPABILITY_STATUS.DISABLED,
  teamManagement: BACKEND_CAPABILITY_STATUS.DISABLED,
  consentHistory: BACKEND_CAPABILITY_STATUS.DISABLED,
  bulkSync: BACKEND_CAPABILITY_STATUS.DISABLED,
  chatPersistence: BACKEND_CAPABILITY_STATUS.DISABLED,
  notificationStream: BACKEND_CAPABILITY_STATUS.DISABLED,
  notificationSendChannel: BACKEND_CAPABILITY_STATUS.DISABLED,
  clinicalAlerts: BACKEND_CAPABILITY_STATUS.DEMO,
  clinicalAlertsStream: BACKEND_CAPABILITY_STATUS.DISABLED,
  exportsPdf: BACKEND_CAPABILITY_STATUS.DISABLED,
  exportsExcel: BACKEND_CAPABILITY_STATUS.DISABLED,
  reportsGenerate: BACKEND_CAPABILITY_STATUS.DISABLED,
  /** No Nest route — do not POST/DELETE scheduled reports */
  reportsSchedule: BACKEND_CAPABILITY_STATUS.DISABLED,
  /** Read-only live tracking contracts exist and return clearly labeled demo data until real feeds are connected. */
  fleetLiveTracking: BACKEND_CAPABILITY_STATUS.DEMO,
  fleetActiveRoutes: BACKEND_CAPABILITY_STATUS.DEMO,
  fleetAlerts: BACKEND_CAPABILITY_STATUS.DEMO,
  hospitalMap: BACKEND_CAPABILITY_STATUS.DEMO,
  medicalDeviceRegistry: BACKEND_CAPABILITY_STATUS.DEMO,
  telemetryLive: BACKEND_CAPABILITY_STATUS.DEMO,
  deviceAlerting: BACKEND_CAPABILITY_STATUS.DEMO,
  deviceFleet: BACKEND_CAPABILITY_STATUS.DEMO,
  deviceMaintenance: BACKEND_CAPABILITY_STATUS.DISABLED,
});

export const BACKEND_API_CAPABILITIES = Object.freeze(
  Object.fromEntries(
    Object.entries(BACKEND_API_CAPABILITY_STATUS).map(([capability, status]) => [
      capability,
      status !== BACKEND_CAPABILITY_STATUS.DISABLED,
    ])
  )
);

/**
 * @param {keyof typeof BACKEND_API_CAPABILITIES} capability
 */
export function isBackendCapabilityEnabled(capability) {
  return Boolean(BACKEND_API_CAPABILITIES[capability]);
}

export function getBackendCapabilityStatus(capability) {
  return BACKEND_API_CAPABILITY_STATUS[capability] || BACKEND_CAPABILITY_STATUS.DISABLED;
}

export const UNSUPPORTED_CAPABILITY_MESSAGE =
  'This feature is not available on the server yet. Use on-device export, chat, or try again after an update.';
