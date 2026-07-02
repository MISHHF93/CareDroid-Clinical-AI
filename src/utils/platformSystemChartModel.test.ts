import { describe, expect, it } from 'vitest';
import { buildPlatformSystemSurfaceView } from '../data/platformSystemSurfaces';
import { getPlatformSystemCapabilityByPath } from '../data/platformSystems';
import {
  buildPlatformSystemModuleChart,
  platformSystemScoreTone,
} from './platformSystemChartModel';

describe('platformSystemChartModel', () => {
  it('builds module charts from platform system surfaces', () => {
    const capability = getPlatformSystemCapabilityByPath('/tools/soap-builder');
    const view = buildPlatformSystemSurfaceView({ capability });
    const chart = buildPlatformSystemModuleChart(view.chart);

    expect(chart).toHaveLength(4);
    expect(chart.every((row) => row.value > 0)).toBe(true);
  });

  it('maps platform system score tones', () => {
    expect(platformSystemScoreTone(90)).toBe('good');
    expect(platformSystemScoreTone(75)).toBe('warning');
    expect(platformSystemScoreTone(60)).toBe('neutral');
  });
});