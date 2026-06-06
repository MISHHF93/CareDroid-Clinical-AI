import {
  AssetDemoLiveStatus,
  AssetRegistryRiskLevel,
  registryTypeToEntityAssetType,
  AssetRegistryType,
} from '../asset-registry.schema';
import {
  OrganizationType,
  PlatformAssetLifecycle,
  PlatformAssetType,
  PricingTier,
} from '../enums/platform-asset.enums';
import { defaultRequiredPermissions, inferDepartmentsForAsset } from '../department-taxonomy';

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
    description:
      'General clinical reasoning, documentation support, care guidance, and safe handoff assistance.',
    route: '/assistant',
    defaultForRoles: ['emergency physician', 'hospitalist', 'nurse', 'ICU clinician'],
    workspaceTags: ['emergency', 'icu', 'cardiology', 'operations'],
    capabilities: [
      'Clinical reasoning',
      'Patient summarization',
      'Guideline retrieval',
      'Care planning',
    ],
    assetAccess: [
      'assistant',
      'patient-summary-ai',
      'clinical-reasoning-engine',
      'guideline-rag',
      'protocols',
    ],
    toolCallingPermissions: [
      'read-clinical-context',
      'invoke-calculators',
      'retrieve-guidelines',
      'draft-clinical-notes',
    ],
  },
  {
    id: 'agent-operations',
    title: 'Operations AI',
    description:
      'Hospital operations command agent for throughput, capacity, incidents, and operational risk.',
    route: '/assistant',
    defaultForRoles: ['fleet operator', 'biomedical engineer', 'administrator'],
    workspaceTags: ['operations', 'medical-iot', 'fleet'],
    capabilities: [
      'Capacity monitoring',
      'Incident coordination',
      'Operational routing',
      'Service status triage',
    ],
    assetAccess: [
      'dashboard',
      'digital-operations-center',
      'hospital-map',
      'system-health',
      'live-map',
    ],
    toolCallingPermissions: [
      'read-operations-state',
      'query-dashboards',
      'summarize-incidents',
      'recommend-workflows',
    ],
  },
  {
    id: 'agent-lab',
    title: 'Laboratory AI',
    description:
      'Laboratory intelligence agent for result interpretation, quality checks, and escalation support.',
    route: '/assistant',
    defaultForRoles: ['pharmacist'],
    workspaceTags: ['laboratory', 'clinical'],
    capabilities: [
      'Lab interpretation',
      'Abnormal result escalation',
      'Reference range support',
      'Quality control review',
    ],
    assetAccess: ['lab-interp', 'laboratory', 'abg-interpreter', 'lab-result-import'],
    toolCallingPermissions: [
      'read-lab-results',
      'invoke-lab-interpreters',
      'retrieve-reference-ranges',
      'draft-escalations',
    ],
  },
  {
    id: 'agent-fleet',
    title: 'Fleet AI',
    description:
      'Fleet and EMS coordination agent for dispatch, live tracking, routes, and maintenance risk.',
    route: '/assistant',
    defaultForRoles: ['fleet operator'],
    workspaceTags: ['fleet', 'emergency', 'operations'],
    capabilities: [
      'Dispatch support',
      'Route optimization',
      'Fleet telemetry review',
      'Predictive maintenance triage',
    ],
    assetAccess: [
      'fleet-dashboard',
      'fleet-live-map',
      'route-optimizer',
      'predictive-maintenance',
      'dispatch-ai',
    ],
    toolCallingPermissions: [
      'read-fleet-state',
      'optimize-routes',
      'summarize-dispatch',
      'flag-maintenance-risk',
    ],
  },
  {
    id: 'agent-education',
    title: 'Education AI',
    description:
      'Training and simulation agent for scenarios, competencies, debriefing, and learner support.',
    route: '/assistant',
    defaultForRoles: ['medical student'],
    workspaceTags: ['education', 'simulation', 'research'],
    capabilities: [
      'Scenario coaching',
      'Simulation debriefing',
      'Competency guidance',
      'Learning plan support',
    ],
    assetAccess: ['simulation-suite', 'scenario-player', 'competencies', 'guideline-rag'],
    toolCallingPermissions: [
      'launch-simulations',
      'read-competencies',
      'retrieve-learning-content',
      'draft-debriefs',
    ],
  },
  {
    id: 'agent-research',
    title: 'Research AI',
    description:
      'Research agent for evidence review, explainability, protocol support, and knowledge synthesis.',
    route: '/assistant',
    defaultForRoles: ['researcher'],
    workspaceTags: ['research', 'education', 'governance'],
    capabilities: [
      'Evidence synthesis',
      'RAG-based literature review',
      'Explainability review',
      'Protocol drafting',
    ],
    assetAccess: ['guideline-rag', 'research-evidence-hub', 'ai-explainability', 'knowledge-graph'],
    toolCallingPermissions: [
      'retrieve-evidence',
      'query-knowledge-graph',
      'summarize-research',
      'draft-protocols',
    ],
  },
  {
    id: 'agent-emergency',
    title: 'Emergency AI',
    description:
      'Emergency department agent for triage, risk scores, stroke/chest-pain workflows, and trauma support.',
    route: '/assistant',
    defaultForRoles: ['emergency physician', 'nurse'],
    workspaceTags: ['emergency', 'fleet', 'operations'],
    capabilities: [
      'Triage assistance',
      'Emergency risk scoring',
      'Stroke workflow support',
      'Trauma scenario guidance',
    ],
    assetAccess: ['qsofa', 'news2', 'heart-score', 'nihss-stroke', 'simulation-suite'],
    toolCallingPermissions: [
      'invoke-risk-scores',
      'retrieve-emergency-protocols',
      'summarize-triage',
      'draft-handoff',
    ],
  },
  {
    id: 'agent-governance',
    title: 'Governance AI',
    description: 'Governance agent for audit, safety, privacy, regulatory, and AI security review.',
    route: '/assistant',
    defaultForRoles: ['administrator'],
    workspaceTags: ['governance', 'operations', 'research'],
    capabilities: [
      'Audit review',
      'Safety finding triage',
      'Privacy and consent review',
      'AI security policy support',
    ],
    assetAccess: [
      'audit-logs',
      'ai-explainability',
      'ai-governance',
      'clinical-safety-audit',
      'privacy-center',
    ],
    toolCallingPermissions: [
      'read-audit-events',
      'review-governance-state',
      'summarize-risk',
      'draft-policy-notes',
    ],
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

const PACK_BUYER_METADATA_BY_ID: Record<
  string,
  {
    buyerPersona: string[];
    decisionMaker: string[];
    stakeholders: string[];
    expectedOutcomes: string[];
  }
> = {
  'core-platform': {
    buyerPersona: ['Chief Medical Officer', 'CIO', 'Clinical Operations Leader'],
    decisionMaker: ['Chief Medical Officer', 'CIO'],
    stakeholders: ['Clinicians', 'Nursing leadership', 'Clinical informatics', 'IT operations'],
    expectedOutcomes: ['core platform adoption', 'standardized access to clinical tools'],
  },
  'emergency-medicine': {
    buyerPersona: ['ED Director', 'Chief Medical Officer'],
    decisionMaker: ['ED Director', 'Chief Medical Officer'],
    stakeholders: ['Emergency physicians', 'Triage nurses', 'Stroke teams', 'Trauma teams'],
    expectedOutcomes: ['faster risk stratification', 'standardized emergency workflows'],
  },
  'laboratory-intelligence': {
    buyerPersona: ['Laboratory Director'],
    decisionMaker: ['Laboratory Director'],
    stakeholders: ['Pathologists', 'Lab managers', 'Lab technologists', 'Quality analysts'],
    expectedOutcomes: ['faster lab interpretation', 'quality-control visibility'],
  },
  'hospital-operations': {
    buyerPersona: ['COO', 'Operations Director'],
    decisionMaker: ['COO', 'Chief Medical Officer'],
    stakeholders: ['Bed managers', 'Facilities teams', 'Incident commanders', 'Nursing operations'],
    expectedOutcomes: ['capacity visibility', 'incident response coordination'],
  },
  'fleet-logistics': {
    buyerPersona: ['EMS Director'],
    decisionMaker: ['EMS Director'],
    stakeholders: ['Dispatchers', 'Paramedics', 'Fleet operators', 'Transport coordinators'],
    expectedOutcomes: ['dispatch efficiency', 'fleet visibility'],
  },
  'research-education': {
    buyerPersona: ['Research Director', 'Dean of Medical Education'],
    decisionMaker: ['Research Director', 'Dean of Medical Education'],
    stakeholders: ['Researchers', 'Principal investigators', 'Educators', 'Students'],
    expectedOutcomes: ['evidence synthesis', 'research and education workflow adoption'],
  },
  'emergency-department-pack': {
    buyerPersona: ['ED Director', 'Chief Medical Officer'],
    decisionMaker: ['ED Director', 'Chief Medical Officer'],
    stakeholders: ['Emergency physicians', 'Triage nurses', 'Charge nurses', 'Quality leaders'],
    expectedOutcomes: ['faster risk stratification', 'standardized triage', 'simulation training'],
  },
  'icu-pack': {
    buyerPersona: ['ICU Medical Director', 'Chief Nursing Officer'],
    decisionMaker: ['ICU Medical Director', 'Chief Medical Officer'],
    stakeholders: ['Intensivists', 'ICU nurses', 'Respiratory therapists', 'Pharmacists'],
    expectedOutcomes: ['critical care standardization', 'sepsis bundle support'],
  },
  'cardiology-pack': {
    buyerPersona: ['Cardiology Service Line Director'],
    decisionMaker: ['Cardiology Service Line Director', 'Chief Medical Officer'],
    stakeholders: ['Cardiologists', 'ED physicians', 'Telemetry teams', 'Cath lab coordinators'],
    expectedOutcomes: ['ACS pathway adherence', 'telemetry visibility'],
  },
  'medical-iot-pack': {
    buyerPersona: ['Biomedical Engineering Lead'],
    decisionMaker: ['Biomedical Engineering Lead'],
    stakeholders: ['Clinical engineers', 'Device managers', 'IT operations', 'Nursing operations'],
    expectedOutcomes: ['device uptime', 'telemetry alerting'],
  },
  'simulation-training-pack': {
    buyerPersona: ['Simulation Center Director', 'Nursing Education Director'],
    decisionMaker: ['Simulation Center Director', 'Dean of Medical Education'],
    stakeholders: ['Instructors', 'Residents', 'Medical students', 'Simulation technicians'],
    expectedOutcomes: ['competency tracking', 'scenario completion'],
  },
  'governance-compliance-pack': {
    buyerPersona: ['CIO', 'Compliance Officer'],
    decisionMaker: ['CIO', 'Compliance Officer'],
    stakeholders: [
      'Privacy teams',
      'Security teams',
      'Clinical safety reviewers',
      'Quality analysts',
    ],
    expectedOutcomes: ['audit readiness', 'AI governance'],
  },
  'digital-twin-pack': {
    buyerPersona: ['COO', 'Facilities Director'],
    decisionMaker: ['COO', 'Chief Operating Officer'],
    stakeholders: [
      'Bed managers',
      'Facilities teams',
      'Transport coordinators',
      'Incident command',
    ],
    expectedOutcomes: ['operations command center', 'capacity visibility'],
  },
  'ai-workflow-pack': {
    buyerPersona: ['Chief Medical Information Officer', 'Clinical Informatics Director'],
    decisionMaker: ['Chief Medical Information Officer', 'Chief Medical Officer'],
    stakeholders: ['Physicians', 'Hospitalists', 'Documentation teams', 'Clinical informatics'],
    expectedOutcomes: ['clinical workflow automation', 'documentation efficiency'],
  },
};

const RAW_SEED_ASSET_PACKS = [
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
    name: 'Governance Pack',
    slug: 'governance-pack',
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

export const SEED_ASSET_PACKS = RAW_SEED_ASSET_PACKS.map((pack) => {
  const buyerMetadata = PACK_BUYER_METADATA_BY_ID[pack.id] || {
    buyerPersona: (pack as any).targetRoles || ['Clinical Operations Leader'],
    decisionMaker: ['Clinical Operations Leader'],
    stakeholders: (pack as any).targetRoles || [],
    expectedOutcomes: ((pack as any).salesMetadata?.outcomes as string[]) || ['asset adoption'],
  };
  return {
    ...pack,
    ...buyerMetadata,
    salesMetadata: {
      ...((pack as any).salesMetadata || {}),
      buyerPersona: buyerMetadata.buyerPersona,
      decisionMaker: buyerMetadata.decisionMaker,
      stakeholders: buyerMetadata.stakeholders,
      expectedOutcomes: buyerMetadata.expectedOutcomes,
    },
  };
});

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
  [OrganizationType.RESEARCH_CENTER]: ['core-platform', 'research-education'],
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

type SeedPlatformAsset = {
  id: string;
  assetType: PlatformAssetType;
  title: string;
  description: string;
  category: string;
  clinicalSpecialty: string;
  route: string;
  launchType: string;
  permissionPolicy: Record<string, unknown>;
  organizationTypes: OrganizationType[];
  roleProfiles: string[];
  intendedRoles: string[];
  workspaceTags: string[];
  specialties: string[];
  primaryDepartment: string;
  secondaryDepartments: string[];
  recommendedRoles: string[];
  requiredPermissions: string[];
  riskLevel: AssetRegistryRiskLevel;
  backendStatus: string;
  demoStatus: AssetDemoLiveStatus;
  governance: Record<string, unknown>;
  lifecycle: PlatformAssetLifecycle;
  pricingTier: PricingTier;
  packIds: string[];
  dependencies: string[];
  catalogVersion: string;
};

type MigratedAssetRecord = Partial<Omit<SeedPlatformAsset, 'id' | 'assetType' | 'title'>> & {
  id: string;
  title?: string;
  type?: AssetRegistryType;
  assetType?: PlatformAssetType;
  packIds?: string[];
};

const DEFAULT_ORGANIZATION_TYPES = Object.values(OrganizationType);
const DEFAULT_INTENDED_ROLES = [
  'administrator',
  'emergency physician',
  'hospitalist',
  'nurse',
  'ICU clinician',
  'medical student',
];
const DEFAULT_WORKSPACE_TAGS = ['clinical', 'operations', 'admin'];
const DEFAULT_PERMISSION_POLICY = {};
const CLINICAL_REVIEW_GOVERNANCE = {
  clinicalRiskLevel: AssetRegistryRiskLevel.CLINICAL_DECISION_SUPPORT,
  requiresHumanReview: true,
  auditRequired: true,
  validationStatus: AssetDemoLiveStatus.DEMO,
};

const PLATFORM_DASHBOARD_ASSETS: MigratedAssetRecord[] = [
  {
    id: 'assistant',
    title: 'AI Assistant',
    type: AssetRegistryType.AI_AGENT,
    category: 'AI Agent',
    route: '/assistant',
    packIds: ['core-platform', 'ai-workflow-pack'],
  },
  {
    id: 'dashboard',
    title: 'Command Center',
    type: AssetRegistryType.DASHBOARD,
    category: 'Dashboard',
    route: '/dashboard',
    packIds: ['core-platform'],
  },
  {
    id: 'devices',
    title: 'Device Fleet',
    type: AssetRegistryType.IOT_MODULE,
    category: 'Medical IoT',
    route: '/devices',
    packIds: ['medical-iot-pack', 'hospital-operations'],
  },
  {
    id: 'fleet-map',
    title: 'Fleet Map',
    type: AssetRegistryType.MAP,
    category: 'Fleet',
    route: '/fleet/map',
    packIds: ['fleet-logistics'],
  },
  {
    id: 'timeline',
    title: 'Clinical Timeline',
    type: AssetRegistryType.DASHBOARD,
    category: 'Patient Workspace',
    route: '/timeline',
    packIds: ['core-platform', 'ai-workflow-pack'],
  },
  {
    id: 'workflows',
    title: 'Workflow Builder',
    type: AssetRegistryType.WORKFLOW,
    category: 'Workflow',
    route: '/workflows',
    packIds: ['ai-workflow-pack'],
  },
  {
    id: 'assets',
    title: 'Asset Library',
    type: AssetRegistryType.DASHBOARD,
    category: 'Asset Registry',
    route: '/assets',
    packIds: ['core-platform'],
  },
  {
    id: 'system-health',
    title: 'System Health',
    type: AssetRegistryType.REPORT,
    category: 'Operations',
    route: '/system-health',
    packIds: ['governance-compliance-pack'],
  },
];

const PLATFORM_SYSTEM_ASSETS: MigratedAssetRecord[] = [
  [
    'fhir-connector',
    'FHIR Connector',
    'Interoperability',
    '/integrations/fhir',
    AssetRegistryType.INTEGRATION,
  ],
  [
    'hl7-bridge',
    'HL7 Bridge',
    'Interoperability',
    '/integrations/hl7',
    AssetRegistryType.INTEGRATION,
  ],
  [
    'ehr-patient-import',
    'EHR Patient Import',
    'Patient Data',
    '/patients/import',
    AssetRegistryType.INTEGRATION,
  ],
  [
    'lab-result-import',
    'Lab Result Import',
    'Patient Data',
    '/patients/:patientId/labs/import',
    AssetRegistryType.INTEGRATION,
  ],
  [
    'medication-list-import',
    'Medication List Import',
    'Patient Data',
    '/patients/:patientId/medications/import',
    AssetRegistryType.INTEGRATION,
  ],
  [
    'observation-vitals-import',
    'Observation And Vitals Import',
    'Patient Data',
    '/patients/:patientId/observations/import',
    AssetRegistryType.INTEGRATION,
  ],
  [
    'source-provenance',
    'Source Provenance',
    'Interoperability',
    '/integrations/source-provenance',
    AssetRegistryType.REPORT,
  ],
  [
    'calculator-recommender-ai',
    'Calculator Recommender AI',
    'Clinical AI',
    '/tools/calculator-recommender',
    AssetRegistryType.AI_AGENT,
  ],
  [
    'workflow-builder-ai',
    'Workflow Builder AI',
    'Clinical AI',
    '/tools/workflow-builder-ai',
    AssetRegistryType.AI_AGENT,
  ],
  [
    'clinical-reasoning-engine',
    'Clinical Reasoning Engine',
    'Clinical AI',
    '/tools/clinical-reasoning-engine',
    AssetRegistryType.AI_AGENT,
  ],
  [
    'guideline-rag',
    'Guideline RAG',
    'Reference',
    '/tools/guideline-rag',
    AssetRegistryType.CLINICAL_TOOL,
  ],
  ['why-engine', 'Why Engine', 'Clinical AI', '/tools/why-engine', AssetRegistryType.AI_AGENT],
  [
    'audit-trail-ai',
    'Audit Trail AI',
    'Governance',
    '/tools/audit-trail-ai',
    AssetRegistryType.AI_AGENT,
  ],
  [
    'patient-workspace',
    'Patient Workspace',
    'Patient Workspace',
    '/patients/:patientId/workspace',
    AssetRegistryType.DASHBOARD,
  ],
  [
    'patient-summary-ai',
    'Patient Summary AI',
    'Clinical AI',
    '/patients/:patientId/summary',
    AssetRegistryType.AI_AGENT,
  ],
  [
    'timeline-live',
    'Live Timeline',
    'Patient Workspace',
    '/patients/:patientId/timeline',
    AssetRegistryType.DASHBOARD,
  ],
  [
    'clinical-event-ai',
    'Clinical Event AI',
    'Clinical AI',
    '/patients/:patientId/events',
    AssetRegistryType.AI_AGENT,
  ],
  [
    'risk-score-history',
    'Risk Score History',
    'Patient Workspace',
    '/patients/:patientId/risk-history',
    AssetRegistryType.REPORT,
  ],
  [
    'care-plan-view',
    'Care Plan View',
    'Patient Workspace',
    '/patients/:patientId/care-plan',
    AssetRegistryType.DASHBOARD,
  ],
  [
    'soap-builder',
    'SOAP Builder',
    'Documentation',
    '/tools/soap-builder',
    AssetRegistryType.TEMPLATE,
  ],
  [
    'ambient-scribe',
    'Ambient Scribe',
    'Documentation',
    '/tools/ambient-scribe',
    AssetRegistryType.AI_AGENT,
  ],
  [
    'clinical-dictation',
    'Clinical Dictation',
    'Documentation',
    '/tools/clinical-dictation',
    AssetRegistryType.AI_AGENT,
  ],
  [
    'discharge-summary-ai',
    'Discharge Summary AI',
    'Documentation',
    '/tools/discharge-summary-ai',
    AssetRegistryType.AI_AGENT,
  ],
  ['referral-ai', 'Referral AI', 'Documentation', '/tools/referral-ai', AssetRegistryType.AI_AGENT],
  [
    'prior-auth-ai',
    'Prior Auth AI',
    'Documentation',
    '/tools/prior-auth-ai',
    AssetRegistryType.AI_AGENT,
  ],
  ['ai-governance', 'AI Governance', 'Governance', '/ai-governance', AssetRegistryType.REPORT],
  [
    'clinical-governance',
    'Clinical Governance',
    'Governance',
    '/governance/clinical',
    AssetRegistryType.REPORT,
  ],
  [
    'clinical-release-gates',
    'Clinical Release Gates',
    'Governance',
    '/governance/clinical/release-gates',
    AssetRegistryType.WORKFLOW,
  ],
  [
    'clinical-safety-findings',
    'Clinical Safety Findings',
    'Governance',
    '/governance/clinical/safety-findings',
    AssetRegistryType.REPORT,
  ],
  ['ai-security', 'AI Security', 'Security', '/security', AssetRegistryType.REPORT],
  [
    'prompt-firewall',
    'Prompt Firewall',
    'Security',
    '/governance/ai-security/prompt-firewall',
    AssetRegistryType.INTEGRATION,
  ],
  [
    'model-access-policy',
    'Model Access Policy',
    'Security',
    '/governance/ai-security/model-access',
    AssetRegistryType.PROTOCOL,
  ],
  [
    'model-usage-dashboard',
    'Model Usage Dashboard',
    'Governance',
    '/governance/model-usage',
    AssetRegistryType.DASHBOARD,
  ],
  [
    'cost-optimization-control-plane',
    'Cost Optimization Control Plane',
    'Governance',
    '/governance/costs',
    AssetRegistryType.DASHBOARD,
  ],
  [
    'clinical-safety-audit',
    'Clinical Safety Audit',
    'Governance',
    '/governance/clinical-safety',
    AssetRegistryType.REPORT,
  ],
  [
    'governance-registry',
    'Platform Governance Registry',
    'Governance',
    '/governance-registry',
    AssetRegistryType.REPORT,
  ],
  [
    'consent-manager',
    'Consent Manager',
    'Governance',
    '/governance/consent',
    AssetRegistryType.WORKFLOW,
  ],
  [
    'privacy-center',
    'Privacy Center',
    'Governance',
    '/governance/privacy',
    AssetRegistryType.REPORT,
  ],
  [
    'regulatory-classification',
    'Regulatory Classification',
    'Regulatory',
    '/governance/regulatory',
    AssetRegistryType.REPORT,
  ],
  [
    'intended-use-registry',
    'Intended Use Registry',
    'Regulatory',
    '/governance/regulatory/intended-use',
    AssetRegistryType.REPORT,
  ],
  [
    'equity-monitoring',
    'Equity Monitoring',
    'Equity',
    '/governance/equity',
    AssetRegistryType.REPORT,
  ],
  [
    'bias-finding-review',
    'Bias Finding Review',
    'Equity',
    '/governance/equity/findings',
    AssetRegistryType.WORKFLOW,
  ],
  [
    'validation-sandbox',
    'Validation Sandbox',
    'Validation',
    '/governance/validation',
    AssetRegistryType.SIMULATION,
  ],
  [
    'synthetic-patient-lab',
    'Synthetic Patient Lab',
    'Validation',
    '/governance/validation/synthetic-patients',
    AssetRegistryType.SIMULATION,
  ],
  ['human-review-queue', 'Human Review Queue', 'Review', '/review', AssetRegistryType.WORKFLOW],
  [
    'consent-center',
    'Consent Center',
    'Governance',
    '/patients/:patientId/consent',
    AssetRegistryType.WORKFLOW,
  ],
  ['audit-trail-spine', 'Audit Trail Spine', 'Audit', '/audit', AssetRegistryType.REPORT],
  [
    'ai-run-audit-timeline',
    'AI Run Audit Timeline',
    'Audit',
    '/audit/ai',
    AssetRegistryType.REPORT,
  ],
  [
    'deployment-observability',
    'Deployment Observability',
    'Operations',
    '/operations/observability',
    AssetRegistryType.REPORT,
  ],
  [
    'operations-incident-center',
    'Operations Incident Center',
    'Operations',
    '/operations/incidents',
    AssetRegistryType.WORKFLOW,
  ],
].map(([id, title, category, route, type]) => ({
  id: id as string,
  title: title as string,
  category: category as string,
  route: route as string,
  type: type as AssetRegistryType,
  packIds:
    category === 'Governance' ||
    category === 'Security' ||
    category === 'Regulatory' ||
    category === 'Equity' ||
    category === 'Validation' ||
    category === 'Review' ||
    category === 'Audit'
      ? ['governance-compliance-pack']
      : category === 'Clinical AI' || category === 'Documentation'
        ? ['ai-workflow-pack']
        : ['hospital-operations'],
}));

const PROTOCOL_ASSETS: MigratedAssetRecord[] = [
  ['sepsis', 'Sepsis Management', 'sepsis'],
  ['acs', 'ACS Chest Pain Pathway', 'ACS'],
  ['stroke', 'Stroke Alert Pathway', 'stroke'],
  ['trauma', 'Trauma Primary Survey Pathway', 'trauma'],
  ['dka', 'DKA Management Pathway', 'DKA'],
  ['respiratory-failure', 'Respiratory Failure Pathway', 'respiratory failure'],
  ['pediatric-fever', 'Pediatric Fever Pathway', 'pediatric fever'],
].map(([id, title, category]) => ({
  id: `protocol-${id}`,
  title,
  type: AssetRegistryType.PROTOCOL,
  category,
  route: '/protocols',
  packIds: ['emergency-medicine', 'emergency-department-pack'],
  workspaceTags: ['clinical', 'emergency', 'education'],
}));

const SIMULATION_ASSETS: MigratedAssetRecord[] = [
  ['sepsis-deterioration', 'Sepsis Deterioration', 'Emergency'],
  ['chest-pain-acs', 'Chest Pain ACS', 'Cardiology'],
  ['stroke-alert', 'Stroke Alert', 'Emergency'],
  ['respiratory-failure', 'Respiratory Failure', 'Respiratory'],
  ['trauma-triage', 'Trauma Triage', 'Trauma'],
  ['dka-management', 'DKA Management', 'Critical Care'],
  ['pediatric-fever', 'Pediatric Fever', 'Pediatrics'],
  ['ob-hemorrhage', 'OB Hemorrhage', 'OB/GYN'],
  ['medication-safety-event', 'Medication Safety Event', 'Medication Safety'],
  ['anaphylaxis', 'Anaphylaxis', 'Emergency'],
  ['cardiac-arrest', 'Cardiac Arrest', 'Critical Care'],
  ['gi-bleed', 'GI Bleed', 'Critical Care'],
  ['abnormal-lab-escalation', 'Abnormal Lab Escalation', 'Laboratory'],
  ['device-alarm-failure', 'Device Alarm Failure', 'Medical IoT / Device Failure'],
  ['hospital-bed-surge', 'Hospital Bed Surge', 'Fleet / Disaster Response'],
  ['mass-casualty-incident', 'Mass Casualty Incident', 'Fleet / Disaster Response'],
].map(([id, title, category]) => ({
  id,
  title,
  type: AssetRegistryType.SIMULATION,
  category,
  route: `/simulation/${id}`,
  packIds: ['simulation-training-pack'],
  workspaceTags: ['education', 'simulation', 'clinical'],
  intendedRoles: ['medical student', 'researcher', 'emergency physician', 'nurse'],
  riskLevel: AssetRegistryRiskLevel.INFORMATIONAL,
  demoStatus: AssetDemoLiveStatus.DEMO_READY,
}));

export const AUTOMATION_COMMERCIAL_ASSETS: MigratedAssetRecord[] = [
  {
    id: 'automation-news2-clinician-notification',
    title: 'High NEWS2 Escalation Automation',
    type: AssetRegistryType.WORKFLOW,
    category: 'Clinical Automation',
    route: '/automation',
    packIds: ['emergency-department-pack', 'icu-pack'],
    workspaceTags: ['automation', 'emergency', 'icu', 'alerts'],
    intendedRoles: ['emergency physician', 'nurse', 'ICU clinician'],
    recommendedRoles: ['emergency physician', 'nurse', 'ICU clinician'],
    requiredPermissions: ['READ_PHI', 'USE_AI_CHAT', 'REVIEW_SAFETY_FINDINGS'],
    riskLevel: AssetRegistryRiskLevel.HIGH_RISK,
    pricingTier: PricingTier.ENTERPRISE,
    demoStatus: AssetDemoLiveStatus.DEMO_READY,
    permissionPolicy: {
      allowedRoles: ['emergency physician', 'nurse', 'ICU clinician', 'administrator'],
      permissions: ['READ_PHI', 'USE_AI_CHAT', 'REVIEW_SAFETY_FINDINGS'],
      logic: 'all',
      requiresHumanReview: true,
    },
    governance: {
      clinicalRiskLevel: AssetRegistryRiskLevel.HIGH_RISK,
      riskLevel: AssetRegistryRiskLevel.HIGH_RISK,
      requiresHumanReview: true,
      auditRequired: true,
      owner: 'Emergency Department Clinical Lead',
      steward: 'Clinical Informatics Steward',
      approver: 'Clinical Safety Board',
      automationTrigger: 'NEWS2 reaches configured high-risk threshold',
      safeAction: 'Notify clinical review queue',
      prohibitedSideEffects: ['clinical_writeback', 'order_entry', 'autonomous_escalation'],
      dashboardCard: 'clinical-automation-review',
    },
  },
  {
    id: 'automation-device-offline-maintenance',
    title: 'Device Offline Maintenance Automation',
    type: AssetRegistryType.WORKFLOW,
    category: 'Operational Automation',
    route: '/medical-iot',
    packIds: ['medical-iot-pack'],
    workspaceTags: ['automation', 'medical-iot', 'devices', 'operations'],
    intendedRoles: ['biomedical engineer', 'administrator'],
    recommendedRoles: ['biomedical engineer', 'administrator'],
    requiredPermissions: ['VIEW_OPERATIONS'],
    riskLevel: AssetRegistryRiskLevel.OPERATIONAL,
    pricingTier: PricingTier.ENTERPRISE,
    demoStatus: AssetDemoLiveStatus.DEMO_READY,
    permissionPolicy: {
      allowedRoles: ['biomedical engineer', 'administrator'],
      permissions: ['VIEW_OPERATIONS'],
      logic: 'all',
      requiresHumanReview: false,
    },
    governance: {
      clinicalRiskLevel: AssetRegistryRiskLevel.OPERATIONAL,
      riskLevel: AssetRegistryRiskLevel.OPERATIONAL,
      requiresHumanReview: false,
      auditRequired: true,
      owner: 'Biomedical Engineering Lead',
      steward: 'Medical IoT Operations Steward',
      approver: 'Biomedical Engineering Lead',
      automationTrigger: 'Device heartbeat stale or offline',
      safeAction: 'Create biomedical maintenance task',
      prohibitedSideEffects: ['device_control', 'clinical_writeback'],
      dashboardCard: 'device-automation-queue',
    },
  },
  {
    id: 'automation-potassium-lab-workflow',
    title: 'Abnormal Potassium Lab Workflow Automation',
    type: AssetRegistryType.WORKFLOW,
    category: 'Clinical Automation',
    route: '/laboratory',
    packIds: ['laboratory-intelligence', 'emergency-department-pack'],
    workspaceTags: ['automation', 'laboratory', 'emergency', 'alerts'],
    intendedRoles: ['emergency physician', 'nurse', 'pharmacist', 'administrator'],
    recommendedRoles: ['emergency physician', 'pharmacist', 'administrator'],
    requiredPermissions: ['READ_PHI', 'USE_AI_CHAT', 'REVIEW_SAFETY_FINDINGS'],
    riskLevel: AssetRegistryRiskLevel.HIGH_RISK,
    pricingTier: PricingTier.ENTERPRISE,
    demoStatus: AssetDemoLiveStatus.DEMO_READY,
    permissionPolicy: {
      allowedRoles: ['emergency physician', 'nurse', 'pharmacist', 'administrator'],
      permissions: ['READ_PHI', 'USE_AI_CHAT', 'REVIEW_SAFETY_FINDINGS'],
      logic: 'all',
      requiresHumanReview: true,
    },
    governance: {
      clinicalRiskLevel: AssetRegistryRiskLevel.HIGH_RISK,
      riskLevel: AssetRegistryRiskLevel.HIGH_RISK,
      requiresHumanReview: true,
      auditRequired: true,
      owner: 'Laboratory Director',
      steward: 'Clinical Informatics Steward',
      approver: 'Clinical Safety Board',
      automationTrigger: 'Potassium result outside configured critical range',
      safeAction: 'Open lab review workflow',
      prohibitedSideEffects: ['clinical_writeback', 'order_entry', 'autonomous_treatment'],
      dashboardCard: 'clinical-automation-review',
    },
  },
  {
    id: 'automation-audit-event-review',
    title: 'Audit Event Review Automation',
    type: AssetRegistryType.WORKFLOW,
    category: 'Governance Automation',
    route: '/audit/automation',
    packIds: ['governance-compliance-pack'],
    workspaceTags: ['automation', 'governance', 'audit'],
    intendedRoles: ['administrator', 'compliance officer', 'security analyst'],
    recommendedRoles: ['administrator', 'compliance officer'],
    requiredPermissions: ['VIEW_AUDIT_LOGS', 'VIEW_GOVERNANCE'],
    riskLevel: AssetRegistryRiskLevel.GOVERNANCE_REQUIRED,
    pricingTier: PricingTier.ADDON,
    demoStatus: AssetDemoLiveStatus.DEMO_READY,
    permissionPolicy: {
      allowedRoles: ['administrator', 'admin', 'owner', 'compliance officer', 'security analyst'],
      permissions: ['VIEW_AUDIT_LOGS', 'VIEW_GOVERNANCE'],
      logic: 'all',
      requiresHumanReview: true,
    },
    governance: {
      clinicalRiskLevel: AssetRegistryRiskLevel.GOVERNANCE_REQUIRED,
      riskLevel: AssetRegistryRiskLevel.GOVERNANCE_REQUIRED,
      requiresHumanReview: true,
      auditRequired: true,
      owner: 'Compliance Officer',
      steward: 'Governance Review Board',
      approver: 'Compliance Officer',
      automationTrigger: 'Audit exception or policy-review event',
      safeAction: 'Create governance review item',
      prohibitedSideEffects: ['policy_change_without_review', 'audit_record_mutation'],
      dashboardCard: 'governance-automation-controls',
    },
  },
  {
    id: 'automation-integration-unsupported-labeling',
    title: 'Unsupported Integration Labeling Automation',
    type: AssetRegistryType.WORKFLOW,
    category: 'Governance Automation',
    route: '/integrations',
    packIds: ['governance-compliance-pack', 'ai-workflow-pack'],
    workspaceTags: ['automation', 'governance', 'interoperability', 'ai-workflow'],
    intendedRoles: ['administrator', 'integration analyst', 'compliance officer'],
    recommendedRoles: ['administrator', 'integration analyst'],
    requiredPermissions: ['VIEW_INTEGRATIONS', 'VIEW_GOVERNANCE'],
    riskLevel: AssetRegistryRiskLevel.GOVERNANCE_REQUIRED,
    pricingTier: PricingTier.ADDON,
    demoStatus: AssetDemoLiveStatus.DEMO_READY,
    permissionPolicy: {
      allowedRoles: [
        'administrator',
        'admin',
        'owner',
        'integration analyst',
        'compliance officer',
      ],
      permissions: ['VIEW_INTEGRATIONS', 'VIEW_GOVERNANCE'],
      logic: 'all',
      requiresHumanReview: true,
    },
    governance: {
      clinicalRiskLevel: AssetRegistryRiskLevel.GOVERNANCE_REQUIRED,
      riskLevel: AssetRegistryRiskLevel.GOVERNANCE_REQUIRED,
      requiresHumanReview: true,
      auditRequired: true,
      owner: 'Clinical Informatics Director',
      steward: 'Integration Governance Steward',
      approver: 'Governance Review Board',
      automationTrigger: 'Unsupported FHIR, HL7, LIS, or telemetry event received',
      safeAction: 'Label unsupported integration and preserve audit metadata',
      prohibitedSideEffects: ['clinical_writeback', 'silent_drop'],
      dashboardCard: 'governance-automation-controls',
    },
  },
];

const WORKFLOW_TEMPLATE_ASSETS: MigratedAssetRecord[] = [
  ['news2-clinician-notification', 'High NEWS2 Escalation', 'Clinical Workflow'],
  ['device-offline-maintenance', 'Offline Device Maintenance', 'Operations Workflow'],
  ['potassium-lab-workflow', 'Abnormal Potassium Lab Workflow', 'Laboratory Workflow'],
  ['discharge-summary-template', 'Discharge Summary Template', 'Documentation Template'],
  ['soap-note-template', 'SOAP Note Template', 'Documentation Template'],
  ['referral-letter-template', 'Referral Letter Template', 'Documentation Template'],
  ['prior-auth-template', 'Prior Authorization Template', 'Documentation Template'],
].map(([id, title, category]) => ({
  id,
  title,
  type: category.includes('Template') ? AssetRegistryType.TEMPLATE : AssetRegistryType.WORKFLOW,
  category,
  route: category.includes('Template') ? '/documentation' : '/workflows',
  packIds: ['ai-workflow-pack'],
  workspaceTags: ['clinical', 'workflow', 'documentation'],
  lifecycle:
    id === 'referral-letter-template'
      ? PlatformAssetLifecycle.DEPRECATED
      : id === 'prior-auth-template'
        ? PlatformAssetLifecycle.ARCHIVED
        : undefined,
}));

const PLUGIN_ASSETS: MigratedAssetRecord[] = [
  [
    'plugin-fluid-resuscitation-calculator',
    'Fluid Resuscitation Calculator Plugin',
    AssetRegistryType.CALCULATOR,
    '/tools/catalog',
  ],
  [
    'plugin-anticoagulation-protocol',
    'Anticoagulation Protocol Plugin',
    AssetRegistryType.PROTOCOL,
    '/protocols',
  ],
  [
    'plugin-pediatric-code-simulation',
    'Pediatric Code Simulation Plugin',
    AssetRegistryType.SIMULATION,
    '/simulation',
  ],
  [
    'plugin-capacity-command-dashboard',
    'Capacity Command Dashboard Plugin',
    AssetRegistryType.DASHBOARD,
    '/operations-center',
  ],
  [
    'plugin-discharge-workflow',
    'Discharge Workflow Plugin',
    AssetRegistryType.WORKFLOW,
    '/assistant',
  ],
  [
    'plugin-guideline-copilot-extension',
    'Guideline Copilot AI Extension',
    AssetRegistryType.AI_AGENT,
    '/assistant',
  ],
].map(([id, title, type, route]) => ({
  id: id as string,
  title: title as string,
  type: type as AssetRegistryType,
  category: 'Plugin',
  route: route as string,
  packIds: ['core-platform'],
  workspaceTags: ['plugin', 'marketplace'],
  lifecycle: PlatformAssetLifecycle.DRAFT,
  demoStatus: AssetDemoLiveStatus.DEMO_READY,
}));

const MIGRATED_CAPABILITY_ASSETS: MigratedAssetRecord[] = [
  ...PLATFORM_DASHBOARD_ASSETS,
  ...PLATFORM_SYSTEM_ASSETS,
  ...PROTOCOL_ASSETS,
  ...SIMULATION_ASSETS,
  ...AUTOMATION_COMMERCIAL_ASSETS,
  ...WORKFLOW_TEMPLATE_ASSETS,
  ...PLUGIN_ASSETS,
];

function inferAssetType(id: string): PlatformAssetType {
  if (id.startsWith('agent-')) return PlatformAssetType.AI_AGENT;
  if (id.includes('simulation') || id === 'scenario-player') return PlatformAssetType.SIMULATION;
  if (id.includes('map') || id === 'live-map') return PlatformAssetType.MAP;
  if (id.includes('iot') || id.includes('device') || id.includes('telemetry')) {
    return PlatformAssetType.IOT;
  }
  if (id.includes('fleet') || id.includes('route-optimizer') || id.includes('dispatch')) {
    return PlatformAssetType.FLEET;
  }
  if (id.includes('workflow')) return PlatformAssetType.WORKFLOW;
  if (id.includes('report') || id.includes('audit')) return PlatformAssetType.REPORT;
  if (id.includes('integration') || id.includes('connector') || id.includes('bridge')) {
    return PlatformAssetType.INTEGRATION;
  }
  if (id.includes('template')) return PlatformAssetType.TEMPLATE;
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

function titleize(id: string) {
  return id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function union<T>(...values: Array<T[] | undefined>): T[] {
  return [...new Set(values.flatMap((value) => value || []))];
}

function pricingTierForPackIds(packIds: string[]) {
  const tiers = packIds
    .map((packId) => SEED_ASSET_PACKS.find((pack) => pack.id === packId)?.pricingTier)
    .filter(Boolean);
  if (tiers.includes(PricingTier.ENTERPRISE)) return PricingTier.ENTERPRISE;
  if (tiers.includes(PricingTier.ADDON)) return PricingTier.ADDON;
  if (tiers.includes(PricingTier.CORE)) return PricingTier.CORE;
  return PricingTier.STANDARD;
}

function packDefaultsForAsset(packIds: string[]): {
  organizationTypes: OrganizationType[];
  intendedRoles: string[];
  workspaceTags: string[];
} {
  const packs = packIds
    .map((packId) => SEED_ASSET_PACKS.find((pack) => pack.id === packId))
    .filter(Boolean) as typeof SEED_ASSET_PACKS;
  return {
    organizationTypes: union<OrganizationType>(...packs.map((pack) => pack.organizationTypes)),
    intendedRoles: union<string>(...packs.map((pack: any) => pack.targetRoles || [])),
    workspaceTags: union<string>(...packs.map((pack) => pack.defaultModules)),
  };
}

function attachMigratedAssetsToPacks() {
  for (const asset of MIGRATED_CAPABILITY_ASSETS) {
    for (const packId of asset.packIds || []) {
      const pack = SEED_ASSET_PACKS.find((item) => item.id === packId);
      if (pack && !pack.assetIds.includes(asset.id)) {
        pack.assetIds.push(asset.id);
      }
    }
  }
}

function governanceForAsset(riskLevel: AssetRegistryRiskLevel, demoStatus: AssetDemoLiveStatus) {
  const clinicalReviewRequired =
    riskLevel === AssetRegistryRiskLevel.CLINICAL_DECISION_SUPPORT ||
    riskLevel === AssetRegistryRiskLevel.HIGH_RISK ||
    riskLevel === AssetRegistryRiskLevel.GOVERNANCE_REQUIRED;
  return {
    ...CLINICAL_REVIEW_GOVERNANCE,
    owner: 'Clinical Platform Owner',
    steward: 'Clinical Informatics Steward',
    approver:
      riskLevel === AssetRegistryRiskLevel.HIGH_RISK
        ? 'Clinical Safety Board'
        : riskLevel === AssetRegistryRiskLevel.GOVERNANCE_REQUIRED
          ? 'Governance Review Board'
          : clinicalReviewRequired
            ? 'Clinical Governance Lead'
            : 'Asset Steward',
    clinicalRiskLevel: riskLevel,
    riskLevel,
    evidenceSource: 'platform-asset-seed.data.ts',
    version: '1.0.0',
    auditRequirement:
      clinicalReviewRequired || riskLevel === AssetRegistryRiskLevel.OPERATIONAL
        ? 'required'
        : 'standard',
    reviewSchedule:
      riskLevel === AssetRegistryRiskLevel.HIGH_RISK ||
      riskLevel === AssetRegistryRiskLevel.GOVERNANCE_REQUIRED
        ? 'quarterly'
        : riskLevel === AssetRegistryRiskLevel.CLINICAL_DECISION_SUPPORT
          ? 'semiannual'
          : 'annual',
    validationStatus: demoStatus,
    requiresHumanReview: clinicalReviewRequired,
  };
}

function normalizeSeedAsset(
  id: string,
  packIds: string[],
  overrides: Partial<MigratedAssetRecord> = {},
): SeedPlatformAsset {
  const agent = AI_AGENT_ASSETS.find((row) => row.id === id);
  const assetType =
    overrides.assetType ||
    (overrides.type && registryTypeToEntityAssetType(overrides.type)) ||
    (agent ? PlatformAssetType.AI_AGENT : inferAssetType(id));
  const defaults = packDefaultsForAsset(packIds);
  const typeRisk =
    assetType === PlatformAssetType.AI_AGENT || assetType === PlatformAssetType.CLINICAL_TOOL
      ? AssetRegistryRiskLevel.CLINICAL_DECISION_SUPPORT
      : assetType === PlatformAssetType.REPORT || assetType === PlatformAssetType.INTEGRATION
        ? AssetRegistryRiskLevel.OPERATIONAL
        : AssetRegistryRiskLevel.INFORMATIONAL;
  const riskLevel = overrides.riskLevel || typeRisk;
  const demoStatus = overrides.demoStatus || AssetDemoLiveStatus.DEMO;
  const organizationTypes = union<OrganizationType>(
    overrides.organizationTypes,
    defaults.organizationTypes,
  );
  const intendedRoles = union<string>(
    overrides.intendedRoles,
    agent?.defaultForRoles,
    defaults.intendedRoles,
  );
  const workspaceTags = union<string>(
    overrides.workspaceTags,
    agent?.workspaceTags,
    defaults.workspaceTags,
  );
  const agentPermissionPolicy = agent
    ? {
        capabilities: agent.capabilities,
        assetAccess: agent.assetAccess,
        workspaceAwareness: agent.workspaceTags,
        roleAwareness: agent.defaultForRoles,
        toolCallingPermissions: agent.toolCallingPermissions,
        canCallTools: true,
      }
    : null;
  const permissionPolicy =
    overrides.permissionPolicy || agentPermissionPolicy || DEFAULT_PERMISSION_POLICY;
  const departmentInput = {
    id,
    title: overrides.title || agent?.title || titleize(id),
    category: overrides.category,
    clinicalSpecialty: overrides.clinicalSpecialty,
    route: overrides.route || agent?.route,
    assetType,
    workspaceTags: workspaceTags.length
      ? workspaceTags
      : agent?.workspaceTags || DEFAULT_WORKSPACE_TAGS,
    specialties: overrides.specialties || [],
    intendedRoles: intendedRoles.length ? intendedRoles : DEFAULT_INTENDED_ROLES,
    packIds,
    permissionPolicy,
  };
  const inferredDepartments = inferDepartmentsForAsset(departmentInput);
  const primaryDepartment = overrides.primaryDepartment || inferredDepartments.primaryDepartment;
  const secondaryDepartments = union<string>(
    overrides.secondaryDepartments,
    inferredDepartments.secondaryDepartments,
  ).filter((department) => department !== primaryDepartment);
  const recommendedRoles = union<string>(
    overrides.recommendedRoles,
    intendedRoles,
    agent?.defaultForRoles,
    defaults.intendedRoles,
  );
  const requiredPermissions = union<string>(
    overrides.requiredPermissions,
    defaultRequiredPermissions({ ...departmentInput, primaryDepartment }),
  );

  return {
    id,
    assetType,
    title: overrides.title || agent?.title || titleize(id),
    description:
      overrides.description ||
      agent?.description ||
      `${overrides.title || agent?.title || titleize(id)} registered in the CareDroid Asset Registry.`,
    category:
      overrides.category ||
      (agent
        ? 'AI Agent'
        : assetType === PlatformAssetType.CALCULATOR
          ? 'Calculator'
          : assetType === PlatformAssetType.DASHBOARD
            ? 'Dashboard'
            : 'Clinical'),
    clinicalSpecialty: overrides.clinicalSpecialty || '',
    route:
      overrides.route ||
      agent?.route ||
      (id === 'calculators'
        ? '/tools/calculators'
        : assetType === PlatformAssetType.CALCULATOR
          ? `/tools/calculators/${id}`
          : `/tools/${id}`),
    launchType: overrides.launchType || 'registry',
    permissionPolicy,
    organizationTypes: organizationTypes.length ? organizationTypes : DEFAULT_ORGANIZATION_TYPES,
    roleProfiles: overrides.roleProfiles || [],
    intendedRoles: intendedRoles.length ? intendedRoles : DEFAULT_INTENDED_ROLES,
    workspaceTags: workspaceTags.length
      ? workspaceTags
      : agent?.workspaceTags || DEFAULT_WORKSPACE_TAGS,
    specialties: overrides.specialties || [],
    primaryDepartment,
    secondaryDepartments,
    recommendedRoles: recommendedRoles.length ? recommendedRoles : DEFAULT_INTENDED_ROLES,
    requiredPermissions,
    riskLevel,
    backendStatus: overrides.backendStatus || 'partial',
    demoStatus,
    governance: overrides.governance || governanceForAsset(riskLevel, demoStatus),
    lifecycle:
      overrides.lifecycle ||
      (assetType === PlatformAssetType.INTEGRATION
        ? PlatformAssetLifecycle.BETA
        : PlatformAssetLifecycle.ACTIVE),
    pricingTier: overrides.pricingTier || pricingTierForPackIds(packIds),
    packIds,
    dependencies: overrides.dependencies || [],
    catalogVersion: overrides.catalogVersion || '1.0.0',
  };
}

function buildAssetSeedRows(): SeedPlatformAsset[] {
  attachMigratedAssetsToPacks();
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
  MIGRATED_CAPABILITY_ASSETS.forEach((asset) => allIds.add(asset.id));

  const migratedById = new Map(MIGRATED_CAPABILITY_ASSETS.map((asset) => [asset.id, asset]));
  return [...allIds].map((id) =>
    normalizeSeedAsset(
      id,
      packByAsset.get(id) || migratedById.get(id)?.packIds || ['core-platform'],
      migratedById.get(id),
    ),
  );
}

export const SEED_PLATFORM_ASSETS = buildAssetSeedRows();
