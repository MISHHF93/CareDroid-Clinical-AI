import { describe, expect, it } from 'vitest';
import { buildPlatformGovernanceSurfaceView } from '../data/platformGovernanceSurfaces';
import {
  buildGovernancePanelChart,
  governancePanelTone,
  governanceSourceTone,
} from './platformGovernanceChartModel';

describe('platformGovernanceChartModel', () => {
  it('builds governance panel charts from demo surfaces', () => {
    const view = buildPlatformGovernanceSurfaceView({ surface: 'ai-security', pathname: '/security' });
    const chart = buildGovernancePanelChart(view.panels);

    expect(chart.length).toBeGreaterThan(0);
    expect(chart.every((row) => row.value > 0)).toBe(true);
  });

  it('maps governance tones', () => {
    expect(governancePanelTone(85)).toBe('good');
    expect(governancePanelTone(70)).toBe('warning');
    expect(governancePanelTone(40)).toBe('critical');
    expect(governanceSourceTone('live')).toBe('good');
    expect(governanceSourceTone('fallback')).toBe('warning');
  });
});