/**
 * TrackMind Platform Intelligence — scoring, KPIs, artifacts (Prompts 117–136).
 * Node-safe; integrates artifact, lineage, governance, and readiness signals.
 */

import { BACKEND_HTTP_ROUTES } from '../data/backendHttpRouteInventory';
import { buildDataLineageExplorer } from '../data/dataLineageExplorer';
import { auditIntegrationDiscovery } from './integrationStatusRegistry';
import { auditProductionReadiness } from './productionReadinessModel';
import { buildCustomerSuccessPlatformAssessment } from './customerSuccessPlatformModel';
import { auditTrackMindMaturity } from './trackMindMaturityModel';
import { auditEnterpriseOperatingPlatform } from './enterpriseOperatingPlatformModel';
import {
  PLATFORM_INTELLIGENCE_MODULE,
  PLATFORM_INTELLIGENCE_MODULES,
  PLATFORM_INTELLIGENCE_MODULE_PROVENANCE,
  PLATFORM_INTELLIGENCE_PROVENANCE,
} from './platformIntelligenceRegistry';

export { PLATFORM_INTELLIGENCE_MODULE, PLATFORM_INTELLIGENCE_MODULES };

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
}

function statusFromScore(score) {
  if (score >= 80) return 'ready';
  if (score >= 65) return 'developing';
  if (score >= 50) return 'watch';
  return 'at-risk';
}

function kpi(id, label, value, target, { max = false, unit = '' }: any = {}) {
  return Object.freeze({
    id,
    label,
    value,
    target,
    unit,
    maxTarget: max,
    passes: max ? value <= target : value >= target,
  });
}

function moduleResult(moduleId, label, score, kpis, artifacts = {} as any) {
  return Object.freeze({
    id: moduleId,
    label,
    score: clampScore(score),
    status: statusFromScore(score),
    kpis,
    artifacts: Object.freeze(artifacts),
    passedKpis: kpis.filter((item) => item.passes).length,
    totalKpis: kpis.length,
  });
}

/** Governed artifact entity types — Prompt 117. */
export const UNIFIED_ARTIFACT_ENTITY_TYPES = Object.freeze([
  Object.freeze({ type: 'organization', label: 'Organization / tenant', governed: true }),
  Object.freeze({ type: 'track', label: 'Racetrack site', governed: true }),
  Object.freeze({ type: 'patient', label: 'Patient / arrival entity', governed: true }),
  Object.freeze({ type: 'workflow', label: 'Workflow definition', governed: true }),
  Object.freeze({ type: 'kpi', label: 'KPI definition', governed: true }),
  Object.freeze({ type: 'policy', label: 'Policy / procedure', governed: true }),
  Object.freeze({ type: 'integration', label: 'Integration connector', governed: true }),
  Object.freeze({ type: 'api', label: 'API surface', governed: true }),
  Object.freeze({ type: 'dashboard', label: 'Dashboard / report', governed: true }),
  Object.freeze({ type: 'risk', label: 'Risk register entry', governed: true }),
  Object.freeze({ type: 'asset', label: 'Physical / system asset', governed: true }),
  Object.freeze({ type: 'certification', label: 'Certification evidence', governed: true }),
]);

export function assessUnifiedArtifactRegistry() {
  const artifacts = UNIFIED_ARTIFACT_ENTITY_TYPES.map((entity, index) =>
    Object.freeze({
      id: `ART-${String(index + 1).padStart(3, '0')}`,
      ...entity,
      owner: 'Platform governance',
      version: '1.0',
      status: entity.governed ? 'registered' : 'draft',
    }),
  );
  const governed = artifacts.filter((a) => a.status === 'registered').length;
  const score = clampScore((governed / artifacts.length) * 100);

  return moduleResult(
    PLATFORM_INTELLIGENCE_MODULE.UNIFIED_ARTIFACT_REGISTRY,
    'Unified artifact registry',
    score,
    [
      kpi('entity-types', 'Entity types registered', governed, 10),
      kpi('governance-coverage', 'Governance coverage', score, 90, { unit: '%' }),
    ],
    { artifacts, entityTypes: UNIFIED_ARTIFACT_ENTITY_TYPES, totalRegistered: governed },
  );
}

/** Explicit artifact relationships — Prompt 118. */
export const ARTIFACT_RELATIONSHIP_EDGES = Object.freeze([
  Object.freeze({ from: 'organization', to: 'track', type: 'owns', cardinality: '1:N' }),
  Object.freeze({ from: 'track', to: 'patient', type: 'hosts', cardinality: '1:N' }),
  Object.freeze({ from: 'patient', to: 'workflow', type: 'triggers', cardinality: 'N:M' }),
  Object.freeze({ from: 'workflow', to: 'kpi', type: 'measures', cardinality: 'N:M' }),
  Object.freeze({ from: 'kpi', to: 'dashboard', type: 'surfaces_in', cardinality: 'N:1' }),
  Object.freeze({ from: 'integration', to: 'api', type: 'exposes', cardinality: '1:N' }),
  Object.freeze({ from: 'api', to: 'dashboard', type: 'feeds', cardinality: 'N:M' }),
  Object.freeze({ from: 'policy', to: 'workflow', type: 'governs', cardinality: '1:N' }),
  Object.freeze({ from: 'risk', to: 'asset', type: 'threatens', cardinality: 'N:M' }),
  Object.freeze({ from: 'certification', to: 'policy', type: 'evidences', cardinality: 'N:1' }),
]);

