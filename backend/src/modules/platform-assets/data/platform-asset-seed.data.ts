import {
  OrganizationType,
  PlatformAssetLifecycle,
  PlatformAssetType,
  PricingTier,
} from '../enums/platform-asset.enums';

/** Legacy workspace enabledToolIds → canonical asset ids */
export const LEGACY_TOOL_ID_ALIASES: Record<string, string[]> = {
  calculators: ['calculators', 'calculators-hub'],
  'drug-check': ['drug-check'],
  'lab-interp': ['lab-interp'],
  protocols: ['protocols'],
  'diagnosis-assistant': ['diagnosis'],
  'hospital-map': ['hospital-map'],
  'medical-iot': ['telemetry-monitoring', 'medical-iot'],
  'emergency-protocols': ['protocols', 'acls-protocol', 'atls-protocol'],
  'trauma-score': ['revised-trauma-score', 'gcs-calculator'],
  'sofa-score': ['sofa-score', 'sofa-calculator'],
  'fleet-live-map': ['fleet-live-map', 'live-map'],
  'fleet-dashboard': ['fleet-dashboard'],
  'route-optimizer': ['route-optimizer'],
  'predictive-maintenance': ['predictive-maintenance'],
  'guideline-rag': ['guideline-rag'],
  'ai-explainability': ['ai-explainability'],
  'clinical-audit': ['clinical-audit'],
  'differential-ai': ['differential-ai'],
  'audit-logs': ['audit-logs'],
  analytics: ['analytics'],
  'team-management': ['team-management'],
  'system-config': ['system-config'],
};

const EMERGENCY_MEDICINE_ASSET_IDS = [
  'qsofa',
  'news2',
  'sofa-score',
  'sofa-calculator',
  'heart-score',
  'nihss',
  'gcs-calculator',
  'mews',
  'revised-trauma-score',
  'apache2-calculator',
  'curb65-calculator',
  'pews',
  'protocols',
  'acls-protocol',
  'atls-protocol',
  'emergency-protocols',
  'simulation-suite',
  'scenario-player',
  'hospital-map',
];

const LABORATORY_INTELLIGENCE_ASSET_IDS = [
  'lab-interp',
  'laboratory',
  'abg-interpreter',
  'calculator-recommender-ai',
  'clinical-audit',
];

const HOSPITAL_OPERATIONS_ASSET_IDS = [
  'digital-operations-center',
  'digital-twin',
  'hospital-map',
  'device-fleet-management',
  'telemetry-monitoring',
  'device-maintenance',
  'hospital-operations-command',
  'asset-tracking-dashboard',
  'incident-command-center',
  'fleet-dashboard',
  'fleet-live-map',
  'live-map',
  'route-optimizer',
  'predictive-maintenance',
];

const AI_AGENT_ASSETS = [
  {
    id: 'agent-clinical',
    title: 'Clinical AI',
    route: '/assistant',
    defaultForRoles: ['emergency physician', 'hospitalist', 'nurse', 'ICU clinician'],
  },
  {
    id: 'agent-operations',
    title: 'Operations AI',
    route: '/assistant',
    defaultForRoles: ['fleet operator', 'biomedical engineer', 'administrator'],
  },
  {
    id: 'agent-lab',
    title: 'Lab AI',
    route: '/assistant',
    defaultForRoles: ['pharmacist'],
  },
  {
    id: 'agent-fleet',
    title: 'Fleet AI',
    route: '/assistant',
    defaultForRoles: ['fleet operator'],
  },
  {
    id: 'agent-education',
    title: 'Education AI',
    route: '/assistant',
    defaultForRoles: ['medical student'],
  },
  {
    id: 'agent-research',
    title: 'Research AI',
    route: '/assistant',
    defaultForRoles: ['researcher'],
  },
  {
    id: 'agent-emergency',
    title: 'Emergency AI',
    route: '/assistant',
    defaultForRoles: ['emergency physician', 'nurse'],
  },
  {
    id: 'agent-governance',
    title: 'Governance AI',
    route: '/assistant',
    defaultForRoles: ['administrator'],
  },
];

const AI_AGENT_IDS = AI_AGENT_ASSETS.map((agent) => agent.id);

