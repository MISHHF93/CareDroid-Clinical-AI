export const DEPARTMENT_HEALTH_BANDS = Object.freeze([
  { id: 'strong', label: 'Strong', minScore: 85 },
  { id: 'stable', label: 'Stable', minScore: 70 },
  { id: 'watch', label: 'Watch', minScore: 50 },
  { id: 'attention', label: 'Attention', minScore: 0 },
]);

export const DEPARTMENT_OUTCOME_SOURCES = Object.freeze({
  WORKFLOW: 'workflow',
  CALCULATOR: 'calculator',
  SIMULATION: 'simulation',
  TURNAROUND: 'turnaround',
  INTERPRETATION: 'interpretation',
  UPTIME: 'uptime',
  MAINTENANCE: 'maintenance',
});

export const DEPARTMENT_PERFORMANCE_OUTCOMES = Object.freeze([
  {
    id: 'emergency',
    name: 'Emergency',
    description: 'Clinical readiness across workflow adoption, calculator usage, and simulation preparation.',
    metrics: [
      {
        id: 'emergency-workflow-adoption',
        label: 'Workflow adoption',
        value: '78%',
        target: '80%',
        score: 78,
        trend: 'improving',
        source: DEPARTMENT_OUTCOME_SOURCES.WORKFLOW,
      },
      {
        id: 'emergency-calculator-utilization',
        label: 'Calculator utilization',
        value: '92 launches',
        target: '75 launches',
        score: 92,
        trend: 'improving',
        source: DEPARTMENT_OUTCOME_SOURCES.CALCULATOR,
      },
      {
        id: 'emergency-simulation-readiness',
        label: 'Simulation readiness',
        value: '84%',
        target: '85%',
        score: 84,
        trend: 'steady',
        source: DEPARTMENT_OUTCOME_SOURCES.SIMULATION,
      },
    ],
  },
  {
    id: 'laboratory',
    name: 'Laboratory',
    description: 'Diagnostic performance across turnaround targets and interpretation assistant use.',
    metrics: [
      {
        id: 'laboratory-turnaround',
        label: 'Turnaround metrics',
        value: '42 min median',
        target: '<=45 min',
        score: 88,
        trend: 'improving',
        source: DEPARTMENT_OUTCOME_SOURCES.TURNAROUND,
      },
      {
        id: 'laboratory-interpretation-utilization',
        label: 'Interpretation utilization',
        value: '64 interpretations',
        target: '70 interpretations',
        score: 72,
        trend: 'steady',
        source: DEPARTMENT_OUTCOME_SOURCES.INTERPRETATION,
      },
    ],
  },
  {
    id: 'operations',
    name: 'Operations',
    description: 'Operational reliability across uptime, fleet, device, and maintenance workload signals.',
    metrics: [
      {
        id: 'operations-asset-uptime',
        label: 'Asset uptime',
        value: '97.4%',
        target: '98%',
        score: 86,
        trend: 'steady',
        source: DEPARTMENT_OUTCOME_SOURCES.UPTIME,
      },
      {
        id: 'operations-maintenance-workload',
        label: 'Maintenance workload',
        value: '18 open work orders',
        target: '<=15 open',
        score: 68,
        trend: 'attention',
        source: DEPARTMENT_OUTCOME_SOURCES.MAINTENANCE,
      },
    ],
  },
]);

function clampScore(score) {
  const value = Math.round(Number(score) || 0);
  return Math.max(0, Math.min(100, value));
}

export function getDepartmentHealthBand(score) {
  const normalized = clampScore(score);
  return (
    DEPARTMENT_HEALTH_BANDS.find((band) => normalized >= band.minScore) ||
    DEPARTMENT_HEALTH_BANDS[DEPARTMENT_HEALTH_BANDS.length - 1]
  );
}

export function calculateDepartmentHealthScore(metrics = [] as any[]) {
  if (!metrics.length) return 0;
  const total = metrics.reduce((sum, metric) => sum + clampScore(metric.score), 0);
  return Math.round(total / metrics.length);
}

export function buildDepartmentPerformanceIntelligence({
  departments = DEPARTMENT_PERFORMANCE_OUTCOMES,
}: any = {}) {
  const departmentRows = departments.map((department) => {
    const metrics = (department.metrics || []).map((metric) => ({
      ...metric,
      score: clampScore(metric.score),
      measurable: Boolean(metric.label && metric.value && metric.target && metric.source),
    }));
    const healthScore = calculateDepartmentHealthScore(metrics);
    const healthBand = getDepartmentHealthBand(healthScore);
    return {
      ...department,
      metrics,
      healthScore,
      healthBand,
      highlights: metrics.filter((metric) => metric.score >= 85),
      attentionItems: metrics.filter((metric) => metric.score < 70),
      measurableOutcomeCount: metrics.filter((metric) => metric.measurable).length,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    departments: departmentRows,
    summary: {
      departmentCount: departmentRows.length,
      averageHealthScore: calculateDepartmentHealthScore(departmentRows.map((row) => ({ score: row.healthScore }))),
      measurableOutcomeCount: departmentRows.reduce(
        (sum, department) => sum + department.measurableOutcomeCount,
        0,
      ),
      attentionDepartmentCount: departmentRows.filter((department) => department.healthScore < 70).length,
    },
  };
}
