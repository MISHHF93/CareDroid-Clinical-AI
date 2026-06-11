import { registerAs } from '@nestjs/config';
import { UNIFIED_AI_MODEL } from '../../../lib/ai/client';

export default registerAs('ai', () => ({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: UNIFIED_AI_MODEL,
  temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
  maxTokens: parseInt(process.env.AI_MAX_TOKENS || '2000', 10),

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

  systemPrompt: `You are a medical AI assistant integrated into CareDroid Clinical Companion.
Your role is to provide evidence-based clinical information, structured outputs, and decision support.
Always return responses in valid JSON format matching the requested schema.
Never provide medical diagnoses or replace professional medical judgment.
Include relevant citations and confidence levels when applicable.`,
}));