const CORE_PLATFORM_ASSET_IDS = [
  'calculators',
  'calculators-hub',
  'drug-check',
  'lab-interp',
  'protocols',
  'assistant',
  'dashboard',
  'search',
  ...AI_AGENT_IDS,
];

export const SEED_ASSET_PACKS = [
  {
    id: 'core-platform',
    name: 'Core Platform',
    slug: 'core-platform',
    description: 'Authentication, assistant, dashboard, search, and essential clinical tools.',
    organizationTypes: Object.values(OrganizationType),
    assetIds: CORE_PLATFORM_ASSET_IDS,
    defaultModules: ['dashboard', 'assistant', 'tools', 'calculators'],
    pricingTier: PricingTier.CORE,
    targetRoles: [
      'emergency physician',
      'hospitalist',
      'nurse',
      'ICU clinician',
      'administrator',
      'medical student',
    ],
  },
  {
    id: 'emergency-medicine',
    name: 'Emergency Medicine Pack',
    slug: 'emergency-medicine',
    description:
      'qSOFA, NEWS2, SOFA, HEART, NIHSS, stroke workflows, trauma tools, emergency simulations.',
    organizationTypes: [
      OrganizationType.HOSPITAL,
      OrganizationType.EMS,
      OrganizationType.ACADEMIC_MEDICAL_CENTER,
      OrganizationType.HEALTH_SYSTEM,
    ],
    assetIds: EMERGENCY_MEDICINE_ASSET_IDS,
    requiredDependencies: ['core-platform'],
    defaultModules: ['dashboard', 'alerts', 'tools', 'maps'],
    pricingTier: PricingTier.ENTERPRISE,
  },
  {
    id: 'laboratory-intelligence',
    name: 'Laboratory Intelligence Pack',
    slug: 'laboratory-intelligence',
    description:
      'Lab dashboard, lab interpretation AI, reference workflows, and QC-oriented surfaces.',
    organizationTypes: [
      OrganizationType.HOSPITAL,
      OrganizationType.CLINIC,
      OrganizationType.ACADEMIC_MEDICAL_CENTER,
      OrganizationType.HEALTH_SYSTEM,
    ],
    assetIds: LABORATORY_INTELLIGENCE_ASSET_IDS,
    requiredDependencies: ['core-platform'],
    defaultModules: ['dashboard', 'tools', 'laboratory'],
    pricingTier: PricingTier.STANDARD,
  },
  {
    id: 'hospital-operations',
    name: 'Hospital Operations Pack',
    slug: 'hospital-operations',
    description: 'Digital twin, hospital map, fleet, IoT, and asset tracking.',
    organizationTypes: [
      OrganizationType.HOSPITAL,
      OrganizationType.HEALTH_SYSTEM,
      OrganizationType.ACADEMIC_MEDICAL_CENTER,
    ],
    assetIds: HOSPITAL_OPERATIONS_ASSET_IDS,
    requiredDependencies: ['core-platform'],
    defaultModules: ['dashboard', 'maps', 'medical-iot', 'fleet', 'operations'],
    pricingTier: PricingTier.ENTERPRISE,
  },
  {
    id: 'fleet-logistics',
    name: 'Fleet & EMS Pack',
    slug: 'fleet-logistics',
    description: 'Fleet command, live tracking, route optimization, and predictive maintenance.',
    organizationTypes: [
      OrganizationType.EMS,
      OrganizationType.HOSPITAL,
      OrganizationType.HEALTH_SYSTEM,
    ],
    assetIds: [
      'fleet-dashboard',
      'fleet-live-map',
      'route-optimizer',
      'predictive-maintenance',
      'dispatch-ai',
    ],
    requiredDependencies: ['core-platform'],
    defaultModules: ['fleet', 'live-tracking'],
    pricingTier: PricingTier.STANDARD,
  },
  {
    id: 'research-education',
    name: 'Research Pack',
    slug: 'research-education',
    description: 'RAG, explainability, simulation suite, and research workspace tools.',
    organizationTypes: [
      OrganizationType.UNIVERSITY,
      OrganizationType.RESEARCH_INSTITUTE,
      OrganizationType.ACADEMIC_MEDICAL_CENTER,
    ],
    assetIds: [
      'guideline-rag',
      'research-evidence-hub',
      'ai-explainability',
      'simulation-suite',
      'differential-ai',
    ],
    requiredDependencies: ['core-platform'],
    defaultModules: ['rag', 'research', 'assistant'],
    pricingTier: PricingTier.STANDARD,
    targetRoles: ['researcher', 'medical student'],
  },
  {
    id: 'emergency-department-pack',
    name: 'Emergency Department Pack',
    slug: 'emergency-department-pack',
    description:
      'ED risk stratification, triage calculators, trauma simulation, stroke and chest pain workflows.',
    organizationTypes: [
      OrganizationType.HOSPITAL,
      OrganizationType.EMS,
      OrganizationType.HEALTH_SYSTEM,
    ],
    assetIds: EMERGENCY_MEDICINE_ASSET_IDS,
    requiredDependencies: ['core-platform'],
    defaultModules: ['dashboard', 'alerts', 'tools'],
    pricingTier: PricingTier.ENTERPRISE,
    targetRoles: ['emergency physician', 'nurse'],
    salesMetadata: {
      targetBuyer: 'ED director / hospital operations',
      outcomes: ['faster risk stratification', 'standardized triage', 'simulation training'],
    },
  },
  {
    id: 'icu-pack',
    name: 'ICU Pack',
    slug: 'icu-pack',
    description: 'Critical care scores, ventilator support, hemodynamic and sepsis tools.',
    organizationTypes: [OrganizationType.HOSPITAL, OrganizationType.ACADEMIC_MEDICAL_CENTER],
    assetIds: ['sofa-score', 'news2', 'mews', 'apache2-calculator', 'protocols', 'lab-interp'],
    requiredDependencies: ['core-platform'],
    defaultModules: ['dashboard', 'icu', 'tools'],
    pricingTier: PricingTier.ENTERPRISE,
    targetRoles: ['ICU clinician', 'nurse'],
  },
  {
    id: 'cardiology-pack',
    name: 'Cardiology Pack',
    slug: 'cardiology-pack',
    description: 'HEART, STEMI pathways, cardiology assistants, telemetry dashboards.',
    organizationTypes: [OrganizationType.HOSPITAL, OrganizationType.CLINIC],
    assetIds: [
      'heart-score',
      'ecg-interpretation-assistant',
      'stemi-pathway-assistant',
      'cardiology-command-center',
    ],
    requiredDependencies: ['core-platform'],
    defaultModules: ['cardiology', 'tools'],
    pricingTier: PricingTier.STANDARD,
    targetRoles: ['cardiologist', 'hospitalist'],
  },
  {
    id: 'medical-iot-pack',
    name: 'Medical IoT Pack',
    slug: 'medical-iot-pack',
    description: 'Device telemetry, maintenance, hospital IoT dashboards.',
    organizationTypes: [OrganizationType.HOSPITAL, OrganizationType.HEALTH_SYSTEM],
    assetIds: [
      'telemetry-monitoring',
      'device-fleet-management',
      'device-maintenance',
      'medical-iot',
    ],
    requiredDependencies: ['core-platform'],
    defaultModules: ['medical-iot', 'devices'],
    pricingTier: PricingTier.ENTERPRISE,
    targetRoles: ['biomedical engineer', 'administrator'],
  },
  {
    id: 'simulation-training-pack',
    name: 'Simulation & Training Pack',
    slug: 'simulation-training-pack',
    description: 'Medical simulation suite, scenarios, outcomes, competency tracking.',
    organizationTypes: [OrganizationType.UNIVERSITY, OrganizationType.HOSPITAL],
    assetIds: ['simulation-suite', 'scenario-player', 'competencies'],
    requiredDependencies: ['core-platform'],
    defaultModules: ['education', 'simulation'],
    pricingTier: PricingTier.STANDARD,
    targetRoles: ['medical student', 'researcher'],
  },
  {
    id: 'governance-compliance-pack',
    name: 'Governance & Compliance Pack',
    slug: 'governance-compliance-pack',
    description: 'Audit, governance, privacy, regulatory, and AI security surfaces.',
    organizationTypes: Object.values(OrganizationType),
    assetIds: ['audit-logs', 'ai-explainability', 'clinical-audit', 'system-config'],
    requiredDependencies: ['core-platform'],
    defaultModules: ['governance', 'audit'],
    pricingTier: PricingTier.ADDON,
    targetRoles: ['administrator'],
  },
  {
    id: 'digital-twin-pack',
    name: 'Digital Twin Pack',
    slug: 'digital-twin-pack',
    description: 'Aggregate digital twin, hospital map, occupancy, fleet and alert overlays.',
    organizationTypes: [OrganizationType.HOSPITAL, OrganizationType.HEALTH_SYSTEM],
    assetIds: [
      'digital-twin',
      'digital-operations-center',
      'hospital-map',
      'asset-tracking-dashboard',
    ],
    requiredDependencies: ['core-platform'],
    defaultModules: ['operations', 'maps'],
    pricingTier: PricingTier.ENTERPRISE,
    targetRoles: ['administrator', 'biomedical engineer'],
  },
  {
    id: 'ai-workflow-pack',
    name: 'AI Workflow Pack',
    slug: 'ai-workflow-pack',
    description:
      'Ambient scribe, differential AI, timeline AI, order sets, documentation assistant.',
    organizationTypes: [OrganizationType.HOSPITAL, OrganizationType.ACADEMIC_MEDICAL_CENTER],
    assetIds: [
      ...AI_AGENT_IDS,
      'differential-ai',
      'timeline-ai',
      'patient-summary-ai',
      'order-set-ai',
      'ambient-scribe',
      'clinical-documentation-assistant',
    ],
    requiredDependencies: ['core-platform'],
    defaultModules: ['assistant', 'ai-workflow'],
    pricingTier: PricingTier.ENTERPRISE,
    targetRoles: ['physician', 'hospitalist'],
  },
];

