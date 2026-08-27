export const PLATFORM_GOVERNANCE_SURFACE_PATTERNS = Object.freeze([
  [/^\/ai-governance/, 'governance'],
  [/^\/security/, 'ai-security'],
  [/^\/regulatory/, 'regulatory'],
  [/^\/equity/, 'equity'],
  [/^\/human-review/, 'review'],
  [/^\/system-health/, 'observability'],
  [/ai-security/, 'ai-security'],
  [/regulatory/, 'regulatory'],
  [/equity/, 'equity'],
  [/validation/, 'validation'],
  [/^\/review/, 'review'],
  [/consent/, 'consent'],
  [/privacy/, 'privacy'],
  [/^\/audit/, 'audit'],
  [/observability|incidents/, 'observability'],
  [/source-provenance|integrations/, 'interoperability'],
  [/governance/, 'governance'],
] as const);

export const PLATFORM_GOVERNANCE_SURFACE_COPY = Object.freeze({
  governance: {
    title: 'Clinical Governance',
    summary: 'Production readiness, policy state, release gates, and safety blockers for clinical AI operations.',
    iconKey: 'shield-check',
  },
  'ai-security': {
    title: 'AI Security',
    summary: 'Prompt firewall, model access, PHI minimization, and security incident controls.',
    iconKey: 'alert',
  },
  regulatory: {
    title: 'Regulatory Classification',
    summary: 'Capability risk classification, intended use, evidence status, and approval gates.',
    iconKey: 'report',
  },
  equity: {
    title: 'Equity Monitoring',
    summary: 'Cohort coverage, missingness, drift, and bias finding review for clinical AI workflows.',
    iconKey: 'chart-bar',
  },
  validation: {
    title: 'Validation Sandbox',
    summary: 'Synthetic patient scenarios, validation runs, and release evidence before production activation.',
    iconKey: 'reassessment',
  },
  review: {
    title: 'Human Review Queue',
    summary: 'Clinician, privacy, governance, and safety review workflows for high-risk actions.',
    iconKey: 'user-check',
  },
  consent: {
    title: 'Consent Center',
    summary: 'Patient consent scope, revocation state, and PHI access gating for AI and documentation.',
    iconKey: 'shield-check',
  },
  privacy: {
    title: 'Privacy Center',
    summary: 'Privacy requests, PHI access transparency, export/delete review, and patient data controls.',
    iconKey: 'shield-check',
  },
  audit: {
    title: 'Audit Trail Spine',
    summary: 'Reconstruct AI, PHI, policy, review, consent, integration, and deployment events.',
    iconKey: 'report',
  },
  observability: {
    title: 'Deployment Observability',
    summary: 'Deployment health, degraded modes, AI safety metrics, and incident readiness.',
    iconKey: 'capacity',
  },
  interoperability: {
    title: 'FHIR + HL7 Integration',
    summary: 'Patient import, observations, medications, labs, encounters, connection states, and source provenance.',
    iconKey: 'route',
  },
});

export const PLATFORM_GOVERNANCE_ENTERPRISE_COPY = Object.freeze({
  '/ai-governance': {
    title: 'AI Governance Center',
    summary: 'Model inventory, clinical review, risk classification, and release history for governed AI deployment.',
    iconKey: 'shield-check',
  },
  '/security': {
    title: 'LLM Security Dashboard',
    summary: 'Blocked prompts, security events, warnings, failed tool calls, PHI protection, and tool permission checks.',
    iconKey: 'alert',
  },
  '/regulatory': {
    title: 'Regulatory Classification',
    summary: 'Classify tools as informational, CDS, potential SaMD, workflow, or operational capabilities.',
    iconKey: 'report',
  },
  '/equity': {
    title: 'Bias And Equity Monitoring',
    summary: 'Model performance, demographic, language, workflow, specialty, fairness, and drift monitoring.',
    iconKey: 'chart-bar',
  },
  '/human-review': {
    title: 'Human Review Queue',
    summary: 'AI outputs awaiting review with status, reviewer, comments, and accept/reject workflow.',
    iconKey: 'user-check',
  },
  '/privacy': {
    title: 'Consent + Privacy Center',
    summary: 'Consent management, retention policy, data export/delete workflows, and audit access.',
    iconKey: 'shield-check',
  },
  '/system-health': {
    title: 'Deployment Observability',
    summary: 'Frontend/backend versions, git commit, build timestamp, API health, environment, and deployment status.',
    iconKey: 'capacity',
  },
  '/integrations': {
    title: 'FHIR + HL7 Integration',
    summary: 'Patient import, observations, medications, labs, encounters, connection states, and source provenance.',
    iconKey: 'route',
  },
});

