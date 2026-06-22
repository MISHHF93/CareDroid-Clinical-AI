import { describe, expect, it } from 'vitest';
import {
  buildEmsOffloadVisibilitySnapshot,
  buildPublicEmsCrowdingImpact,
  hasEmsOffloadVisibilityActivity,
  selectEmsOffloadVisibilityMetrics,
} from './emsOffloadVisibilityModel';

const inboundArrival = {
  id: 'ems-1',
  unitId: 'unit-7',
  unitName: 'Medic 7',
  status: 'En Route',
  estimatedArrivalTime: new Date(Date.now() + 8 * 60000).toISOString(),
  chiefComplaint: 'Chest pain',
  patientId: 'p-secret',
};

const onSceneArrival = {
  id: 'ems-2',
  unitId: 'unit-3',
  unitName: 'Medic 3',
  status: 'Arrived',
  arrivedAt: new Date(Date.now() - 18 * 60000).toISOString(),
  chiefComplaint: 'Fall',
};

describe('emsOffloadVisibilityModel', () => {
  it('builds aggregate staff snapshot from EMS arrivals', () => {
    const snapshot = buildEmsOffloadVisibilitySnapshot([inboundArrival, onSceneArrival]);

    expect(snapshot.inboundCount).toBe(1);
    expect(snapshot.handoffPendingCount).toBeGreaterThanOrEqual(1);
    expect(hasEmsOffloadVisibilityActivity(snapshot)).toBe(true);
  });

  it('returns four staff strip metrics', () => {
    const metrics = selectEmsOffloadVisibilityMetrics([inboundArrival, onSceneArrival], {
      surface: 'chargeNurse',
    });

    expect(metrics).toHaveLength(4);
    expect(metrics.map((metric) => metric.label)).toEqual([
      'EMS inbound',
      'Offload delays',
      'Offload duration',
      'Handoff pending',
    ]);
  });

  it('builds PHI-safe public crowding impact without identifiers', () => {
    const impact = buildPublicEmsCrowdingImpact([inboundArrival, onSceneArrival], {
      enabled: true,
    });

    expect(impact.active).toBe(true);
    expect(impact.detail).not.toContain('Medic');
    expect(impact.detail).not.toContain('p-secret');
    expect(impact.detail).not.toContain('Chest pain');
  });

  it('hides public crowding impact when disabled', () => {
    const impact = buildPublicEmsCrowdingImpact([inboundArrival], { enabled: false });
    expect(impact.active).toBe(false);
  });
});
