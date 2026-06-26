import { apiFetchJson, getApiErrorMessage } from './apiClient';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';
import { AIConfigRegistry, AISafetyRules } from '../config/ai.config';

const EMERGENCY_GOVERNANCE_API_ROOT = '/api/emergency/governance';

async function guardedJson(path, options: any = {}) {
  if (!isBackendCapabilityEnabled('emergencyGovernance')) {
    return { ok: false, data: null, message: 'Backend AI governance endpoint is not available yet.' };
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

export const LOCAL_AI_GOVERNANCE_REGISTRY = Object.freeze({
  services: AIConfigRegistry,
  promptTemplates: {},
  safetyRules: AISafetyRules,
  storageMode: 'frontend-local-fallback',
  governanceFrameworks: [
    'NIST AI RMF',
    'WHO AI healthcare guidance',
    'HIPAA Security Rule',
    'FDA SaMD',
  ],
});

export function fetchAIGovernanceRegistry() {
  return guardedJson(`${EMERGENCY_GOVERNANCE_API_ROOT}/registry`);
}

export function fetchAIGovernanceSafetyRules() {
  return guardedJson(`${EMERGENCY_GOVERNANCE_API_ROOT}/safety-rules`);
}

export function fetchEmergencyGovernanceCompliance(days = 30) {
  const params = new URLSearchParams({ days: String(days) });
  return guardedJson(`${EMERGENCY_GOVERNANCE_API_ROOT}/compliance?${params.toString()}`);
}

export function fetchEmergencyGovernanceViolations(limit = 50) {
  const params = new URLSearchParams({ limit: String(limit) });
  return guardedJson(`${EMERGENCY_GOVERNANCE_API_ROOT}/violations?${params.toString()}`);
}

export function validateEmergencyGovernancePrompts() {
  return guardedJson(`${EMERGENCY_GOVERNANCE_API_ROOT}/validate-prompts`);
}

export default Object.freeze({
  fetchAIGovernanceRegistry,
  fetchAIGovernanceSafetyRules,
  fetchEmergencyGovernanceCompliance,
  fetchEmergencyGovernanceViolations,
  validateEmergencyGovernancePrompts,
  LOCAL_AI_GOVERNANCE_REGISTRY,
});