export function assessArtifactRelationshipMapping() {
  const nodeCount = new Set(ARTIFACT_RELATIONSHIP_EDGES.flatMap((e) => [e.from, e.to])).size;
  const score = clampScore(ARTIFACT_RELATIONSHIP_EDGES.length * 8 + nodeCount * 2);

  return moduleResult(
    PLATFORM_INTELLIGENCE_MODULE.ARTIFACT_RELATIONSHIP_MAPPING,
    'Artifact relationship mapping',
    score,
    [
      kpi('relationship-edges', 'Relationship edges', ARTIFACT_RELATIONSHIP_EDGES.length, 8),
      kpi('connected-nodes', 'Connected node types', nodeCount, 8),
    ],
    { edges: ARTIFACT_RELATIONSHIP_EDGES, nodeCount, graphFormat: 'directed-labeled' },
  );
}

/** Standard metadata fields — Prompt 119. */
export const ENTERPRISE_METADATA_SCHEMA = Object.freeze([
  Object.freeze({ field: 'id', type: 'uuid', required: true, domains: ['all'] }),
  Object.freeze({ field: 'organizationId', type: 'uuid', required: true, domains: ['all'] }),
  Object.freeze({ field: 'owner', type: 'string', required: true, domains: ['all'] }),
  Object.freeze({ field: 'createdAt', type: 'datetime', required: true, domains: ['all'] }),
  Object.freeze({ field: 'updatedAt', type: 'datetime', required: true, domains: ['all'] }),
  Object.freeze({ field: 'classification', type: 'enum', required: true, domains: ['all'] }),
  Object.freeze({
    field: 'retentionPolicy',
    type: 'string',
    required: false,
    domains: ['patient', 'audit'],
  }),
  Object.freeze({
    field: 'welfareTier',
    type: 'enum',
    required: false,
    domains: ['equine', 'welfare'],
  }),
  Object.freeze({
    field: 'complianceTag',
    type: 'string[]',
    required: false,
    domains: ['policy', 'audit'],
  }),
  Object.freeze({
    field: 'sourceSystem',
    type: 'string',
    required: false,
    domains: ['integration', 'dataset'],
  }),
]);

export function assessEnterpriseMetadata() {
  const requiredFields = ENTERPRISE_METADATA_SCHEMA.filter((f) => f.required).length;
  const domainCoverage = new Set(ENTERPRISE_METADATA_SCHEMA.flatMap((f) => f.domains)).size;
  const score = clampScore(requiredFields * 8 + domainCoverage * 5);

  return moduleResult(
    PLATFORM_INTELLIGENCE_MODULE.ENTERPRISE_METADATA,
    'Enterprise metadata framework',
    score,
    [
      kpi('schema-fields', 'Schema fields defined', ENTERPRISE_METADATA_SCHEMA.length, 8),
      kpi('required-fields', 'Required fields', requiredFields, 5),
      kpi('domain-coverage', 'Domain coverage', domainCoverage, 5),
    ],
    { schema: ENTERPRISE_METADATA_SCHEMA, validation: 'json-schema-ready' },
  );
}

export function assessDataCatalog() {
  const apiCount = BACKEND_HTTP_ROUTES.length;
  const catalog = Object.freeze([
    Object.freeze({
      id: 'DS-001',
      type: 'dataset',
      name: 'Patient arrivals',
      domain: 'operations',
      discoverable: true,
    }),
    Object.freeze({
      id: 'DS-002',
      type: 'dataset',
      name: 'Queue metrics',
      domain: 'operations',
      discoverable: true,
    }),
    Object.freeze({
      id: 'DS-003',
      type: 'dataset',
      name: 'Usage events',
      domain: 'saas',
      discoverable: true,
    }),
    Object.freeze({
      id: 'DS-004',
      type: 'dataset',
      name: 'Audit logs',
      domain: 'compliance',
      discoverable: true,
    }),
    Object.freeze({
      id: 'ENT-001',
      type: 'entity',
      name: 'Organization',
      domain: 'tenant',
      discoverable: true,
    }),
    Object.freeze({
      id: 'ENT-002',
      type: 'entity',
      name: 'Platform asset',
      domain: 'catalog',
      discoverable: true,
    }),
    Object.freeze({
      id: 'API-001',
      type: 'api',
      name: 'CareDroid API',
      domain: 'clinical',
      discoverable: true,
      endpointCount: 24,
    }),
    Object.freeze({
      id: 'API-002',
      type: 'api',
      name: 'Platform assets API',
      domain: 'commercial',
      discoverable: true,
      endpointCount: 18,
    }),
  ]);
  const discoverable = catalog.filter((item) => item.discoverable).length;
  const score = clampScore((discoverable / catalog.length) * 70 + Math.min(30, apiCount / 20));

  return moduleResult(
    PLATFORM_INTELLIGENCE_MODULE.DATA_CATALOG,
    'Data catalog platform',
    score,
    [
      kpi('catalog-entries', 'Catalog entries', catalog.length, 6),
      kpi('api-surfaces', 'API route inventory', apiCount, 100),
      kpi('discoverable-rate', 'Discoverable rate', discoverable, catalog.length),
    ],
    { catalog, apiRouteCount: apiCount, searchEnabled: true },
  );
}

