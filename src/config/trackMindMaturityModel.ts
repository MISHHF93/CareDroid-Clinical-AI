/**
 * TrackMind Operating System Maturity Framework — nine-domain maturity scoring.
 * Node-safe; aggregates platform audit signals and questionnaire inputs.
 */

import { auditDataQualityExposure } from './dataQualityModel';
import { auditMultiTenantReadiness } from './multiTenantReadinessModel';
import { evaluateOperationalSurvivabilityKpis } from './operationalSurvivabilityKpisModel';
import { auditProductionReadiness } from './productionReadinessModel';

export const TRACKMIND_MATURITY_LEVEL = Object.freeze({
  INITIAL: 'initial',
  EMERGING: 'emerging',
  DEFINED: 'defined',
  MANAGED: 'managed',
  OPTIMIZING: 'optimizing',
});

export const TRACKMIND_MATURITY_DOMAIN = Object.freeze({
  OPERATIONS: 'operations',
  SAFETY: 'safety',
  COMPLIANCE: 'compliance',
  SECURITY: 'security',
  EQUINE_WELFARE: 'equine_welfare',
  FACILITIES: 'facilities',
  FINANCE: 'finance',
  AI_GOVERNANCE: 'ai_governance',
  DATA_QUALITY: 'data_quality',
});

export const TRACKMIND_MATURITY_LEVELS = Object.freeze([
  Object.freeze({
    id: TRACKMIND_MATURITY_LEVEL.INITIAL,
    level: 1,
    label: 'Initial',
    minScore: 0,
    summary: 'Reactive and undocumented — outcomes depend on individual effort.',
  }),
  Object.freeze({
    id: TRACKMIND_MATURITY_LEVEL.EMERGING,
    level: 2,
    label: 'Emerging',
    minScore: 21,
    summary: 'Basic awareness exists but practices are inconsistent across shifts.',
  }),
  Object.freeze({
    id: TRACKMIND_MATURITY_LEVEL.DEFINED,
    level: 3,
    label: 'Defined',
    minScore: 41,
    summary: 'Documented standards, assigned ownership, and repeatable workflows.',
  }),
  Object.freeze({
    id: TRACKMIND_MATURITY_LEVEL.MANAGED,
    level: 4,
    label: 'Managed',
    minScore: 61,
    summary: 'Measured KPIs, audit trails, and corrective action loops are active.',
  }),
  Object.freeze({
    id: TRACKMIND_MATURITY_LEVEL.OPTIMIZING,
    level: 5,
    label: 'Optimizing',
    minScore: 81,
    summary: 'Continuous improvement culture with predictive signals and benchmarking.',
  }),
]);