const DEMO_PANELS_BY_SURFACE = Object.freeze({
  governance: {
    approvalWorkflow: { required: true, score: 88, reasons: ['phi_access', 'high_risk_cds'] },
    riskClassification: { level: 'high', category: 'high_risk_cds', score: 82 },
    releaseGates: { status: 'guarded', blocked: false, score: 76 },
    policyCoverage: { policies: 14, complete: 11, score: 79 },
  },
  'ai-security': {
    promptInjection: { status: 'blocking', blocked: true, score: 91 },
    phiProtection: { action: 'minimize_or_redact', findings: ['mrn', 'dob'], score: 86 },
    toolPermissions: { denied: 3, reviewed: 12, score: 74 },
    modelAccess: { restrictedModels: 2, score: 80 },
  },
  regulatory: {
    cdsClassification: { level: 'clinical_decision_support', score: 84 },
    samdWatchlist: { candidates: 2, score: 71 },
    evidenceStatus: { complete: 9, pending: 4, score: 69 },
    intendedUse: { documented: 18, score: 77 },
  },
  equity: {
    cohortCoverage: { represented: 6, missing: 2, score: 73 },
    fairnessDrift: { drifted: 1, score: 68 },
    languageParity: { gaps: 2, score: 72 },
    specialtyBalance: { underrepresented: 1, score: 75 },
  },
  validation: {
    syntheticScenarios: { ready: 8, draft: 3, score: 78 },
    releaseEvidence: { attached: 5, score: 81 },
    regressionRuns: { passed: 12, failed: 1, score: 88 },
  },
  review: {
    pendingReviews: { count: 7, score: 64 },
    clinicianQueue: { count: 4, score: 70 },
    privacyQueue: { count: 2, score: 66 },
    safetyEscalations: { count: 1, score: 58 },
  },
  consent: {
    activeConsents: { count: 24, score: 82 },
    revocations: { count: 1, score: 90 },
    scopeGaps: { count: 2, score: 74 },
  },
  privacy: {
    exportRequests: { open: 2, score: 71 },
    deleteRequests: { open: 1, score: 69 },
    accessTransparency: { events: 148, score: 85 },
    retentionPolicy: { compliant: true, score: 88 },
  },
  audit: {
    aiRuns: { events: 312, score: 86 },
    phiAccess: { events: 96, score: 83 },
    policyChanges: { events: 14, score: 79 },
    deploymentEvents: { events: 22, score: 81 },
  },
  observability: {
    apiHealth: { status: 'guarded', score: 77 },
    deploymentStatus: { status: 'guarded', score: 75 },
    incidentReadiness: { open: 0, score: 84 },
    aiSafetyMetrics: { alerts: 2, score: 72 },
  },
  interoperability: {
    fhirConnections: { active: 2, degraded: 1, score: 74 },
    hl7Interfaces: { active: 3, score: 81 },
    patientImport: { successRate: 92, score: 86 },
    sourceProvenance: { verified: 18, score: 80 },
  },
});

/**
 * Structured view of one `panels.modelInventory` entry (GET /api/ai-governance/summary,
 * ModelRegistryService.listModels() in backend/src/modules/governance/governance.module.ts).
 * That data is real and human-curated (data/model-registry/entries/*.json, 5 entries) -- but
 * without this, the generic control-card renderer below (`detail: JSON.stringify(value)`)
 * collapsed it to a fallback score of 60, a "5 records" summary, and a 220-char JSON slice,
 * so none of it was actually readable by an admin. Only the fields the governance workspace
 * renders as real columns are extracted here; anything missing is labeled, never guessed.
 */
export interface ModelInventoryCardView {
  modelId: string;
  modelName: string;
  modelIdentifier: string;
  status: string;
  purpose: string;
  regulatoryClass: string;
  owner: string;
  limitations: string[];
  expiresAt: string;
  retirementPlan: string;
}

