/**
 * TrackMind Platform Intelligence — module registry (Prompts 117–136).
 */

export const PLATFORM_INTELLIGENCE_MODULE = Object.freeze({
  UNIFIED_ARTIFACT_REGISTRY: 'unified_artifact_registry',
  ARTIFACT_RELATIONSHIP_MAPPING: 'artifact_relationship_mapping',
  ENTERPRISE_METADATA: 'enterprise_metadata',
  DATA_CATALOG: 'data_catalog',
  DATA_LINEAGE: 'data_lineage',
  KPI_INTELLIGENCE: 'kpi_intelligence',
  OPERATIONAL_INTELLIGENCE_GRAPH: 'operational_intelligence_graph',
  CROSS_DOMAIN_ANALYTICS: 'cross_domain_analytics',
  FORECASTING_READINESS: 'forecasting_readiness',
  REPORTING_STUDIO: 'reporting_studio',
  TENANT_HEALTH: 'tenant_health',
  TRACK_HEALTH: 'track_health',
  EXECUTIVE_COCKPIT: 'executive_cockpit',
  FEDERATION_INTELLIGENCE: 'federation_intelligence',
  SAAS_OPERATIONS: 'saas_operations',
  INTEGRATION_GOVERNANCE: 'integration_governance',
  API_GOVERNANCE: 'api_governance',
  PLATFORM_OBSERVABILITY: 'platform_observability',
  TECHNICAL_DEBT_REGISTRY: 'technical_debt_registry',
  PLATFORM_CONVERGENCE: 'platform_convergence',
});

/**
 * Where each module score comes from.
 *
 * LIVE     the assessor calls an audit or inventory outside this module, so
 *          the score moves when the platform moves (BACKEND_HTTP_ROUTES,
 *          auditTrackMindMaturity, auditIntegrationDiscovery, ...).
 * REGISTRY the assessor derives its score from a hand-maintained list living
 *          in platformIntelligenceModel.ts. That is a real inventory and worth
 *          showing, but it is a curated document, not a measurement of this
 *          deployment -- assessKpiIntelligence takes `_signals` (underscored,
 *          deliberately unused) and always returns 88.
 *
 * Any surface that prints an overall score has to be able to say how much of
 * it is which. Same reason TRACKMIND_DOMAIN_SCORE_PROVENANCE exists next door.
 */
export const PLATFORM_INTELLIGENCE_PROVENANCE = Object.freeze({ LIVE: 'live', REGISTRY: 'registry' });