export function assessDataLineage() {
  // Was a hardcoded 3-item sample list that had drifted out of sync with
  // the real /data-lineage page (its ids -- 'qsofa-calculator-trace',
  // 'simulation-debrief-trace' -- didn't even match the current real flow
  // ids in data/dataLineageExplorer.ts, which had been renamed to
  // 'news2-calculator-trace'/'simulation-protocol-trace'). Reads the same
  // builder DataLineageExplorer.tsx renders from, so this tracks the real
  // page instead of a stale duplicate.
  const explorer = buildDataLineageExplorer();
  const flowCount = explorer.flows.length;
  const stageCoverage = explorer.stages.length;
  const score = clampScore(Math.min(100, flowCount * 12 + stageCoverage * 8));

  return moduleResult(
    PLATFORM_INTELLIGENCE_MODULE.DATA_LINEAGE,
    'Data lineage platform',
    score,
    [
      kpi('lineage-flows', 'Lineage flows documented', flowCount, 5),
      kpi('stage-coverage', 'Stage coverage', stageCoverage, 5),
    ],
    {
      flowCount,
      stages: explorer.stages.map((stage) => stage.stage),
      sampleFlows: explorer.flows.map((flow) => ({
        id: flow.id,
        title: flow.title,
        category: flow.category,
      })),
      route: '/data-lineage',
    },
  );
}

export function assessKpiIntelligence(_signals = {} as any) {
  const recommendations = Object.freeze([
    Object.freeze({
      id: 'KR-001',
      kpi: 'Reception registration',
      signal: 'above cohort p75',
      action: 'Maintain express-register workflow',
    }),
    Object.freeze({
      id: 'KR-002',
      kpi: 'Data quality risks',
      signal: 'duplicate rate elevated',
      action: 'Enable duplicate review banner',
    }),
    Object.freeze({
      id: 'KR-003',
      kpi: 'Customer health',
      signal: 'watch band',
      action: 'Schedule CS enablement call',
    }),
    Object.freeze({
      id: 'KR-004',
      kpi: 'Feature utilization',
      signal: 'below target',
      action: 'Target smart intake and shift handoff',
    }),
  ]);
  const anomalyReadiness = Object.freeze({
    telemetryIngest: true,
    baselineWindows: ['7d', '30d'],
    alertThresholdsDefined: true,
    humanReviewRequired: true,
    implementationStatus: 'readiness-only',
  });
  const score = clampScore(68 + recommendations.length * 5);

  return moduleResult(
    PLATFORM_INTELLIGENCE_MODULE.KPI_INTELLIGENCE,
    'KPI intelligence layer',
    score,
    [
      kpi('recommendations', 'Active recommendations', recommendations.length, 3),
      kpi('anomaly-readiness', 'Anomaly readiness fields', 4, 4),
    ],
    {
      recommendations,
      anomalyReadiness,
      disclaimer: 'Readiness structures — not autonomous anomaly detection',
    },
  );
}

export function assessOperationalIntelligenceGraph() {
  const nodes = Object.freeze([
    Object.freeze({ id: 'event:arrival', type: 'event', label: 'Patient arrival' }),
    Object.freeze({ id: 'entity:patient', type: 'entity', label: 'Patient' }),
    Object.freeze({ id: 'kpi:registration-time', type: 'kpi', label: 'Registration seconds' }),
    Object.freeze({ id: 'audit:queue-change', type: 'audit', label: 'Queue state change' }),
    Object.freeze({ id: 'approval:identity', type: 'approval', label: 'Identity verification' }),
    Object.freeze({ id: 'rec:copilot', type: 'recommendation', label: 'Copilot quick action' }),
  ]);
  const edges = Object.freeze([
    Object.freeze({ from: 'event:arrival', to: 'entity:patient', rel: 'creates' }),
    Object.freeze({ from: 'entity:patient', to: 'kpi:registration-time', rel: 'measured_by' }),
    Object.freeze({ from: 'entity:patient', to: 'audit:queue-change', rel: 'logged_as' }),
    Object.freeze({ from: 'entity:patient', to: 'approval:identity', rel: 'requires' }),
    Object.freeze({ from: 'kpi:registration-time', to: 'rec:copilot', rel: 'triggers' }),
  ]);
  const score = clampScore(nodes.length * 12 + edges.length * 8);

  return moduleResult(
    PLATFORM_INTELLIGENCE_MODULE.OPERATIONAL_INTELLIGENCE_GRAPH,
    'Operational intelligence graph',
    score,
    [
      kpi('graph-nodes', 'Graph node types', nodes.length, 5),
      kpi('graph-edges', 'Graph edges', edges.length, 4),
    ],
    {
      nodes,
      edges,
      querySurfaces: ['Operational history', 'Queue audit', 'Copilot recommendations'],
    },
  );
}

export function assessCrossDomainAnalytics() {
  const domains = Object.freeze([
    'operations',
    'compliance',
    'equine_welfare',
    'finance',
    'security',
  ]);
  const maturity = auditTrackMindMaturity();
  const domainScores = domains.map((d) => maturity.scores.dimensions[d]?.score ?? 55);
  const avg = domainScores.reduce((s, v) => s + v, 0) / domains.length;
  const score = clampScore(avg);

  return moduleResult(
    PLATFORM_INTELLIGENCE_MODULE.CROSS_DOMAIN_ANALYTICS,
    'Cross-domain analytics',
    score,
    [
      kpi('domains-connected', 'Domains connected', domains.length, 5),
      kpi('cross-domain-avg', 'Cross-domain average', Math.round(avg), 65),
    ],
    {
      domains: domains.map((id, i) => Object.freeze({ id, score: domainScores[i] })),
      analyticsViews: [
        'TrackMind maturity radar',
        'Enterprise platform modules',
        'Customer success KPIs',
      ],
    },
  );
}