const MODEL_INVENTORY_FIELD_NOT_DOCUMENTED = 'Not documented';

export function buildModelInventoryCards(value: unknown): ModelInventoryCardView[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .map((entry, index) => ({
      modelId: typeof entry.modelId === 'string' ? entry.modelId : `model-${index}`,
      modelName: typeof entry.modelName === 'string' ? entry.modelName : MODEL_INVENTORY_FIELD_NOT_DOCUMENTED,
      // ModelRegistryService.listModels() puts the real curated modelIdentifier
      // (data/model-registry/entries/*.json's `modelIdentifier` field) into `version`.
      modelIdentifier: typeof entry.version === 'string' ? entry.version : MODEL_INVENTORY_FIELD_NOT_DOCUMENTED,
      status: typeof entry.status === 'string' ? entry.status : MODEL_INVENTORY_FIELD_NOT_DOCUMENTED,
      purpose: typeof entry.purpose === 'string' ? entry.purpose : MODEL_INVENTORY_FIELD_NOT_DOCUMENTED,
      regulatoryClass: typeof entry.regulatoryClass === 'string' ? entry.regulatoryClass : MODEL_INVENTORY_FIELD_NOT_DOCUMENTED,
      owner: typeof entry.owner === 'string' ? entry.owner : MODEL_INVENTORY_FIELD_NOT_DOCUMENTED,
      limitations: Array.isArray(entry.knownLimitations) ? entry.knownLimitations.map(String) : [],
      expiresAt: typeof entry.expiresAt === 'string' ? entry.expiresAt : MODEL_INVENTORY_FIELD_NOT_DOCUMENTED,
      retirementPlan: typeof entry.retirementPlan === 'string' ? entry.retirementPlan : MODEL_INVENTORY_FIELD_NOT_DOCUMENTED,
    }));
}

export type PlatformGovernanceSurfaceId = keyof typeof PLATFORM_GOVERNANCE_SURFACE_COPY;

export function inferPlatformGovernanceSurface(pathname = ''): PlatformGovernanceSurfaceId {
  const match = PLATFORM_GOVERNANCE_SURFACE_PATTERNS.find(([pattern]) => pattern.test(pathname));
  return (match?.[1] as PlatformGovernanceSurfaceId) || 'governance';
}

export function resolvePlatformGovernanceCopy(pathname = '', surface: PlatformGovernanceSurfaceId = inferPlatformGovernanceSurface(pathname)) {
  return (
    (PLATFORM_GOVERNANCE_ENTERPRISE_COPY as Record<string, (typeof PLATFORM_GOVERNANCE_SURFACE_COPY)['governance']>)[pathname] ||
    PLATFORM_GOVERNANCE_SURFACE_COPY[surface] ||
    PLATFORM_GOVERNANCE_SURFACE_COPY.governance
  );
}

function panelScore(value: unknown): number {
  if (typeof value === 'number') return value;
  if (!value || typeof value !== 'object') return 50;
  const record = value as Record<string, unknown>;
  if (typeof record.score === 'number') return record.score;
  if (record.blocked === true || record.status === 'blocking') return 35;
  if (record.blocked === false || record.status === 'guarded') return 75;
  if (record.level === 'high' || record.compliant === true) return 85;
  if (record.level === 'medium') return 65;
  if (typeof record.count === 'number') return Math.min(100, Math.max(20, record.count * 8));
  return 60;
}

export function scoreGovernancePanels(panels: Record<string, unknown> = {}) {
  return Object.entries(panels).map(([name, value]) => ({
    name: name.replace(/([A-Z])/g, ' $1').trim(),
    value: panelScore(value),
  }));
}

