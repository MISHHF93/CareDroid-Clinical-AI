import { describe, expect, it } from 'vitest';
import {
  buildSearchFirstDiscoveryEntries,
  buildSearchFirstResults,
} from './searchFirstDiscovery';

describe('search-first discovery index', () => {
  it('indexes assets, workflows, simulations, protocols, AI, operations, commercial capabilities, and workspaces', () => {
    const entries = buildSearchFirstDiscoveryEntries();
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

  it('finds protocols, AI records, operations, and automation templates from one search index', () => {
    expect(buildSearchFirstResults({ query: 'sepsis management lactate pathway' })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'protocol', sourceId: 'sepsis' }),
      ])
    );
    expect(buildSearchFirstResults({ query: 'guardrails human review safety' })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'ai-model', sourceId: 'guardrails' }),
      ])
    );
    expect(buildSearchFirstResults({ query: 'clinical copilot agent' })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'ai-agent', sourceId: 'agent-clinical-copilot' }),
      ])
    );
    expect(buildSearchFirstResults({ query: 'fleet dispatch maintenance map' })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'operation', sourceId: 'fleet' }),
      ])
    );
    expect(buildSearchFirstResults({ query: 'high news2 escalation notify clinician' })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'automation',
          sourceId: 'emergency-high-news2-alert',
          path: '/workspace/emergency/automations',
        }),
      ])
    );
  });

  it('indexes canonical navigation destinations so hidden routes are still findable', () => {
    expect(buildSearchFirstResults({ query: 'global search' })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'destination', sourceId: 'search', path: '/search' }),
      ])
    );
    expect(buildSearchFirstResults({ query: 'recommendations' })).toEqual(
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
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'destination', sourceId: 'billing', path: '/billing' }),
      ])
    );
    expect(buildSearchFirstResults({ query: 'workflow mining journeys' })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'destination', sourceId: 'workflow-mining', path: '/workflow-mining' }),
      ])
    );
  });

  it('indexes commercial catalog capabilities and row-level launch targets', () => {
    expect(buildSearchFirstResults({ query: 'emergency department solution' })[0]).toEqual(
      expect.objectContaining({
        kind: 'commercial',
        sourceId: 'specialty-emergency',
        path: '/specialties/emergency',
      })
    );
    expect(buildSearchFirstResults({ query: 'fhir patient integration' })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'commercial',
          sourceId: 'integration-fhir',
          path: '/integrations-marketplace?category=fhir',
        }),
      ])
    );
    expect(buildSearchFirstResults({ query: 'hospital solution builder' })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'commercial',
          sourceId: 'solution-builder',
          path: '/solution-builder',
        }),
      ])
    );
    expect(buildSearchFirstResults({ query: 'automation analytics human overrides' })).toEqual(
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
