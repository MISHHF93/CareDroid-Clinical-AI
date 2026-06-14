/**
 * Backend governance adapter for the canonical Emergency OS AI configuration.
 * The source of truth lives in `lib/ai/config.ts` and `lib/ai/promptRegistry.ts`.
 */

import {
  EXTERNAL_DATA_REVIEW_DISCLAIMER,
  HUMAN_REVIEW_DISCLAIMER,
} from '../../../lib/ai/safetyPolicy';
import {
  readAIPlatformConfig,
  type AIPlatformServiceConfig,
  type GovernanceAIProvider,
} from '../../../lib/ai/config';
import { AI_PROMPT_REGISTRY } from '../../../lib/ai/promptRegistry';

export interface AIServiceConfig {
  name: string;
  provider: GovernanceAIProvider | 'aws_bedrock';
  model: string;
  purpose: string;
  owner: string;
  riskLevel: 'low' | 'medium' | 'high';
  regulatoryCategory: 'informational' | 'clinical_decision_support' | 'identity_resolution';
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
  status: AIPlatformServiceConfig['status'];
}

export interface AIPromptTemplate {
  id: string;
  name: string;
  version: string;
  template: string;
  variables: string[];
  validationRules: string[];
  lastValidated: string;
}

const platformConfig = readAIPlatformConfig();

export const AIConfigRegistry: Readonly<Record<string, AIServiceConfig>> = Object.freeze(
  Object.fromEntries(
    Object.entries(platformConfig.services).map(([id, service]) => [
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
        status: service.status,
      },
    ]),
  ),
);

export const PromptTemplateRegistry: Readonly<Record<string, AIPromptTemplate>> = Object.freeze(
  Object.fromEntries(
    Object.values(AI_PROMPT_REGISTRY).map((definition) => [
      definition.id,
      {
        id: `${definition.id}_v1`,
        name: definition.productRole,
        version: '1.0.0',
        template: `${definition.prompt}\n\n${definition.requiredDisclaimer}`,
        variables: [],
        validationRules: [
          'Must stay within Emergency OS allowed AI scope',
          'Must require human review',
          'Must not diagnose, prescribe, disposition, auto-triage, auto-import, or auto-link identity',
        ],
        lastValidated: '2026-06-13T00:00:00.000Z',
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
    HUMAN_REVIEW_DISCLAIMER,
    EXTERNAL_DATA_REVIEW_DISCLAIMER,
    'AI-generated content - verify before acting',
  ],
  disallowedAutonomousActions: [
    'diagnose',
    'prescribe',
    'disposition patients',
    'auto-triage without human review',
    'auto-import external health data',
    'auto-link patient identity',
    'overwrite clinical records',
    'bypass staff verification',
  ],
  auditRequirements: {
    logAllInteractions: true,
    redactRawPrompts: true,
    retentionDays: platformConfig.governance.auditRetentionDays,
    requireUserConsent: true,
  },
  rateLimits: {
    physician: { requestsPerMinute: 60 },
    nurse: { requestsPerMinute: 30 },
    charge_nurse: { requestsPerMinute: 45 },
    clerk: { requestsPerMinute: 10 },
    ems: { requestsPerMinute: 20 },
  },
});
