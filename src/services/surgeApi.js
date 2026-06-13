import { apiFetchJson, getApiErrorMessage } from './apiClient';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';

const jsonHeaders = { 'content-type': 'application/json' };

async function guardedJson(path, options = {}) {
  if (!isBackendCapabilityEnabled('emergencySurge')) {
    return { ok: false, data: null, message: 'Backend surge endpoint is not available yet.' };
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

export function activateEmergencySurge(payload = {}) {
  return guardedJson('/api/emergency/surge/activate', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
}

export function batchEmergencyEmsIntake(patients, surgeEventId) {
  return guardedJson('/api/emergency/surge/batch-ems-intake', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ patients, surgeEventId }),
  });
}

export function fetchEmergencySurgeBottlenecks() {
  return guardedJson('/api/emergency/surge/bottlenecks');
}

export function deactivateEmergencySurge(surgeEventId, debriefNotes = '') {
  return guardedJson('/api/emergency/surge/deactivate', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ surgeEventId, debriefNotes }),
  });
}

export function fetchEmergencySurgeStatus() {
  return guardedJson('/api/emergency/surge/status');
}

export default Object.freeze({
  activateEmergencySurge,
  batchEmergencyEmsIntake,
  fetchEmergencySurgeBottlenecks,
  deactivateEmergencySurge,
  fetchEmergencySurgeStatus,
});
