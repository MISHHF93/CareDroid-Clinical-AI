export const HOSPITAL_READINESS_BANDS = Object.freeze([
  { id: 'advanced', label: 'Advanced', minScore: 85 },
  { id: 'ready', label: 'Ready', minScore: 70 },
  { id: 'developing', label: 'Developing', minScore: 50 },
  { id: 'emerging', label: 'Emerging', minScore: 0 },
]);

export const HOSPITAL_READINESS_DIMENSIONS = Object.freeze([
  {
    id: 'digital_maturity',
    label: 'Digital maturity',
    baseScore: 72,
    signals: ['Standardized workflows', 'Operational dashboards', 'Digital tool adoption'],
    gaps: ['Connect digital outcomes to executive value tracking'],
  },
  {
    id: 'ai_maturity',
    label: 'AI maturity',
    baseScore: 64,
    signals: ['Assistant usage', 'Human review patterns', 'AI workflow interest'],
    gaps: ['Formalize AI evaluation, audit, and model governance routines'],
  },
  {
    id: 'interoperability',
    label: 'Interoperability',
    baseScore: 58,
    signals: ['FHIR readiness', 'HL7 planning', 'Identity and integration inventory'],
    gaps: ['Prioritize EHR, lab, and identity integrations before scale rollout'],
  },
  {
    id: 'simulation_readiness',
    label: 'Simulation readiness',
    baseScore: 67,
    signals: ['Scenario library fit', 'Competency workflows', 'Training program readiness'],
    gaps: ['Convert simulation usage into recurring readiness programs'],
  },
  {
    id: 'iot_readiness',
    label: 'IoT readiness',
    baseScore: 55,
    signals: ['Device fleet visibility', 'Telemetry quality checks', 'Maintenance workflows'],
    gaps: ['Connect device telemetry, uptime, fleet, and operations signals'],
  },
  {
    id: 'governance_readiness',
    label: 'Governance readiness',
    baseScore: 70,
    signals: ['Audit controls', 'Privacy workflows', 'Security and regulatory ownership'],
    gaps: ['Package governance evidence for AI and enterprise review'],
  },
]);

export const DEFAULT_HOSPITAL_READINESS_QUESTIONNAIRE = Object.freeze({
  questions: HOSPITAL_READINESS_DIMENSIONS.map((dimension) => ({
    id: dimension.id,
    question: `How mature is your hospital's ${dimension.label.toLowerCase()}?`,
    options: [
      { value: 1, label: 'Emerging' },
      { value: 2, label: 'Developing' },
      { value: 3, label: 'Ready' },
      { value: 4, label: 'Advanced' },
    ],
  })),
});

export const HOSPITAL_READINESS_RECOMMENDATIONS = Object.freeze({
  products: [
    'Emergency Department Solution',
    'Hospital Operations Command Center',
    'AI Governance Suite',
  ],
  packs: [
    'Emergency Pack',
    'Simulation Pack',
    'Medical IoT Pack',
    'Governance Compliance Pack',
  ],
  integrations: ['FHIR Patient Context', 'HL7 ADT', 'Laboratory Interface', 'Identity SSO'],
  training: [
    'Simulation readiness workshop',
    'AI governance enablement',
    'Clinical workflow onboarding',
  ],
});

function clampScore(score) {
  const value = Math.round(Number(score) || 0);
  return Math.max(0, Math.min(100, value));
}

function answerScore(answerValue, fallback) {
  const value = Number(answerValue);
  if (!Number.isFinite(value)) return fallback;
  return clampScore(value * 25);
}

export function getHospitalReadinessBand(score) {
  const normalized = clampScore(score);
  return (
    HOSPITAL_READINESS_BANDS.find((band) => normalized >= band.minScore) ||
    HOSPITAL_READINESS_BANDS[HOSPITAL_READINESS_BANDS.length - 1]
  );
}

export function calculateHospitalReadinessScore(dimensions = []) {
  if (!dimensions.length) return 0;
  const total = dimensions.reduce((sum, dimension) => sum + clampScore(dimension.score), 0);
  return Math.round(total / dimensions.length);
}

export function buildHospitalReadinessAssessment({ answers = {} } = {}) {
  const dimensions = HOSPITAL_READINESS_DIMENSIONS.map((dimension) => {
    const score = answerScore(answers[dimension.id], dimension.baseScore);
    return {
      ...dimension,
      score,
      level: getHospitalReadinessBand(score),
    };
  });
  const hospitalReadinessScore = calculateHospitalReadinessScore(dimensions);

  return {
    generatedAt: new Date().toISOString(),
    hospitalReadinessScore,
    readinessBand: getHospitalReadinessBand(hospitalReadinessScore),
    dimensions,
    recommendations: HOSPITAL_READINESS_RECOMMENDATIONS,
    summary: {
      measuredDimensionCount: dimensions.length,
      recommendationCount: Object.values(HOSPITAL_READINESS_RECOMMENDATIONS).reduce(
        (sum, items) => sum + items.length,
        0,
      ),
      lowestDimension: [...dimensions].sort((a, b) => a.score - b.score)[0],
      highestDimension: [...dimensions].sort((a, b) => b.score - a.score)[0],
    },
  };
}
