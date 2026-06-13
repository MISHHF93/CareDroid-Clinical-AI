import { apiFetchJson, getApiErrorMessage } from './apiClient';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';
import { AIConfigRegistry, AISafetyRules } from '../config/ai.config';

async function guardedJson(path, options = {}) {
  if (!isBackendCapabilityEnabled('aiGovernance')) {
    return { ok: false, data: null, message: 'Backend AI governance endpoint is not available yet.' };
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
  return guardedJson('/api/v1/governance/registry');
}

export function fetchAIGovernanceSafetyRules() {
  return guardedJson('/api/v1/governance/safety-rules');
}

export function fetchEmergencyGovernanceCompliance(days = 30) {
  const params = new URLSearchParams({ days: String(days) });
  return guardedJson(`/api/v1/governance/compliance?${params.toString()}`);
}

export function fetchEmergencyGovernanceViolations(limit = 50) {
  const params = new URLSearchParams({ limit: String(limit) });
  return guardedJson(`/api/v1/governance/violations?${params.toString()}`);
}

export function validateEmergencyGovernancePrompts() {
  return guardedJson('/api/v1/governance/validate-prompts');
}

export default Object.freeze({
  fetchAIGovernanceRegistry,
  fetchAIGovernanceSafetyRules,
  fetchEmergencyGovernanceCompliance,
  fetchEmergencyGovernanceViolations,
  validateEmergencyGovernancePrompts,
  LOCAL_AI_GOVERNANCE_REGISTRY,
});
