/** Canonical feature-flag state and category literals — shared by frontend and backend. */
export const FEATURE_FLAG_STATES = Object.freeze({
  ENABLED: 'enabled',
  DISABLED: 'disabled',
  BETA: 'beta',
  EXPERIMENTAL: 'experimental',
  LOCKED: 'locked',
  SUBSCRIPTION_REQUIRED: 'subscription-required',
  ADMIN_ONLY: 'admin-only',
} as const);

export const FEATURE_FLAG_CATEGORIES = Object.freeze({
  AI: 'AI',
  TOOLS: 'Tools',
  CALCULATORS: 'Calculators',
  SIMULATION: 'Simulation',
  MAPS: 'Maps',
  FLEET: 'Fleet',
  IOT: 'IoT',
  GOVERNANCE: 'Governance',
} as const);

export type FeatureFlagStateValue = (typeof FEATURE_FLAG_STATES)[keyof typeof FEATURE_FLAG_STATES];
export type FeatureFlagCategoryValue =
  (typeof FEATURE_FLAG_CATEGORIES)[keyof typeof FEATURE_FLAG_CATEGORIES];