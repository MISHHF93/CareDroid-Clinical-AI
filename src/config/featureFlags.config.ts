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
  enableSimulationMode: appConfig.features.enableSimulationMode,
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
  LOCKED: 'locked',
  SUBSCRIPTION_REQUIRED: 'subscription-required',
  ADMIN_ONLY: 'admin-only',
});

export const FEATURE_FLAG_CATEGORIES = Object.freeze({
  AI: 'AI',
  TOOLS: 'Tools',
  CALCULATORS: 'Calculators',
  SIMULATION: 'Simulation',
  MAPS: 'Maps',
  FLEET: 'Fleet',
  IOT: 'IoT',
  GOVERNANCE: 'Governance',
});

export const FEATURE_FLAG_STATE_LABELS = Object.freeze({
  [FEATURE_FLAG_STATES.ENABLED]: 'Enabled',
  [FEATURE_FLAG_STATES.DISABLED]: 'Disabled',
  [FEATURE_FLAG_STATES.BETA]: 'Beta',
  [FEATURE_FLAG_STATES.EXPERIMENTAL]: 'Experimental',
  [FEATURE_FLAG_STATES.LOCKED]: 'Locked',
  [FEATURE_FLAG_STATES.SUBSCRIPTION_REQUIRED]: 'Subscription required',
  [FEATURE_FLAG_STATES.ADMIN_ONLY]: 'Admin only',
});

