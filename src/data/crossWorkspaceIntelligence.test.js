import { describe, expect, it } from 'vitest';
import {
  buildWorkspaceDependencyGraph,
  getWorkspaceDependencyChain,
} from './crossWorkspaceIntelligence';

describe('crossWorkspaceIntelligence', () => {
  it('builds the required workspace dependency edges', () => {
    const graph = buildWorkspaceDependencyGraph();
    const edgeIds = graph.edges.map((edge) => edge.id);

    expect(edgeIds).toEqual(
      expect.arrayContaining([
        'emergency-to-icu',
        'laboratory-to-cardiology',
        'medical-iot-to-fleet',
        'fleet-to-operations',
      ]),
    );
    expect(graph.summary.workspaceCount).toBeGreaterThanOrEqual(6);
    expect(graph.summary.highStrengthDependencyCount).toBeGreaterThanOrEqual(3);
  });

  it('generates a multi-hop Medical IoT to Fleet to Operations chain', () => {
    const graph = buildWorkspaceDependencyGraph();
    const chain = getWorkspaceDependencyChain(graph, 'iot-fleet-operations');

    expect(chain).toMatchObject({
      label: 'Medical IoT -> Fleet -> Operations',
      workspaceIds: ['medical-iot', 'fleet', 'operations'],
      edgeIds: ['medical-iot-to-fleet', 'fleet-to-operations'],
    });
  });
});
