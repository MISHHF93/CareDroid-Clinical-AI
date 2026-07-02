export type PlatformSystemChartDatum = Readonly<{ name: string; value: number }>;

export function buildPlatformSystemModuleChart(
  rows: ReadonlyArray<{ name: string; value: number }> = [],
): PlatformSystemChartDatum[] {
  return rows.map((row) => ({ name: row.name, value: row.value }));
}

export function platformSystemScoreTone(score: number): 'good' | 'warning' | 'critical' | 'neutral' {
  if (score >= 85) return 'good';
  if (score >= 70) return 'warning';
  return 'neutral';
}