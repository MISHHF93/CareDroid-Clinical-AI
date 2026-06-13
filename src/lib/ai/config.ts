export type AIProvider = 'anthropic' | 'openai' | 'gemini' | 'local';

export interface TenantAISettings {
  aiEnabled: boolean;
  edCopilotEnabled: boolean;
  smartIntakeAiEnabled: boolean;
  referralAiEnabled: boolean;
  analyticsAiEnabled: boolean;
  clinicalWorkflowAiEnabled: boolean;
  aiAuditLoggingEnabled: boolean;
  aiPatientContextEnabled: boolean;
}

export interface AIProviderConfig {
  provider: AIProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  stream: boolean;
}

export const DEFAULT_TENANT_AI_SETTINGS: TenantAISettings = Object.freeze({
  aiEnabled: false,
  edCopilotEnabled: true,
  smartIntakeAiEnabled: false,
  referralAiEnabled: false,
  analyticsAiEnabled: false,
  clinicalWorkflowAiEnabled: false,
  aiAuditLoggingEnabled: true,
  aiPatientContextEnabled: false,
});

export const DEFAULT_AI_PROVIDER_CONFIG: AIProviderConfig = Object.freeze({
  provider: 'anthropic',
  model: 'backend-configured',
  temperature: 0.2,
  maxTokens: 2000,
  stream: false,
});