export function assessForecastingReadiness() {
  const structures = Object.freeze([
    Object.freeze({
      id: 'FC-001',
      name: 'Arrival volume forecast slot',
      status: 'schema-ready',
      implemented: false,
    }),
    Object.freeze({
      id: 'FC-002',
      name: 'Capacity band projection slot',
      status: 'schema-ready',
      implemented: false,
    }),
    Object.freeze({
      id: 'FC-003',
      name: 'Renewal risk projection slot',
      status: 'schema-ready',
      implemented: false,
    }),
    Object.freeze({
      id: 'FC-004',
      name: 'Welfare incident trend slot',
      status: 'planned',
      implemented: false,
    }),
  ]);
  const ready = structures.filter((s) => s.status === 'schema-ready').length;
  const score = clampScore((ready / structures.length) * 100);

  return moduleResult(
    PLATFORM_INTELLIGENCE_MODULE.FORECASTING_READINESS,
    'Forecasting readiness',
    score,
    [
      kpi('schema-ready-slots', 'Schema-ready forecast slots', ready, 3),
      kpi('implemented-models', 'Production models deployed', 0, 0, { max: true }),
    ],
    {
      structures,
      disclaimer: 'Readiness structures only — no production predictive models claimed',
      prerequisites: ['Historical telemetry', 'Labeled outcomes', 'Human-reviewed thresholds'],
    },
  );
}

export function assessReportingStudio() {
  const templates = Object.freeze([
    Object.freeze({
      id: 'RPT-001',
      name: 'Shift handoff summary',
      format: 'pdf',
      configurable: true,
    }),
    Object.freeze({
      id: 'RPT-002',
      name: 'Customer success executive brief',
      format: 'pdf',
      configurable: true,
    }),
    Object.freeze({
      id: 'RPT-003',
      name: 'TrackMind maturity export',
      format: 'json',
      configurable: true,
    }),
    Object.freeze({
      id: 'RPT-004',
      name: 'Regulatory evidence pack',
      format: 'zip',
      configurable: true,
    }),
    Object.freeze({
      id: 'RPT-005',
      name: 'Cross-domain KPI workbook',
      format: 'xlsx',
      configurable: true,
    }),
  ]);
  const score = clampScore(
    (templates.filter((t) => t.configurable).length / templates.length) * 100,
  );

  return moduleResult(
    PLATFORM_INTELLIGENCE_MODULE.REPORTING_STUDIO,
    'Advanced reporting studio',
    score,
    [
      kpi('report-templates', 'Report templates', templates.length, 4),
      kpi('export-formats', 'Export formats', new Set(templates.map((t) => t.format)).size, 3),
    ],
    { templates, exportChannels: ['download', 'audit-trail', 'governance-registry'] },
  );
}

function buildRepresentativeTenantContext(context = {} as any) {
  return Object.freeze({
    provisioned: true,
    edRbacWired: true,
    staffUiWired: true,
    products: [{ id: 'ed-os' }, { id: 'clinical-ai' }, { id: 'operations-intelligence' }],
    packs: [{ id: 'emergency-ops' }, { id: 'clinical-safety' }],
    integrations: [{ status: 'requested' }, { status: 'connected' }],
    subscription: { status: 'active', tier: 'enterprise' },
    roleProfile: { id: 'charge-nurse', label: 'Charge nurse' },
    organization: { id: 'tenant-demo', name: 'Demo Hospital' },
    workspaces: [
      {
        id: 'ed',
        name: 'Emergency',
        settings: {
          enabledToolIds: [
            'whiteboard',
            'reception',
            'smart-intake',
            'queue-intelligence',
            'shift-handoff',
            'reassessment',
          ],
        },
      },
    ],
    ...context,
  });
}

function buildRepresentativeCustomerDashboard(dashboard = null as any) {
  if (dashboard) return dashboard;

  return Object.freeze({
    health: { score: 88, status: 'healthy', retentionRisk: 'low' },
    metrics: Object.freeze({
      adoption: { value: 84, enabledPackCount: 5, enabledAssetCount: 18, totalAssetCount: 20 },
      activeUsers: { value: 58 },
      assetUsage: {
        value: 286,
        topAssets: [
          {
            id: 'whiteboard',
            label: 'Emergency Whiteboard',
            count: 48,
            route: '/emergency/whiteboard',
          },
          {
            id: 'reception',
            label: 'Reception workspace',
            count: 44,
            route: '/emergency/reception',
          },
          { id: 'copilot', label: 'ED Copilot', count: 31, route: '/emergency/copilot' },
          { id: 'smart-intake', label: 'Smart Intake', count: 28, route: '/emergency/intake' },
          {
            id: 'queue-intelligence',
            label: 'Queue Intelligence',
            count: 27,
            route: '/emergency/queues',
          },
          { id: 'shift-handoff', label: 'Shift Handoff', count: 24, route: '/emergency/shift' },
          {
            id: 'data-quality',
            label: 'Data Quality Surfacing',
            count: 22,
            route: '/emergency/reception?panel=data-quality',
          },
          {
            id: 'reassessment',
            label: 'Reassessment Workflow',
            count: 21,
            route: '/emergency/reassessment',
          },
          { id: 'ems-panel', label: 'EMS Pre-arrival', count: 19, route: '/emergency/ems' },
          { id: 'command-palette', label: 'Command Palette', count: 18, route: '/command-palette' },
        ],
      },
      aiUsage: { value: 49 },
      simulationsCompleted: { value: 12 },
      workflowsCompleted: { value: 31 },
      underusedProducts: [],
    }),
    signals: [
      { id: 'adoption', label: 'Adoption', status: 'healthy', message: '84% asset coverage.' },
      {
        id: 'feature-breadth',
        label: 'Feature breadth',
        status: 'healthy',
        message: 'Core ED workflows have active utilization.',
      },
    ],
  });
}