export const DEFAULT_PACKS_BY_ORGANIZATION_TYPE: Record<OrganizationType, string[]> = {
  [OrganizationType.HOSPITAL]: [
    'core-platform',
    'emergency-medicine',
    'laboratory-intelligence',
    'hospital-operations',
  ],
  [OrganizationType.ACADEMIC_MEDICAL_CENTER]: [
    'core-platform',
    'emergency-medicine',
    'laboratory-intelligence',
    'hospital-operations',
    'research-education',
  ],
  [OrganizationType.CLINIC]: ['core-platform', 'laboratory-intelligence'],
  [OrganizationType.EMS]: ['core-platform', 'emergency-medicine', 'fleet-logistics'],
  [OrganizationType.RESEARCH_INSTITUTE]: ['core-platform', 'research-education'],
  [OrganizationType.HEALTH_SYSTEM]: [
    'core-platform',
    'emergency-medicine',
    'laboratory-intelligence',
    'hospital-operations',
  ],
  [OrganizationType.LONG_TERM_CARE]: ['core-platform'],
  [OrganizationType.HOME_CARE]: ['core-platform', 'fleet-logistics'],
  [OrganizationType.TELEHEALTH]: ['core-platform', 'laboratory-intelligence'],
  [OrganizationType.UNIVERSITY]: ['core-platform', 'research-education'],
};

