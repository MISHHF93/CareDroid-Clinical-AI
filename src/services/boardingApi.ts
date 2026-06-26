import { apiFetchJson, getApiErrorMessage } from './apiClient';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';

const jsonHeaders = { 'content-type': 'application/json' };

async function guardedJson(path, options: any = {}) {
  if (!isBackendCapabilityEnabled('emergencyBoarding')) {
    return { ok: false, data: null, message: 'Backend boarding endpoint is not available yet.' };
  }

  try {
    const { response, data } = await apiFetchJson(path, options);
    if (!response.ok) {
      return { ok: false, data: null, message: data?.error || data?.message || getApiErrorMessage(null, response) };
    }
    return { ok: true, data, message: data?.message || '' };
  } catch (error: any) {
    return { ok: false, data: null, message: getApiErrorMessage(error) };
  }
}

export function trackBoardingDecision(patientId, clinicianId) {
  return guardedJson('/api/emergency/boarding/track-decision', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ patientId, clinicianId }),
  });
}

export function fetchBoardingMetrics() {
  return guardedJson('/api/emergency/boarding/metrics');
}

export function fetchBoardingReport() {
  return guardedJson('/api/emergency/boarding/report');
}

export function fetchBoardedPatients() {
  return guardedJson('/api/emergency/boarding/boarded');
}

export function fetchDischargeReadiness(patientId) {
  return guardedJson(`/api/emergency/boarding/discharge-readiness/${encodeURIComponent(patientId)}`);
}

export function fetchSameDayDischarges() {
  return guardedJson('/api/emergency/boarding/same-day-discharges');
}

export default Object.freeze({
  trackBoardingDecision,
  fetchBoardingMetrics,
  fetchBoardingReport,
  fetchBoardedPatients,
  fetchDischargeReadiness,
  fetchSameDayDischarges,
});