/** @type {ReadonlyArray} */
export const TRACKMIND_MATURITY_DOMAINS = Object.freeze([
  Object.freeze({
    id: TRACKMIND_MATURITY_DOMAIN.OPERATIONS,
    label: 'Operations',
    weight: 14,
    baseScore: 68,
    owner: 'race_day_operations_manager',
    ownerLabel: 'Track director / operations lead',
    description: 'Shift handoff, queue visibility, throughput, and daily operating rhythm.',
    levelCriteria: [
      'No shared operating picture; decisions are ad hoc.',
      'Basic whiteboard or roster exists but is not trusted under load.',
      'Standard operating procedures documented for reception, charge nurse, and director roles.',
      'Survivability KPIs tracked with evidence surfaces and handoff readability audits.',
      'Predictive capacity, automated escalation, and cross-shift learning loops.',
    ],
    indicators: [
      'Reception registration under 60 seconds',
      'Charge nurse status read under 30 seconds',
      'Director throughput snapshot under 120 seconds',
    ],
  }),
  Object.freeze({
    id: TRACKMIND_MATURITY_DOMAIN.SAFETY,
    label: 'Safety',
    weight: 14,
    baseScore: 62,
    owner: 'steward',
    ownerLabel: 'Chief medical officer / safety officer',
    description: 'Clinical safety guardrails, reassessment discipline, and harm-prevention workflows.',
    levelCriteria: [
      'Safety incidents handled reactively without shared taxonomy.',
      'Safety checklists exist but are not enforced in workflows.',
      'Decision-support disclaimers, reassessment timers, and escalation paths are documented.',
      'Safety signals visible on whiteboard and audited in operational history.',
      'Proactive safety analytics, near-miss capture, and simulation-backed drills.',
    ],
    indicators: ['Reassessment attention strips', 'Clinical guardrail checklist coverage', 'Operational audit domains'],
  }),
  Object.freeze({
    id: TRACKMIND_MATURITY_DOMAIN.COMPLIANCE,
    label: 'Compliance',
    weight: 11,
    baseScore: 58,
    owner: 'compliance_officer',
    ownerLabel: 'Compliance / privacy officer',
    description: 'Regulatory evidence, audit readiness, privacy workflows, and policy attestation.',
    levelCriteria: [
      'Policies live in email or binders; evidence is scattered.',
      'Policy library exists but attestation is manual and incomplete.',
      'Regulatory registry mapped to workflows with exportable audit trails.',
      'Tenant-scoped compliance controls with periodic review cadence.',
      'Automated compliance monitoring and regulator-ready evidence packs.',
    ],
    indicators: ['Governance registry surfaces', 'Audit trail coverage', 'Privacy workflow maturity'],
  }),
  Object.freeze({
    id: TRACKMIND_MATURITY_DOMAIN.SECURITY,
    label: 'Security',
    weight: 12,
    baseScore: 54,
    owner: 'security_manager',
    ownerLabel: 'CISO / security lead',
    description: 'Authentication, tenant isolation, RBAC, secrets management, and API hardening.',
    levelCriteria: [
      'Shared credentials; no tenant isolation model.',
      'Basic auth exists but emergency APIs may be exposed.',
      'JWT, RBAC, and org-scoped settings enforced on critical paths.',
      'Production secrets, rate limits, and Swagger gating verified.',
      'Zero-trust posture with continuous vulnerability and access review.',
    ],
    indicators: ['Multi-tenant readiness score', 'Production security controls', 'Emergency API auth'],
  }),
  Object.freeze({
    id: TRACKMIND_MATURITY_DOMAIN.EQUINE_WELFARE,
    label: 'Equine welfare',
    weight: 12,
    baseScore: 52,
    owner: 'equine_welfare_officer',
    ownerLabel: 'Equine welfare officer / track veterinarian',
    description: 'Horse health monitoring, withdrawal protocols, injury response, and welfare audits.',
    levelCriteria: [
      'Welfare incidents logged informally; no central registry.',
      'Veterinary rounds documented but not linked to track operations.',
      'Welfare checklists, withdrawal rules, and vet escalation paths are standardized.',
      'Welfare KPIs tracked per meet with audit-ready incident timelines.',
      'Predictive welfare signals, biomechanics review, and third-party welfare benchmarking.',
    ],
    indicators: [
      'Pre-race vet clearance workflow',
      'Post-incident welfare review',
      'Withdrawal and recovery tracking',
    ],
  }),
  Object.freeze({
    id: TRACKMIND_MATURITY_DOMAIN.FACILITIES,
    label: 'Facilities',
    weight: 10,
    baseScore: 56,
    owner: 'facilities_manager',
    ownerLabel: 'Facilities / track superintendent',
    description: 'Track surface, barns, equipment maintenance, and incident-ready infrastructure.',
    levelCriteria: [
      'Maintenance requests handled verbally; no asset registry.',
      'Facilities log exists but is disconnected from operations.',
      'Preventive maintenance schedules and zone ownership documented.',
      'Facilities KPIs integrated with operations command and IoT readiness.',
      'Digital twin of facilities with predictive maintenance and safety interlocks.',
    ],
    indicators: ['Asset tracking surfaces', 'Maintenance workflow coverage', 'Incident command readiness'],
  }),
  Object.freeze({
    id: TRACKMIND_MATURITY_DOMAIN.FINANCE,
    label: 'Finance',
    weight: 9,
    baseScore: 50,
    owner: 'finance_manager',
    ownerLabel: 'CFO / finance controller',
    description: 'Revenue capture, cost visibility, billing readiness, and value tracking.',
    levelCriteria: [
      'Financial reporting is manual and lagging.',
      'Basic billing and usage views exist but are not tied to operations.',
      'Subscription, usage, and value-tracking models are documented.',
      'Finance KPIs linked to operational throughput and tenant billing.',
      'Predictive revenue modeling and automated reconciliation with ERP.',
    ],
    indicators: ['Billing portal readiness', 'Usage metering', 'Value tracking alignment'],
  }),
  Object.freeze({
    id: TRACKMIND_MATURITY_DOMAIN.AI_GOVERNANCE,
    label: 'AI governance',
    weight: 9,
    baseScore: 60,
    owner: 'organization_admin',
    ownerLabel: 'AI governance lead / clinical informatics',
    description: 'Model registry, human review, prompt governance, and AI safety controls.',
    levelCriteria: [
      'AI tools used without inventory or review requirements.',
      'AI usage tracked informally; human review is optional.',
      'Prompt registry, model inventory, and human-review queue documented.',
      'AI evaluation dashboards and governance registry wired to workflows.',
      'Continuous model evaluation, bias monitoring, and regulator-ready AI dossiers.',
    ],
    indicators: ['AI governance center', 'Human review queue', 'Prompt registry coverage'],
  }),
  Object.freeze({
    id: TRACKMIND_MATURITY_DOMAIN.DATA_QUALITY,
    label: 'Data quality',
    weight: 9,
    baseScore: 64,
    owner: 'data_analytics_user',
    ownerLabel: 'Data steward / registration lead',
    description: 'Identity verification, duplicate detection, demographics, and arrival reason completeness.',
    levelCriteria: [
      'Registration data quality issues discovered only at discharge.',
      'Manual duplicate checks; placeholder patients accumulate.',
      'Data quality risk taxonomy defined with reception and whiteboard surfacing.',
      'Data quality KPIs tracked with discovery audits and remediation workflows.',
      'Automated deduplication, enrichment, and real-time quality scoring at intake.',
    ],
    indicators: ['Data quality surface registry', 'Risk category coverage', 'Verification workflow maturity'],
  }),
]);

