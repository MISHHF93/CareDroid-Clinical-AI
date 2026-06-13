// Browser-safe compatibility surface for frontend imports. Runtime provider
// credentials and model selection remain backend-owned.
export type {
  AIPlatformConfig,
  AIPlatformServiceConfig,
  AIProviderConfig,
  AIProvider,
  AIRagConfig,
  AIRiskModelThresholds,
  GovernanceAIProvider,
  TenantAISettings,
} from '../../../lib/ai/config';

export {
  CARE_AI_PLATFORM_BUILD,
  DEFAULT_AI_ANOMALY_DETECTION_CONFIG,
  DEFAULT_AI_NLU_CONFIG,
  DEFAULT_AI_PROVIDER_CONFIG,
  DEFAULT_AI_RAG_CONFIG,
  DEFAULT_AI_RISK_THRESHOLDS,
  DEFAULT_TENANT_AI_SETTINGS,
  readAIPlatformConfig,
} from '../../../lib/ai/config';
