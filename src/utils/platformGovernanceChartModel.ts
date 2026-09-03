import { scoreGovernancePanels } from '../data/platformGovernanceSurfaces';

export type GovernanceChartDatum = Readonly<{ name: string; value: number }>;

export function buildGovernancePanelChart(
  panels: Record<string, unknown> = {},
): GovernanceChartDatum[] {
  return scoreGovernancePanels(panels);
}

export function governancePanelTone(score: number): 'good' | 'warning' | 'critical' | 'neutral' {
  if (score >= 80) return 'good';
  if (score >= 65) return 'warning';
  if (score >= 45) return 'neutral';
  return 'critical';
}

export function governanceSourceTone(
  sourceStatus: string,
): 'good' | 'warning' | 'critical' | 'neutral' {
  if (sourceStatus === 'live') return 'good';
  if (sourceStatus === 'demo' || sourceStatus === 'synthetic_ready') return 'neutral';
  if (sourceStatus === 'fallback') return 'warning';
  return 'neutral';
}