export const TRACKMIND_MATURITY_QUESTIONNAIRE = Object.freeze({
  questions: TRACKMIND_MATURITY_DOMAINS.map((domain) => ({
    id: domain.id,
    question: `How mature is ${domain.label.toLowerCase()} at your track or operating site?`,
    options: TRACKMIND_MATURITY_LEVELS.map((level) => ({
      value: level.level,
      label: level.label,
    })),
  })),
});

function clampScore(score) {
  const value = Math.round(Number(score) || 0);
  return Math.max(0, Math.min(100, value));
}

export function getTrackMindMaturityLevel(score) {
  const normalized = clampScore(score);
  const ordered = [...TRACKMIND_MATURITY_LEVELS].sort((a, b) => b.minScore - a.minScore);
  return ordered.find((level) => normalized >= level.minScore) || TRACKMIND_MATURITY_LEVELS[0];
}

export function levelToScore(levelValue, fallback = 50) {
  const level = Number(levelValue);
  if (!Number.isFinite(level) || level < 1 || level > 5) return fallback;
  const band = TRACKMIND_MATURITY_LEVELS[level - 1];
  const next = TRACKMIND_MATURITY_LEVELS[level] || { minScore: 100 };
  return clampScore(band.minScore + (next.minScore - band.minScore) / 2 - 1);
}

function scoreFromSurvivabilityKpis() {
  const evaluation = evaluateOperationalSurvivabilityKpis();
  const passed = evaluation.passedCount;
  const bonus = passed * 8;
  return clampScore(52 + bonus);
}