export function assessTenantHealth(context = {} as any) {
  const tenantContext = buildRepresentativeTenantContext(context);
  const cs = buildCustomerSuccessPlatformAssessment({
    context: tenantContext,
    dashboard: buildRepresentativeCustomerDashboard(context.dashboard),
  });
  const score = clampScore(cs.summary.healthScore);

  return moduleResult(
    PLATFORM_INTELLIGENCE_MODULE.TENANT_HEALTH,
    'Tenant health dashboard',
    score,
    [
      kpi('tenant-health', 'Tenant health score', cs.summary.healthScore, 75),
      kpi('onboarding', 'Onboarding percent', cs.summary.onboardingPercent, 80, { unit: '%' }),
      kpi('open-support', 'Open support items', cs.summary.openSupportItems, 3, { max: true }),
    ],
    {
      tenantId: tenantContext.organization?.id || 'tenant-demo',
      healthStatus: cs.capabilities.health_score.status,
      renewalReadiness: cs.summary.renewalReadiness,
      monitors: ['Adoption', 'Feature utilization', 'Support queue', 'Renewal readiness'],
    },
  );
}

export function assessTrackHealth(signals = {} as any) {
  const maturity = auditTrackMindMaturity(signals);
  const ops = maturity.scores.dimensions.operations?.score ?? 68;
  const safety = maturity.scores.dimensions.safety?.score ?? 62;
  const welfare = maturity.scores.dimensions.equine_welfare?.score ?? 52;
  const score = clampScore(ops * 0.4 + safety * 0.35 + welfare * 0.25);

  return moduleResult(
    PLATFORM_INTELLIGENCE_MODULE.TRACK_HEALTH,
    'Track health dashboard',
    score,
    [
      kpi('operations-health', 'Operations domain', ops, 65),
      kpi('safety-health', 'Safety domain', safety, 65),
      kpi('welfare-health', 'Equine welfare domain', welfare, 55),
    ],
    {
      trackSignals: Object.freeze([
        'Whiteboard load',
        'Reassessment compliance',
        'Welfare checklist',
        'EMS offload',
      ]),
      maturityLevel: maturity.scores.level,
      route: '/emergency/whiteboard',
    },
  );
}

export function assessExecutiveCockpit(context = {} as any) {
  const enterprise = auditEnterpriseOperatingPlatform({ signals: context.signals });
  const maturity = auditTrackMindMaturity(context.signals);
  const tenantContext = buildRepresentativeTenantContext(context);
  const cs = buildCustomerSuccessPlatformAssessment({
    context: tenantContext,
    dashboard: buildRepresentativeCustomerDashboard(context.dashboard),
  });
  const score = clampScore(
    enterprise.assessment.overallScore * 0.35 +
      maturity.scores.overall * 0.35 +
      cs.summary.healthScore * 0.3,
  );

  return moduleResult(
    PLATFORM_INTELLIGENCE_MODULE.EXECUTIVE_COCKPIT,
    'Executive cockpit',
    score,
    [
      kpi(
        'enterprise-readiness',
        'Enterprise platform score',
        enterprise.assessment.overallScore,
        75,
      ),
      kpi('maturity-score', 'TrackMind maturity', maturity.scores.overall, 65),
      kpi('customer-health', 'Customer health', cs.summary.healthScore, 75),
    ],
    {
      consolidatedPanels: Object.freeze([
        'Risk register',
        'Renewal readiness',
        'Portfolio health',
        'ESG summary',
        'Platform convergence',
      ]),
      route: '/executive',
      refreshCadence: 'real-time + daily rollup',
    },
  );
}

export function assessFederationIntelligence() {
  const federations = Object.freeze([
    Object.freeze({
      id: 'FED-001',
      name: 'Regional circuit',
      tracks: 8,
      avgHealth: 76,
      status: 'healthy',
    }),
    Object.freeze({
      id: 'FED-002',
      name: 'Training grounds network',
      tracks: 4,
      avgHealth: 68,
      status: 'watch',
    }),
  ]);
  const totalTracks = federations.reduce((s, f) => s + f.tracks, 0);
  const avgHealth = federations.reduce((s, f) => s + f.avgHealth * f.tracks, 0) / totalTracks;
  const score = clampScore(avgHealth);

  return moduleResult(
    PLATFORM_INTELLIGENCE_MODULE.FEDERATION_INTELLIGENCE,
    'Federation intelligence',
    score,
    [
      kpi('federations', 'Federations tracked', federations.length, 1),
      kpi('aggregate-tracks', 'Aggregate tracks', totalTracks, 4),
      kpi('federation-health', 'Federation health avg', Math.round(avgHealth), 70),
    ],
    { federations, anonymizedAggregation: true, totalTracks },
  );
}

export function assessSaasOperations(context = {} as any) {
  const tenantContext = buildRepresentativeTenantContext(context);
  const cs = buildCustomerSuccessPlatformAssessment({
    context: tenantContext,
    dashboard: context.dashboard || {
      ...buildRepresentativeCustomerDashboard(),
      sources: { usageEvents: 4500, auditEvents: 890 },
    },
  });
  const score = clampScore(cs.summary.adoptionScore * 0.4 + cs.summary.healthScore * 0.35 + 25);

  return moduleResult(
    PLATFORM_INTELLIGENCE_MODULE.SAAS_OPERATIONS,
    'SaaS operations dashboard',
    score,
    [
      kpi('platform-adoption', 'Platform adoption', cs.summary.adoptionScore, 70, { unit: '%' }),
      kpi('active-users', 'Active users', cs.capabilities.adoption.activeUsers, 50),
      kpi('system-health', 'System health proxy', score, 65),
    ],
    {
      subscriptions: Object.freeze(['Enterprise', 'Professional']),
      usageSignals: Object.freeze([
        'Usage events',
        'Audit events',
        'Active users',
        'Asset launches',
      ]),
      route: '/saas-health',
    },
  );
}

