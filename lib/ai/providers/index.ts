export {
  completeViaEgress,
  getEgressHealth,
  normalizeEgressRequest,
  applyPatientContextGate,
  isPatientContextEnabled,
} from './egress';
export type { EgressResult, EgressRuntime, MetadataLogger } from './egress';
export type { PatientContextGateResult } from './patientContextGate';
export { minimizePhiText, minimizePhiMessages, minimizePhiRequest } from './phiMinimize';
export {
  getAdapter,
  listAdapterHealth,
  normalizeProviderId,
  resolveFallbackProvider,
  resolvePrimaryProvider,
} from './registry';
export type { LlmAdapter, LlmAdapterHealth, LlmAdapterRuntime, LlmProviderId } from './types';
export {
  DEFAULT_AI_REQUEST_TIMEOUT_MS,
  fetchWithTimeout,
  getProviderCircuit,
  listProviderCircuitSnapshots,
  readAiRequestTimeoutMs,
  resetAllProviderCircuits,
} from './transportSafety';
export type { CircuitSnapshot, CircuitState } from './transportSafety';
export { groqAdapter, GroqAdapter } from './groqAdapter';
