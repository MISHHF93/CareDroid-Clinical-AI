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
  automationAudit: BACKEND_CAPABILITY_STATUS.REAL,
  platformAssets: BACKEND_CAPABILITY_STATUS.REAL,
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
  collaborationHub: BACKEND_CAPABILITY_STATUS.REAL,
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
  emergencyOperationalAnalytics: BACKEND_CAPABILITY_STATUS.DEMO,
  emergencyShiftReportExport: BACKEND_CAPABILITY_STATUS.DISABLED,
  /** Mounted CareDroid module envelopes under /api/emergency/*; currently fixture/demo backed. */
  emergencyCentralNode: BACKEND_CAPABILITY_STATUS.DEMO,
  emergencyWhiteboard: BACKEND_CAPABILITY_STATUS.DEMO,
  /** Session-scoped board mutators (create/list share EmergencyPatientService in-memory + optional DB write-through). */
  emergencyPatients: BACKEND_CAPABILITY_STATUS.REAL,
  emergencyPatientJourney: BACKEND_CAPABILITY_STATUS.DEMO,
  emergencyQueues: BACKEND_CAPABILITY_STATUS.DEMO,
  emergencyCapacity: BACKEND_CAPABILITY_STATUS.DEMO,
  emergencyBoarding: BACKEND_CAPABILITY_STATUS.DEMO,
  emergencyEmsRuntime: BACKEND_CAPABILITY_STATUS.DEMO,
  emergencyOperatingSurfaces: BACKEND_CAPABILITY_STATUS.DEMO,
  emergencyDispatch: BACKEND_CAPABILITY_STATUS.DEMO,
  emergencyDiagnosticsView: BACKEND_CAPABILITY_STATUS.DEMO,
  emergencyHandoffsView: BACKEND_CAPABILITY_STATUS.DEMO,
  emergencyReportsView: BACKEND_CAPABILITY_STATUS.DEMO,
  emergencyPulseView: BACKEND_CAPABILITY_STATUS.DEMO,
  emergencyShiftView: BACKEND_CAPABILITY_STATUS.DEMO,
  emergencyEdReadinessView: BACKEND_CAPABILITY_STATUS.DEMO,
  /** Snapshot is built from live listPatients + queues after create/handoff. */
  emergencyReceptionSnapshot: BACKEND_CAPABILITY_STATUS.REAL,
  emergencyReceptionHandoff: BACKEND_CAPABILITY_STATUS.REAL,
  /** POST /api/emergency/reception/escalation — durable alert + realtime fan-out */
  emergencyReceptionEscalation: BACKEND_CAPABILITY_STATUS.REAL,
  emergencyTriageAssist: BACKEND_CAPABILITY_STATUS.REAL,
  emergencyOperationalIntelligence: BACKEND_CAPABILITY_STATUS.DEMO,
  emergencyPatientOrchestration: BACKEND_CAPABILITY_STATUS.REAL,
  emergencyPatientFlow: BACKEND_CAPABILITY_STATUS.DEMO,
  emergencyWorkflowOrchestration: BACKEND_CAPABILITY_STATUS.DEMO,
  careDroidUnifiedAINode: BACKEND_CAPABILITY_STATUS.DEMO,
  emergencyWorkflowAudit: BACKEND_CAPABILITY_STATUS.DEMO,
  emergencyIntegrationHub: BACKEND_CAPABILITY_STATUS.DEMO,
  emergencyProvincialHealth: BACKEND_CAPABILITY_STATUS.DEMO,
  aiGovernance: BACKEND_CAPABILITY_STATUS.REAL,
  emergencyGovernance: BACKEND_CAPABILITY_STATUS.REAL,
  emergencyReassessment: BACKEND_CAPABILITY_STATUS.DEMO,
  emergencySurge: BACKEND_CAPABILITY_STATUS.DISABLED,
  /** POST /api/emergency/intake createFromIntake is a real board mutator. */
  emergencySmartIntake: BACKEND_CAPABILITY_STATUS.REAL,
  emergencySmartIntakeIdentitySession: BACKEND_CAPABILITY_STATUS.DISABLED,
  emergencyOcrIntake: BACKEND_CAPABILITY_STATUS.REAL,
  /** POST /api/emergency/waiting-room-safety/escalation-notify -- real email out-of-band channel. */
  waitingRoomEscalationNotify: BACKEND_CAPABILITY_STATUS.REAL,
  emergencyCopilotRuntime: BACKEND_CAPABILITY_STATUS.DEMO,
  /** Optional / absent CareDroid routes; keep frontend clients from calling them until mounted. */
  emergencyCapacityDashboard: BACKEND_CAPABILITY_STATUS.DISABLED,
  emergencyCapacityHistory: BACKEND_CAPABILITY_STATUS.DISABLED,
  emergencyQueueAnalytics: BACKEND_CAPABILITY_STATUS.DISABLED,
  emergencyAdvancedDecisionSupport: BACKEND_CAPABILITY_STATUS.DEMO,
  emergencyReferralPersistence: BACKEND_CAPABILITY_STATUS.REAL,
  emergencyReferralHistory: BACKEND_CAPABILITY_STATUS.DISABLED,
  emergencyTransferWorkflow: BACKEND_CAPABILITY_STATUS.DISABLED,
  emergencyDiversionStatus: BACKEND_CAPABILITY_STATUS.DISABLED,
  emergencyDepartmentSettings: BACKEND_CAPABILITY_STATUS.DEMO,
  emergencyThresholdSettings: BACKEND_CAPABILITY_STATUS.DEMO,
  emergencyAlertRuleSettings: BACKEND_CAPABILITY_STATUS.DEMO,
  emergencyShiftTemplates: BACKEND_CAPABILITY_STATUS.DEMO,
  emergencyStaffSettings: BACKEND_CAPABILITY_STATUS.DEMO,
  integrationStatus: BACKEND_CAPABILITY_STATUS.DEMO,
  integrationTest: BACKEND_CAPABILITY_STATUS.DEMO,
  protocolsAdmin: BACKEND_CAPABILITY_STATUS.REAL,
  tenantAdministration: BACKEND_CAPABILITY_STATUS.REAL,
  organizationFeatureFlags: BACKEND_CAPABILITY_STATUS.REAL,
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
  surveillanceNexus: BACKEND_CAPABILITY_STATUS.DEMO,
  surveillanceCameras: BACKEND_CAPABILITY_STATUS.DEMO,
  surveillanceIotRegistry: BACKEND_CAPABILITY_STATUS.DEMO,
  surveillanceZones: BACKEND_CAPABILITY_STATUS.DEMO,
  surveillanceHealth: BACKEND_CAPABILITY_STATUS.DEMO,
  surveillanceAlerts: BACKEND_CAPABILITY_STATUS.DEMO,
  /** CareDroid Sentinel — EMS command, AVL, durable alarms, AI review, analytics */
  sentinelHealth: BACKEND_CAPABILITY_STATUS.REAL,
  sentinelCommand: BACKEND_CAPABILITY_STATUS.REAL,
  sentinelAlarms: BACKEND_CAPABILITY_STATUS.REAL,
  sentinelInbound: BACKEND_CAPABILITY_STATUS.REAL,
  sentinelIngest: BACKEND_CAPABILITY_STATUS.REAL,
  sentinelAi: BACKEND_CAPABILITY_STATUS.REAL,
  sentinelAnalytics: BACKEND_CAPABILITY_STATUS.REAL,
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
