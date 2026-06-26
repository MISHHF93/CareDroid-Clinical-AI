import { describe, expect, it } from 'vitest';
import {
  DATA_LINEAGE_STAGES,
  buildDataLineageExplorer,
  filterDataLineageFlows,
} from './dataLineageExplorer';

describe('dataLineageExplorer', () => {
  it('builds transparent Input to AI to Tool to Backend to Output flows', () => {
    const lineage = buildDataLineageExplorer();
    const expectedStages = Object.values(DATA_LINEAGE_STAGES);

    expect(lineage.summary.flows).toBeGreaterThan(0);
    expect(lineage.summary.transformations).toBeGreaterThan(10);
    expect(lineage.summary.models).toBeGreaterThan(0);
    expect(lineage.summary.calculators).toBeGreaterThan(0);

    for (const flow of lineage.flows) {
      expect(flow.stages.map((stage) => stage.stage)).toEqual(expectedStages);
      expect(flow.source).toBeTruthy();
      expect(flow.output).toBeTruthy();
      expect(flow.timestamps.firstSeen).toBeTruthy();
      expect(flow.timestamps.completedAt).toBeTruthy();
      expect(flow.stages.every((stage) => stage.timestamp && stage.transformations.length > 0)).toBe(
        true
      );
    }
  });

  it('filters lineage flows by query and category', () => {
    const lineage = buildDataLineageExplorer();

    expect(filterDataLineageFlows(lineage.flows, 'NEWS2').map((flow) => flow.id)).toContain(
      'news2-calculator-trace'
    );
    expect(filterDataLineageFlows(lineage.flows, '', 'Calculator').map((flow) => flow.id)).toEqual([
      'news2-calculator-trace',
    ]);
  });
});
