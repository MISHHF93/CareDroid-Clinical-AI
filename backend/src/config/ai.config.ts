import { registerAs } from '@nestjs/config';
import { readAIProviderConfig, readTenantAISettings } from '../../../lib/ai/config';
import { getAIPrompt } from '../../../lib/ai/promptRegistry';
import { AIConfigRegistry, AISafetyRules, PromptTemplateRegistry } from './ai-governance.registry';
import { getEnvironmentConfig } from './environment.config';

export {
  AIConfigRegistry,
  AISafetyRules,
  PromptTemplateRegistry,
  type AIServiceConfig,
  type AIPromptTemplate,
} from './ai-governance.registry';

const providerConfig = readAIProviderConfig();
const tenantSettings = readTenantAISettings();

export default registerAs('ai', () => {
  const config = getEnvironmentConfig();

  return {
    apiKey: config.ai.anthropicApiKey,
    provider: providerConfig.provider,
    model: providerConfig.model,
    temperature: providerConfig.temperature,
    maxTokens: providerConfig.maxTokens,
    stream: providerConfig.stream,
    tenantSettings,

    // Rate limits per subscription tier
    rateLimits: {
      free: {
        dailyLimit: config.ai.rateLimits.free,
        costPerQuery: 0.01,
      },
      professional: {
        dailyLimit: config.ai.rateLimits.professional,
        costPerQuery: 0.01,
      },
      institutional: {
        dailyLimit: config.ai.rateLimits.institutional,
        costPerQuery: 0.01,
      },
    },

    systemPrompt: getAIPrompt('ed-copilot').prompt,
    services: AIConfigRegistry,
    promptTemplates: PromptTemplateRegistry,
    safetyRules: AISafetyRules,
  };
});