export function assessIntegrationGovernance() {
  const audit = auditIntegrationDiscovery();
  const surfaceCount = audit.totalPoints ?? 0;
  const covered =
    (audit.byStatus?.implemented || 0) +
    (audit.byStatus?.verified || 0) +
    (audit.byStatus?.partial || 0);
  const score = clampScore(
    surfaceCount > 0 ? Math.min(100, (covered / surfaceCount) * 100 + 20) : 55,
  );

  return moduleResult(
    PLATFORM_INTELLIGENCE_MODULE.INTEGRATION_GOVERNANCE,
    'Integration governance',
    score,
    [
      kpi('integration-points', 'Integration points tracked', surfaceCount, 15),
      kpi('governed-integrations', 'Governed integrations', covered, 8),
    ],
    {
      ownershipModel: 'Integration owner + compliance reviewer',
      statusValues: ['placeholder', 'partial', 'implemented', 'verified'],
      auditSummary: audit,
    },
  );
}

export function assessApiGovernance() {
  const routes = BACKEND_HTTP_ROUTES;
  const controllers = new Set(routes.map((r) => r.controller));
  const versioned = routes.filter((r) => r.path.includes('/v')).length;
  const score = clampScore(Math.min(100, routes.length / 8 + controllers.size * 3));

  const lifecycle = Object.freeze([
    Object.freeze({ stage: 'design', count: 12 }),
    Object.freeze({ stage: 'implemented', count: routes.length - 24 }),
    Object.freeze({ stage: 'deprecated', count: 4 }),
    Object.freeze({ stage: 'retired', count: 0 }),
  ]);

  return moduleResult(
    PLATFORM_INTELLIGENCE_MODULE.API_GOVERNANCE,
    'API governance platform',
    score,
    [
      kpi('api-routes', 'API routes inventoried', routes.length, 200),
      kpi('controllers', 'Controller owners', controllers.size, 20),
      kpi('versioned-routes', 'Versioned routes', versioned, 5),
    ],
    {
      lifecycle,
      routeInventory: routes.length,
      ownership: 'Controller-level',
      docsRoute: '/api/docs',
    },
  );
}

export function assessPlatformObservability() {
  const pillars = Object.freeze([
    Object.freeze({
      id: 'logs',
      label: 'Logs',
      status: 'partial',
      surfaces: ['audit_logs', 'workflow_logs'],
    }),
    Object.freeze({
      id: 'metrics',
      label: 'Metrics',
      status: 'partial',
      surfaces: ['usage_events', 'saas_health'],
    }),
    Object.freeze({ id: 'traces', label: 'Traces', status: 'planned', surfaces: ['datadog-apm'] }),
    Object.freeze({
      id: 'audits',
      label: 'Audits',
      status: 'active',
      surfaces: ['operational_audit', 'governance_registry'],
    }),
    Object.freeze({
      id: 'alerts',
      label: 'Alerts',
      status: 'active',
      surfaces: ['alert_rules', 'reassessment_strips'],
    }),
  ]);
  const active = pillars.filter((p) => p.status === 'active').length;
  const partial = pillars.filter((p) => p.status === 'partial').length;
  const score = clampScore(active * 20 + partial * 12 + 20);

  return moduleResult(
    PLATFORM_INTELLIGENCE_MODULE.PLATFORM_OBSERVABILITY,
    'Platform observability center',
    score,
    [
      kpi('observability-pillars', 'Pillars with coverage', active + partial, 4),
      kpi('alert-surfaces', 'Alert surfaces', 2, 2),
    ],
    { pillars, routes: ['/system-health', '/operations/observability', '/saas-health'] },
  );
}

type TechnicalDebtItem = {
  id: string;
  area: string;
  summary: string;
  priority: 'P0' | 'P1' | 'P2';
  effort: 'high' | 'medium' | 'low';
  status: 'open' | 'mitigating' | 'resolved';
};

/** Technical debt registry — Prompt 135. */
export const TECHNICAL_DEBT_REGISTRY: readonly TechnicalDebtItem[] = Object.freeze([
  // ED patient/board state (Nest in-memory vs Mongoose, TD-006) is a
  // separate, still-open migration from workflow log durability, which
  // TD-004 below covers -- the two used to be bundled in one summary.
  Object.freeze({
    id: 'TD-001',
    area: 'backend',
    summary: 'ED patient persistence migration active (dual in-memory/Mongoose planes, see TD-006)',
    priority: 'P0',
    effort: 'high',
    status: 'mitigating',
  }),
  Object.freeze({
    id: 'TD-002',
    area: 'security',
    summary: 'Emergency API auth guards applied to active Nest emergency controllers',
    priority: 'P0',
    effort: 'medium',
    status: 'resolved',
  }),
  Object.freeze({
    id: 'TD-003',
    area: 'frontend',
    summary:
      'Large App shell coupling reduced through route-tree extraction and lazy route smoke coverage',
    priority: 'P2',
    effort: 'high',
    status: 'mitigating',
  }),
  // Verified 2026-08-27: WorkflowActionLogEntry's durable journal
  // (Cycle 92/HEAL-252) already existed with a working write-through/
  // rehydrate cycle, but every real call site omitted metadata.tenantId,
  // so every org's rows fell into record()'s 'default-tenant' fallback --
  // fixed by threading the patient/task's own organizationId through all
  // 10 call sites (emergency-os.services.ts x7, emergency-os.controller.ts,
  // emergency-os.upgrade-harness.service.ts, care-operations.service.ts x2).
  Object.freeze({
    id: 'TD-004',
    area: 'auditability',
    summary: 'Workflow logs are durably persisted and now tenant-partitioned via metadata.tenantId',
    priority: 'P1',
    effort: 'medium',
    status: 'resolved',
  }),
  // Verified 2026-08-27 directly against integrationStatusRegistry.ts --
  // INTEGRATION_STATUS already has 3 distinct tiers (placeholder/partial/
  // implemented) consistently applied across all 26 registry entries; the
  // distinction this item describes is already in place, not in progress.
  Object.freeze({
    id: 'TD-005',
    area: 'integrations',
    summary: 'Connector registry now distinguishes implemented, partial, and roadmap surfaces',
    priority: 'P1',
    effort: 'high',
    status: 'resolved',
  }),
  Object.freeze({
    id: 'TD-006',
    area: 'architecture',
    summary: 'Dual persistence planes',
    priority: 'P1',
    effort: 'high',
    status: 'open',
  }),
]);

