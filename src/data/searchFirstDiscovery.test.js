import { describe, expect, it } from 'vitest';
import {
  buildSearchFirstDiscoveryEntries,
  buildSearchFirstResults,
} from './searchFirstDiscovery';

describe('search-first discovery index', () => {
  it('indexes assets, workflows, simulations, and workspaces', () => {
    const entries = buildSearchFirstDiscoveryEntries();
    const kinds = new Set(entries.map((entry) => entry.kind));

    expect([...kinds]).toEqual(
      expect.arrayContaining(['asset', 'workflow', 'simulation', 'workspace'])
    );
  });

  it('finds workflow and simulation results by natural language query', () => {
    expect(buildSearchFirstResults({ query: 'sepsis escalation workflow' })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'workflow', sourceId: 'sepsis-escalation' }),
      ])
    );
    expect(buildSearchFirstResults({ query: 'sepsis deterioration simulation' })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'simulation', sourceId: 'sepsis-deterioration' }),
      ])
    );
  });

  it('filters workspace-specific discovery results', () => {
    const iotResults = buildSearchFirstResults({ query: 'device telemetry', workspaceId: 'medical-iot' });

    expect(iotResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'workspace', sourceId: 'medical-iot' }),
      ])
    );
    expect(iotResults.every((entry) => entry.workspaceIds.includes('medical-iot'))).toBe(true);
  });
});
