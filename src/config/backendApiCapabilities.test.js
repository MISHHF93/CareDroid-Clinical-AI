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
    expect(isBackendCapabilityEnabled('emergencyQueues')).toBe(true);
    expect(isBackendCapabilityEnabled('emergencyCapacity')).toBe(true);
    expect(isBackendCapabilityEnabled('emergencySmartIntake')).toBe(true);
    expect(getBackendCapabilityStatus('emergencyQueues')).toBe(BACKEND_CAPABILITY_STATUS.DEMO);
    expect(getBackendCapabilityStatus('emergencyCapacity')).toBe(BACKEND_CAPABILITY_STATUS.DEMO);
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
