import { describe, expect, it } from 'vitest';
import {
  CARE_DROID_CIG_LAYER,
  CIG_DISCHARGED_RETENTION_MS,
  CIG_ENTITY_TYPES,
  CIG_OPERATIONAL_CANVAS_ROUTE,
  CIG_RELATIONSHIP_TYPES,
  CIG_SERVICE_METADATA_ALLOWLIST,
  CIG_EVENT_CATALOGUE,
} from './index';

describe('lib/cig public surface', () => {
  it('exports layer identity and product locks', () => {
    expect(CARE_DROID_CIG_LAYER).toBe('CareDroidClinicalIntelligenceGraph');
    expect(CIG_OPERATIONAL_CANVAS_ROUTE).toBe('/emergency/operational-canvas');
    expect(CIG_DISCHARGED_RETENTION_MS).toBe(36 * 60 * 60 * 1000);
  });

  it('includes all session KG entity types plus CIG extensions', () => {
    const sessionTypes = [
      'patient',
      'staff',
      'department',
      'alert',
      'workflow',
      'ai_recommendation',
      'service',
      'queue',
      'room',
      'bed',
      'diagnostic',
      'operational_event',
    ];
    for (const t of sessionTypes) {
      expect(CIG_ENTITY_TYPES).toContain(t);
    }
    expect(CIG_ENTITY_TYPES).toContain('protocol');
    expect(CIG_ENTITY_TYPES).toContain('ems_unit');
  });

  it('includes session KG relationships plus CIG extensions', () => {
    expect(CIG_RELATIONSHIP_TYPES).toContain('assigned_to');
    expect(CIG_RELATIONSHIP_TYPES).toContain('blocks');
    expect(CIG_RELATIONSHIP_TYPES).toContain('transitions_to');
  });

  it('restricts service metadata keys (PHI-safe allow-list)', () => {
    expect(CIG_SERVICE_METADATA_ALLOWLIST).toContain('latencyMs');
    expect(CIG_SERVICE_METADATA_ALLOWLIST).not.toContain('patientName');
    expect(CIG_SERVICE_METADATA_ALLOWLIST).not.toContain('mrn');
  });

  it('ships Stage F catalogue for graph event honesty', () => {
    expect(CIG_EVENT_CATALOGUE.some((e) => e.name === 'cig.graph.updated')).toBe(true);
  });
});
