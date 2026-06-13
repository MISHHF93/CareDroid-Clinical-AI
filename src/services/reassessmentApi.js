import { apiFetchJson, getApiErrorMessage } from './apiClient';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';

const jsonHeaders = { 'content-type': 'application/json' };

async function guardedJson(path, options = {}) {
  if (!isBackendCapabilityEnabled('emergencyReassessment')) {
    return { ok: false, data: null, message: 'Backend reassessment endpoint is not available yet.' };
  }

  try {
    const { response, data } = await apiFetchJson(path, options);
    if (!response.ok) {
      return { ok: false, data: null, message: data?.error || data?.message || getApiErrorMessage(null, response) };
    }
    return { ok: true, data, message: data?.message || '' };
  } catch (error) {
    return { ok: false, data: null, message: getApiErrorMessage(error) };
  }
}

export function fetchDueReassessments() {
  return guardedJson('/api/emergency/reassessment/due');
}

export function recordPatientReassessment(patientId, payload = {}) {
  return guardedJson(`/api/emergency/reassessment/${encodeURIComponent(patientId)}/reassess`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
}

export function dismissPatientReassessment(patientId, reason, clinician) {
  return guardedJson(`/api/emergency/reassessment/${encodeURIComponent(patientId)}/dismiss`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ reason, clinician }),
  });
}

export default Object.freeze({
  fetchDueReassessments,
  recordPatientReassessment,
  dismissPatientReassessment,
});