function scoreFromProductionSecurity(signals = {} as any) {
  const audit = auditProductionReadiness(signals);
  const security = audit.scores.dimensions.securityControls?.score ?? 52;
  const architecture = audit.scores.dimensions.architecture?.score ?? 62;
  return clampScore(Math.round(security * 0.7 + architecture * 0.3));
}

function scoreFromCompliance() {
  const multiTenant = auditMultiTenantReadiness();
  return clampScore(multiTenant.overallReadinessScore);
}

function scoreFromSafety(signals = {} as any) {
  const production = auditProductionReadiness(signals);
  const operational = production.scores.dimensions.operationalAwareness?.score ?? 78;
  const auditability = production.scores.dimensions.auditability?.score ?? 65;
  return clampScore(Math.round(operational * 0.55 + auditability * 0.45));
}

function scoreFromDataQuality() {
  const audit = auditDataQualityExposure();
  if (audit.passesAudit) return 78;
  if (audit.surfaceCount >= 3) return 62;
  return 48;
}

function scoreFromAiGovernance() {
  return 66;
}

function scoreFromFacilities() {
  const evidence = [
    'enterprise asset registry',
    'maintenance workflow coverage',
    'operations command surfaces',
    'IoT readiness dashboard',
  ];
  return clampScore(52 + evidence.length * 6);
}

function scoreFromFinance() {
  const evidence = [
    'subscription tier model',
    'usage metering events',
    'customer success renewal factors',
    'asset utilization analytics',
  ];
  return clampScore(48 + evidence.length * 6);
}

function scoreFromEquineWelfare() {
  const evidence = [
    'clinical safety guardrails',
    'reassessment attention strips',
    'incident review workflow',
    'audit-ready safety timeline',
  ];
  return clampScore(50 + evidence.length * 6);
}

/**
 * Where each domain score actually comes from.
 *
 * Five domains call a real audit and move when the platform moves. Four do
 * not: AI_GOVERNANCE returns the literal 66, and FACILITIES / FINANCE /
 * EQUINE_WELFARE return `base + evidence.length * 6` over a hardcoded list of
 * prose strings, so they are always 76, 72 and 74 no matter what the platform
 * is doing. That is a placeholder, not a measurement.
 *
 * Consumers MUST be able to tell the two apart. A maturity dashboard that
 * blends all nine into one number and prints it next to a level badge is
 * presenting four fixed constants as findings, which is the failure mode this
 * codebase has repeatedly had to undo elsewhere (integration status conflated
 * config-presence with health; the AI surfaces overclaimed "Live" for
 * deterministic rule handlers). Hence this map and the `provenance` field on
 * every scored dimension.
 *
 * To move a domain to STATIC -> AUDITED, give it a scorer that reads real
 * state and flip its entry here. Do not flip it without doing that.
 */
export const TRACKMIND_SCORE_PROVENANCE = Object.freeze({ AUDITED: 'audited', STATIC: 'static' });

