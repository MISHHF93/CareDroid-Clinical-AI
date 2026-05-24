/**
 * Which backend HTTP capabilities exist today (Nest controllers).
 * Frontend must not call routes marked false — use guarded clients or local fallbacks.
 *
 * @see docs/backend-exposure-report.md
 */

import { ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS } from '../data/clinicalToolIdContract';

/** POST /api/tools/:nluToolId/execute — registered orchestrator executors only. */
export const BACKEND_EXECUTOR_NLU_TOOL_IDS = Object.freeze([...ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS]);

export function isBackendExecutorToolId(toolId) {
  return BACKEND_EXECUTOR_NLU_TOOL_IDS.includes(toolId);
}

/**
 * Platform routes beyond clinical executors.
 * @type {Readonly<Record<string, boolean>>}
 */
export const BACKEND_API_CAPABILITIES = Object.freeze({
  chatMessage: true,
  chatIntentClassify: true,
  toolsList: true,
  toolsExecute: true,
  toolsResultsSync: true,
  clinicalIntelligence: true,
  complianceConsent: true,
  complianceExport: true,
  auditSync: true,
  notificationsRest: true,
  /** No Nest route — do not POST */
  toolsShareResults: false,
  teamManagement: false,
  consentHistory: false,
  bulkSync: false,
  chatPersistence: false,
  notificationStream: false,
  notificationSendChannel: false,
  clinicalAlerts: false,
  exportsPdf: false,
  exportsExcel: false,
  reportsGenerate: false,
  /** No Nest route — do not POST/DELETE scheduled reports */
  reportsSchedule: false,
  /** Read-only live tracking contracts exist and return clearly labeled demo data until real feeds are connected. */
  fleetLiveTracking: true,
  fleetActiveRoutes: true,
  hospitalMap: true,
  medicalDeviceRegistry: true,
  telemetryLive: true,
  deviceAlerting: true,
  deviceFleet: true,
  deviceMaintenance: false,
});

/**
 * @param {keyof typeof BACKEND_API_CAPABILITIES} capability
 */
export function isBackendCapabilityEnabled(capability) {
  return Boolean(BACKEND_API_CAPABILITIES[capability]);
}

export const UNSUPPORTED_CAPABILITY_MESSAGE =
  'This feature is not available on the server yet. Use on-device export, chat, or try again after an update.';
