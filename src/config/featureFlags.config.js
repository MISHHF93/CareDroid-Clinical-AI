import appConfig from './appConfig';

/**
 * Canonical frontend feature flag projection.
 *
 * `appConfig` parses environment variables; runtime consumers should import
 * this stable projection instead of reading `appConfig.features` directly.
 */
export const FEATURE_FLAGS = Object.freeze({
  enablePushNotifications: appConfig.features.enablePushNotifications,
  enableOfflineMode: appConfig.features.enableOfflineMode,
  enableBiometricAuth: appConfig.features.enableBiometricAuth,
  enableDevAuthBypass: appConfig.features.enableDevAuthBypass,
  enableDemoMode: appConfig.features.enableDemoMode,
  allowLocalDemoAuth: appConfig.features.allowLocalDemoAuth,
  showDemoAuth: appConfig.features.showDemoAuth,
  hideDivisionMode: appConfig.features.hideDivisionMode,
  platformEntitlements: appConfig.features.platformEntitlements,
  singleWorkspaceModel: appConfig.features.singleWorkspaceModel,
  commercialSurfaces: appConfig.features.commercialSurfaces,
  strictSaasEntitlements: appConfig.features.strictSaasEntitlements,
  assetAwareNavigation: appConfig.features.assetAwareNavigation,
  orgScopedPlatformReads: appConfig.features.orgScopedPlatformReads,
});

export const FEATURE_FLAG_STATES = Object.freeze({
  ENABLED: 'enabled',
  DISABLED: 'disabled',
  BETA: 'beta',
  EXPERIMENTAL: 'experimental',
  HIDDEN: 'hidden',
});

export const FEATURE_FLAG_CATEGORIES = Object.freeze({
  AI: 'AI',
  SIMULATION: 'Simulation',
  FLEET: 'Fleet',
  IOT: 'IoT',
  LABORATORY: 'Laboratory',
  GOVERNANCE: 'Governance',
});

export const FEATURE_FLAG_STATE_LABELS = Object.freeze({
  [FEATURE_FLAG_STATES.ENABLED]: 'Enabled',
  [FEATURE_FLAG_STATES.DISABLED]: 'Disabled',
  [FEATURE_FLAG_STATES.BETA]: 'Beta',
  [FEATURE_FLAG_STATES.EXPERIMENTAL]: 'Experimental',
  [FEATURE_FLAG_STATES.HIDDEN]: 'Hidden',
});

export const FEATURE_FLAG_REGISTRY = Object.freeze([
  {
    id: 'ai-clinical-copilot',
    name: 'AI Clinical Copilot',
    category: FEATURE_FLAG_CATEGORIES.AI,
    defaultState: FEATURE_FLAG_STATES.ENABLED,
    owner: 'Clinical AI',
    route: '/assistant',
    description: 'Assistant, clinical suggestions, and chat-guided tool launch flows.',
    rolloutNotes: 'Default-on for authenticated users; governed by clinical AI safety controls.',
  },
  {
    id: 'ai-documentation-assistant',
    name: 'Clinical Documentation Assistant',
    category: FEATURE_FLAG_CATEGORIES.AI,
    defaultState: FEATURE_FLAG_STATES.BETA,
    owner: 'Clinical AI',
    route: '/documentation',
    description: 'AI-assisted note drafting, summarization, patient instructions, and export readiness.',
    rolloutNotes: 'Beta because generated documentation requires clinician review.',
  },
  {
    id: 'simulation-suite',
    name: 'Medical Simulation Suite',
    category: FEATURE_FLAG_CATEGORIES.SIMULATION,
    defaultState: FEATURE_FLAG_STATES.BETA,
    owner: 'Education',
    route: '/simulation',
    description: 'Scenario player, competency links, debriefing, and simulation completion tracking.',
    rolloutNotes: 'Beta rollout for training teams before organization-wide launch.',
  },
  {
    id: 'simulation-outcomes',
    name: 'Simulation Outcomes',
    category: FEATURE_FLAG_CATEGORIES.SIMULATION,
    defaultState: FEATURE_FLAG_STATES.EXPERIMENTAL,
    owner: 'Education',
    route: '/simulation/outcomes',
    description: 'Outcome scoring, debrief summaries, and skill gap analytics.',
    rolloutNotes: 'Experimental analytics until scoring rubrics are validated.',
  },
  {
    id: 'fleet-command',
    name: 'Fleet Command',
    category: FEATURE_FLAG_CATEGORIES.FLEET,
    defaultState: FEATURE_FLAG_STATES.ENABLED,
    owner: 'Operations',
    route: '/fleet/command',
    description: 'Fleet operations, command dashboards, dispatch context, and operational visibility.',
    rolloutNotes: 'Default-on for operations roles.',
  },
  {
    id: 'predictive-maintenance',
    name: 'Predictive Maintenance',
    category: FEATURE_FLAG_CATEGORIES.FLEET,
    defaultState: FEATURE_FLAG_STATES.BETA,
    owner: 'Operations',
    route: '/fleet/predictive-maintenance',
    description: 'Fleet maintenance risk, service windows, and early failure indicators.',
    rolloutNotes: 'Beta because model quality depends on telemetry availability.',
  },
  {
    id: 'medical-iot-dashboard',
    name: 'Medical IoT Dashboard',
    category: FEATURE_FLAG_CATEGORIES.IOT,
    defaultState: FEATURE_FLAG_STATES.BETA,
    owner: 'Biomedical Engineering',
    route: '/medical-iot',
    description: 'Connected device telemetry, status, alerts, and care environment context.',
    rolloutNotes: 'Beta until device integration contracts are fully live.',
  },
  {
    id: 'device-live-tracking',
    name: 'Device Live Tracking',
    category: FEATURE_FLAG_CATEGORIES.IOT,
    defaultState: FEATURE_FLAG_STATES.EXPERIMENTAL,
    owner: 'Biomedical Engineering',
    route: '/live-map',
    description: 'Live location and tracking surfaces for connected clinical assets.',
    rolloutNotes: 'Experimental until all live-tracking streams are normalized.',
  },
  {
    id: 'laboratory-dashboard',
    name: 'Laboratory Dashboard',
    category: FEATURE_FLAG_CATEGORIES.LABORATORY,
    defaultState: FEATURE_FLAG_STATES.ENABLED,
    owner: 'Clinical Operations',
    route: '/laboratory',
    description: 'Laboratory module, lab interpretation entry points, and result workflows.',
    rolloutNotes: 'Default-on because it routes to established laboratory surfaces.',
  },
  {
    id: 'advanced-lab-interpretation',
    name: 'Advanced Lab Interpretation',
    category: FEATURE_FLAG_CATEGORIES.LABORATORY,
    defaultState: FEATURE_FLAG_STATES.BETA,
    owner: 'Clinical AI',
    route: '/tools/lab-interpreter',
    description: 'AI-assisted interpretation for lab panels and abnormal value summaries.',
    rolloutNotes: 'Beta because interpretation needs clinical review and guardrails.',
  },
  {
    id: 'ai-governance-center',
    name: 'AI Governance Center',
    category: FEATURE_FLAG_CATEGORIES.GOVERNANCE,
    defaultState: FEATURE_FLAG_STATES.ENABLED,
    owner: 'Governance',
    route: '/ai-governance',
    description: 'Model inventory, release gates, review state, and governance controls.',
    rolloutNotes: 'Default-on for governance roles.',
  },
  {
    id: 'regulatory-workspace',
    name: 'Regulatory Workspace',
    category: FEATURE_FLAG_CATEGORIES.GOVERNANCE,
    defaultState: FEATURE_FLAG_STATES.HIDDEN,
    owner: 'Compliance',
    route: '/regulatory',
    description: 'Regulatory classification, intended use, evidence, and approval surfaces.',
    rolloutNotes: 'Hidden until compliance owners choose a rollout window.',
  },
]);

