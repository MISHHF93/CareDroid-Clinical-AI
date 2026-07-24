import { apiFetch, getApiErrorMessage, parseApiResponse } from './apiClient';
import { serializePatientForBackendApi } from './patientArrivalBackendSync';
import logger from '../utils/logger';

/**
 * Canonical CareDroid frontend facade.
 *
 * Active pages should prefer the Nest `/api/emergency/*` endpoints listed in
 * ACTIVE_EMERGENCY_OS_API_ENDPOINT_KEYS. The review-only groups remain exported
 * for retained demos, placeholder connectors, and legacy audit coverage, but
 * they are not active navigation contracts.
 */
export const EMERGENCY_OS_API_ENDPOINTS = Object.freeze({
  centralNodeSnapshot: '/api/emergency/central-node/snapshot',
  operationalIntelligenceSnapshot: '/api/emergency/operational-intelligence/snapshot',
  operationalIntelligenceModelHealth: '/api/emergency/operational-intelligence/model-health',
  operationalIntelligenceAlerts: '/api/emergency/operational-intelligence/alerts',
  operationalIntelligenceEvaluate: '/api/emergency/operational-intelligence/evaluate',
  whiteboard: '/api/emergency/whiteboard',
  patients: '/api/emergency/patients',
  patientDocumentArtifacts: '/api/emergency/patients',
  journey: '/api/emergency/journey',
  ems: '/api/emergency/ems',
  emsHandoff: '/api/emergency/ems/handoff',
  receptionSnapshot: '/api/emergency/reception/snapshot',
  receptionHandoff: '/api/emergency/reception/handoff',
  receptionEscalation: '/api/emergency/reception/escalation',
  triageAssist: '/api/emergency/triage/assist',
  patientOrchestration: '/api/emergency/patients',
  intake: '/api/emergency/intake',
  smartIntakeVerticalSlice: '/api/emergency/intake/vertical-slice',
  queues: '/api/emergency/queues',
  reassessment: '/api/emergency/reassessment',
  patientFlow: '/api/emergency/patient-flow',
  workflowOrchestration: '/api/emergency/workflow-orchestration',
  capacity: '/api/emergency/capacity',
  boarding: '/api/emergency/boarding',
  referrals: '/api/emergency/referrals',
  provincialHealth: '/api/emergency/provincial-health',
  integrations: '/api/emergency/integrations',
  copilot: '/api/emergency/copilot',
  copilotQuery: '/api/emergency/copilot/query',
  copilotInteractions: '/api/emergency/copilot/interactions',
  clinicalCalculatorResults: '/api/emergency/clinical-calculators/results',
  workflowLogs: '/api/emergency/workflow-logs',
  patientWorkflowLogs: '/api/emergency/patients',
  implementationReadiness: '/api/emergency/implementation-readiness',
  analytics: '/api/emergency/analytics',
  aiGovernanceRegistry: '/api/emergency/governance/registry',
  aiGovernanceSafetyRules: '/api/emergency/governance/safety-rules',
  aiGovernanceCompliance: '/api/emergency/governance/compliance',
  aiGovernanceViolations: '/api/emergency/governance/violations',
  aiGovernancePromptValidation: '/api/emergency/governance/validate-prompts',
  upgradeHarness: '/api/emergency/upgrade-harness',
  upgradeHarnessCapacity: '/api/emergency/upgrade-harness/capacity',
  upgradeHarnessPatientFlow: '/api/emergency/upgrade-harness/patient-flow',
  upgradeHarnessClinicalIntelligence: '/api/emergency/upgrade-harness/clinical-intelligence',
  upgradeHarnessAuditSummary: '/api/emergency/upgrade-harness/audit-summary',
  simulationUpdateLive: '/api/emergency/simulation/update-live',
  simulationEvaluate: '/api/emergency/simulation/evaluate',
  simulationCompare: '/api/emergency/simulation/compare',
  simulationRecommendations: '/api/emergency/simulation/recommendations',
  federatedLearningRegister: '/api/emergency/federated-learning/register',
  federatedLearningUpdate: '/api/emergency/federated-learning/update',
  federatedLearningAggregate: '/api/emergency/federated-learning/aggregate',
  federatedLearningGlobalModel: '/api/emergency/federated-learning/global-model',
  federatedLearningDashboard: '/api/emergency/federated-learning/dashboard',
  digitalTwinInitialize: '/api/emergency/digital-twin/initialize',
  digitalTwinSimulate: '/api/emergency/digital-twin/simulate',
  digitalTwinState: '/api/emergency/digital-twin/state',
  digitalTwinScenario: '/api/emergency/digital-twin/scenario',
  settings: '/api/emergency/settings',
  operatingSurface: '/api/emergency/operating-surfaces',
});