export const TRACKMIND_DOMAIN_SCORE_PROVENANCE = Object.freeze({
  [TRACKMIND_MATURITY_DOMAIN.OPERATIONS]: TRACKMIND_SCORE_PROVENANCE.AUDITED,
  [TRACKMIND_MATURITY_DOMAIN.SAFETY]: TRACKMIND_SCORE_PROVENANCE.AUDITED,
  [TRACKMIND_MATURITY_DOMAIN.COMPLIANCE]: TRACKMIND_SCORE_PROVENANCE.AUDITED,
  [TRACKMIND_MATURITY_DOMAIN.SECURITY]: TRACKMIND_SCORE_PROVENANCE.AUDITED,
  [TRACKMIND_MATURITY_DOMAIN.DATA_QUALITY]: TRACKMIND_SCORE_PROVENANCE.AUDITED,
  [TRACKMIND_MATURITY_DOMAIN.AI_GOVERNANCE]: TRACKMIND_SCORE_PROVENANCE.STATIC,
  [TRACKMIND_MATURITY_DOMAIN.FACILITIES]: TRACKMIND_SCORE_PROVENANCE.STATIC,
  [TRACKMIND_MATURITY_DOMAIN.FINANCE]: TRACKMIND_SCORE_PROVENANCE.STATIC,
  [TRACKMIND_MATURITY_DOMAIN.EQUINE_WELFARE]: TRACKMIND_SCORE_PROVENANCE.STATIC,
});
const PLATFORM_SIGNAL_SCORERS = Object.freeze({
  [TRACKMIND_MATURITY_DOMAIN.OPERATIONS]: () => scoreFromSurvivabilityKpis(),
  [TRACKMIND_MATURITY_DOMAIN.SAFETY]: (signals) => scoreFromSafety(signals),
  [TRACKMIND_MATURITY_DOMAIN.COMPLIANCE]: () => scoreFromCompliance(),
  [TRACKMIND_MATURITY_DOMAIN.SECURITY]: (signals) => scoreFromProductionSecurity(signals),
  [TRACKMIND_MATURITY_DOMAIN.EQUINE_WELFARE]: () => scoreFromEquineWelfare(),
  [TRACKMIND_MATURITY_DOMAIN.FACILITIES]: () => scoreFromFacilities(),
  [TRACKMIND_MATURITY_DOMAIN.FINANCE]: () => scoreFromFinance(),
  [TRACKMIND_MATURITY_DOMAIN.AI_GOVERNANCE]: () => scoreFromAiGovernance(),
  [TRACKMIND_MATURITY_DOMAIN.DATA_QUALITY]: () => scoreFromDataQuality(),
});

export function scoreTrackMindDomain(domainId, { answers = {} as any, signals = {} as any } = {}) {
  const domain = TRACKMIND_MATURITY_DOMAINS.find((item) => item.id === domainId);
  if (!domain) return null;

  const answerLevel = answers[domainId];
  const questionnaireScore =
    answerLevel !== undefined && answerLevel !== null
      ? levelToScore(answerLevel, domain.baseScore)
      : null;

  const platformScore = PLATFORM_SIGNAL_SCORERS[domainId]?.(signals) ?? domain.baseScore;
  const score =
    questionnaireScore !== null
      ? clampScore(Math.round(questionnaireScore * 0.6 + platformScore * 0.4))
      : platformScore;

  const maturityLevel = getTrackMindMaturityLevel(score);
  const criteriaIndex = Math.max(0, maturityLevel.level - 1);

  return Object.freeze({
    ...domain,
    score,
    platformScore,
    provenance:
      TRACKMIND_DOMAIN_SCORE_PROVENANCE[domainId] || TRACKMIND_SCORE_PROVENANCE.STATIC,
    questionnaireScore,
    maturityLevel,
    currentCriteria: domain.levelCriteria[criteriaIndex],
    nextCriteria:
      maturityLevel.level < 5 ? domain.levelCriteria[maturityLevel.level] : null,
    gapToNextLevel:
      maturityLevel.level < 5
        ? clampScore(
            TRACKMIND_MATURITY_LEVELS[maturityLevel.level].minScore - score,
          )
        : 0,
  });
}

