import { describe, expect, it } from 'vitest';
import {
  buildSearchFirstDiscoveryEntries,
  buildSearchFirstResults,
} from './searchFirstDiscovery';

describe('search-first discovery index', () => {
  it('indexes every primary Emergency OS route as a searchable destination', () => {
    const primaryEmergencyOsPaths = [
      '/emergency/whiteboard',
      '/emergency/patients',
      '/emergency/ems',
      '/emergency/intake',
      '/emergency/queues',
      '/emergency/reassessment',
      '/emergency/capacity',
      '/emergency/boarding',
      '/emergency/referrals',
      '/emergency/copilot',
      '/emergency/analytics',
      '/emergency/settings',
    ];
    const entries = buildSearchFirstDiscoveryEntries();
    const emergencyOsPaths = new Set(
      entries
        .filter((entry) => entry.category === 'emergency-os')
        .map((entry) => entry.path)
    );

    expect([...emergencyOsPaths].sort()).toEqual([...primaryEmergencyOsPaths].sort());
    expect(buildSearchFirstResults({ query: 'boarding boarders' })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'destination', sourceId: 'emergency-boarding', path: '/emergency/boarding' }),
      ])
    );
  });

  it('keeps default discovery scoped to active Emergency OS destinations', () => {
    const entries = buildSearchFirstDiscoveryEntries();
    const paths = new Set(entries.map((entry) => entry.path));
    const kinds = new Set(entries.map((entry) => entry.kind));

    expect([...paths].every((path) => path.startsWith('/emergency/'))).toBe(true);
    expect([...kinds]).toEqual(['destination']);
  });

  it('indexes assets, workflows, simulations, protocols, AI, operations, commercial capabilities, and workspaces in platform catalog mode', () => {
    const entries = buildSearchFirstDiscoveryEntries({ includePlatformCatalog: true });
    const kinds = new Set(entries.map((entry) => entry.kind));

    expect([...kinds]).toEqual(
      expect.arrayContaining([
        'asset',
        'workflow',
        'automation',
        'simulation',
        'protocol',
        'ai-agent',
        'ai-model',
        'operation',
        'commercial',
        'workspace',
      ])
    );
  });

  it('finds workflow and simulation results by natural language query', () => {
    expect(buildSearchFirstResults({ query: 'sepsis escalation workflow', includePlatformCatalog: true })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'workflow', sourceId: 'sepsis-escalation' }),
      ])
    );
    expect(buildSearchFirstResults({ query: 'sepsis deterioration simulation', includePlatformCatalog: true })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'simulation', sourceId: 'sepsis-deterioration' }),
      ])
    );
  });

  it('filters workspace-specific discovery results to active workspaces', () => {
    const emergencyResults = buildSearchFirstResults({
      query: 'emergency workspace',
      workspaceId: 'emergency',
      includePlatformCatalog: true,
    });
    const iotResults = buildSearchFirstResults({
      query: 'device telemetry',
      workspaceId: 'medical-iot',
      includePlatformCatalog: true,
    });

    expect(emergencyResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'workspace', sourceId: 'emergency' }),
      ])
    );
    expect(iotResults).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'workspace', sourceId: 'medical-iot' }),
      ])
    );
  });

  it('finds protocols, AI agents, and automation templates from one search index', () => {
    expect(buildSearchFirstResults({ query: 'sepsis management lactate pathway', includePlatformCatalog: true })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'protocol', sourceId: 'sepsis' }),
      ])
    );
    expect(buildSearchFirstResults({ query: 'clinical copilot agent', includePlatformCatalog: true })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'ai-agent', sourceId: 'agent-clinical-copilot' }),
      ])
    );
    expect(buildSearchFirstResults({ query: 'fleet dispatch maintenance map', includePlatformCatalog: true })).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'operation', sourceId: 'fleet' }),
      ])
    );
    expect(buildSearchFirstResults({ query: 'automated triage matrix vitals chief complaint', includePlatformCatalog: true })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'automation',
          sourceId: 'emergency-automated-triage-matrix',
          path: '/workspace/emergency/automations',
        }),
      ])
    );
  });

  it('does not expose subsidiary navigation pages in the default Emergency OS search', () => {
    expect(buildSearchFirstResults({ query: 'global search' })).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'destination', sourceId: 'search', path: '/search' }),
      ])
    );
    expect(buildSearchFirstResults({ query: 'recommendations' })).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'destination', sourceId: 'recommendations', path: '/recommendations' }),
      ])
    );
    expect(buildSearchFirstResults({ query: 'billing usage subscription' })).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'destination', sourceId: 'billing', path: '/billing' }),
      ])
    );
    expect(
      buildSearchFirstResults({
        query: 'billing usage subscription',
        navigationPermissions: ['MANAGE_SUBSCRIPTIONS'],
      })
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'destination', sourceId: 'billing', path: '/billing' }),
      ])
    );
    expect(buildSearchFirstResults({ query: 'workflow mining journeys' })).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'destination', sourceId: 'workflow-mining', path: '/workflow-mining' }),
      ])
    );
  });

  it('indexes commercial catalog capabilities and row-level launch targets', () => {
    expect(buildSearchFirstResults({ query: 'emergency flow intelligence platform', includePlatformCatalog: true })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'commercial',
          sourceId: 'specialty-emergency',
          path: '/specialties/emergency',
        }),
      ])
    );
    expect(buildSearchFirstResults({ query: 'ems handoff bed flow bottleneck', includePlatformCatalog: true })[0]).toEqual(
      expect.objectContaining({
        kind: 'commercial',
        sourceId: 'specialty-emergency',
        path: '/specialties/emergency',
      })
    );
    expect(buildSearchFirstResults({ query: 'fhir patient integration', includePlatformCatalog: true })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'commercial',
          sourceId: 'integration-fhir',
          path: '/integrations-marketplace?category=fhir',
        }),
      ])
    );
    expect(buildSearchFirstResults({ query: 'hospital solution builder', includePlatformCatalog: true })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'commercial',
          sourceId: 'solution-builder',
          path: '/solution-builder',
        }),
      ])
    );
    expect(buildSearchFirstResults({ query: 'automation analytics human overrides', includePlatformCatalog: true })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'commercial',
          sourceId: 'automation-analytics',
          path: '/automation-analytics',
        }),
      ])
    );
  });
});