export const SEED_ROLE_PROFILES = [
  {
    id: 'emergency-physician',
    label: 'Emergency Physician',
    intendedRoles: ['emergency physician'],
    specialties: ['emergency medicine'],
    preferredAssetIds: [
      'qsofa',
      'news2',
      'sofa-score',
      'nihss',
      'heart-score',
      'protocols',
      'gcs-calculator',
      'revised-trauma-score',
      'simulation-suite',
    ],
    defaultDashboard: 'command',
    defaultAiAgentId: 'agent-clinical',
  },
  {
    id: 'nurse',
    label: 'Nurse',
    intendedRoles: ['nurse', 'ICU clinician'],
    specialties: ['critical care', 'emergency medicine'],
    preferredAssetIds: [
      'news2',
      'mews',
      'protocols',
      'sofa-score',
      'lab-interp',
      'drug-check',
      'gcs-calculator',
    ],
    defaultDashboard: 'command',
    defaultAiAgentId: 'agent-clinical',
  },
  {
    id: 'pharmacist',
    label: 'Pharmacist',
    intendedRoles: ['pharmacist'],
    specialties: ['pharmacy'],
    preferredAssetIds: [
      'drug-check',
      'lab-interp',
      'laboratory',
      'abg-interpreter',
      'calculator-recommender-ai',
    ],
    defaultDashboard: 'command',
    defaultAiAgentId: 'agent-lab',
  },
  {
    id: 'fleet-operator',
    label: 'Fleet Operator',
    intendedRoles: ['fleet operator'],
    specialties: ['operations'],
    preferredAssetIds: [
      'fleet-dashboard',
      'fleet-live-map',
      'live-map',
      'route-optimizer',
      'predictive-maintenance',
      'dispatch-ai',
      'hospital-operations-command',
      'incident-command-center',
    ],
    defaultDashboard: 'operations',
    defaultAiAgentId: 'agent-fleet',
  },
  {
    id: 'administrator',
    label: 'Administrator',
    intendedRoles: ['administrator'],
    specialties: ['administration'],
    preferredAssetIds: [
      'analytics',
      'audit-logs',
      'system-config',
      'digital-twin',
      'medical-iot',
      'telemetry-monitoring',
      'ai-explainability',
      'dashboard',
      'search',
      'hospital-operations-command',
      'incident-command-center',
      'live-map',
    ],
    defaultDashboard: 'command',
    defaultAiAgentId: 'agent-operations',
  },
  {
    id: 'researcher',
    label: 'Researcher',
    intendedRoles: ['researcher'],
    specialties: ['research'],
    preferredAssetIds: ['guideline-rag', 'research-evidence-hub', 'ai-explainability'],
    defaultDashboard: 'command',
    defaultAiAgentId: 'agent-research',
  },
  {
    id: 'medical-student',
    label: 'Medical Student',
    intendedRoles: ['medical student'],
    specialties: ['medical education'],
    preferredAssetIds: [
      'calculators',
      'calculators-hub',
      'simulation-suite',
      'dashboard',
      'assistant',
      'search',
    ],
    defaultDashboard: 'command',
    defaultAiAgentId: 'agent-education',
  },
];