export function assessTechnicalDebtRegistry() {
  const open = TECHNICAL_DEBT_REGISTRY.filter((d) => d.status === 'open').length;
  const openP0 = TECHNICAL_DEBT_REGISTRY.filter(
    (d) => d.priority === 'P0' && d.status === 'open',
  ).length;
  const mitigating = TECHNICAL_DEBT_REGISTRY.filter((d) => d.status === 'mitigating').length;
  const score = clampScore(100 - open * 8 - openP0 * 10 - mitigating * 2);

  return moduleResult(
    PLATFORM_INTELLIGENCE_MODULE.TECHNICAL_DEBT_REGISTRY,
    'Technical debt registry',
    score,
    [
      kpi('debt-items', 'Debt items tracked', TECHNICAL_DEBT_REGISTRY.length, 5),
      kpi('open-debt', 'Open items', open, 3, { max: true }),
      kpi('p0-debt', 'Open P0 items', openP0, 0, { max: true }),
    ],
    {
      registry: TECHNICAL_DEBT_REGISTRY,
      remediationPlans: TECHNICAL_DEBT_REGISTRY.filter((d) => d.status !== 'resolved'),
    },
  );
}

/** Platform convergence — Prompt 136. */
export function assessPlatformConvergence(signals = {} as any) {
  const production = auditProductionReadiness(signals);
  const maturity = auditTrackMindMaturity(signals);
  const enterprise = auditEnterpriseOperatingPlatform({ signals });
  const debt = assessTechnicalDebtRegistry();
  const customer = buildCustomerSuccessPlatformAssessment({
    context: buildRepresentativeTenantContext(),
    dashboard: buildRepresentativeCustomerDashboard(),
  });
  const customerAlignment = clampScore(
    (customer.summary.healthScore + customer.summary.renewalReadiness) / 2,
  );

  const gaps = Object.freeze([
    Object.freeze({
      id: 'GAP-001',
      domain: 'architecture',
      summary: 'Architecture score vs implementation parity',
      severity: 'high',
      score: production.scores.dimensions.architecture?.score ?? 62,
    }),
    Object.freeze({
      id: 'GAP-002',
      domain: 'business',
      summary: 'Customer health vs renewal readiness alignment',
      severity: 'medium',
      score: customerAlignment,
    }),
    Object.freeze({
      id: 'GAP-003',
      domain: 'operations',
      summary: 'Survivability KPIs vs whiteboard load',
      severity: 'medium',
      score: maturity.scores.dimensions.operations?.score ?? 68,
    }),
    Object.freeze({
      id: 'GAP-004',
      domain: 'governance',
      summary: 'Certification evidence vs audit durability',
      severity: 'high',
      score: debt.score,
    }),
    Object.freeze({
      id: 'GAP-005',
      domain: 'platform',
      summary: 'Enterprise module readiness dispersion',
      severity: 'medium',
      score: enterprise.assessment.overallScore,
    }),
  ]);

  const correctiveActions = Object.freeze([
    Object.freeze({
      id: 'CA-001',
      gap: 'GAP-001',
      action: 'Complete org-scoped emergency settings convergence',
      priority: 'P0',
      owner: 'Platform engineering',
    }),
    Object.freeze({
      id: 'CA-002',
      gap: 'GAP-002',
      action: 'Close customer success enablement queue items before renewal',
      priority: 'P1',
      owner: 'Customer success',
    }),
    Object.freeze({
      id: 'CA-003',
      gap: 'GAP-003',
      action: 'Apply whiteboard density mitigations under stress load',
      priority: 'P1',
      owner: 'Operations UX',
    }),
    Object.freeze({
      id: 'CA-004',
      gap: 'GAP-004',
      action: 'Persist workflow logs and partition by tenant',
      priority: 'P0',
      owner: 'Backend platform',
    }),
    Object.freeze({
      id: 'CA-005',
      gap: 'GAP-005',
      action: 'Raise lowest enterprise modules to developing threshold',
      priority: 'P2',
      owner: 'Program management',
    }),
  ]);

  const avgGap = gaps.reduce((s, g) => s + g.score, 0) / gaps.length;
  const score = clampScore(
    avgGap * 0.6 +
      (100 - debt.artifacts.registry.filter((d) => d.status === 'open').length * 8) * 0.4,
  );

  return moduleResult(
    PLATFORM_INTELLIGENCE_MODULE.PLATFORM_CONVERGENCE,
    'Platform convergence review',
    score,
    [
      kpi('gaps-identified', 'Gaps identified', gaps.length, 3),
      kpi('corrective-actions', 'Corrective actions', correctiveActions.length, 4),
      kpi('convergence-score', 'Convergence score', score, 70),
    ],
    {
      gaps,
      correctiveActions,
      architectureVsBusinessDelta: Math.abs(
        (production.scores.overall ?? 65) - enterprise.assessment.overallScore,
      ),
    },
  );
}

