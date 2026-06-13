import { buildApiUrl, getApiErrorMessage, parseApiResponse } from './apiClient';

export const EMERGENCY_OS_API_ENDPOINTS = Object.freeze({
  whiteboard: '/api/emergency/whiteboard',
  patients: '/api/emergency/patients',
  journey: '/api/emergency/journey',
  ems: '/api/emergency/ems',
  intake: '/api/emergency/intake',
  queues: '/api/emergency/queues',
  reassessment: '/api/emergency/reassessment',
  capacity: '/api/emergency/capacity',
  boarding: '/api/emergency/boarding',
  referrals: '/api/emergency/referrals',
  provincialHealth: '/api/emergency/provincial-health',
  integrations: '/api/emergency/integrations',
  copilot: '/api/emergency/copilot',
  analytics: '/api/emergency/analytics',
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
});

async function requestEmergencyJson(path, options = {}) {
  try {
    const response = await fetch(buildApiUrl(path), {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
    });
    const data = await parseApiResponse(response, { fallback: {} });
    if (!response.ok) {
      throw new Error(data?.message || getApiErrorMessage(null, response));
    }
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error));
  }
}

export const fetchEmergencyWhiteboard = () => requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.whiteboard);
export const fetchEmergencyPatients = () => requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.patients);
export const fetchPatientJourney = () => requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.journey);
export const fetchEMSIntake = () => requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.ems);
export const fetchSmartIntake = () => requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.intake);
export const fetchEmergencyQueues = () => requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.queues);
export const fetchReassessmentQueue = () => requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.reassessment);
export const fetchCapacityStatus = () => requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.capacity);
export const fetchBoardingStatus = () => requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.boarding);
export const fetchReferrals = () => requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.referrals);
export const fetchProvincialHealth = () => requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.provincialHealth);
export const fetchIntegrationHub = () => requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.integrations);
export const fetchEDCopilot = () => requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.copilot);
export const fetchEmergencyAnalytics = () => requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.analytics);
export const fetchEmergencySettings = () => requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.settings);
export const updateRealTimeSimulationState = (state = {}) =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.simulationUpdateLive, {
    method: 'POST',
    body: JSON.stringify(state),
  });
export const evaluateRealTimeSimulationIntervention = (intervention = {}) =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.simulationEvaluate, {
    method: 'POST',
    body: JSON.stringify(intervention),
  });
export const compareRealTimeSimulationInterventions = (payload = {}) =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.simulationCompare, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
export const fetchRealTimeSimulationRecommendations = () =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.simulationRecommendations);
export const registerFederatedHospital = (hospital = {}) =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.federatedLearningRegister, {
    method: 'POST',
    body: JSON.stringify(hospital),
  });
export const submitFederatedModelUpdate = (update = {}) =>
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
    `${EMERGENCY_OS_API_ENDPOINTS.federatedLearningGlobalModel}/${encodeURIComponent(hospitalId)}`
  );
export const fetchFederatedLearningDashboard = () =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.federatedLearningDashboard);
export const initializeHybridDigitalTwin = (state = {}) =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.digitalTwinInitialize, {
    method: 'POST',
    body: JSON.stringify(state),
  });
export const simulateHybridDigitalTwin = (payload = {}) =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.digitalTwinSimulate, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
export const fetchHybridDigitalTwinState = () =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.digitalTwinState);
export const evaluateHybridDigitalTwinScenario = (payload = {}) =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.digitalTwinScenario, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const createEmergencyPatient = (patient) =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.patients, {
    method: 'POST',
    body: JSON.stringify(patient),
  });

export const createSmartIntakePatient = (patient) =>
  requestEmergencyJson(EMERGENCY_OS_API_ENDPOINTS.intake, {
    method: 'POST',
    body: JSON.stringify(patient),
  });

export default Object.freeze({
  EMERGENCY_OS_API_ENDPOINTS,
  fetchEmergencyWhiteboard,
  fetchEmergencyPatients,
  fetchPatientJourney,
  fetchEMSIntake,
  fetchSmartIntake,
  fetchEmergencyQueues,
  fetchReassessmentQueue,
  fetchCapacityStatus,
  fetchBoardingStatus,
  fetchReferrals,
  fetchProvincialHealth,
  fetchIntegrationHub,
  fetchEDCopilot,
  fetchEmergencyAnalytics,
  fetchEmergencySettings,
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
});