export type OperatingSurfaceId =
  | 'dispatch'
  | 'department-pulse'
  | 'shift-summary'
  | 'diagnostics'
  | 'handoffs'
  | 'reports'
  | 'ed-readiness'
  | 'command-center'
  | 'alerts'
  | 'whiteboard';

export const ACTIVE_EMERGENCY_OS_API_ENDPOINT_KEYS = Object.freeze([
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
  'receptionEscalation',
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

export const REVIEW_ONLY_EMERGENCY_OS_API_ENDPOINT_KEYS = Object.freeze([
  'simulationUpdateLive',
  'simulationEvaluate',
  'simulationCompare',
  'simulationRecommendations',
  'federatedLearningRegister',
  'federatedLearningUpdate',
  'federatedLearningAggregate',
  'federatedLearningGlobalModel',
  'federatedLearningDashboard',
  'digitalTwinInitialize',
  'digitalTwinSimulate',
  'digitalTwinState',
  'digitalTwinScenario',
  'aiGovernanceSafetyRules',
  'aiGovernanceViolations',
  'implementationReadiness',
  'upgradeHarness',
  'upgradeHarnessCapacity',
  'upgradeHarnessPatientFlow',
  'upgradeHarnessClinicalIntelligence',
  'upgradeHarnessAuditSummary',
]);

async function requestEmergencyJson(path, options: any = {}) {
  try {
    const response = await apiFetch(path, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
    });
    const data = await parseApiResponse(response, { fallback: {} });
    if (!response?.ok) {
      throw new Error(data?.message || getApiErrorMessage(null, response));
    }
    return data;
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error));
  }
}

export const fetchEmergencyWhiteboard = () =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.whiteboard);
export const fetchCareDroidCentralNodeSnapshot = () =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.centralNodeSnapshot);
export const fetchOperationalIntelligenceSnapshot = () =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.operationalIntelligenceSnapshot);
export const fetchOperationalIntelligenceModelHealth = () =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.operationalIntelligenceModelHealth);
export const fetchOperationalIntelligenceAlerts = () =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.operationalIntelligenceAlerts);
export const evaluateOperationalIntelligence = (events = [] as any[]) =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.operationalIntelligenceEvaluate, {
    method: 'POST',
    body: JSON.stringify({ events }),
  });
export const fetchEmergencyPatients = () =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.patients);
export const fetchPatientJourney = () => requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.journey);
export const fetchEMSIntake = () => requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.ems);
export const postEmsHandoff = (payload) =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.emsHandoff, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
export const fetchReceptionSnapshot = () =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.receptionSnapshot);
export const postReceptionHandoff = (payload) =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.receptionHandoff, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
export const postReceptionEscalation = (payload) =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.receptionEscalation, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
export const postTriageAssist = (payload) =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.triageAssist, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
export const fetchPatientOrchestration = (patientId, role = 'physician') => {
  const params = new URLSearchParams({ role: String(role || 'physician') });
  return requestEmergencyJson(
    `${EMERGENCY_OS_API_ENDPOINTS.patientOrchestration}/${encodeURIComponent(patientId)}/orchestration?${params.toString()}`,
  );
};
export const fetchSmartIntake = () => requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.intake);
export const fetchEmergencyQueues = () => requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.queues);
export const fetchReassessmentQueue = () =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.reassessment);
export const fetchPatientFlow = (patientId?: string) =>
  requestEmergencyJson(
    patientId
      ? `${EMERGENCY_OS_API_ENDPOINTS.patientFlow}/${encodeURIComponent(patientId)}`
      : EMERGENCY_OS_API_ENDPOINTS.patientFlow,
  );
export const fetchWorkflowOrchestration = () =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.workflowOrchestration);
export const reviewWorkflowAutomation = (payload: Record<string, unknown>) =>
  requestEmergencyJson(`${EMERGENCY_OS_API_ENDPOINTS.workflowOrchestration}/review`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
export const fetchCapacityStatus = () => requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.capacity);
export const fetchBoardingStatus = () => requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.boarding);
export const fetchReferrals = () => requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.referrals);
export const fetchProvincialHealth = () =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.provincialHealth);
export const fetchIntegrationHub = () =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.integrations);
export const fetchEDCopilot = () => requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.copilot);
export const queryEmergencyCopilot = (payload: any = {}) =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.copilotQuery, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
export const recordCopilotInteraction = (payload: any = {}) =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.copilotInteractions, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
export const listCopilotInteractions = (patientId) => {
  const params = patientId ? new URLSearchParams({ patientId: String(patientId) }) : null;
  const path = params
    ? `${EMERGENCY_OS_API_ENDPOINTS.copilotInteractions}?${params.toString()}`
    : EMERGENCY_OS_API_ENDPOINTS.copilotInteractions;
  return requestEmergencyJson(path);
};
export const recordClinicalCalculatorResult = (payload: any = {}) =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.clinicalCalculatorResults, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
export const listClinicalCalculatorResults = ({ patientId, calculatorId }: any = {}) => {
  const params = new URLSearchParams();
  if (patientId) params.set('patientId', String(patientId));
  if (calculatorId) params.set('calculatorId', String(calculatorId));
  const query = params.toString();
  const path = query
    ? `${EMERGENCY_OS_API_ENDPOINTS.clinicalCalculatorResults}?${query}`
    : EMERGENCY_OS_API_ENDPOINTS.clinicalCalculatorResults;
  return requestEmergencyJson(path);
};

