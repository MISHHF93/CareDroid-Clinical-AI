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
  // TwoFactorController is mounted and every route is in
  // backendHttpRouteInventory; it simply had no caller until the security
  // settings page shipped.
  twoFactor: BACKEND_CAPABILITY_STATUS.REAL,
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
  /**
   * Corrected 2026-08-09 (HEAL-008): EmergencyOsController.getJourney() calls
   * PatientJourneyService.getJourney(), which builds journey events entirely
   * from EmergencyPatientService.listPatients() -- the same real, always-on
   * TypeORM-backed patient list emergencyCapacity was already corrected for.
   * No fixture/demo data anywhere in this path.
   */
  emergencyPatientJourney: BACKEND_CAPABILITY_STATUS.REAL,
  /**
   * Corrected 2026-08-09 (HEAL-008): EmergencyOsController.getQueues() calls
   * QueueIntelligenceService.getQueues(), which buckets the same real
   * EmergencyPatientService.listPatients() list by patient.state -- no
   * fixture data.
   */
  emergencyQueues: BACKEND_CAPABILITY_STATUS.REAL,
  /**
   * Corrected 2026-08-09: EmergencyOsController.getCapacity() calls
   * CapacityService.getCapacity() (backend/src/modules/emergency-os/
   * emergency-os.services.ts), which computes capacity from
   * EmergencyPatientService.computeCapacity() -- the real, always-on
   * TypeORM patient repository via calculateEmergencyOsCapacity()
   * (lib/emergency-os/logic.ts), not a fixture. Was mislabeled DEMO
   * alongside the genuinely-fixture-backed EmergencyOsController siblings;
   * this one specifically has been directly verified real.
   */
  emergencyCapacity: BACKEND_CAPABILITY_STATUS.REAL,
  /**
   * Corrected 2026-08-09 (HEAL-008): EmergencyOsController.getBoarding() calls
   * BoardingService.getBoarding(), which filters the same real
   * EmergencyPatientService.listPatients() list by isBoarding() -- no fixture
   * data. (The separate Mongoose-gated BoardingController sub-routes --
   * track-decision/metrics/report/etc. -- remain a distinct, optional tier;
   * this key covers only the always-on GET /emergency/boarding route.)
   */
  emergencyBoarding: BACKEND_CAPABILITY_STATUS.REAL,
  /**
   * Corrected 2026-08-09 (HEAL-008): EmergencyOsController.getEMS() calls
   * EMSIntakeService.getEMSIntake(), which derives EMS arrivals from the same
   * real EmergencyPatientService.listPatients() list (filtered by EMS
   * flags/complaint text) -- no fixture data. (The separate Mongoose-gated
   * EmsController sub-routes -- alert/status/arrive/incoming -- remain a
   * distinct, optional tier with zero real frontend callers; this key covers
   * only the always-on GET /emergency/ems route.)
   */
  emergencyEmsRuntime: BACKEND_CAPABILITY_STATUS.REAL,
  /**
   * Corrected 2026-08-09 (HEAL-008): EmergencyOsController.getOperatingSurface()
   * calls EmergencyOperatingSurfacesService.getSurface(), whose baseContext()
   * assembles real patients/alerts/capacity/EMS/queues/analytics/referrals --
   * every one of them already-verified real, TypeORM/EmergencyPatientService-
   * backed sources -- no fixture data.
   */
  emergencyOperatingSurfaces: BACKEND_CAPABILITY_STATUS.REAL,
  /**
   * Corrected 2026-08-09 (HEAL-033, continuing HEAL-008's per-key trace): all 7
   * of these route through EmergencyOsController.getOperatingSurface() ->
   * EmergencyOperatingSurfacesService.getSurface(surfaceId), whose 'dispatch'/
   * 'diagnostics'/'handoffs'/'reports'/'department-pulse'/'shift-summary'/
   * 'ed-readiness' switch branches each derive their response exclusively from
   * baseContext() -- which itself only calls already-verified-real services
   * (EmergencyPatientService.listPatients()/listStaff()/listAlerts()/
   * computeCapacity(), EMSIntakeService.getEMSIntake(), QueueIntelligenceService
   * .getQueues(), EmergencyAnalyticsService.getAnalytics(), ReferralService
   * .getReferrals(), WorkflowActionLogService.listLogs()). No fixture/random/
   * seeded values anywhere in the switch statement itself. ('diagnostics'/
   * 'handoffs' additionally pull workflowTasks from WorkflowOrchestrationService
   * .getWorkflowOrchestration(), which independently also traces to the same
   * real patient/referral/EMS sources plus a persisted task queue -- not yet
   * individually corrected as its own emergencyWorkflowOrchestration key since
   * that key also has its own separate frontend callers needing their own
   * trace; flagged for a future round, not guessed at here.)
   */
  emergencyDispatch: BACKEND_CAPABILITY_STATUS.REAL,
  emergencyDiagnosticsView: BACKEND_CAPABILITY_STATUS.REAL,
  emergencyHandoffsView: BACKEND_CAPABILITY_STATUS.REAL,
  emergencyReportsView: BACKEND_CAPABILITY_STATUS.REAL,
  emergencyPulseView: BACKEND_CAPABILITY_STATUS.REAL,
  emergencyShiftView: BACKEND_CAPABILITY_STATUS.REAL,
  emergencyEdReadinessView: BACKEND_CAPABILITY_STATUS.REAL,
  /** Snapshot is built from live listPatients + queues after create/handoff. */
  emergencyReceptionSnapshot: BACKEND_CAPABILITY_STATUS.REAL,
  emergencyReceptionHandoff: BACKEND_CAPABILITY_STATUS.REAL,
  /** POST /api/emergency/reception/escalation — durable alert + realtime fan-out */
  emergencyReceptionEscalation: BACKEND_CAPABILITY_STATUS.REAL,
  emergencyTriageAssist: BACKEND_CAPABILITY_STATUS.REAL,
  emergencyOperationalIntelligence: BACKEND_CAPABILITY_STATUS.DEMO,
  emergencyPatientOrchestration: BACKEND_CAPABILITY_STATUS.REAL,
  /**
   * Corrected 2026-08-09 (HEAL-008, round 2): EmergencyOsController.getPatientFlow()
   * calls PatientFlowService.buildSnapshot(), which draws only on real
   * EmergencyPatientService.listPatients()/listStaff()/computeCapacity() and
   * ReferralService.getReferrals() -- all already-verified real sources.
   * buildBackendPatientFlowSnapshot() (emergency-os.flow-snapshots.ts) contains
   * no fixture/demo/random data. The optional OperationalIntelligenceService
   * dependency is used only to publish a realtime side-effect signal, never to
   * source snapshot data.
   */
  emergencyPatientFlow: BACKEND_CAPABILITY_STATUS.REAL,
  emergencyWorkflowOrchestration: BACKEND_CAPABILITY_STATUS.DEMO,
  careDroidUnifiedAINode: BACKEND_CAPABILITY_STATUS.DEMO,
  emergencyWorkflowAudit: BACKEND_CAPABILITY_STATUS.DEMO,
  emergencyIntegrationHub: BACKEND_CAPABILITY_STATUS.DEMO,
  emergencyProvincialHealth: BACKEND_CAPABILITY_STATUS.DEMO,
  aiGovernance: BACKEND_CAPABILITY_STATUS.REAL,
  emergencyGovernance: BACKEND_CAPABILITY_STATUS.REAL,
  /**
   * Corrected 2026-08-09 (HEAL-008, round 2): EmergencyOsController.getReassessment()
   * calls ReassessmentService.getReassessmentQueue(), which filters the same
   * real EmergencyPatientService.listPatients() list by the ReassessmentDue
   * flag -- no fixture data.
   */
  emergencyReassessment: BACKEND_CAPABILITY_STATUS.REAL,
  /**
   * HEAL-347.40: SurgeController (backend/src/modules/surge/surge.controller.ts)
   * is a real, live route backed by SurgeCapacityService -- not a stub -- but
   * this flag stayed DISABLED, so surgeApi.ts's guardedJson() short-circuited
   * every surge call (status/activate/deactivate/bottlenecks/batch-ems-intake)
   * to a hardcoded null before ever reaching the network, regardless of
   * backend health. Confirmed live: ExecutiveCommandCenter's "Surge active"
   * badge was permanently null with no error shown. The controller does
   * additionally require a live Mongoose/MongoDB connection
   * (assertMongoReady() -- confirmed via live curl, returns a real 503
   * DEPENDENCY_UNAVAILABLE with an actionable message when Mongo isn't
   * configured) -- but that's a legitimate degraded-service response the
   * frontend's guardedJson already surfaces via data?.error, the same way
   * any other REAL capability's transient failure is handled. Silently
   * discarding it before the request even fires was strictly worse.
   */
  emergencySurge: BACKEND_CAPABILITY_STATUS.REAL,
  /** POST /api/emergency/intake createFromIntake is a real board mutator. */
  emergencySmartIntake: BACKEND_CAPABILITY_STATUS.REAL,
  emergencySmartIntakeIdentitySession: BACKEND_CAPABILITY_STATUS.DISABLED,
  emergencyOcrIntake: BACKEND_CAPABILITY_STATUS.REAL,
  /** POST /api/emergency/waiting-room-safety/escalation-notify -- real email out-of-band channel. */
  waitingRoomEscalationNotify: BACKEND_CAPABILITY_STATUS.REAL,
  /**
   * Corrected 2026-08-09 (HEAL-008, round 3): EmergencyOsController.queryCopilot()
   * (POST copilot/query) delegates to ChatService.processMessage() -- the same
   * real canonical AI dispatcher the live ED Copilot UI uses (post the
   * 2026-08-08 AI-Runtime Convergence fix) -- not a fixture response.
   * listCopilotInteractions() (GET copilot/interactions) reads a real,
   * in-memory interaction log populated by real DTO-driven writes
   * (ClinicalDecisionSupportService.recordCopilotInteraction()), not seeded
   * fixture data. No feature-flag/Mongoose gate on either route.
   */
  emergencyCopilotRuntime: BACKEND_CAPABILITY_STATUS.REAL,
  /** Optional / absent CareDroid routes; keep frontend clients from calling them until mounted. */
  emergencyCapacityDashboard: BACKEND_CAPABILITY_STATUS.DISABLED,
  emergencyCapacityHistory: BACKEND_CAPABILITY_STATUS.DISABLED,
  emergencyQueueAnalytics: BACKEND_CAPABILITY_STATUS.DISABLED,
  /**
   * Checked 2026-08-09 (HEAL-008, round 3) -- correctly left DEMO, not a
   * mislabel. Covers real simulation/federated-learning/digital-twin
   * computation, but HybridDigitalTwinService.initialize() defaults its own
   * twinId to 'ed-hybrid-des-abm-twin-demo' and every response explicitly
   * carries a self-reported productionGaps() disclosure -- this subsystem
   * honestly self-classifies as a demo/prototype simulation engine, unlike
   * the 7 EmergencyPatientService-backed keys corrected above.
   */
  emergencyAdvancedDecisionSupport: BACKEND_CAPABILITY_STATUS.DEMO,
  emergencyReferralPersistence: BACKEND_CAPABILITY_STATUS.REAL,
  emergencyReferralHistory: BACKEND_CAPABILITY_STATUS.DISABLED,
  /** PATCH /emergency/transfers/:id/status has been a real, DTO-validated
   * route since 2026-08-06 (emergency-os.controller.ts's updateTransferStatus).
   * This flag was left DISABLED after that fix landed, so ReferralPanel.tsx's
   * updateEmergencyTransferWorkflow() has never actually attempted the call --
   * every TransferRequested/TransportArranged/PatientDeparted transition has
   * been synced only to local Zustand state, never persisted server-side. */
  emergencyTransferWorkflow: BACKEND_CAPABILITY_STATUS.REAL,
  emergencyDiversionStatus: BACKEND_CAPABILITY_STATUS.DISABLED,
  /**
   * Corrected 2026-08-09 (HEAL-008, round 3): EmergencyOsController.getSettings()/
   * updateSettings() (GET/PATCH settings) read/write EmergencySettingsService's
   * real, tenant-scoped, in-memory settings store -- the same "in-memory +
   * real mutation logic = REAL, not a fixture" standard already applied to
   * emergencyPatients/emergencyReceptionSnapshot elsewhere in this file. No
   * feature-flag gate.
   */
  emergencyDepartmentSettings: BACKEND_CAPABILITY_STATUS.REAL,
  /**
   * Checked 2026-08-09 (HEAL-008, round 3) -- correctly left DEMO. Unlike
   * emergencyDepartmentSettings above (which has real frontend callers --
   * emergencySettingsApi.js/EmergencySettings.jsx), these 4 keys have zero
   * references anywhere in the frontend outside this file itself -- no
   * evidence of what UI/feature they're meant to gate, so no verdict can be
   * reached without guessing. Left un-traced rather than assumed.
   */
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
  /**
   * subscriptions.service.ts makes real, config-gated Stripe SDK calls
   * (stripe.customers.create/checkout.sessions.create/
   * billingPortal.sessions.create) via BillingPage.tsx/Settings.tsx's
   * subscriptionApi.ts -- the single most real, most-live integration in
   * this codebase, previously absent from this capability map entirely.
   */
  stripeBilling: BACKEND_CAPABILITY_STATUS.REAL,
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