const MODULE_ASSESSORS = Object.freeze({
  [PLATFORM_INTELLIGENCE_MODULE.UNIFIED_ARTIFACT_REGISTRY]: () => assessUnifiedArtifactRegistry(),
  [PLATFORM_INTELLIGENCE_MODULE.ARTIFACT_RELATIONSHIP_MAPPING]: () =>
    assessArtifactRelationshipMapping(),
  [PLATFORM_INTELLIGENCE_MODULE.ENTERPRISE_METADATA]: () => assessEnterpriseMetadata(),
  [PLATFORM_INTELLIGENCE_MODULE.DATA_CATALOG]: () => assessDataCatalog(),
  [PLATFORM_INTELLIGENCE_MODULE.DATA_LINEAGE]: () => assessDataLineage(),
  [PLATFORM_INTELLIGENCE_MODULE.KPI_INTELLIGENCE]: (ctx, sig) => assessKpiIntelligence(sig),
  [PLATFORM_INTELLIGENCE_MODULE.OPERATIONAL_INTELLIGENCE_GRAPH]: () =>
    assessOperationalIntelligenceGraph(),
  [PLATFORM_INTELLIGENCE_MODULE.CROSS_DOMAIN_ANALYTICS]: () => assessCrossDomainAnalytics(),
  [PLATFORM_INTELLIGENCE_MODULE.FORECASTING_READINESS]: () => assessForecastingReadiness(),
  [PLATFORM_INTELLIGENCE_MODULE.REPORTING_STUDIO]: () => assessReportingStudio(),
  [PLATFORM_INTELLIGENCE_MODULE.TENANT_HEALTH]: (ctx) => assessTenantHealth(ctx),
  [PLATFORM_INTELLIGENCE_MODULE.TRACK_HEALTH]: (ctx, sig) => assessTrackHealth(sig),
  [PLATFORM_INTELLIGENCE_MODULE.EXECUTIVE_COCKPIT]: (ctx, sig) =>
    assessExecutiveCockpit({ ...ctx, signals: sig }),
  [PLATFORM_INTELLIGENCE_MODULE.FEDERATION_INTELLIGENCE]: () => assessFederationIntelligence(),
  [PLATFORM_INTELLIGENCE_MODULE.SAAS_OPERATIONS]: (ctx) => assessSaasOperations(ctx),
  [PLATFORM_INTELLIGENCE_MODULE.INTEGRATION_GOVERNANCE]: () => assessIntegrationGovernance(),
  [PLATFORM_INTELLIGENCE_MODULE.API_GOVERNANCE]: () => assessApiGovernance(),
  [PLATFORM_INTELLIGENCE_MODULE.PLATFORM_OBSERVABILITY]: () => assessPlatformObservability(),
  [PLATFORM_INTELLIGENCE_MODULE.TECHNICAL_DEBT_REGISTRY]: () => assessTechnicalDebtRegistry(),
  [PLATFORM_INTELLIGENCE_MODULE.PLATFORM_CONVERGENCE]: (ctx, sig) => assessPlatformConvergence(sig),
});

export function buildPlatformIntelligenceAssessment({
  context = {} as any,
  signals = {} as any,
  organizationName = 'Current organization',
} = {}) {
  const modules = PLATFORM_INTELLIGENCE_MODULES.map((meta) => {
    const assess = MODULE_ASSESSORS[meta.id];
    const result = assess(context, signals);
    return Object.freeze({
      ...meta,
      assessment: result,
      provenance:
        PLATFORM_INTELLIGENCE_MODULE_PROVENANCE[meta.id] ||
        PLATFORM_INTELLIGENCE_PROVENANCE.REGISTRY,
    });
  });

  const overallScore = clampScore(
    modules.reduce((sum, module) => sum + module.assessment.score, 0) / modules.length,
  );

  return Object.freeze({
    generatedAt: new Date().toISOString(),
    organizationName,
    framework: 'TrackMind Platform Intelligence (Prompts 117–136)',
    overallScore,
    overallStatus: statusFromScore(overallScore),
    modules,
    summary: Object.freeze({
      moduleCount: modules.length,
      // How much of overallScore actually tracks the platform. A surface that
      // prints the headline has to be able to print this next to it.
      liveModuleCount: modules.filter(
        (module) => module.provenance === PLATFORM_INTELLIGENCE_PROVENANCE.LIVE,
      ).length,
      registryModuleCount: modules.filter(
        (module) => module.provenance === PLATFORM_INTELLIGENCE_PROVENANCE.REGISTRY,
      ).length,
      readyModules: modules.filter((m) => m.assessment.status === 'ready').length,
      kpisPassed: modules.reduce((s, m) => s + m.assessment.passedKpis, 0),
      kpisTotal: modules.reduce((s, m) => s + m.assessment.totalKpis, 0),
      convergenceActions: assessPlatformConvergence(signals).artifacts.correctiveActions,
    }),
  });
}

export function auditPlatformIntelligence(options = {} as any) {
  const assessment = buildPlatformIntelligenceAssessment({
    context: options.context || {},
    signals: options.signals || {
      emergencyApiAuthenticated: true,
      orgScopedSettings: true,
      storeHydration: true,
      edRbacWired: true,
    },
    organizationName: options.organizationName || 'Demo Track Portfolio',
  });

  return Object.freeze({
    generatedAt: new Date().toISOString(),
    goal: 'Platform intelligence audit — Prompts 117–136',
    assessment,
    moduleScores: Object.fromEntries(
      assessment.modules.map((module) => [module.id, module.assessment.score]),
    ),
    promptsCovered: assessment.modules.map((module) => module.prompt),
  });
}
