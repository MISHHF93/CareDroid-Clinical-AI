import { registerAs } from '@nestjs/config';
import { readAIProviderConfig, readTenantAISettings } from '../../../lib/ai/config';
import { getAIPrompt } from '../../../lib/ai/promptRegistry';
import { AIConfigRegistry, AISafetyRules, PromptTemplateRegistry } from './ai-governance.registry';

export {
  AIConfigRegistry,
  AISafetyRules,
  PromptTemplateRegistry,
  type AIServiceConfig,
  type AIPromptTemplate,
} from './ai-governance.registry';

const providerConfig = readAIProviderConfig();
const tenantSettings = readTenantAISettings();

export default registerAs('ai', () => ({
  apiKey: process.env.ANTHROPIC_API_KEY,
  provider: providerConfig.provider,
  model: providerConfig.model,
  temperature: providerConfig.temperature,
  maxTokens: providerConfig.maxTokens,
  stream: providerConfig.stream,
  tenantSettings,

  // Rate limits per subscription tier
  rateLimits: {
    free: {
      dailyLimit: parseInt(process.env.AI_RATE_LIMIT_FREE || '10', 10),
      costPerQuery: 0.01,
    },
    professional: {
      dailyLimit: parseInt(process.env.AI_RATE_LIMIT_PRO || '1000', 10),
      costPerQuery: 0.01,
    },
    institutional: {
      dailyLimit: parseInt(process.env.AI_RATE_LIMIT_INSTITUTIONAL || '10000', 10),
      costPerQuery: 0.01,
    },
  },

  systemPrompt: getAIPrompt('ed-copilot').prompt,
  services: AIConfigRegistry,
  promptTemplates: PromptTemplateRegistry,
  safetyRules: AISafetyRules,
}));
