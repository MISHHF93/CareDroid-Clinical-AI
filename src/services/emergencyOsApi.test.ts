import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetch = vi.hoisted(() => vi.fn());
const parseApiResponse = vi.hoisted(() => vi.fn());

vi.mock('./apiClient', () => ({
  apiFetch,
  getApiErrorMessage: (error) => error?.message || 'API error',
  parseApiResponse,
}));

const {
  ACTIVE_EMERGENCY_OS_API_ENDPOINT_KEYS,
  REVIEW_ONLY_EMERGENCY_OS_API_ENDPOINT_KEYS,
  aggregateFederatedLearningRound,
  compareRealTimeSimulationInterventions,
  fetchBoardingStatus,
  fetchCapacityStatus,
  fetchCareDroidCentralNodeSnapshot,
  fetchEDCopilot,
  fetchEMSIntake,
  evaluateHybridDigitalTwinScenario,
  evaluateRealTimeSimulationIntervention,
  fetchAdvancedEmergencyOsUpgradeHarness,
  fetchEmergencyAnalytics,
  fetchEmergencyAiGovernanceCompliance,
  fetchEmergencyAiGovernanceRegistry,
  fetchEmergencyAiGovernanceSafetyRules,
  fetchEmergencyPatients,
  fetchEmergencyQueues,
  fetchEmergencySettings,
  fetchEmergencyWhiteboard,
  fetchEmergencyWorkflowLogs,
  fetchIntegrationHub,
  fetchPatientJourney,
  fetchPatientWorkflowLogs,
  fetchCompleteImplementationReadiness,
  fetchEmergencyAiGovernanceViolations,
  fetchFederatedLearningDashboard,
  fetchFederatedLearningGlobalModel,
  fetchHybridDigitalTwinState,
  fetchProvincialHealth,
  fetchRealTimeSimulationRecommendations,
  fetchReassessmentQueue,
  fetchReferrals,
  fetchSmartIntake,
  fetchUpgradeHarnessAuditSummary,
  fetchUpgradeHarnessCapacity,
  fetchUpgradeHarnessClinicalIntelligence,
  fetchUpgradeHarnessPatientFlow,
  updateEmergencySettings,
  initializeHybridDigitalTwin,
  runSmartIntakeVerticalSlice,
  registerFederatedHospital,
  simulateHybridDigitalTwin,
  submitFederatedModelUpdate,
  updateRealTimeSimulationState,
  validateEmergencyAiGovernancePrompts,
} = await import('./emergencyOsApi');

