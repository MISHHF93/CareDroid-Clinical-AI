export const EXPANSION_OPPORTUNITY_BANDS = Object.freeze([
  { id: 'high-confidence', label: 'High-confidence expansion', minScore: 85 },
  { id: 'qualified', label: 'Qualified expansion', minScore: 70 },
  { id: 'nurture', label: 'Nurture', minScore: 50 },
  { id: 'monitor', label: 'Monitor', minScore: 0 },
]);

export const COMMERCIAL_MOTIONS = Object.freeze({
  UPSELL: 'upsell',
  CROSS_SELL: 'cross-sell',
  EVALUATION: 'evaluation',
  RENEWAL_EXPANSION: 'renewal-expansion',
});

export const CUSTOMER_EXPANSION_SEGMENTS = Object.freeze([
  {
    id: 'hospital-emergency',
    segment: 'Hospital',
    organizationType: 'hospital',
    currentPacks: ['Emergency Pack'],
    summary: 'Emergency department adoption indicates readiness for critical care and simulation expansion.',
    opportunities: [
      {
        id: 'hospital-icu-pack',
        recommendedPack: 'ICU Pack',
        score: 91,
        motion: COMMERCIAL_MOTIONS.UPSELL,
        expectedOutcome: 'Extend acute-care workflows from ED triage into inpatient critical care.',
        evidence: [
          'Emergency Pack is active',
          'Workflow adoption supports adjacent ICU protocols',
          'Calculator utilization indicates clinical decision-support readiness',
        ],
      },
      {
        id: 'hospital-simulation-pack',
        recommendedPack: 'Simulation Pack',
        score: 88,
        motion: COMMERCIAL_MOTIONS.CROSS_SELL,
        expectedOutcome: 'Convert emergency usage into preparedness, drills, and competency readiness.',
        evidence: [
          'Emergency workflows benefit from sepsis and deterioration simulation',
          'Simulation readiness is measurable by department',
          'Training adoption creates recurring expansion value',
        ],
      },
    ],
  },
  {
    id: 'university-education',
    segment: 'University',
    organizationType: 'university',
    currentPacks: ['Education Pack'],
    summary: 'Education adoption indicates readiness for research workflows and model evaluation programs.',
    opportunities: [
      {
        id: 'university-research-pack',
        recommendedPack: 'Research Pack',
        score: 89,
        motion: COMMERCIAL_MOTIONS.UPSELL,
        expectedOutcome: 'Expand education usage into research cohorts, evidence review, and study workflows.',
        evidence: [
          'Education Pack is active',
          'Academic users need research and evidence workflows',
          'Research Pack complements simulation and teaching assets',
        ],
      },
      {
        id: 'university-ai-evaluation-pack',
        recommendedPack: 'AI Evaluation Pack',
        score: 86,
        motion: COMMERCIAL_MOTIONS.EVALUATION,
        expectedOutcome: 'Enable benchmark labs, model comparison, hallucination checks, and governance evidence.',
        evidence: [
          'Education environments need assessment and benchmarking',
          'AI Evaluation Pack supports faculty-led validation',
          'Evaluation outputs support procurement and governance decisions',
        ],
      },
    ],
  },
  {
    id: 'operations-platform',
    segment: 'Operations',
    organizationType: 'operations',
    currentPacks: ['Operations Pack'],
    summary: 'Operations adoption indicates readiness for digital twin, uptime, and maintenance expansion.',
    opportunities: [
      {
        id: 'operations-digital-twin-pack',
        recommendedPack: 'Digital Twin Pack',
        score: 84,
        motion: COMMERCIAL_MOTIONS.CROSS_SELL,
        expectedOutcome: 'Turn operations usage into enterprise visibility across beds, devices, fleet, and maintenance.',
        evidence: [
          'Operations Pack is active',
          'Asset uptime and maintenance workload are measurable',
          'Digital twin workflows add executive operational value',
        ],
      },
    ],
  },
]);

function clampScore(score) {
  const value = Math.round(Number(score) || 0);
  return Math.max(0, Math.min(100, value));
}

export function getExpansionOpportunityBand(score) {
  const normalized = clampScore(score);
  return (
    EXPANSION_OPPORTUNITY_BANDS.find((band) => normalized >= band.minScore) ||
    EXPANSION_OPPORTUNITY_BANDS[EXPANSION_OPPORTUNITY_BANDS.length - 1]
  );
}

export function buildCustomerExpansionOpportunities({
  segments = CUSTOMER_EXPANSION_SEGMENTS,
  organizationType,
  currentPacks,
}: any = {}) {
  const packSet = new Set((currentPacks || []).map((pack) => String(pack).toLowerCase()));
  const visibleSegments = segments.filter((segment) => {
    if (organizationType && segment.organizationType !== organizationType) return false;
    if (!packSet.size) return true;
    return segment.currentPacks.some((pack) => packSet.has(pack.toLowerCase()));
  });

  const rows = visibleSegments.map((segment) => {
    const opportunities = segment.opportunities.map((opportunity) => {
      const score = clampScore(opportunity.score);
      return {
        ...opportunity,
        score,
        band: getExpansionOpportunityBand(score),
        evidenceCount: opportunity.evidence?.length || 0,
      };
    });
    return {
      ...segment,
      opportunities,
      topScore: opportunities.reduce((max, opportunity) => Math.max(max, opportunity.score), 0),
      opportunityCount: opportunities.length,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    segments: rows,
    summary: {
      customerSegmentCount: rows.length,
      opportunityCount: rows.reduce((sum, segment) => sum + segment.opportunityCount, 0),
      highConfidenceCount: rows.reduce(
        (sum, segment) =>
          sum +
          segment.opportunities.filter((opportunity) => opportunity.score >= 85).length,
        0,
      ),
      recommendedPackCount: new Set(
        rows.flatMap((segment) => segment.opportunities.map((opportunity) => opportunity.recommendedPack)),
      ).size,
    },
  };
}
