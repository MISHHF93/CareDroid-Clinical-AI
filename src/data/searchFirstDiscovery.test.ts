import { describe, expect, it } from 'vitest';
import {
  buildSearchFirstDiscoveryEntries,
  buildSearchFirstResults,
} from './searchFirstDiscovery';
import { getPilotCustomerNavigationItems } from '../config/unified-navigation.config';
import { CANONICAL_ROUTES } from '../config/routes.config';

const PILOT_VISIBLE_PATHS = getPilotCustomerNavigationItems().map((item) => item.path);

describe('search-first discovery index', () => {
  it('indexes every primary CareDroid route as a searchable destination', () => {
    const entries = buildSearchFirstDiscoveryEntries();
    const emergencyOsPaths = new Set(
      entries
        .filter((entry) => entry.category === 'emergency-os')
        .map((entry) => entry.path)
    );

    // EMERGENCY_OS_DESTINATIONS is a curated subset tagged category
    // 'emergency-os'; newer pilot nav items are picked up by the separate
    // navigationDestinationEntries()/'destination' path instead. Full
    // path coverage across all categories is verified by the next test.
    for (const path of emergencyOsPaths) {
      expect(PILOT_VISIBLE_PATHS).toContain(path);
    }
    expect(buildSearchFirstResults({ query: 'tools calculators scores' })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'destination', sourceId: 'emergency-tools', path: '/emergency/tools' }),
      ])
    );
  });

  it('keeps default discovery scoped to active CareDroid destinations', () => {
    const entries = buildSearchFirstDiscoveryEntries();
    const paths = new Set(entries.map((entry) => entry.path));
    const kinds = new Set(entries.map((entry) => entry.kind));

    expect([...paths].sort()).toEqual([...PILOT_VISIBLE_PATHS].sort());
    expect(entries.map((entry) => entry.path)).toHaveLength(paths.size);
    expect([...kinds]).toEqual(['destination']);
    expect(buildSearchFirstResults({ query: 'analytics throughput' })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceId: 'emergency-analytics', path: '/emergency/analytics' }),
      ])
    );
    expect(buildSearchFirstResults({ query: 'settings thresholds' })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceId: 'emergency-settings', path: '/emergency/settings' }),
      ])
    );
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

  it('does not expose subsidiary navigation pages in the default CareDroid search', () => {
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
    // HEAL-347.80: 'specialty-emergency'/'specialty-cardiology'/'specialty-laboratory'/
    // 'pathway-sepsis'/'pathway-stroke' (row-level) and 'products'/'specialties'/
    // 'care-pathways'/'agents'/'outcomes'/'value-tracking'/'integration-readiness'/
    // 'solution-builder' (group-level) were removed from searchFirstDiscovery.ts --
    // a route-collision trace found they all pointed at CANONICAL_ROUTES constants
    // with zero <Route> registration anywhere (the same pre-pivot CommercialPages
    // purge leftovers HEAL-347.78 already removed from navigation.config.ts; two of
    // these, outcomes/value-tracking, were net-new findings this same trace). This
    // registry only ever surfaces to a real user when includePlatformCatalog:true,
    // which no live caller ever passes (only tests) -- so these were dormant, not an
    // active user-facing dead link, but still confirmed-dead data worth removing.
    expect(buildSearchFirstResults({ query: 'fhir patient integration', includePlatformCatalog: true })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'commercial',
          sourceId: 'integration-fhir',
          path: '/integrations-marketplace?category=fhir',
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
    expect(buildSearchFirstResults({ query: 'customer success renewal readiness', includePlatformCatalog: true })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'commercial',
          sourceId: 'customer-success',
          path: CANONICAL_ROUTES.customerSuccess,
        }),
      ])
    );
    expect(
      buildSearchFirstResults({ query: 'products specialties care pathways agents outcomes value tracking solution builder', includePlatformCatalog: true }),
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceId: expect.stringMatching(/^(products|specialties|care-pathways|agents|outcomes|value-tracking|integration-readiness|solution-builder|specialty-emergency|specialty-cardiology|specialty-laboratory|pathway-sepsis|pathway-stroke)$/) }),
      ]),
    );
  });
});
