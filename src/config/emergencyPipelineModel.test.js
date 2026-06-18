import { describe, expect, it } from 'vitest';
import {
  RECEPTION_PIPELINE_STAGES,
  auditNavCoverage,
  getEmergencySurface,
  resolvePipelineStageFromSearchParams,
} from './emergencyPipelineModel.js';
import { sortNavigationItemsForRole } from './emergencyNavPolicy.js';
import { NAVIGATION_ITEMS } from './unified-navigation.config.ts';

describe('emergencyPipelineModel', () => {
  it('defines four reception pipeline stages', () => {
    expect(RECEPTION_PIPELINE_STAGES).toHaveLength(4);
    expect(RECEPTION_PIPELINE_STAGES.map((stage) => stage.id)).toEqual([
      'arrival',
      'register',
      'verify',
      'handoff',
    ]);
  });

  it('resolves pipeline stage from reception query params', () => {
    expect(resolvePipelineStageFromSearchParams({ get: (key) => (key === 'express' ? '1' : '') })).toBe(
      'register',
    );
    expect(resolvePipelineStageFromSearchParams({ get: (key) => (key === 'queue' ? 'verification' : '') })).toBe(
      'verify',
    );
    expect(resolvePipelineStageFromSearchParams({ get: (key) => (key === 'queue' ? 'pretriage' : '') })).toBe(
      'handoff',
    );
  });

  it('registers pulse and shift surfaces', () => {
    expect(getEmergencySurface('pulse')?.canonicalRoute).toBe('/emergency/pulse');
    expect(getEmergencySurface('shift')?.canonicalRoute).toBe('/emergency/shift');
  });

  it('passes nav coverage audit for emergency target routes', () => {
    const audit = auditNavCoverage({
      retainedDirectRoutes: ['/emergency/pulse', '/emergency/shift'],
    });
    expect(audit.passesAudit).toBe(true);
    expect(audit.orphans).toHaveLength(0);
  });

  it('sorts registration clerk nav reception-first with pulse utility', () => {
    const clerkItems = NAVIGATION_ITEMS.filter((item) =>
      ['reception', 'patients', 'pulse', 'shift'].includes(item.id),
    );
    const sorted = sortNavigationItemsForRole(clerkItems, 'registration_clerk');
    expect(sorted.map((item) => item.id)).toEqual(['reception', 'patients', 'pulse', 'shift']);
  });
});
