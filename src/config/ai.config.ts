import { readAIPlatformConfig, type AIProvider, type GovernanceAIProvider } from '../lib/ai/config';

export interface AIServiceConfig {
  name: string;
  provider: AIProvider | GovernanceAIProvider | 'aws_bedrock';
  model: string;
  purpose: string;
  owner?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  regulatoryCategory?: string;
  requiresHumanReview: boolean;
  maxTokens: number;
  temperature: number;
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  safetyConstraints: string[];
  fallbackEnabled: boolean;
  auditLevel: 'none' | 'basic' | 'full';
}

export const AIConfigRegistry: Record<string, AIServiceConfig> = Object.freeze(
  Object.fromEntries(
    Object.entries(readAIPlatformConfig({}).services).map(([id, service]) => [
      id,
      {
        name: service.name,
        provider: service.provider,
        model: service.model,
        purpose: service.purpose,
        owner: service.owner,
        riskLevel: service.riskLevel,
        regulatoryCategory: service.regulatoryCategory,
        requiresHumanReview: service.requiresHumanReview,
        maxTokens: service.maxTokens,
        temperature: service.temperature,
        rateLimit: service.rateLimit,
        safetyConstraints: service.safetyConstraints,
        fallbackEnabled: service.fallbackEnabled,
        auditLevel: service.auditLevel,
      },
    ]),
  ),
);

export const AISafetyRules = Object.freeze({
  cannotLowerPriorityFor: {
    dpsScores: [1, 2],
    conditions: ['stroke', 'sepsis', 'chest_pain'],
    abnormalVitals: ['hr > 120', 'bp < 90/60', 'o2 < 92', 'rr > 24'],
  },
  requiredDisclaimers: [
    'Human review required',
    'Not a replacement for clinical judgment',
    'AI-generated content - verify before acting',
  ],
  rateLimits: {
    physician: { requestsPerMinute: 60 },
    nurse: { requestsPerMinute: 30 },
    charge_nurse: { requestsPerMinute: 45 },
    clerk: { requestsPerMinute: 10 },
    ems: { requestsPerMinute: 20 },
  },
});
