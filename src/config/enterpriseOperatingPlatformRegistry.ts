/**
 * TrackMind Enterprise Operating Platform — module registry (Prompts 99–116).
 */

export const ENTERPRISE_PLATFORM_MODULE = Object.freeze({
  OPERATIONAL_BENCHMARKING: 'operational_benchmarking',
  FRANCHISE_READINESS: 'franchise_readiness',
  TRACK_CERTIFICATION: 'track_certification',
  RISK_MANAGEMENT: 'risk_management',
  BUSINESS_CONTINUITY: 'business_continuity',
  DISASTER_RECOVERY: 'disaster_recovery',
  ENTERPRISE_ASSET_REGISTRY: 'enterprise_asset_registry',
  WORKFORCE_MANAGEMENT: 'workforce_management',
  TRAINING_COMPETENCY: 'training_competency',
  KNOWLEDGE_MANAGEMENT: 'knowledge_management',
  OPERATIONAL_PLAYBOOK: 'operational_playbook',
  DECISION_SUPPORT: 'decision_support',
  SCENARIO_PLANNING: 'scenario_planning',
  STRATEGIC_PLANNING: 'strategic_planning',
  PORTFOLIO_MANAGEMENT: 'portfolio_management',
  EXECUTIVE_GOVERNANCE: 'executive_governance',
  SUSTAINABILITY_ESG: 'sustainability_esg',
  ARCHITECTURE_GOVERNANCE: 'architecture_governance',
});

/**
 * Where each module score comes from. Mirrors
 * PLATFORM_INTELLIGENCE_MODULE_PROVENANCE next door, and exists for the same
 * reason: this model produces an overall number, and half of it is not a
 * measurement of anything.
 *
 * LIVE     the assessor reaches outside this module -- auditTrackMindMaturity,
 *          evaluateOperationalSurvivabilityKpis, simulateClinicOnboarding or
 *          buildCustomerSuccessPlatformAssessment -- so the score moves when
 *          the platform does.
 * REGISTRY the assessor scores a list maintained inside
 *          enterpriseOperatingPlatformModel.ts. A real curated inventory,
 *          worth showing, but a document rather than a finding about this
 *          deployment. Several score themselves outright.
 *
 * Derived by checking each assessor for calls to imported symbols, not by
 * matching words in its body -- that shortcut is how assessReportingStudio got
 * mislabelled LIVE in the sibling map.
 */
export const ENTERPRISE_PLATFORM_PROVENANCE = Object.freeze({ LIVE: 'live', REGISTRY: 'registry' });

