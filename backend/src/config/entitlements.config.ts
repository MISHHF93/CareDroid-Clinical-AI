import { SubscriptionTier } from '../modules/subscriptions/entities/subscription.entity';

export enum EntitlementCategory {
  TOOLS = 'tools',
  CALCULATORS = 'calculators',
  AUTOMATIONS = 'automations',
  SIMULATIONS = 'simulations',
  MAPS = 'maps',
  IOT = 'iot',
  FLEET = 'fleet',
  AI_AGENTS = 'ai-agents',
  GOVERNANCE = 'governance',
}

export enum EntitlementAccessState {
  ALLOWED = 'allowed',
  DISABLED = 'disabled',
  BETA = 'beta',
  EXPERIMENTAL = 'experimental',
  LOCKED = 'locked',
  SUBSCRIPTION_REQUIRED = 'subscription-required',
  ADMIN_ONLY = 'admin-only',
}

export interface EntitlementRule {
  assetIds: string[];
  category: EntitlementCategory;
  featureFlagId: string;
  requiredPlan: SubscriptionTier;
  requiredPackIds: string[];
  adminOnly?: boolean;
}

const CORE_PACK = 'core-platform';

export const ENTITLEMENT_REGISTRY: EntitlementRule[] = [
  {
    assetIds: ['calculators', 'calculators-hub', 'qsofa', 'news2', 'sofa-score'],
    category: EntitlementCategory.CALCULATORS,
    featureFlagId: 'clinical-calculators',
    requiredPlan: SubscriptionTier.FREE,
    requiredPackIds: [CORE_PACK],
  },
  {
    assetIds: ['drug-check', 'lab-interp', 'protocols', 'diagnosis-assistant'],
    category: EntitlementCategory.TOOLS,
    featureFlagId: 'clinical-tools-core',
    requiredPlan: SubscriptionTier.FREE,
    requiredPackIds: [CORE_PACK],
  },
  {
    assetIds: ['simulation-suite', 'scenario-player', 'simulation-outcomes'],
    category: EntitlementCategory.SIMULATIONS,
    featureFlagId: 'simulation-suite',
    requiredPlan: SubscriptionTier.PROFESSIONAL,
    requiredPackIds: ['research-education'],
  },
  {
    assetIds: [
      'automation-news2-clinician-notification',
      'automation-potassium-lab-workflow',
    ],
    category: EntitlementCategory.AUTOMATIONS,
    featureFlagId: 'clinical-tools-core',
    requiredPlan: SubscriptionTier.PROFESSIONAL,
    requiredPackIds: ['emergency-department-pack'],
  },
  {
    assetIds: ['automation-device-offline-maintenance'],
    category: EntitlementCategory.AUTOMATIONS,
    featureFlagId: 'medical-iot-dashboard',
    requiredPlan: SubscriptionTier.ENTERPRISE,
    requiredPackIds: ['medical-iot-pack'],
  },
  {
    assetIds: [
      'automation-audit-event-review',
      'automation-integration-unsupported-labeling',
    ],
    category: EntitlementCategory.AUTOMATIONS,
    featureFlagId: 'ai-governance-center',
    requiredPlan: SubscriptionTier.ENTERPRISE,
    requiredPackIds: ['governance-compliance-pack'],
  },
  {
    assetIds: ['hospital-map', 'digital-twin', 'live-map'],
    category: EntitlementCategory.MAPS,
    featureFlagId: 'maps-hospital-operations',
    requiredPlan: SubscriptionTier.INSTITUTIONAL,
    requiredPackIds: ['hospital-operations'],
  },
  {
    assetIds: ['medical-iot', 'telemetry-monitoring', 'device-fleet-management'],
    category: EntitlementCategory.IOT,
    featureFlagId: 'medical-iot-dashboard',
    requiredPlan: SubscriptionTier.INSTITUTIONAL,
    requiredPackIds: ['hospital-operations'],
  },
  {
    assetIds: ['fleet-dashboard', 'fleet-live-map', 'route-optimizer', 'predictive-maintenance', 'dispatch-ai'],
    category: EntitlementCategory.FLEET,
    featureFlagId: 'fleet-command',
    requiredPlan: SubscriptionTier.PROFESSIONAL,
    requiredPackIds: ['fleet-logistics'],
  },
  {
    assetIds: ['agent-clinical', 'agent-operations', 'agent-lab', 'agent-fleet', 'agent-education', 'agent-research'],
    category: EntitlementCategory.AI_AGENTS,
    featureFlagId: 'ai-clinical-copilot',
    requiredPlan: SubscriptionTier.PROFESSIONAL,
    requiredPackIds: [CORE_PACK],
  },
  {
    assetIds: ['ai-governance', 'clinical-audit', 'ai-explainability', 'regulatory', 'audit-logs'],
    category: EntitlementCategory.GOVERNANCE,
    featureFlagId: 'ai-governance-center',
    requiredPlan: SubscriptionTier.INSTITUTIONAL,
    requiredPackIds: [CORE_PACK],
    adminOnly: true,
  },
];

export const SUBSCRIPTION_TIER_RANK: Record<SubscriptionTier, number> = {
  [SubscriptionTier.FREE]: 0,
  [SubscriptionTier.STARTER]: 0,
  [SubscriptionTier.PROFESSIONAL]: 1,
  [SubscriptionTier.ACADEMIC]: 1,
  [SubscriptionTier.INSTITUTIONAL]: 2,
  [SubscriptionTier.ENTERPRISE]: 2,
  [SubscriptionTier.GOVERNMENT]: 2,
};

export function getEntitlementRuleForAsset(assetId: string): EntitlementRule | undefined {
  return ENTITLEMENT_REGISTRY.find((rule) => rule.assetIds.includes(assetId));
}

export function subscriptionMeetsRequirement(
  currentTier: SubscriptionTier | string | undefined,
  requiredTier: SubscriptionTier = SubscriptionTier.FREE,
) {
  return (
    (SUBSCRIPTION_TIER_RANK[currentTier as SubscriptionTier] ?? -1) >=
    (SUBSCRIPTION_TIER_RANK[requiredTier] ?? SUBSCRIPTION_TIER_RANK[SubscriptionTier.FREE])
  );
}