/** Fire-and-forget copilot audit trail — never blocks clinical UI. */
export function persistCopilotInteractionSafely(payload: any = {}) {
  void recordCopilotInteraction({
    requiresHumanReview: true,
    safetyCheckPassed: true,
    ...payload,
  }).catch((error) => {
    logger.warn('Failed to persist copilot interaction audit trail', {
      error: error instanceof Error ? error.message : String(error),
    });
  });
}
export const fetchEmergencyWorkflowLogs = () =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.workflowLogs);
export const fetchPatientWorkflowLogs = (patientId) =>
  requestEmergencyJson(
    `${EMERGENCY_OS_API_ENDPOINTS.patientWorkflowLogs}/${encodeURIComponent(patientId)}/workflow-logs`,
  );
export const fetchCompleteImplementationReadiness = () =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.implementationReadiness);
export const fetchEmergencyAnalytics = () =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.analytics);
export const fetchEmergencyOperatingSurface = (surfaceId: OperatingSurfaceId) =>
  requestEmergencyJson(
    `${EMERGENCY_OS_API_ENDPOINTS.operatingSurface}/${encodeURIComponent(surfaceId)}`,
  );
export const fetchEmergencyAiGovernanceRegistry = () =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.aiGovernanceRegistry);
export const fetchEmergencyAiGovernanceSafetyRules = () =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.aiGovernanceSafetyRules);
export const fetchEmergencyAiGovernanceCompliance = (days = 30) => {
  const params = new URLSearchParams({ days: String(days) });
  return requestEmergencyJson(
    `${EMERGENCY_OS_API_ENDPOINTS.aiGovernanceCompliance}?${params.toString()}`,
  );
};
export const fetchEmergencyAiGovernanceViolations = (limit = 50) => {
  const params = new URLSearchParams({ limit: String(limit) });
  return requestEmergencyJson(
    `${EMERGENCY_OS_API_ENDPOINTS.aiGovernanceViolations}?${params.toString()}`,
  );
};
export const validateEmergencyAiGovernancePrompts = () =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.aiGovernancePromptValidation);
export const fetchAdvancedEmergencyOsUpgradeHarness = () =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.upgradeHarness);
export const fetchUpgradeHarnessCapacity = () =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.upgradeHarnessCapacity);
export const fetchUpgradeHarnessPatientFlow = (patientId) =>
  requestEmergencyJson(
    patientId
      ? `${EMERGENCY_OS_API_ENDPOINTS.upgradeHarnessPatientFlow}/${encodeURIComponent(patientId)}`
      : EMERGENCY_OS_API_ENDPOINTS.upgradeHarnessPatientFlow,
  );
export const fetchUpgradeHarnessClinicalIntelligence = (patientId) =>
  requestEmergencyJson(
    patientId
      ? `${EMERGENCY_OS_API_ENDPOINTS.upgradeHarnessClinicalIntelligence}/${encodeURIComponent(patientId)}`
      : EMERGENCY_OS_API_ENDPOINTS.upgradeHarnessClinicalIntelligence,
  );
export const fetchUpgradeHarnessAuditSummary = () =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.upgradeHarnessAuditSummary);
export const fetchEmergencySettings = () =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.settings);
export const updateEmergencySettings = (settings: any = {}) =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.settings, {
    method: 'PATCH',
    body: JSON.stringify(settings),
  });
export const updateRealTimeSimulationState = (state: any = {}) =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.simulationUpdateLive, {
    method: 'POST',
    body: JSON.stringify(state),
  });
export const evaluateRealTimeSimulationIntervention = (intervention: any = {}) =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.simulationEvaluate, {
    method: 'POST',
    body: JSON.stringify(intervention),
  });