function countRecords(data: Record<string, unknown> | null | undefined, surface: string) {
  if (!data) return 0;
  if (Array.isArray(data)) return data.length;
  if (Array.isArray(data.items)) return data.items.length;
  if (Array.isArray(data.events)) return data.events.length;
  // Found 2026-08-27: PlatformGovernanceService.getConsent() (consent surface)
  // returns { patientId, records, effectiveStatus } and getPrivacyAccessLog()
  // (privacy surface) returns { patientId, accessLog, safety } -- neither key
  // was recognized here, so both surfaces' "Records" metric silently showed 0
  // regardless of how many real consent grants/privacy-access entries existed
  // in the database, every time. Not attempting a broader audit of every
  // other governance surface's response shape here (this shared function is
  // fed by dozens of distinct endpoints across platformGovernanceApi.ts's
  // SURFACE_ENDPOINTS/endpointForSurface) -- scoped to these two specifically
  // verified, real, currently-broken shapes.
  if (Array.isArray(data.records)) return data.records.length;
  if (Array.isArray(data.accessLog)) return data.accessLog.length;
  const counts = data.counts as Record<string, number> | undefined;
  if (counts) {
    const key = Object.keys(counts).find((entry) => entry.includes(surface.replace('-', '')));
    if (key && counts[key] !== undefined) return counts[key];
    return Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0);
  }
  return Object.keys(data.panels || {}).length;
}

export function buildPlatformGovernanceSurfaceView({
  surface = 'governance' as PlatformGovernanceSurfaceId,
  pathname = '',
  apiData = null as Record<string, unknown> | null,
  sourceStatus = 'demo',
}: {
  surface?: PlatformGovernanceSurfaceId;
  pathname?: string;
  apiData?: Record<string, unknown> | null;
  sourceStatus?: string;
} = {}) {
  const copy = resolvePlatformGovernanceCopy(pathname, surface);
  const demoPanels = (DEMO_PANELS_BY_SURFACE as Record<string, Record<string, unknown>>)[surface] || DEMO_PANELS_BY_SURFACE.governance;
  const panels =
    apiData?.panels && Object.keys(apiData.panels as object).length
      ? (apiData.panels as Record<string, unknown>)
      : demoPanels;
  const readiness = (apiData?.readiness as { blocked?: boolean } | undefined) || { blocked: sourceStatus === 'fallback' };
  const status = String(apiData?.status || (readiness.blocked ? 'blocked' : 'guarded'));

  return {
    copy,
    panels,
    panelChart: scoreGovernancePanels(panels),
    metrics: [
      {
        label: 'Source status',
        value: sourceStatus,
        hint: 'Live, demo, or fallback contract state',
        tone: sourceStatus === 'live' ? 'good' : sourceStatus === 'fallback' ? 'warning' : 'neutral',
      },
      {
        label: 'Readiness',
        value: readiness.blocked ? 'Blocked' : status,
        hint: 'P0 controls fail closed until configured',
        tone: readiness.blocked ? 'critical' : status === 'guarded' ? 'warning' : 'good',
      },
      {
        label: 'Panels',
        value: String(Object.keys(panels).length),
        hint: 'Operational governance controls',
        tone: 'neutral',
      },
      {
        label: 'Records',
        value: String(countRecords(apiData, surface)),
        hint: 'Durable or synthetic workflow records',
        tone: 'neutral',
      },
    ],
    controls: Object.entries(panels).map(([key, value]) => ({
      id: key,
      label: key.replace(/([A-Z])/g, ' $1').trim(),
      score: panelScore(value),
      summary: summarizePanelValue(value),
      detail: typeof value === 'object' ? JSON.stringify(value) : String(value ?? 'Ready'),
      // Every control carries this key (even as null) so PlatformGovernanceWorkspace.tsx
      // can branch on it without a union-type mismatch across map iterations.
      modelInventory: key === 'modelInventory' ? buildModelInventoryCards(value) : null,
    })),
    safety: (apiData?.safety as Record<string, unknown> | undefined) || {
      autonomousActionTaken: false,
      failClosed: true,
      demoExternalConnectors: true,
    },
  };
}

function summarizePanelValue(value: unknown): string {
  if (Array.isArray(value)) return `${value.length} records`;
  if (!value || typeof value !== 'object') return String(value ?? 'Ready');
  const record = value as Record<string, unknown>;
  if (record.status) return String(record.status);
  if (record.level) return String(record.level);
  if (record.action) return String(record.action);
  if (record.blocked !== undefined) return record.blocked ? 'Blocked' : 'Allowed';
  if (record.count !== undefined) return `${record.count} items`;
  return `${Object.keys(record).length} signals`;
}