export const ENTERPRISE_PLATFORM_MODULE_PROVENANCE = Object.freeze({
  [ENTERPRISE_PLATFORM_MODULE.OPERATIONAL_BENCHMARKING]: ENTERPRISE_PLATFORM_PROVENANCE.LIVE,
  [ENTERPRISE_PLATFORM_MODULE.FRANCHISE_READINESS]: ENTERPRISE_PLATFORM_PROVENANCE.LIVE,
  [ENTERPRISE_PLATFORM_MODULE.TRACK_CERTIFICATION]: ENTERPRISE_PLATFORM_PROVENANCE.LIVE,
  [ENTERPRISE_PLATFORM_MODULE.BUSINESS_CONTINUITY]: ENTERPRISE_PLATFORM_PROVENANCE.LIVE,
  [ENTERPRISE_PLATFORM_MODULE.DISASTER_RECOVERY]: ENTERPRISE_PLATFORM_PROVENANCE.LIVE,
  [ENTERPRISE_PLATFORM_MODULE.DECISION_SUPPORT]: ENTERPRISE_PLATFORM_PROVENANCE.LIVE,
  [ENTERPRISE_PLATFORM_MODULE.STRATEGIC_PLANNING]: ENTERPRISE_PLATFORM_PROVENANCE.LIVE,
  [ENTERPRISE_PLATFORM_MODULE.EXECUTIVE_GOVERNANCE]: ENTERPRISE_PLATFORM_PROVENANCE.LIVE,
  [ENTERPRISE_PLATFORM_MODULE.SUSTAINABILITY_ESG]: ENTERPRISE_PLATFORM_PROVENANCE.LIVE,
  [ENTERPRISE_PLATFORM_MODULE.ARCHITECTURE_GOVERNANCE]: ENTERPRISE_PLATFORM_PROVENANCE.LIVE,
  [ENTERPRISE_PLATFORM_MODULE.RISK_MANAGEMENT]: ENTERPRISE_PLATFORM_PROVENANCE.REGISTRY,
  [ENTERPRISE_PLATFORM_MODULE.ENTERPRISE_ASSET_REGISTRY]: ENTERPRISE_PLATFORM_PROVENANCE.REGISTRY,
  [ENTERPRISE_PLATFORM_MODULE.WORKFORCE_MANAGEMENT]: ENTERPRISE_PLATFORM_PROVENANCE.REGISTRY,
  [ENTERPRISE_PLATFORM_MODULE.TRAINING_COMPETENCY]: ENTERPRISE_PLATFORM_PROVENANCE.REGISTRY,
  [ENTERPRISE_PLATFORM_MODULE.KNOWLEDGE_MANAGEMENT]: ENTERPRISE_PLATFORM_PROVENANCE.REGISTRY,
  [ENTERPRISE_PLATFORM_MODULE.OPERATIONAL_PLAYBOOK]: ENTERPRISE_PLATFORM_PROVENANCE.REGISTRY,
  [ENTERPRISE_PLATFORM_MODULE.SCENARIO_PLANNING]: ENTERPRISE_PLATFORM_PROVENANCE.REGISTRY,
  [ENTERPRISE_PLATFORM_MODULE.PORTFOLIO_MANAGEMENT]: ENTERPRISE_PLATFORM_PROVENANCE.REGISTRY,
});
/** @type {ReadonlyArray} */
export const ENTERPRISE_PLATFORM_MODULES = Object.freeze([
  Object.freeze({
    id: ENTERPRISE_PLATFORM_MODULE.OPERATIONAL_BENCHMARKING,
    prompt: 99,
    label: 'Operational benchmarking',
    description: 'Anonymized aggregate KPI comparison across tracks and cohorts.',
    route: '/enterprise-platform#benchmarking',
    relatedRoutes: ['/trackmind-maturity', '/customer-success'],
  }),
  Object.freeze({
    id: ENTERPRISE_PLATFORM_MODULE.FRANCHISE_READINESS,
    prompt: 100,
    label: 'Franchise readiness',
    description: 'Readiness assessments for new racetrack deployments.',
    route: '/enterprise-platform#franchise',
    relatedRoutes: ['/onboarding', '/trackmind-maturity'],
  }),
  Object.freeze({
    id: ENTERPRISE_PLATFORM_MODULE.TRACK_CERTIFICATION,
    prompt: 101,
    label: 'Track certification',
    description: 'Certification-readiness tracking and evidence collection.',
    route: '/enterprise-platform#certification',
    relatedRoutes: ['/governance-registry', '/regulatory'],
  }),
  Object.freeze({
    id: ENTERPRISE_PLATFORM_MODULE.RISK_MANAGEMENT,
    prompt: 102,
    label: 'Risk management',
    description: 'Enterprise risk registers, mitigation workflows, and risk KPIs.',
    route: '/enterprise-platform#risk',
    relatedRoutes: ['/security', '/audit'],
  }),
  Object.freeze({
    id: ENTERPRISE_PLATFORM_MODULE.BUSINESS_CONTINUITY,
    prompt: 103,
    label: 'Business continuity',
    description: 'Continuity planning, recovery workflows, and resilience metrics.',
    route: '/enterprise-platform#continuity',
    relatedRoutes: ['/incident-command', '/operations'],
  }),
  Object.freeze({
    id: ENTERPRISE_PLATFORM_MODULE.DISASTER_RECOVERY,
    prompt: 104,
    label: 'Disaster recovery',
    description: 'DR readiness indicators and operational recovery dashboards.',
    route: '/enterprise-platform#disaster-recovery',
    relatedRoutes: ['/system-health', '/self-diagnostics'],
  }),
  Object.freeze({
    id: ENTERPRISE_PLATFORM_MODULE.ENTERPRISE_ASSET_REGISTRY,
    prompt: 105,
    label: 'Enterprise asset registry',
    description: 'Unified asset model for facilities, systems, equipment, and infrastructure.',
    route: '/enterprise-platform#assets',
    relatedRoutes: ['/assets', '/devices'],
  }),
  Object.freeze({
    id: ENTERPRISE_PLATFORM_MODULE.WORKFORCE_MANAGEMENT,
    prompt: 106,
    label: 'Workforce management',
    description: 'Staff scheduling, assignments, certifications, and workforce KPIs.',
    route: '/enterprise-platform#workforce',
    relatedRoutes: ['/tenant-admin', '/emergency/settings'],
  }),
  Object.freeze({
    id: ENTERPRISE_PLATFORM_MODULE.TRAINING_COMPETENCY,
    prompt: 107,
    label: 'Training & competency',
    description: 'Training completion, certifications, qualifications, and readiness.',
    route: '/enterprise-platform#training',
    relatedRoutes: ['/competencies', '/training'],
  }),
  Object.freeze({
    id: ENTERPRISE_PLATFORM_MODULE.KNOWLEDGE_MANAGEMENT,
    prompt: 108,
    label: 'Knowledge management',
    description: 'Operational playbooks, procedures, policies, and searchable artifacts.',
    route: '/enterprise-platform#knowledge',
    relatedRoutes: ['/knowledge-hub', '/knowledge-base'],
  }),
  Object.freeze({
    id: ENTERPRISE_PLATFORM_MODULE.OPERATIONAL_PLAYBOOK,
    prompt: 109,
    label: 'Operational playbook engine',
    description: 'Guided workflows and standard operating procedures.',
    route: '/enterprise-platform#playbooks',
    relatedRoutes: ['/workflows', '/protocols'],
  }),
  Object.freeze({
    id: ENTERPRISE_PLATFORM_MODULE.DECISION_SUPPORT,
    prompt: 110,
    label: 'Decision support',
    description: 'Evidence-based decision support dashboards and recommendations.',
    route: '/enterprise-platform#decision-support',
    relatedRoutes: ['/ai-governance', '/emergency/copilot'],
  }),
  Object.freeze({
    id: ENTERPRISE_PLATFORM_MODULE.SCENARIO_PLANNING,
    prompt: 111,
    label: 'Scenario planning',
    description: 'Operational simulations, planning exercises, and readiness reviews.',
    route: '/enterprise-platform#scenarios',
    relatedRoutes: ['/simulation', '/competencies'],
  }),
  Object.freeze({
    id: ENTERPRISE_PLATFORM_MODULE.STRATEGIC_PLANNING,
    prompt: 112,
    label: 'Strategic planning',
    description: 'Long-term planning dashboards using KPIs and trends.',
    route: '/enterprise-platform#strategy',
    relatedRoutes: ['/platform-analytics', '/value-tracking'],
  }),
  Object.freeze({
    id: ENTERPRISE_PLATFORM_MODULE.PORTFOLIO_MANAGEMENT,
    prompt: 113,
    label: 'Portfolio management',
    description: 'Organizations operating multiple racetracks.',
    route: '/enterprise-platform#portfolio',
    relatedRoutes: ['/organization-intelligence', '/tenant-admin'],
  }),
  Object.freeze({
    id: ENTERPRISE_PLATFORM_MODULE.EXECUTIVE_GOVERNANCE,
    prompt: 114,
    label: 'Executive governance',
    description: 'Governance dashboards for leadership and boards.',
    route: '/enterprise-platform#governance',
    relatedRoutes: ['/governance-registry', '/executive-command'],
  }),
  Object.freeze({
    id: ENTERPRISE_PLATFORM_MODULE.SUSTAINABILITY_ESG,
    prompt: 115,
    label: 'Sustainability & ESG',
    description: 'Sustainability metrics, welfare metrics, and efficiency indicators.',
    route: '/enterprise-platform#esg',
    relatedRoutes: ['/trackmind-maturity', '/equity-monitoring'],
  }),
  Object.freeze({
    id: ENTERPRISE_PLATFORM_MODULE.ARCHITECTURE_GOVERNANCE,
    prompt: 116,
    label: 'Architecture governance',
    description: 'Architecture decisions, standards compliance, technical debt, platform maturity.',
    route: '/enterprise-platform#architecture',
    relatedRoutes: ['/dependency-map', '/enterprise-readiness'],
  }),
]);

export function getEnterprisePlatformModule(moduleId) {
  return ENTERPRISE_PLATFORM_MODULES.find((module) => module.id === moduleId) || null;
}
