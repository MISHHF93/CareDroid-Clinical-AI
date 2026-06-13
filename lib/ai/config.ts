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
  model: 'claude-sonnet-4-20250514',
  temperature: 0.2,
  maxTokens: 2000,
  stream: false,
});

export function readAIProviderConfig(env: Record<string, string | undefined> = process.env): AIProviderConfig {
  return {
    provider: normalizeProvider(env.AI_PROVIDER || DEFAULT_AI_PROVIDER_CONFIG.provider),
    model: env.AI_MODEL || DEFAULT_AI_PROVIDER_CONFIG.model,
    temperature: parseNumber(env.AI_TEMPERATURE, DEFAULT_AI_PROVIDER_CONFIG.temperature),
    maxTokens: parseInteger(env.AI_MAX_TOKENS, DEFAULT_AI_PROVIDER_CONFIG.maxTokens),
    stream: env.AI_STREAMING_ENABLED === 'true',
  };
}

export function readTenantAISettings(
  env: Record<string, string | undefined> = process.env,
): TenantAISettings {
  return {
    aiEnabled: env.AI_ENABLED === 'true',
    edCopilotEnabled: env.ED_COPILOT_AI_ENABLED !== 'false',
    smartIntakeAiEnabled: env.SMART_INTAKE_AI_ENABLED === 'true',
    referralAiEnabled: env.REFERRAL_AI_ENABLED === 'true',
    analyticsAiEnabled: env.ANALYTICS_AI_ENABLED === 'true',
    clinicalWorkflowAiEnabled: env.CLINICAL_WORKFLOW_AI_ENABLED === 'true',
    aiAuditLoggingEnabled: env.AI_AUDIT_LOGGING_ENABLED !== 'false',
    aiPatientContextEnabled: env.AI_PATIENT_CONTEXT_ENABLED === 'true',
  };
}

function normalizeProvider(value: string): AIProvider {
  if (value === 'openai' || value === 'gemini' || value === 'local') return value;
  return 'anthropic';
}

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number.parseFloat(value || '');
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}
