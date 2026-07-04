import {
  FEATURE_FLAG_CATEGORIES as SHARED_FEATURE_FLAG_CATEGORIES,
  FEATURE_FLAG_STATES as SHARED_FEATURE_FLAG_STATES,
  type FeatureFlagCategoryValue,
  type FeatureFlagStateValue,
} from '../../../lib/featureFlags/constants';

export const FeatureFlagState = SHARED_FEATURE_FLAG_STATES;
export type FeatureFlagState = FeatureFlagStateValue;

export const FeatureFlagCategory = SHARED_FEATURE_FLAG_CATEGORIES;
export type FeatureFlagCategory = FeatureFlagCategoryValue;

export interface FeatureFlagDefinition {
  id: string;
  name: string;
  category: FeatureFlagCategory;
  defaultState: FeatureFlagState;
  assetIds: string[];
  route?: string;
  owner?: string;
}

export const FEATURE_FLAG_REGISTRY: FeatureFlagDefinition[] = [
  {
    id: 'clinical-tools-core',
    name: 'Clinical Tools Core',
    category: FeatureFlagCategory.TOOLS,
    defaultState: FeatureFlagState.ENABLED,
    route: '/tools',
    owner: 'Clinical Platform',
    assetIds: ['drug-check', 'lab-interp', 'protocols', 'diagnosis-assistant'],
  },
  {
    id: 'clinical-calculators',
    name: 'Clinical Calculators',
    category: FeatureFlagCategory.CALCULATORS,
    defaultState: FeatureFlagState.ENABLED,
    route: '/tools/calculators',
    owner: 'Clinical Platform',
    assetIds: ['calculators', 'calculators-hub', 'qsofa', 'news2', 'sofa-score'],
  },
  {
    id: 'ai-clinical-copilot',
    name: 'AI Clinical Copilot',
    category: FeatureFlagCategory.AI,
    defaultState: FeatureFlagState.ENABLED,
    route: '/assistant',
    owner: 'CareDroid',
    assetIds: ['assistant', 'agent-clinical', 'differential-ai', 'patient-summary-ai'],
  },
  {
    id: 'ai-documentation-assistant',
    name: 'Clinical Documentation Assistant',
    category: FeatureFlagCategory.AI,
    defaultState: FeatureFlagState.BETA,
    route: '/documentation',
    owner: 'CareDroid',
    assetIds: ['ambient-scribe', 'documentation-assistant', 'order-set-ai'],
  },
  {
    id: 'simulation-suite',
    name: 'Medical Simulation Suite',
    category: FeatureFlagCategory.SIMULATION,
    defaultState: FeatureFlagState.BETA,
    route: '/simulation',
    owner: 'Education',
    assetIds: ['simulation-suite', 'scenario-player', 'simulation-outcomes'],
  },
  {
    id: 'maps-hospital-operations',
    name: 'Hospital Maps',
    category: FeatureFlagCategory.MAPS,
    defaultState: FeatureFlagState.BETA,
    route: '/hospital-map',
    owner: 'Operations',
    assetIds: ['hospital-map', 'digital-twin', 'live-map'],
  },
  {
    id: 'fleet-command',
    name: 'Fleet Command',
    category: FeatureFlagCategory.FLEET,
    defaultState: FeatureFlagState.ENABLED,
    route: '/fleet/command',
    owner: 'Operations',
    assetIds: ['fleet-dashboard', 'fleet-live-map', 'route-optimizer', 'dispatch-ai'],
  },
  {
    id: 'predictive-maintenance',
    name: 'Predictive Maintenance',
    category: FeatureFlagCategory.FLEET,
    defaultState: FeatureFlagState.BETA,
    route: '/fleet/predictive-maintenance',
    owner: 'Operations',
    assetIds: ['predictive-maintenance', 'device-maintenance'],
  },
  {
    id: 'medical-iot-dashboard',
    name: 'Medical IoT Dashboard',
    category: FeatureFlagCategory.IOT,
    defaultState: FeatureFlagState.BETA,
    route: '/medical-iot',
    owner: 'Biomedical Engineering',
    assetIds: ['medical-iot', 'telemetry-monitoring', 'device-fleet-management'],
  },
  {
    id: 'device-live-tracking',
    name: 'Device Live Tracking',
    category: FeatureFlagCategory.IOT,
    defaultState: FeatureFlagState.EXPERIMENTAL,
    route: '/live-map',
    owner: 'Biomedical Engineering',
    assetIds: ['live-map', 'asset-tracking-dashboard'],
  },
  {
    id: 'ai-governance-center',
    name: 'AI Governance Center',
    category: FeatureFlagCategory.GOVERNANCE,
    defaultState: FeatureFlagState.ENABLED,
    route: '/ai-governance',
    owner: 'Governance',
    assetIds: ['ai-governance', 'clinical-audit', 'ai-explainability'],
  },
  {
    id: 'regulatory-workspace',
    name: 'Regulatory Workspace',
    category: FeatureFlagCategory.GOVERNANCE,
    defaultState: FeatureFlagState.ADMIN_ONLY,
    route: '/regulatory',
    owner: 'Compliance',
    assetIds: ['regulatory', 'governance-regulatory', 'audit-logs'],
  },
];

export function normalizeFeatureFlagState(state?: string): FeatureFlagState {
  if (state === 'hidden') return FeatureFlagState.DISABLED;
  return Object.values(FeatureFlagState).includes(state as FeatureFlagState)
    ? (state as FeatureFlagState)
    : FeatureFlagState.DISABLED;
}

export function getFeatureFlagForAsset(assetId: string): FeatureFlagDefinition | undefined {
  return FEATURE_FLAG_REGISTRY.find((flag) => flag.assetIds.includes(assetId));
}
