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
    expect(getBackendCapabilityStatus('emergencyCentralNode')).toBe(BACKEND_CAPABILITY_STATUS.DEMO);
    expect(getBackendCapabilityStatus('emergencyPatientJourney')).toBe(BACKEND_CAPABILITY_STATUS.DEMO);
    expect(getBackendCapabilityStatus('emergencyQueues')).toBe(BACKEND_CAPABILITY_STATUS.DEMO);
    expect(getBackendCapabilityStatus('emergencyCapacity')).toBe(BACKEND_CAPABILITY_STATUS.DEMO);
    expect(getBackendCapabilityStatus('emergencyIntegrationHub')).toBe(BACKEND_CAPABILITY_STATUS.DEMO);
    expect(getBackendCapabilityStatus('emergencySmartIntake')).toBe(BACKEND_CAPABILITY_STATUS.DEMO);
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

  it('exports frozen capability map', () => {
    expect(Object.isFrozen(BACKEND_API_CAPABILITIES)).toBe(true);
    expect(Object.isFrozen(BACKEND_API_CAPABILITY_STATUS)).toBe(true);
  });
});