export function scoreTrackMindMaturity({ answers = {} as any, signals = {} as any } = {}) {
  const dimensions = TRACKMIND_MATURITY_DOMAINS.map((domain) =>
    scoreTrackMindDomain(domain.id, { answers, signals }),
  ).filter((d): d is NonNullable<typeof d> => d !== null);

  const weightedTotal = dimensions.reduce(
    (sum, dimension) => sum + dimension.score * dimension.weight,
    0,
  );
  const weightSum = dimensions.reduce((sum, dimension) => sum + dimension.weight, 0);
  const overallScore = clampScore(Math.round(weightedTotal / weightSum));
  const overallLevel = getTrackMindMaturityLevel(overallScore);

  const sorted = [...dimensions].sort((a, b) => a.score - b.score);

  return Object.freeze({
    generatedAt: new Date().toISOString(),
    framework: 'TrackMind Operating System Maturity',
    overallScore,
    overallLevel,
    dimensions,
    summary: Object.freeze({
      domainCount: dimensions.length,
      // How much of the overall score is actually measured. Any surface that
      // prints `overallScore` has to be able to say this alongside it.
      auditedDomainCount: dimensions.filter(
        (dimension) => dimension.provenance === TRACKMIND_SCORE_PROVENANCE.AUDITED,
      ).length,
      staticDomainCount: dimensions.filter(
        (dimension) => dimension.provenance === TRACKMIND_SCORE_PROVENANCE.STATIC,
      ).length,
      auditedWeightShare: Math.round(
        (dimensions
          .filter((dimension) => dimension.provenance === TRACKMIND_SCORE_PROVENANCE.AUDITED)
          .reduce((sum, dimension) => sum + dimension.weight, 0) /
          weightSum) *
          100,
      ),
      optimizingCount: dimensions.filter(
        (dimension) => dimension.maturityLevel.id === TRACKMIND_MATURITY_LEVEL.OPTIMIZING,
      ).length,
      managedOrAboveCount: dimensions.filter((dimension) => dimension.maturityLevel.level >= 4)
        .length,
      lowestDimension: sorted[0],
      highestDimension: sorted[sorted.length - 1],
      averageGapToNext: Math.round(
        dimensions.reduce((sum, dimension) => sum + dimension.gapToNextLevel, 0) /
          dimensions.length,
      ),
    }),
  });
}

/** @type {ReadonlyArray} */
export const TRACKMIND_IMPROVEMENT_CATALOG = Object.freeze([
  Object.freeze({
    id: 'TM-001',
    domain: TRACKMIND_MATURITY_DOMAIN.OPERATIONS,
    priority: 'P0',
    summary: 'Pass all three operational survivability KPIs (reception, charge nurse, director).',
    effort: 'medium',
  }),
  Object.freeze({
    id: 'TM-002',
    domain: TRACKMIND_MATURITY_DOMAIN.SECURITY,
    priority: 'P0',
    summary: 'Enforce JWT auth and org-scoped emergency settings on all API paths.',
    effort: 'medium',
  }),
  Object.freeze({
    id: 'TM-003',
    domain: TRACKMIND_MATURITY_DOMAIN.DATA_QUALITY,
    priority: 'P1',
    summary: 'Surface all four data quality risk categories in reception and whiteboard workflows.',
    effort: 'low',
  }),
  Object.freeze({
    id: 'TM-004',
    domain: TRACKMIND_MATURITY_DOMAIN.EQUINE_WELFARE,
    priority: 'P1',
    summary: 'Standardize pre-race vet clearance and post-incident welfare review checklists.',
    effort: 'done',
  }),
  Object.freeze({
    id: 'TM-005',
    domain: TRACKMIND_MATURITY_DOMAIN.AI_GOVERNANCE,
    priority: 'P1',
    summary: 'Wire human-review queue and prompt registry to all AI-assisted workflows.',
    effort: 'medium',
  }),
  Object.freeze({
    id: 'TM-006',
    domain: TRACKMIND_MATURITY_DOMAIN.COMPLIANCE,
    priority: 'P2',
    summary: 'Complete multi-tenant readiness audit and close org-scoping blockers.',
    effort: 'medium',
  }),
  Object.freeze({
    id: 'TM-007',
    domain: TRACKMIND_MATURITY_DOMAIN.FACILITIES,
    priority: 'P2',
    summary: 'Connect facilities maintenance registry to operations command surfaces.',
    effort: 'done',
  }),
  Object.freeze({
    id: 'TM-008',
    domain: TRACKMIND_MATURITY_DOMAIN.FINANCE,
    priority: 'P2',
    summary: 'Link usage metering and value tracking to operational throughput KPIs.',
    effort: 'done',
  }),
  Object.freeze({
    id: 'TM-009',
    domain: TRACKMIND_MATURITY_DOMAIN.SAFETY,
    priority: 'P1',
    summary: 'Ensure reassessment and safety attention strips pass readability audits under load.',
    effort: 'low',
  }),
  Object.freeze({
    id: 'TM-010',
    domain: TRACKMIND_MATURITY_DOMAIN.OPERATIONS,
    priority: 'P2',
    summary: 'Deploy shift handoff snapshot model for charge nurse and director roles.',
    effort: 'done',
  }),
]);