export const compareRealTimeSimulationInterventions = (payload: any = {}) =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.simulationCompare, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
export const fetchRealTimeSimulationRecommendations = () =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.simulationRecommendations);
export const registerFederatedHospital = (hospital: any = {}) =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.federatedLearningRegister, {
    method: 'POST',
    body: JSON.stringify(hospital),
  });
export const submitFederatedModelUpdate = (update: any = {}) =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.federatedLearningUpdate, {
    method: 'POST',
    body: JSON.stringify(update),
  });
export const aggregateFederatedLearningRound = () =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.federatedLearningAggregate, {
    method: 'POST',
    body: JSON.stringify({}),
  });
export const fetchFederatedLearningGlobalModel = (hospitalId) =>
  requestEmergencyJson(
    `${EMERGENCY_OS_API_ENDPOINTS.federatedLearningGlobalModel}/${encodeURIComponent(hospitalId)}`,
  );
export const fetchFederatedLearningDashboard = () =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.federatedLearningDashboard);
export const initializeHybridDigitalTwin = (state: any = {}) =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.digitalTwinInitialize, {
    method: 'POST',
    body: JSON.stringify(state),
  });
export const simulateHybridDigitalTwin = (payload: any = {}) =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.digitalTwinSimulate, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
export const fetchHybridDigitalTwinState = () =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.digitalTwinState);
export const evaluateHybridDigitalTwinScenario = (payload: any = {}) =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.digitalTwinScenario, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const createEmergencyPatient = (patient) =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.patients, {
    method: 'POST',
    body: JSON.stringify(serializePatientForBackendApi(patient)),
  });

export const createSmartIntakePatient = (patient) =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.intake, {
    method: 'POST',
    body: JSON.stringify(serializePatientForBackendApi(patient)),
  });

export const runSmartIntakeVerticalSlice = (payload: any = {}) =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.smartIntakeVerticalSlice, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export default Object.freeze({
  EMERGENCY_OS_API_ENDPOINTS,
  ACTIVE_EMERGENCY_OS_API_ENDPOINT_KEYS,
  REVIEW_ONLY_EMERGENCY_OS_API_ENDPOINT_KEYS,
  fetchCareDroidCentralNodeSnapshot,
  fetchOperationalIntelligenceSnapshot,
  fetchOperationalIntelligenceModelHealth,
  fetchOperationalIntelligenceAlerts,
  evaluateOperationalIntelligence,
  fetchEmergencyWhiteboard,
  fetchEmergencyPatients,
  fetchPatientJourney,
  fetchEMSIntake,
  fetchReceptionSnapshot,
  postReceptionHandoff,
  postReceptionEscalation,
  postTriageAssist,
  fetchSmartIntake,
  fetchEmergencyQueues,
  fetchReassessmentQueue,
  fetchPatientFlow,
  fetchWorkflowOrchestration,
  reviewWorkflowAutomation,
  fetchCapacityStatus,
  fetchBoardingStatus,
  fetchReferrals,
  fetchProvincialHealth,
  fetchIntegrationHub,
  fetchEDCopilot,
  queryEmergencyCopilot,
  recordCopilotInteraction,
  listCopilotInteractions,
  recordClinicalCalculatorResult,
  listClinicalCalculatorResults,
  persistCopilotInteractionSafely,
  fetchPatientOrchestration,
  fetchEmergencyWorkflowLogs,
  fetchPatientWorkflowLogs,
  fetchCompleteImplementationReadiness,
  fetchEmergencyAnalytics,
  fetchEmergencyAiGovernanceRegistry,
  fetchEmergencyAiGovernanceSafetyRules,
  fetchEmergencyAiGovernanceCompliance,
  fetchEmergencyAiGovernanceViolations,
  validateEmergencyAiGovernancePrompts,
  fetchAdvancedEmergencyOsUpgradeHarness,
  fetchUpgradeHarnessCapacity,
  fetchUpgradeHarnessPatientFlow,
  fetchUpgradeHarnessClinicalIntelligence,
  fetchUpgradeHarnessAuditSummary,
  fetchEmergencySettings,
  updateEmergencySettings,
  updateRealTimeSimulationState,
  evaluateRealTimeSimulationIntervention,
  compareRealTimeSimulationInterventions,
  fetchRealTimeSimulationRecommendations,
  registerFederatedHospital,
  submitFederatedModelUpdate,
  aggregateFederatedLearningRound,
  fetchFederatedLearningGlobalModel,
  fetchFederatedLearningDashboard,
  initializeHybridDigitalTwin,
  simulateHybridDigitalTwin,
  fetchHybridDigitalTwinState,
  evaluateHybridDigitalTwinScenario,
  createEmergencyPatient,
  createSmartIntakePatient,
  runSmartIntakeVerticalSlice,
});
