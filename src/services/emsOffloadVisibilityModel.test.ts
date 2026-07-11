import { describe, expect, it } from 'vitest';
import { Priority, type EMSArrival } from '../types/emergency';
import {
  buildEmsOffloadVisibilitySnapshot,
  buildPublicEmsCrowdingImpact,
  hasEmsOffloadVisibilityActivity,
  selectEmsOffloadVisibilityMetrics,
} from './emsOffloadVisibilityModel';

// status 'Handoff' (not 'Inbound'/'Arrived') keeps this unit out of the inbound count,
// same as the original non-canonical fixture status did — it already carries a
// patientId, which independently drives the "handoff" phase in the offload tracker.
const inboundArrival: EMSArrival = {
  id: 'ems-1',
  unitId: 'unit-7',
  unitName: 'Medic 7',
  crewNames: ['Medic 7 crew'],
  patientAge: 54,
  patientSex: 'Unknown',
  status: 'Handoff',
  estimatedArrivalTime: new Date(Date.now() + 8 * 60000).toISOString(),
  chiefComplaint: 'Chest pain',
  prearrivalComplaint: 'Chest pain',
  eta: 8,
  severity: 'High',
  dispatchTime: new Date(Date.now() - 5 * 60000).toISOString(),
  notes: '',
  priority: Priority.P2,
  patientId: 'p-secret',
};

const onSceneArrival: EMSArrival = {
  id: 'ems-2',
  unitId: 'unit-3',
  unitName: 'Medic 3',
  crewNames: ['Medic 3 crew'],
  patientAge: 68,
  patientSex: 'Unknown',
  status: 'Arrived',
  arrivedAt: new Date(Date.now() - 18 * 60000).toISOString(),
  estimatedArrivalTime: new Date(Date.now() - 18 * 60000).toISOString(),
  chiefComplaint: 'Fall',
  prearrivalComplaint: 'Fall',
  eta: 0,
  severity: 'Moderate',
  dispatchTime: new Date(Date.now() - 30 * 60000).toISOString(),
  notes: '',
  priority: Priority.P3,
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