export function auditTrackMindMaturity(options = {} as any) {
  const signals = {
    emergencyApiAuthenticated: options.emergencyApiAuthenticated ?? true,
    orgScopedSettings: options.orgScopedSettings ?? true,
    storeHydration: options.storeHydration ?? true,
    clinicProvisioned: options.clinicProvisioned ?? true,
    edRbacWired: options.edRbacWired ?? true,
    orgScopedEmergencySettingsService: options.orgScopedEmergencySettingsService ?? true,
  };

  const baseline = scoreTrackMindMaturity({ signals });
  const assessed = options.answers
    ? scoreTrackMindMaturity({ answers: options.answers, signals })
    : baseline;

  const survivability = evaluateOperationalSurvivabilityKpis();
  const dataQuality = auditDataQualityExposure();
  const multiTenant = auditMultiTenantReadiness();

  const prioritizedImprovements = [...TRACKMIND_IMPROVEMENT_CATALOG]
    .filter((item) => item.effort !== 'done')
    .sort((a, b) => {
      const priorityOrder = { P0: 0, P1: 1, P2: 2 };
      return (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9);
    });

  const domainScores = Object.fromEntries(
    assessed.dimensions.map((dimension) => [
      dimension.id,
      {
        score: dimension.score,
        level: dimension.maturityLevel.label,
        levelId: dimension.maturityLevel.id,
      },
    ]),
  );

  return Object.freeze({
    generatedAt: new Date().toISOString(),
    goal: 'Score TrackMind operating system maturity across operations, safety, compliance, security, equine welfare, facilities, finance, AI governance, and data quality',
    framework: 'TrackMind Operating System Maturity',
    maturityLevels: TRACKMIND_MATURITY_LEVELS,
    domains: TRACKMIND_MATURITY_DOMAINS.map(({ id, label, weight, owner }) =>
      Object.freeze({ id, label, weight, owner }),
    ),
    scores: Object.freeze({
      overall: assessed.overallScore,
      level: assessed.overallLevel.label,
      levelId: assessed.overallLevel.id,
      dimensions: domainScores,
    }),
    assessment: assessed,
    platformSignals: Object.freeze({
      survivabilityKpis: survivability,
      dataQualityAudit: dataQuality,
      multiTenantReadiness: {
        overallReadinessScore: multiTenant.overallReadinessScore,
        passesAudit: multiTenant.passesAudit,
      },
    }),
    prioritizedImprovements,
    summary: Object.freeze({
      passesManagedThreshold: assessed.overallScore >= 61,
      passesOptimizingThreshold: assessed.overallScore >= 81,
      managedDomainCount: assessed.summary.managedOrAboveCount,
      lowestDomain: assessed.summary.lowestDimension?.label,
      highestDomain: assessed.summary.highestDimension?.label,
      improvementCount: prioritizedImprovements.length,
    }),
  });
}

export function buildTrackMindMaturityAssessment({ answers = {} as any, signals = {} as any, organizationName = 'Current site' } = {}) {
  const assessment = scoreTrackMindMaturity({ answers, signals });

  return Object.freeze({
    ...assessment,
    organizationName,
    recommendations: Object.freeze({
      immediate: TRACKMIND_IMPROVEMENT_CATALOG.filter((item) => item.priority === 'P0'),
      nearTerm: TRACKMIND_IMPROVEMENT_CATALOG.filter((item) => item.priority === 'P1'),
      strategic: TRACKMIND_IMPROVEMENT_CATALOG.filter((item) => item.priority === 'P2'),
    }),
  });
}
