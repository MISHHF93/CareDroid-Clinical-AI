export const SUBSCRIPTION_TIERS = Object.freeze({
  FREE: 'free',
  TRIAL: 'trial',
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  ACADEMIC: 'academic',
  INSTITUTIONAL: 'institutional',
  ENTERPRISE: 'enterprise',
  GOVERNMENT: 'government',
});

export const ENTITLEMENT_CATEGORIES = Object.freeze({
  TOOLS: 'tools',
  CALCULATORS: 'calculators',
  AUTOMATIONS: 'automations',
  SIMULATIONS: 'simulations',
  MAPS: 'maps',
  IOT: 'iot',
  FLEET: 'fleet',
  AI_AGENTS: 'ai-agents',
  GOVERNANCE: 'governance',
});

export const ENTITLEMENT_ACCESS_STATES = Object.freeze({
  ALLOWED: 'allowed',
  DISABLED: 'disabled',
  BETA: 'beta',
  EXPERIMENTAL: 'experimental',
  LOCKED: 'locked',
  SUBSCRIPTION_REQUIRED: 'subscription-required',
  ADMIN_ONLY: 'admin-only',
});

const CORE_PACK = 'core-platform';

export const ENTITLEMENT_REGISTRY = Object.freeze([
  {
    assetIds: ['calculators', 'calculators-hub', 'qsofa', 'news2', 'sofa-score'],
    category: ENTITLEMENT_CATEGORIES.CALCULATORS,
    featureFlagId: 'clinical-calculators',
    requiredPlan: SUBSCRIPTION_TIERS.FREE,
    requiredPackIds: [CORE_PACK],
  },
  {
    assetIds: ['drug-check', 'lab-interp', 'protocols', 'diagnosis'],
    category: ENTITLEMENT_CATEGORIES.TOOLS,
    featureFlagId: 'clinical-tools-core',
    requiredPlan: SUBSCRIPTION_TIERS.FREE,
    requiredPackIds: [CORE_PACK],
  },
  {
    assetIds: ['simulation-suite', 'scenario-player', 'simulation-outcomes'],
    category: ENTITLEMENT_CATEGORIES.SIMULATIONS,
    featureFlagId: 'simulation-suite',
    requiredPlan: SUBSCRIPTION_TIERS.PROFESSIONAL,
    requiredPackIds: ['research-education'],
  },
  {
    assetIds: [
      'automation-news2-clinician-notification',
      'automation-potassium-lab-workflow',
    ],
    category: ENTITLEMENT_CATEGORIES.AUTOMATIONS,
    featureFlagId: 'clinical-tools-core',
    requiredPlan: SUBSCRIPTION_TIERS.PROFESSIONAL,
    requiredPackIds: ['emergency-department-pack'],
  },
  {
    assetIds: ['automation-device-offline-maintenance'],
    category: ENTITLEMENT_CATEGORIES.AUTOMATIONS,
    featureFlagId: 'medical-iot-dashboard',
    requiredPlan: SUBSCRIPTION_TIERS.INSTITUTIONAL,
    requiredPackIds: ['medical-iot-pack'],
  },
  {
    assetIds: [
      'automation-audit-event-review',
      'automation-integration-unsupported-labeling',
    ],
    category: ENTITLEMENT_CATEGORIES.AUTOMATIONS,
    featureFlagId: 'ai-governance-center',
    requiredPlan: SUBSCRIPTION_TIERS.INSTITUTIONAL,
    requiredPackIds: ['governance-compliance-pack'],
  },
  {
    assetIds: ['hospital-map', 'digital-twin', 'live-map'],
    category: ENTITLEMENT_CATEGORIES.MAPS,
    featureFlagId: 'maps-hospital-operations',
    requiredPlan: SUBSCRIPTION_TIERS.INSTITUTIONAL,
    requiredPackIds: ['hospital-operations'],
  },
  {
    assetIds: ['medical-iot', 'telemetry-monitoring', 'device-fleet-management'],
    category: ENTITLEMENT_CATEGORIES.IOT,
    featureFlagId: 'medical-iot-dashboard',
    requiredPlan: SUBSCRIPTION_TIERS.INSTITUTIONAL,
    requiredPackIds: ['hospital-operations'],
  },
  {
    assetIds: ['fleet-dashboard', 'fleet-live-map', 'route-optimizer', 'predictive-maintenance', 'dispatch-ai'],
    category: ENTITLEMENT_CATEGORIES.FLEET,
    featureFlagId: 'fleet-command',
    requiredPlan: SUBSCRIPTION_TIERS.PROFESSIONAL,
    requiredPackIds: ['fleet-logistics'],
  },
  {
    assetIds: [
      'admission-prediction',
      'journey-prediction',
      'command-predictive-alerts',
      'predictive-analytics-dashboard',
    ],
    category: ENTITLEMENT_CATEGORIES.AI_AGENTS,
    featureFlagId: 'predictive-analytics-pack',
    requiredPlan: SUBSCRIPTION_TIERS.PROFESSIONAL,
    requiredPackIds: ['emergency-department-pack', 'analytics-pack'],
  },
  {
    assetIds: ['patient-whiteboard', 'patient-room-display', 'digital-door-sign'],
    category: ENTITLEMENT_CATEGORIES.TOOLS,
    featureFlagId: 'patient-experience-pack',
    requiredPlan: SUBSCRIPTION_TIERS.FREE,
    requiredPackIds: ['emergency-department-pack'],
  },
  {
    assetIds: ['ems-pre-arrival', 'pre-arrival-activation', 'trauma-team-activation'],
    category: ENTITLEMENT_CATEGORIES.TOOLS,
    featureFlagId: 'ems-pre-arrival-pack',
    requiredPlan: SUBSCRIPTION_TIERS.PROFESSIONAL,
    requiredPackIds: ['emergency-department-pack'],
  },
  {
    assetIds: ['agent-clinical', 'agent-operations', 'agent-lab', 'agent-fleet', 'agent-education', 'agent-research'],
    category: ENTITLEMENT_CATEGORIES.AI_AGENTS,
    featureFlagId: 'ai-clinical-copilot',
    requiredPlan: SUBSCRIPTION_TIERS.PROFESSIONAL,
    requiredPackIds: [CORE_PACK],
  },
  {
    assetIds: ['ai-governance', 'clinical-audit', 'ai-explainability', 'regulatory', 'audit-logs'],
    category: ENTITLEMENT_CATEGORIES.GOVERNANCE,
    featureFlagId: 'ai-governance-center',
    requiredPlan: SUBSCRIPTION_TIERS.INSTITUTIONAL,
    requiredPackIds: ['core-platform'],
    adminOnly: true,
  },
]);

