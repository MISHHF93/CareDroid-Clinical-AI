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
  createEmergencyPatient,
  createSmartIntakePatient,
});
