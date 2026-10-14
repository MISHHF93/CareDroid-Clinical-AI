/**
 * Canonical Feature Flag Registry and type definitions.
 * Single source of truth shared by both frontend and backend.
 */

import {
  FEATURE_FLAG_CATEGORIES,
  FEATURE_FLAG_STATES,
  type FeatureFlagCategoryValue,
  type FeatureFlagStateValue,
} from './constants';

export {
  FEATURE_FLAG_CATEGORIES,
  FEATURE_FLAG_STATES,
  type FeatureFlagCategoryValue,
  type FeatureFlagStateValue,
};

export interface FeatureFlagDefinition {
  id: string;
  name: string;
  category: FeatureFlagCategoryValue;
  defaultState: FeatureFlagStateValue;
  owner: string;
  route: string;
  assetIds: string[];
  description: string;
  rolloutNotes: string;
}

export const FEATURE_FLAG_REGISTRY: readonly FeatureFlagDefinition[] = Object.freeze([
  {
    id: 'clinical-tools-core',
    name: 'Clinical Tools Core',
    category: FEATURE_FLAG_CATEGORIES.TOOLS,
    defaultState: FEATURE_FLAG_STATES.ENABLED,
    owner: 'Clinical Platform',
    route: '/tools',
    assetIds: ['drug-check', 'lab-interp', 'protocols', 'diagnosis'],
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
    assetIds: ['ambient-scribe', 'clinical-documentation-assistant', 'order-set-ai'],
    description:
      'AI-assisted note drafting, summarization, patient instructions, and export readiness.',
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
    description:
      'Scenario player, competency links, debriefing, and simulation completion tracking.',
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
    description:
      'Fleet operations, command dashboards, dispatch context, and operational visibility.',
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
    description:
      'Heuristic admission scoring, journey prediction, and command-center proactive alerts.',
    rolloutNotes:
      'Requires analytics pack entitlement and charge/physician roles for staff surfaces.',
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
    defaultState: FEATURE_FLAG_STATES.BETA,
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

export function normalizeFeatureFlagState(state?: string): FeatureFlagStateValue {
  if (state === 'hidden') return FEATURE_FLAG_STATES.DISABLED;
  return Object.values(FEATURE_FLAG_STATES).includes(state as FeatureFlagStateValue)
    ? (state as FeatureFlagStateValue)
    : FEATURE_FLAG_STATES.DISABLED;
}

export function getFeatureFlagForAsset(assetId: string): FeatureFlagDefinition | undefined {
  return FEATURE_FLAG_REGISTRY.find((flag) => flag.assetIds.includes(assetId));
}
