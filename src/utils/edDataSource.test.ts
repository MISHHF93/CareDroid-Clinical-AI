import { describe, expect, it } from 'vitest';
import { resolveEdDataSourcePresentation, resolveEdSourceLabel } from './edDataSource';

describe('edDataSource simulation mode', () => {
  it('labels simulation mode data sources clearly', () => {
    expect(resolveEdSourceLabel('simulation-mode')).toContain('simulation');
    expect(resolveEdSourceLabel('simulation-mode')).toContain('no live patient data');
  });

  it('prioritizes simulation mode over scenario fixtures in presentation', () => {
    const presentation = resolveEdDataSourcePresentation({
      simulationModeActive: true,
      activeScenarioId: 'normal-day',
      envelope: { source: 'backend', generatedAt: new Date().toISOString() },
    });

    expect(presentation.sourceLabel).toContain('simulation');
  });
});