export const PLATFORM_INTELLIGENCE_MODULE_PROVENANCE = Object.freeze({
  [PLATFORM_INTELLIGENCE_MODULE.DATA_CATALOG]: PLATFORM_INTELLIGENCE_PROVENANCE.LIVE,
  [PLATFORM_INTELLIGENCE_MODULE.DATA_LINEAGE]: PLATFORM_INTELLIGENCE_PROVENANCE.LIVE,
  [PLATFORM_INTELLIGENCE_MODULE.CROSS_DOMAIN_ANALYTICS]: PLATFORM_INTELLIGENCE_PROVENANCE.LIVE,
  [PLATFORM_INTELLIGENCE_MODULE.REPORTING_STUDIO]: PLATFORM_INTELLIGENCE_PROVENANCE.LIVE,
  [PLATFORM_INTELLIGENCE_MODULE.TENANT_HEALTH]: PLATFORM_INTELLIGENCE_PROVENANCE.LIVE,
  [PLATFORM_INTELLIGENCE_MODULE.TRACK_HEALTH]: PLATFORM_INTELLIGENCE_PROVENANCE.LIVE,
  [PLATFORM_INTELLIGENCE_MODULE.EXECUTIVE_COCKPIT]: PLATFORM_INTELLIGENCE_PROVENANCE.LIVE,
  [PLATFORM_INTELLIGENCE_MODULE.SAAS_OPERATIONS]: PLATFORM_INTELLIGENCE_PROVENANCE.LIVE,
  [PLATFORM_INTELLIGENCE_MODULE.INTEGRATION_GOVERNANCE]: PLATFORM_INTELLIGENCE_PROVENANCE.LIVE,
  [PLATFORM_INTELLIGENCE_MODULE.API_GOVERNANCE]: PLATFORM_INTELLIGENCE_PROVENANCE.LIVE,
  [PLATFORM_INTELLIGENCE_MODULE.PLATFORM_CONVERGENCE]: PLATFORM_INTELLIGENCE_PROVENANCE.LIVE,
  [PLATFORM_INTELLIGENCE_MODULE.UNIFIED_ARTIFACT_REGISTRY]: PLATFORM_INTELLIGENCE_PROVENANCE.REGISTRY,
  [PLATFORM_INTELLIGENCE_MODULE.ARTIFACT_RELATIONSHIP_MAPPING]: PLATFORM_INTELLIGENCE_PROVENANCE.REGISTRY,
  [PLATFORM_INTELLIGENCE_MODULE.ENTERPRISE_METADATA]: PLATFORM_INTELLIGENCE_PROVENANCE.REGISTRY,
  [PLATFORM_INTELLIGENCE_MODULE.KPI_INTELLIGENCE]: PLATFORM_INTELLIGENCE_PROVENANCE.REGISTRY,
  [PLATFORM_INTELLIGENCE_MODULE.OPERATIONAL_INTELLIGENCE_GRAPH]: PLATFORM_INTELLIGENCE_PROVENANCE.REGISTRY,
  [PLATFORM_INTELLIGENCE_MODULE.FORECASTING_READINESS]: PLATFORM_INTELLIGENCE_PROVENANCE.REGISTRY,
  [PLATFORM_INTELLIGENCE_MODULE.FEDERATION_INTELLIGENCE]: PLATFORM_INTELLIGENCE_PROVENANCE.REGISTRY,
  [PLATFORM_INTELLIGENCE_MODULE.PLATFORM_OBSERVABILITY]: PLATFORM_INTELLIGENCE_PROVENANCE.REGISTRY,
  [PLATFORM_INTELLIGENCE_MODULE.TECHNICAL_DEBT_REGISTRY]: PLATFORM_INTELLIGENCE_PROVENANCE.REGISTRY,
});
/** @type {ReadonlyArray} */
export const PLATFORM_INTELLIGENCE_MODULES = Object.freeze([
  Object.freeze({ id: PLATFORM_INTELLIGENCE_MODULE.UNIFIED_ARTIFACT_REGISTRY, prompt: 117, label: 'Unified artifact registry', description: 'Register every major entity as a governed artifact.', route: '/platform-intelligence#artifacts', relatedRoutes: ['/artifacts', '/governance-registry'] }),
  Object.freeze({ id: PLATFORM_INTELLIGENCE_MODULE.ARTIFACT_RELATIONSHIP_MAPPING, prompt: 118, label: 'Artifact relationship mapping', description: 'Explicit relationships between governed artifacts.', route: '/platform-intelligence#relationships', relatedRoutes: ['/dependency-graph', '/dependency-map'] }),
  Object.freeze({ id: PLATFORM_INTELLIGENCE_MODULE.ENTERPRISE_METADATA, prompt: 119, label: 'Enterprise metadata framework', description: 'Standardized metadata across all domains.', route: '/platform-intelligence#metadata', relatedRoutes: ['/data-lineage'] }),
  Object.freeze({ id: PLATFORM_INTELLIGENCE_MODULE.DATA_CATALOG, prompt: 120, label: 'Data catalog platform', description: 'Discoverable catalogs of datasets, entities, and APIs.', route: '/platform-intelligence#catalog', relatedRoutes: ['/developer-catalog', '/data-lineage'] }),
  Object.freeze({ id: PLATFORM_INTELLIGENCE_MODULE.DATA_LINEAGE, prompt: 121, label: 'Data lineage platform', description: 'Lineage from source to dashboard.', route: '/platform-intelligence#lineage', relatedRoutes: ['/data-lineage'] }),
  Object.freeze({ id: PLATFORM_INTELLIGENCE_MODULE.KPI_INTELLIGENCE, prompt: 122, label: 'KPI intelligence layer', description: 'KPI recommendation and anomaly detection readiness.', route: '/platform-intelligence#kpi-intelligence', relatedRoutes: ['/platform-analytics', '/value-tracking'] }),
  Object.freeze({ id: PLATFORM_INTELLIGENCE_MODULE.OPERATIONAL_INTELLIGENCE_GRAPH, prompt: 123, label: 'Operational intelligence graph', description: 'Connect events, entities, KPIs, approvals, audits, and recommendations.', route: '/platform-intelligence#intel-graph', relatedRoutes: ['/workspace-dependency-graph'] }),
  Object.freeze({ id: PLATFORM_INTELLIGENCE_MODULE.CROSS_DOMAIN_ANALYTICS, prompt: 124, label: 'Cross-domain analytics', description: 'Analytics across operations, compliance, welfare, finance, and security.', route: '/platform-intelligence#cross-domain', relatedRoutes: ['/trackmind-maturity', '/enterprise-platform'] }),
  Object.freeze({ id: PLATFORM_INTELLIGENCE_MODULE.FORECASTING_READINESS, prompt: 125, label: 'Forecasting readiness', description: 'Predictive analytics structures without overclaiming implementation.', route: '/platform-intelligence#forecasting', relatedRoutes: ['/ai-evaluation'] }),
  Object.freeze({ id: PLATFORM_INTELLIGENCE_MODULE.REPORTING_STUDIO, prompt: 126, label: 'Advanced reporting studio', description: 'Configurable reporting templates and exports.', route: '/platform-intelligence#reporting', relatedRoutes: ['/audit', '/regulatory'] }),
  Object.freeze({ id: PLATFORM_INTELLIGENCE_MODULE.TENANT_HEALTH, prompt: 127, label: 'Tenant health dashboard', description: 'Tenant-level operational health monitoring.', route: '/platform-intelligence#tenant-health', relatedRoutes: ['/customer-success', '/saas-health'] }),
  Object.freeze({ id: PLATFORM_INTELLIGENCE_MODULE.TRACK_HEALTH, prompt: 128, label: 'Track health dashboard', description: 'Racetrack-level health monitoring.', route: '/platform-intelligence#track-health', relatedRoutes: ['/trackmind-maturity', '/emergency/whiteboard'] }),
  Object.freeze({ id: PLATFORM_INTELLIGENCE_MODULE.EXECUTIVE_COCKPIT, prompt: 129, label: 'Executive cockpit', description: 'Consolidated executive command center.', route: '/platform-intelligence#executive', relatedRoutes: ['/executive', '/business-brain'] }),
  Object.freeze({ id: PLATFORM_INTELLIGENCE_MODULE.FEDERATION_INTELLIGENCE, prompt: 130, label: 'Federation intelligence', description: 'Aggregate federation intelligence views.', route: '/platform-intelligence#federation', relatedRoutes: ['/organization-intelligence', '/enterprise-platform'] }),
  Object.freeze({ id: PLATFORM_INTELLIGENCE_MODULE.SAAS_OPERATIONS, prompt: 131, label: 'SaaS operations dashboard', description: 'Platform usage, adoption, subscriptions, and system health.', route: '/platform-intelligence#saas-ops', relatedRoutes: ['/saas-health', '/usage', '/billing'] }),
  Object.freeze({ id: PLATFORM_INTELLIGENCE_MODULE.INTEGRATION_GOVERNANCE, prompt: 132, label: 'Integration governance', description: 'Integration readiness, ownership, status, and compliance.', route: '/platform-intelligence#integrations', relatedRoutes: ['/integration-readiness', '/integrations-marketplace'] }),
  Object.freeze({ id: PLATFORM_INTELLIGENCE_MODULE.API_GOVERNANCE, prompt: 133, label: 'API governance platform', description: 'API lifecycle, versioning, ownership, and usage.', route: '/platform-intelligence#api-governance', relatedRoutes: ['/api/docs', '/dependency-map'] }),
  Object.freeze({ id: PLATFORM_INTELLIGENCE_MODULE.PLATFORM_OBSERVABILITY, prompt: 134, label: 'Platform observability center', description: 'Consolidate logs, metrics, traces, audits, and alerts.', route: '/platform-intelligence#observability', relatedRoutes: ['/system-health', '/operations/observability'] }),
  Object.freeze({ id: PLATFORM_INTELLIGENCE_MODULE.TECHNICAL_DEBT_REGISTRY, prompt: 135, label: 'Technical debt registry', description: 'Debt visibility, remediation plans, and priorities.', route: '/platform-intelligence#tech-debt', relatedRoutes: ['/dependency-map', '/self-diagnostics'] }),
  Object.freeze({ id: PLATFORM_INTELLIGENCE_MODULE.PLATFORM_CONVERGENCE, prompt: 136, label: 'Platform convergence review', description: 'Gaps between architecture, implementation, and business objectives with corrective actions.', route: '/platform-intelligence#convergence', relatedRoutes: ['/enterprise-readiness', '/production-readiness'] }),
]);

export function getPlatformIntelligenceModule(moduleId) {
  return PLATFORM_INTELLIGENCE_MODULES.find((module) => module.id === moduleId) || null;
}