export const FEATURE_FLAG_REGISTRY = Object.freeze([
  {
    id: 'clinical-tools-core',
    name: 'Clinical Tools Core',
    category: FEATURE_FLAG_CATEGORIES.TOOLS,
    defaultState: FEATURE_FLAG_STATES.ENABLED,
    owner: 'Clinical Platform',
    route: '/tools',
    assetIds: ['drug-check', 'lab-interp', 'protocols', 'diagnosis-assistant'],
    description: 'Core clinical tool pages, references, protocols, and diagnostic helpers.',
    rolloutNotes: 'Default-on for authenticated clinical users with tenant context.',
  },
  {
    id: 'clinical-calculators',
    name: 'Clinical Calculators',
    category: FEATURE_FLAG_CATEGORIES.CALCULATORS,
    defaultState: FEATURE_FLAG_STATES.ENABLED,
    owner: 'Clinical Platform',
    route: '/tools/calculators',
    assetIds: ['calculators', 'calculators-hub', 'qsofa', 'news2', 'sofa-score'],
    description: 'Calculator hub and dedicated clinical calculator forms.',
    rolloutNotes: 'Default-on because calculators are local UI with clinical disclaimers.',
  },
  {
    id: 'ai-clinical-copilot',
    name: 'AI Clinical Copilot',
    category: FEATURE_FLAG_CATEGORIES.AI,
    defaultState: FEATURE_FLAG_STATES.ENABLED,
    owner: 'CareDroid',
    route: '/assistant',
    assetIds: ['assistant', 'agent-clinical', 'differential-ai', 'patient-summary-ai'],
    description: 'Assistant, clinical suggestions, and chat-guided tool launch flows.',
    rolloutNotes: 'Default-on for authenticated users; governed by clinical AI safety controls.',
  },
  {
    id: 'ai-documentation-assistant',
    name: 'Clinical Documentation Assistant',
    category: FEATURE_FLAG_CATEGORIES.AI,
    defaultState: FEATURE_FLAG_STATES.BETA,
    owner: 'CareDroid',
    route: '/documentation',
    assetIds: ['ambient-scribe', 'documentation-assistant', 'order-set-ai'],
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
    assetIds: ['simulation-suite', 'scenario-player', 'simulation-outcomes'],
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
    assetIds: ['simulation-outcomes'],
    description: 'Outcome scoring, debrief summaries, and skill gap analytics.',
    rolloutNotes: 'Experimental analytics until scoring rubrics are validated.',
  },
  {
    id: 'maps-hospital-operations',
    name: 'Hospital Maps',
    category: FEATURE_FLAG_CATEGORIES.MAPS,
    defaultState: FEATURE_FLAG_STATES.BETA,
    owner: 'Operations',
    route: '/hospital-map',
    assetIds: ['hospital-map', 'digital-twin', 'live-map'],
    description: 'Hospital map, digital twin, and live operational map surfaces.',
    rolloutNotes: 'Beta while tenant-specific map data and device feeds are validated.',
  },
  {
    id: 'fleet-command',
    name: 'Fleet Command',
    category: FEATURE_FLAG_CATEGORIES.FLEET,
    defaultState: FEATURE_FLAG_STATES.ENABLED,
    owner: 'Operations',
    route: '/fleet/command',
    assetIds: ['fleet-dashboard', 'fleet-live-map', 'route-optimizer', 'dispatch-ai'],
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
    assetIds: ['predictive-maintenance', 'device-maintenance'],
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
    assetIds: ['medical-iot', 'telemetry-monitoring', 'device-fleet-management'],
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
    assetIds: ['live-map', 'asset-tracking-dashboard'],
    description: 'Live location and tracking surfaces for connected clinical assets.',
    rolloutNotes: 'Experimental until all live-tracking streams are normalized.',
  },
  {
    id: 'advanced-lab-interpretation',
    name: 'Advanced Lab Interpretation',
    category: FEATURE_FLAG_CATEGORIES.TOOLS,
    defaultState: FEATURE_FLAG_STATES.BETA,
    owner: 'CareDroid',
    route: '/tools/lab-interpreter',
    assetIds: ['lab-interp', 'advanced-lab-interpretation'],
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
    assetIds: ['ai-governance', 'clinical-audit', 'ai-explainability'],
    description: 'Model inventory, release gates, review state, and governance controls.',
    rolloutNotes: 'Default-on for governance roles.',
  },
  {
    id: 'predictive-analytics-pack',
    name: 'Predictive Analytics Pack',
    category: FEATURE_FLAG_CATEGORIES.AI,
    defaultState: FEATURE_FLAG_STATES.BETA,
    owner: 'Emergency Operations',
    route: '/emergency/analytics',
    assetIds: [
      'admission-prediction',
      'journey-prediction',
      'command-predictive-alerts',
      'predictive-analytics-dashboard',
    ],
    description: 'Heuristic admission scoring, journey prediction, and command-center proactive alerts.',
    rolloutNotes: 'Requires analytics pack entitlement and charge/physician roles for staff surfaces.',
  },
  {
    id: 'patient-experience-pack',
    name: 'Patient Experience Pack',
    category: FEATURE_FLAG_CATEGORIES.TOOLS,
    defaultState: FEATURE_FLAG_STATES.ENABLED,
    owner: 'Patient Experience',
    route: '/emergency/patient-room',
    assetIds: ['patient-whiteboard', 'patient-room-display', 'digital-door-sign'],
    description: 'Patient-facing whiteboard and room display surfaces.',
    rolloutNotes: 'Default-on for emergency department tenants.',
  },
  {
    id: 'ems-pre-arrival-pack',
    name: 'EMS Pre-Arrival Pack',
    category: FEATURE_FLAG_CATEGORIES.TOOLS,
    defaultState: FEATURE_FLAG_STATES.ENABLED,
    owner: 'EMS Operations',
    route: '/emergency/ems',
    assetIds: ['ems-pre-arrival', 'pre-arrival-activation', 'trauma-team-activation'],
    description: 'Structured pre-arrival intake and automatic resource activation rules.',
    rolloutNotes: 'Enabled for EMS and charge nurse command workflows.',
  },
  {
    id: 'regulatory-workspace',
    name: 'Regulatory Workspace',
    category: FEATURE_FLAG_CATEGORIES.GOVERNANCE,
    defaultState: FEATURE_FLAG_STATES.ADMIN_ONLY,
    owner: 'Compliance',
    route: '/regulatory',
    assetIds: ['regulatory', 'governance-regulatory', 'audit-logs'],
    description: 'Regulatory classification, intended use, evidence, and approval surfaces.',
    rolloutNotes: 'Admin-only until compliance owners choose a broader rollout window.',
  },
]);

export function normalizeFeatureFlagState(state) {
  if (state === 'hidden') return FEATURE_FLAG_STATES.DISABLED;
  return Object.values(FEATURE_FLAG_STATES).includes(state) ? state : FEATURE_FLAG_STATES.DISABLED;
}

export function buildFeatureFlagStateMap(overrides: any = {}) {
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
    unavailableCount: flags.filter((flag) =>
      [
        FEATURE_FLAG_STATES.DISABLED,
        FEATURE_FLAG_STATES.LOCKED,
        FEATURE_FLAG_STATES.SUBSCRIPTION_REQUIRED,
        FEATURE_FLAG_STATES.ADMIN_ONLY,
      ].includes(flag.state)
    ).length,
    hiddenOrDisabledCount: flags.filter((flag) =>
      [FEATURE_FLAG_STATES.DISABLED, FEATURE_FLAG_STATES.LOCKED].includes(flag.state)
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
