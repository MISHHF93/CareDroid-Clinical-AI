export type ProfileActivityLog = Readonly<{
  id?: string;
  action?: string;
  timestamp?: string;
  phiAccessed?: boolean;
  resource?: string;
}>;

export type ProfileChartDatum = Readonly<{
  name: string;
  value: number;
  color?: string;
}>;

const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  AI_QUERY: 'AI query',
  PHI_ACCESS: 'PHI access',
  PROFILE_UPDATE: 'Profile update',
  CLINICAL_DATA_ACCESS: 'Clinical data',
};

function formatActionLabel(action?: string): string {
  if (!action) return 'Account';
  return ACTION_LABELS[action] || String(action).replace(/_/g, ' ');
}

function classifyActivity(log: ProfileActivityLog): string {
  if (log.phiAccessed || log.action === 'PHI_ACCESS') return 'PHI access';
  if (log.action === 'AI_QUERY') return 'AI usage';
  if (log.action === 'CLINICAL_DATA_ACCESS') return 'Clinical data';
  return 'Account';
}

export function buildActivityMixChart(logs: readonly ProfileActivityLog[]): ProfileChartDatum[] {
  const counts = new Map<string, number>();
  for (const log of logs) {
    const bucket = classifyActivity(log);
    counts.set(bucket, (counts.get(bucket) || 0) + 1);
  }
  return [...counts.entries()].map(([name, value]) => ({ name, value }));
}

export function buildActivityTypeChart(logs: readonly ProfileActivityLog[]): ProfileChartDatum[] {
  const counts = new Map<string, number>();
  for (const log of logs) {
    const label = formatActionLabel(log.action);
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));
}

export function buildActivityTrendPoints(logs: readonly ProfileActivityLog[]): number[] {
  if (!logs.length) return [0];
  const buckets = new Map<string, number>();
  for (const log of logs) {
    if (!log.timestamp) continue;
    const day = new Date(log.timestamp).toLocaleDateString();
    buckets.set(day, (buckets.get(day) || 0) + 1);
  }
  const points = [...buckets.values()];
  return points.length ? points : [logs.length];
}

export function buildToolUsageChart(
  tools: readonly { label?: string; id?: string }[],
): ProfileChartDatum[] {
  return tools.slice(0, 6).map((tool, index) => ({
    name: tool.label || tool.id || `Tool ${index + 1}`,
    value: Math.max(1, 6 - index),
  }));
}

export function buildCompetencyBreakdownChart(summary: {
  simulationCompletion?: number;
  skillCompletion?: number;
  overallReadiness?: number;
  activeCredentials?: number;
}): ProfileChartDatum[] {
  return [
    { name: 'Simulation', value: summary.simulationCompletion || 0 },
    { name: 'Skills', value: summary.skillCompletion || 0 },
    { name: 'Readiness', value: summary.overallReadiness || 0 },
    { name: 'Credentials', value: summary.activeCredentials || 0 },
  ];
}
