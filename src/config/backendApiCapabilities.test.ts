import { describe, it, expect } from 'vitest';
import {
  BACKEND_API_CAPABILITIES,
  BACKEND_API_CAPABILITY_STATUS,
  BACKEND_CAPABILITY_STATUS,
  BACKEND_EXECUTOR_NLU_TOOL_IDS,
  getBackendCapabilityStatus,
  isBackendCapabilityEnabled,
  isBackendExecutorToolId,
} from './backendApiCapabilities';

describe('backendApiCapabilities', () => {
  it('enables only real orchestrator executors', () => {
    expect(BACKEND_EXECUTOR_NLU_TOOL_IDS).toEqual([
      'sofa-calculator',
      'drug-interactions',
      'lab-interpreter',
      'heart-score',
      'cha2ds2vasc-calculator',
      'wells-pe',
      'shock-index',
      'apache2-calculator',
      'anion-gap',
      'aa-gradient',
      'news2',
      'abcd2',
      'canadian-c-spine',
      'nexus-cspine',
      'gcs-calculator',
      'chads2',
      'duke-treadmill-score',
      'reynolds-risk-score',
      'has-bled',
      'timi-ua-nstemi',
      'framingham-risk',
      'grace-acs',
      'corrected-calcium',
      'corrected-sodium',
      'fena',
      'feurea',
      'osmolal-gap',
      'serum-osmolality',
      'pao2-fio2-ratio',
      'rox-index',
      'mews',
      'revised-trauma-score',
      'hunt-hess-scale',
      'ich-score',
      'four-score',
      'modified-rankin-scale',
      'pecarn-head',
      'wells-dvt-calculator',
      'abg-interpreter',
    ]);
    expect(isBackendExecutorToolId('qsofa')).toBe(false);
    expect(isBackendExecutorToolId('drug-interactions')).toBe(true);
  });

  it('disables phantom platform routes', () => {
    expect(isBackendCapabilityEnabled('toolsShareResults')).toBe(false);
    expect(isBackendCapabilityEnabled('teamManagement')).toBe(false);
    expect(isBackendCapabilityEnabled('bulkSync')).toBe(false);
    expect(isBackendCapabilityEnabled('chatPersistence')).toBe(false);
    expect(isBackendCapabilityEnabled('reportsSchedule')).toBe(false);
    expect(isBackendCapabilityEnabled('clinicalAlertsStream')).toBe(false);
    expect(isBackendCapabilityEnabled('emergencySmartIntakeIdentitySession')).toBe(false);
    expect(isBackendCapabilityEnabled('emergencyCapacityDashboard')).toBe(false);
    expect(isBackendCapabilityEnabled('emergencyCapacityHistory')).toBe(false);
    expect(isBackendCapabilityEnabled('emergencyQueueAnalytics')).toBe(false);
  });

  it('enables wired clinical routes', () => {
    expect(isBackendCapabilityEnabled('toolsExecute')).toBe(true);
    expect(isBackendCapabilityEnabled('chatMessage')).toBe(true);
    expect(isBackendCapabilityEnabled('complianceConsent')).toBe(true);
    expect(isBackendCapabilityEnabled('toolsResultsSync')).toBe(true);
    expect(isBackendCapabilityEnabled('userProfile')).toBe(true);
    expect(isBackendCapabilityEnabled('operationalProfile')).toBe(true);
    expect(isBackendCapabilityEnabled('workspaces')).toBe(true);
    expect(isBackendCapabilityEnabled('userActivity')).toBe(true);
    expect(isBackendCapabilityEnabled('personalization')).toBe(true);
    expect(isBackendCapabilityEnabled('trainingPipeline')).toBe(true);
    expect(isBackendCapabilityEnabled('evaluationFramework')).toBe(true);
    expect(isBackendCapabilityEnabled('costOptimization')).toBe(true);
    expect(isBackendCapabilityEnabled('clinicalAlerts')).toBe(true);
    expect(isBackendCapabilityEnabled('emergencyGovernance')).toBe(true);
    expect(isBackendCapabilityEnabled('emergencyCentralNode')).toBe(true);
    expect(isBackendCapabilityEnabled('emergencyWhiteboard')).toBe(true);
    expect(isBackendCapabilityEnabled('emergencyPatients')).toBe(true);
    expect(isBackendCapabilityEnabled('emergencyPatientJourney')).toBe(true);
    expect(isBackendCapabilityEnabled('emergencyQueues')).toBe(true);
    expect(isBackendCapabilityEnabled('emergencyCapacity')).toBe(true);
    expect(isBackendCapabilityEnabled('emergencyWorkflowAudit')).toBe(true);
    expect(isBackendCapabilityEnabled('emergencyIntegrationHub')).toBe(true);
    expect(isBackendCapabilityEnabled('emergencyProvincialHealth')).toBe(true);
    expect(isBackendCapabilityEnabled('emergencySmartIntake')).toBe(true);
    expect(isBackendCapabilityEnabled('emergencyPatients')).toBe(true);
    expect(isBackendCapabilityEnabled('emergencyReceptionSnapshot')).toBe(true);
    expect(getBackendCapabilityStatus('emergencyCentralNode')).toBe(BACKEND_CAPABILITY_STATUS.DEMO);
    // Corrected 2026-08-09 (HEAL-008): both compute from the same real
    // EmergencyPatientService.listPatients() list -- see backendApiCapabilities.ts's own comments.
    expect(getBackendCapabilityStatus('emergencyPatientJourney')).toBe(BACKEND_CAPABILITY_STATUS.REAL);
    expect(getBackendCapabilityStatus('emergencyQueues')).toBe(BACKEND_CAPABILITY_STATUS.REAL);
    expect(getBackendCapabilityStatus('emergencyBoarding')).toBe(BACKEND_CAPABILITY_STATUS.REAL);
    expect(getBackendCapabilityStatus('emergencyEmsRuntime')).toBe(BACKEND_CAPABILITY_STATUS.REAL);
    expect(getBackendCapabilityStatus('emergencyOperatingSurfaces')).toBe(BACKEND_CAPABILITY_STATUS.REAL);
    expect(getBackendCapabilityStatus('emergencyPatientFlow')).toBe(BACKEND_CAPABILITY_STATUS.REAL);
    expect(getBackendCapabilityStatus('emergencyReassessment')).toBe(BACKEND_CAPABILITY_STATUS.REAL);
    expect(getBackendCapabilityStatus('emergencyCopilotRuntime')).toBe(BACKEND_CAPABILITY_STATUS.REAL);
    expect(getBackendCapabilityStatus('emergencyDepartmentSettings')).toBe(BACKEND_CAPABILITY_STATUS.REAL);
    // Correctly still demo -- self-labeled prototype simulation, not a mislabel.
    expect(getBackendCapabilityStatus('emergencyAdvancedDecisionSupport')).toBe(BACKEND_CAPABILITY_STATUS.DEMO);
    // Corrected 2026-08-09: computes from the real TypeORM patient repository
    // (calculateEmergencyOsCapacity), not a fixture -- see backendApiCapabilities.ts's own comment.
    expect(getBackendCapabilityStatus('emergencyCapacity')).toBe(BACKEND_CAPABILITY_STATUS.REAL);
    expect(getBackendCapabilityStatus('emergencyIntegrationHub')).toBe(BACKEND_CAPABILITY_STATUS.DEMO);
    // Create/list/handoff intake path is a real session board mutator (not fixture-only demo).
    expect(getBackendCapabilityStatus('emergencySmartIntake')).toBe(BACKEND_CAPABILITY_STATUS.REAL);
    expect(getBackendCapabilityStatus('emergencyPatients')).toBe(BACKEND_CAPABILITY_STATUS.REAL);
    expect(getBackendCapabilityStatus('emergencyReceptionSnapshot')).toBe(BACKEND_CAPABILITY_STATUS.REAL);
    expect(getBackendCapabilityStatus('emergencyReceptionHandoff')).toBe(BACKEND_CAPABILITY_STATUS.REAL);
    expect(getBackendCapabilityStatus('emergencyReceptionEscalation')).toBe(BACKEND_CAPABILITY_STATUS.REAL);
    expect(isBackendCapabilityEnabled('emergencyReceptionEscalation')).toBe(true);
    expect(getBackendCapabilityStatus('emergencyOcrIntake')).toBe(BACKEND_CAPABILITY_STATUS.REAL);
    // PATCH /emergency/transfers/:id/status has been a real, DTO-validated
    // route since 2026-08-06 -- this flag was left DISABLED after that fix
    // landed, silently preventing ReferralPanel.tsx from ever calling it.
    expect(getBackendCapabilityStatus('emergencyTransferWorkflow')).toBe(BACKEND_CAPABILITY_STATUS.REAL);
    expect(isBackendCapabilityEnabled('emergencyTransferWorkflow')).toBe(true);
    // Corrected 2026-08-09 (HEAL-033): all 7 route through
    // EmergencyOperatingSurfacesService.getSurface(), which derives every
    // branch from already-verified-real patient/EMS/queue/analytics/referral/
    // workflow-log services -- no fixture/random data. See
    // backendApiCapabilities.ts's own comment for the full trace.
    expect(getBackendCapabilityStatus('emergencyDispatch')).toBe(BACKEND_CAPABILITY_STATUS.REAL);
    expect(getBackendCapabilityStatus('emergencyDiagnosticsView')).toBe(BACKEND_CAPABILITY_STATUS.REAL);
    expect(getBackendCapabilityStatus('emergencyHandoffsView')).toBe(BACKEND_CAPABILITY_STATUS.REAL);
    expect(getBackendCapabilityStatus('emergencyReportsView')).toBe(BACKEND_CAPABILITY_STATUS.REAL);
    expect(getBackendCapabilityStatus('emergencyPulseView')).toBe(BACKEND_CAPABILITY_STATUS.REAL);
    expect(getBackendCapabilityStatus('emergencyShiftView')).toBe(BACKEND_CAPABILITY_STATUS.REAL);
    expect(getBackendCapabilityStatus('emergencyEdReadinessView')).toBe(BACKEND_CAPABILITY_STATUS.REAL);
  });

  it('enables read-only live tracking contracts as demo-backed capabilities', () => {
    expect(isBackendCapabilityEnabled('fleetLiveTracking')).toBe(true);
    expect(isBackendCapabilityEnabled('fleetActiveRoutes')).toBe(true);
    expect(isBackendCapabilityEnabled('hospitalMap')).toBe(true);
    expect(isBackendCapabilityEnabled('medicalDeviceRegistry')).toBe(true);
    expect(isBackendCapabilityEnabled('telemetryLive')).toBe(true);
    expect(isBackendCapabilityEnabled('deviceAlerting')).toBe(true);
    expect(getBackendCapabilityStatus('fleetLiveTracking')).toBe(BACKEND_CAPABILITY_STATUS.DEMO);
    expect(getBackendCapabilityStatus('hospitalMap')).toBe(BACKEND_CAPABILITY_STATUS.DEMO);
    expect(getBackendCapabilityStatus('telemetryLive')).toBe(BACKEND_CAPABILITY_STATUS.DEMO);
    expect(getBackendCapabilityStatus('clinicalAlerts')).toBe(BACKEND_CAPABILITY_STATUS.DEMO);
  });

  it('marks Stripe billing as a real, live capability (HEAL)', () => {
    // subscriptions.service.ts makes real Stripe SDK calls -- previously
    // absent from this capability map entirely.
    expect(isBackendCapabilityEnabled('stripeBilling')).toBe(true);
    expect(getBackendCapabilityStatus('stripeBilling')).toBe(BACKEND_CAPABILITY_STATUS.REAL);
  });

  it('exports frozen capability map', () => {
    expect(Object.isFrozen(BACKEND_API_CAPABILITIES)).toBe(true);
    expect(Object.isFrozen(BACKEND_API_CAPABILITY_STATUS)).toBe(true);
  });
});
