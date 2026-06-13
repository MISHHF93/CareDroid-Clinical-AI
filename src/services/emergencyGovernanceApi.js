import { apiFetchJson, getApiErrorMessage } from './apiClient';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';

async function guardedJson(path, options = {}) {
  if (!isBackendCapabilityEnabled('emergencyGovernance')) {
    return { ok: false, data: null, message: 'Backend emergency governance endpoint is not available yet.' };
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

export function fetchEmergencyGovernanceCompliance(days = 30) {
  const params = new URLSearchParams({ days: String(days) });
  return guardedJson(`/api/emergency/governance/compliance?${params.toString()}`);
}

export function fetchEmergencyGovernanceViolations(limit = 50) {
  const params = new URLSearchParams({ limit: String(limit) });
  return guardedJson(`/api/emergency/governance/violations?${params.toString()}`);
}

export function validateEmergencyGovernancePrompts() {
  return guardedJson('/api/emergency/governance/validate-prompts');
}

export default Object.freeze({
  fetchEmergencyGovernanceCompliance,
  fetchEmergencyGovernanceViolations,
  validateEmergencyGovernancePrompts,
});