function inferAssetType(id: string): PlatformAssetType {
  if (id.startsWith('agent-')) return PlatformAssetType.AI_AGENT;
  if (id.includes('simulation') || id === 'scenario-player') return PlatformAssetType.SIMULATION;
  if (id.includes('map') || id === 'live-map') return PlatformAssetType.MAP;
  if (
    id.includes('dashboard') ||
    id === 'laboratory' ||
    id === 'digital-twin' ||
    id === 'digital-operations-center'
  ) {
    return PlatformAssetType.DASHBOARD;
  }
  if (id.includes('protocol') || id === 'protocols') return PlatformAssetType.PROTOCOL;
  if (
    id.includes('calculator') ||
    id.endsWith('-score') ||
    ['qsofa', 'news2', 'mews', 'nihss', 'pews', 'apache2-calculator', 'curb65-calculator'].includes(
      id,
    )
  ) {
    return PlatformAssetType.CALCULATOR;
  }
  return PlatformAssetType.TOOL;
}

function buildAssetSeedRows(): Array<{
  id: string;
  assetType: PlatformAssetType;
  title: string;
  category: string;
  route: string | null;
  lifecycle: PlatformAssetLifecycle;
  pricingTier: PricingTier;
  packIds: string[];
}> {
  const packByAsset = new Map<string, string[]>();
  for (const pack of SEED_ASSET_PACKS) {
    for (const assetId of pack.assetIds) {
      const existing = packByAsset.get(assetId) || [];
      existing.push(pack.id);
      packByAsset.set(assetId, existing);
    }
  }

  const allIds = new Set<string>();
  for (const pack of SEED_ASSET_PACKS) {
    pack.assetIds.forEach((id) => allIds.add(id));
  }
  AI_AGENT_ASSETS.forEach((agent) => allIds.add(agent.id));

  return [...allIds].map((id) => {
    const agent = AI_AGENT_ASSETS.find((row) => row.id === id);
    return {
      id,
      assetType: agent ? PlatformAssetType.AI_AGENT : inferAssetType(id),
      title: agent?.title || id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      category: agent
        ? 'AI Agent'
        : inferAssetType(id) === PlatformAssetType.CALCULATOR
          ? 'Calculator'
          : 'Clinical',
      route: agent?.route || (id === 'calculators' ? '/tools/calculators' : `/tools/${id}`),
      lifecycle: PlatformAssetLifecycle.ACTIVE,
      pricingTier: packByAsset.get(id)?.includes('core-platform')
        ? PricingTier.CORE
        : PricingTier.STANDARD,
      packIds: packByAsset.get(id) || [],
    };
  });
}

export const SEED_PLATFORM_ASSETS = buildAssetSeedRows();
