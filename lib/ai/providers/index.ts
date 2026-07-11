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