describe('emergencyOsApi advanced CareDroid capabilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    parseApiResponse.mockResolvedValue({ status: 'ok' });
    apiFetch.mockResolvedValue({ ok: true });
  });

  it('marks active CareDroid page endpoints separately from review-only capabilities', () => {
    expect(ACTIVE_EMERGENCY_OS_API_ENDPOINT_KEYS).toEqual([
      'centralNodeSnapshot',
      'operationalIntelligenceSnapshot',
      'operationalIntelligenceModelHealth',
      'operationalIntelligenceAlerts',
      'operationalIntelligenceEvaluate',
      'whiteboard',
      'patients',
      'journey',
      'ems',
      'emsHandoff',
      'receptionSnapshot',
      'receptionHandoff',
      'triageAssist',
      'intake',
      'smartIntakeVerticalSlice',
      'queues',
      'reassessment',
      'patientFlow',
      'workflowOrchestration',
      'capacity',
      'boarding',
      'referrals',
      'provincialHealth',
      'integrations',
      'copilot',
      'copilotQuery',
      'copilotInteractions',
      'clinicalCalculatorResults',
      'patientOrchestration',
      'workflowLogs',
      'patientWorkflowLogs',
      'analytics',
      'aiGovernanceRegistry',
      'aiGovernanceCompliance',
      'aiGovernancePromptValidation',
      'settings',
      'operatingSurface',
    ]);
    expect(REVIEW_ONLY_EMERGENCY_OS_API_ENDPOINT_KEYS).toEqual(
      expect.arrayContaining([
        'simulationUpdateLive',
        'federatedLearningDashboard',
        'digitalTwinState',
        'aiGovernanceSafetyRules',
        'aiGovernanceViolations',
        'implementationReadiness',
        'upgradeHarness',
        'upgradeHarnessCapacity',
        'upgradeHarnessPatientFlow',
        'upgradeHarnessClinicalIntelligence',
        'upgradeHarnessAuditSummary',
      ]),
    );
  });

  it('calls the active CareDroid module endpoints through the canonical facade', async () => {
    const activeFetchers: Array<[() => Promise<unknown>, string]> = [
      [fetchCareDroidCentralNodeSnapshot, '/api/emergency/central-node/snapshot'],
      [fetchEmergencyWhiteboard, '/api/emergency/whiteboard'],
      [fetchEmergencyPatients, '/api/emergency/patients'],
      [fetchPatientJourney, '/api/emergency/journey'],
      [fetchEMSIntake, '/api/emergency/ems'],
      [fetchSmartIntake, '/api/emergency/intake'],
      [fetchEmergencyQueues, '/api/emergency/queues'],
      [fetchReassessmentQueue, '/api/emergency/reassessment'],
      [fetchCapacityStatus, '/api/emergency/capacity'],
      [fetchBoardingStatus, '/api/emergency/boarding'],
      [fetchReferrals, '/api/emergency/referrals'],
      [fetchProvincialHealth, '/api/emergency/provincial-health'],
      [fetchIntegrationHub, '/api/emergency/integrations'],
      [fetchEDCopilot, '/api/emergency/copilot'],
      [fetchEmergencyAnalytics, '/api/emergency/analytics'],
      [fetchEmergencySettings, '/api/emergency/settings'],
    ];

    for (const [fetcher] of activeFetchers) {
      await fetcher();
    }

    activeFetchers.forEach(([, path], index) => {
      expect(apiFetch).toHaveBeenNthCalledWith(
        index + 1,
        path,
        expect.objectContaining({
          headers: expect.objectContaining({ Accept: 'application/json' }),
        }),
      );
    });
  });

  it('calls the real-time simulation endpoints', async () => {
    await updateRealTimeSimulationState({ census: 55 });
    await evaluateRealTimeSimulationIntervention({ type: 'open_fast_track' });
    await compareRealTimeSimulationInterventions({});
    await fetchRealTimeSimulationRecommendations();

    expect(apiFetch).toHaveBeenNthCalledWith(
      1,
      '/api/emergency/simulation/update-live',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ census: 55 }) }),
    );
    expect(apiFetch).toHaveBeenNthCalledWith(
      2,
      '/api/emergency/simulation/evaluate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ type: 'open_fast_track' }),
      }),
    );
    expect(apiFetch).toHaveBeenNthCalledWith(
      3,
      '/api/emergency/simulation/compare',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(apiFetch).toHaveBeenNthCalledWith(
      4,
      '/api/emergency/simulation/recommendations',
      expect.objectContaining({ headers: expect.objectContaining({ Accept: 'application/json' }) }),
    );
  });

  it('calls the federated learning endpoints', async () => {
    await registerFederatedHospital({ hospitalId: 'h1' });
    await submitFederatedModelUpdate({ hospitalId: 'h1', weights: { intercept: 0.2 } });
    await aggregateFederatedLearningRound();
    await fetchFederatedLearningGlobalModel('h1');
    await fetchFederatedLearningDashboard();

    expect(apiFetch).toHaveBeenNthCalledWith(
      1,
      '/api/emergency/federated-learning/register',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(apiFetch).toHaveBeenNthCalledWith(
      2,
      '/api/emergency/federated-learning/update',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(apiFetch).toHaveBeenNthCalledWith(
      3,
      '/api/emergency/federated-learning/aggregate',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(apiFetch).toHaveBeenNthCalledWith(
      4,
      '/api/emergency/federated-learning/global-model/h1',
      expect.any(Object),
    );
    expect(apiFetch).toHaveBeenNthCalledWith(
      5,
      '/api/emergency/federated-learning/dashboard',
      expect.any(Object),
    );
  });

  it('calls the hybrid digital twin endpoints', async () => {
    await initializeHybridDigitalTwin({ twinId: 'twin-1' });
    await simulateHybridDigitalTwin({ includeTrace: true });
    await fetchHybridDigitalTwinState();
    await evaluateHybridDigitalTwinScenario({ interventions: [{ type: 'increase_staff' }] });

    expect(apiFetch).toHaveBeenNthCalledWith(
      1,
      '/api/emergency/digital-twin/initialize',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(apiFetch).toHaveBeenNthCalledWith(
      2,
      '/api/emergency/digital-twin/simulate',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(apiFetch).toHaveBeenNthCalledWith(
      3,
      '/api/emergency/digital-twin/state',
      expect.any(Object),
    );
    expect(apiFetch).toHaveBeenNthCalledWith(
      4,
      '/api/emergency/digital-twin/scenario',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('calls the Smart Intake vertical slice endpoint', async () => {
    await runSmartIntakeVerticalSlice({ patient: { id: 'patient-1' }, staffId: 'rn-1' });

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/emergency/intake/vertical-slice',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ patient: { id: 'patient-1' }, staffId: 'rn-1' }),
      }),
    );
  });

  it('fetches CareDroid workflow audit logs', async () => {
    await fetchEmergencyWorkflowLogs();

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/emergency/workflow-logs',
      expect.objectContaining({ headers: expect.objectContaining({ Accept: 'application/json' }) }),
    );
  });

  it('fetches patient-scoped CareDroid workflow audit logs', async () => {
    await fetchPatientWorkflowLogs('patient 1');

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/emergency/patients/patient%201/workflow-logs',
      expect.objectContaining({ headers: expect.objectContaining({ Accept: 'application/json' }) }),
    );
  });

  it('fetches the review-only complete implementation readiness contract', async () => {
    await fetchCompleteImplementationReadiness();

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/emergency/implementation-readiness',
      expect.objectContaining({ headers: expect.objectContaining({ Accept: 'application/json' }) }),
    );
  });

  it('fetches the canonical Advanced CareDroid upgrade harness endpoints', async () => {
    await fetchAdvancedEmergencyOsUpgradeHarness();
    await fetchUpgradeHarnessCapacity();
    await fetchUpgradeHarnessPatientFlow('patient 1');
    await fetchUpgradeHarnessClinicalIntelligence('patient 1');
    await fetchUpgradeHarnessAuditSummary();

    expect(apiFetch).toHaveBeenNthCalledWith(
      1,
      '/api/emergency/upgrade-harness',
      expect.objectContaining({ headers: expect.objectContaining({ Accept: 'application/json' }) }),
    );
    expect(apiFetch).toHaveBeenNthCalledWith(
      2,
      '/api/emergency/upgrade-harness/capacity',
      expect.objectContaining({ headers: expect.objectContaining({ Accept: 'application/json' }) }),
    );
    expect(apiFetch).toHaveBeenNthCalledWith(
      3,
      '/api/emergency/upgrade-harness/patient-flow/patient%201',
      expect.any(Object),
    );
    expect(apiFetch).toHaveBeenNthCalledWith(
      4,
      '/api/emergency/upgrade-harness/clinical-intelligence/patient%201',
      expect.any(Object),
    );
    expect(apiFetch).toHaveBeenNthCalledWith(
      5,
      '/api/emergency/upgrade-harness/audit-summary',
      expect.any(Object),
    );
  });

  it('fetches the canonical CareDroid AI governance endpoints', async () => {
    await fetchEmergencyAiGovernanceRegistry();
    await fetchEmergencyAiGovernanceSafetyRules();
    await fetchEmergencyAiGovernanceCompliance(14);
    await fetchEmergencyAiGovernanceViolations(5);
    await validateEmergencyAiGovernancePrompts();

    expect(apiFetch).toHaveBeenNthCalledWith(
      1,
      '/api/emergency/governance/registry',
      expect.objectContaining({ headers: expect.objectContaining({ Accept: 'application/json' }) }),
    );
    expect(apiFetch).toHaveBeenNthCalledWith(
      2,
      '/api/emergency/governance/safety-rules',
      expect.any(Object),
    );
    expect(apiFetch).toHaveBeenNthCalledWith(
      3,
      '/api/emergency/governance/compliance?days=14',
      expect.any(Object),
    );
    expect(apiFetch).toHaveBeenNthCalledWith(
      4,
      '/api/emergency/governance/violations?limit=5',
      expect.any(Object),
    );
    expect(apiFetch).toHaveBeenNthCalledWith(
      5,
      '/api/emergency/governance/validate-prompts',
      expect.any(Object),
    );
  });

  it('updates CareDroid settings through the canonical facade', async () => {
    await updateEmergencySettings({ tenantName: 'North Command ED' });

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/emergency/settings',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ tenantName: 'North Command ED' }),
      }),
    );
  });
});