// Must mirror backend/src/config/entitlements.config.ts's SUBSCRIPTION_TIER_RANK exactly --
// this used to only recognize 3 of the backend's 8 real SubscriptionTier values (missing
// trial/starter/academic/enterprise/government entirely). subscriptionMeetsRequirement() falls
// back to rank -1 for any unrecognized tier, so a real enterprise/government/trial/starter/
// academic subscription context flowing through here (context.subscriptionPlan/
// tenant.subscriptionPlan/subscription.tier -- all real, live values, not frontend-only) was
// silently treated as below Free tier and denied entitlements it should have had.
export const SUBSCRIPTION_TIER_RANK = Object.freeze({
  [SUBSCRIPTION_TIERS.FREE]: 0,
  [SUBSCRIPTION_TIERS.TRIAL]: 0,
  [SUBSCRIPTION_TIERS.STARTER]: 0,
  [SUBSCRIPTION_TIERS.PROFESSIONAL]: 1,
  [SUBSCRIPTION_TIERS.ACADEMIC]: 1,
  [SUBSCRIPTION_TIERS.INSTITUTIONAL]: 2,
  [SUBSCRIPTION_TIERS.ENTERPRISE]: 2,
  [SUBSCRIPTION_TIERS.GOVERNMENT]: 2,
});

export function getEntitlementRuleForAsset(assetId) {
  return ENTITLEMENT_REGISTRY.find((rule) => rule.assetIds.includes(assetId));
}

export function subscriptionMeetsRequirement(currentTier, requiredTier = SUBSCRIPTION_TIERS.FREE) {
  return (
    (SUBSCRIPTION_TIER_RANK[currentTier] ?? -1) >=
    (SUBSCRIPTION_TIER_RANK[requiredTier] ?? SUBSCRIPTION_TIER_RANK[SUBSCRIPTION_TIERS.FREE])
  );
}