export function normalizeFeatureFlagState(state) {
  return Object.values(FEATURE_FLAG_STATES).includes(state)
    ? state
    : FEATURE_FLAG_STATES.DISABLED;
}

export function buildFeatureFlagStateMap(overrides = {}) {
  return Object.fromEntries(
    FEATURE_FLAG_REGISTRY.map((flag) => [
      flag.id,
      normalizeFeatureFlagState(overrides[flag.id] || flag.defaultState),
    ])
  );
}

export function getFeatureFlagsByCategory(stateMap = buildFeatureFlagStateMap()) {
  return Object.values(FEATURE_FLAG_CATEGORIES).map((category) => ({
    category,
    flags: FEATURE_FLAG_REGISTRY.filter((flag) => flag.category === category).map((flag) => ({
      ...flag,
      state: normalizeFeatureFlagState(stateMap[flag.id] || flag.defaultState),
    })),
  }));
}

export function summarizeFeatureFlags(stateMap = buildFeatureFlagStateMap()) {
  const flags = FEATURE_FLAG_REGISTRY.map((flag) => ({
    ...flag,
    state: normalizeFeatureFlagState(stateMap[flag.id] || flag.defaultState),
  }));
  const stateCounts = Object.values(FEATURE_FLAG_STATES).reduce((acc, state) => {
    acc[state] = flags.filter((flag) => flag.state === state).length;
    return acc;
  }, {});
  const categoryCounts = Object.values(FEATURE_FLAG_CATEGORIES).reduce((acc, category) => {
    acc[category] = flags.filter((flag) => flag.category === category).length;
    return acc;
  }, {});

  return {
    total: flags.length,
    stateCounts,
    categoryCounts,
    liveRolloutCount: flags.filter((flag) =>
      [FEATURE_FLAG_STATES.ENABLED, FEATURE_FLAG_STATES.BETA, FEATURE_FLAG_STATES.EXPERIMENTAL].includes(flag.state)
    ).length,
    hiddenOrDisabledCount: flags.filter((flag) =>
      [FEATURE_FLAG_STATES.HIDDEN, FEATURE_FLAG_STATES.DISABLED].includes(flag.state)
    ).length,
  };
}

export function shouldExposeDemoAuthFlag() {
  return Boolean(
    FEATURE_FLAGS.enableDemoMode ||
      FEATURE_FLAGS.enableDevAuthBypass ||
      FEATURE_FLAGS.showDemoAuth
  );
}
