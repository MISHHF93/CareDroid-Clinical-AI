import { describe, expect, it } from 'vitest';
import { PatientState, Priority } from '../types/emergency';
import {
  buildHospitalCommandCenterSnapshot,
  filterHospitalCommandMetrics,
} from './hospitalCommandCenterModel';
import { resolveHospitalCommandMetricsForRole } from '../config/hospitalCommandCenterRolePolicy';
import { EMERGENCY_ROLE_IDS } from '../config/emergencyRolePermissions';

describe('hospitalCommandCenterModel', () => {
  it('builds all actionable command center metrics', () => {
    const snapshot = buildHospitalCommandCenterSnapshot({
      patients: [
        {
          id: 'p1',
          mrn: 'MRN1',
          firstName: 'Alex',
          lastName: 'Patient',
          state: PatientState.Waiting,
          priority: Priority.P2,
          arrivalTime: new Date(Date.now() - 50 * 60_000).toISOString(),
          flags: ['HighRisk'],
          chiefComplaint: 'Chest pain',
        } as never,
      ],
      staff: [
        { id: 's1', name: 'Dr Lee', role: 'MD', active: true, status: 'OnShift' } as never,
        { id: 's2', name: 'Nurse Kim', role: 'RN', active: true, status: 'OnShift' } as never,
      ],
      alerts: [
        {
          id: 'a1',
          severity: 'Critical',
          message: 'Sepsis concern',
          acknowledged: false,
          dismissed: false,
        } as never,
      ],
      emsArrivals: [
        {
          id: 'ems1',
          status: 'Inbound',
          eta: 6,
          chiefComplaint: 'Stroke',
          unitName: 'Medic 12',
        } as never,
      ],
      capacity: {
        band: 'Orange',
        occupancyPercent: 88,
        maxCapacity: 20,
        currentOccupancy: 17,
        occupiedRooms: 17,
        waitingCount: 1,
      } as never,
    });

    expect(snapshot.metrics.length).toBe(14);
    expect(snapshot.metrics.find((metric) => metric.id === 'waiting-patients')?.value).toBe(1);
    expect(snapshot.metrics.find((metric) => metric.id === 'unresolved-alerts')?.value).toBe(1);
    expect(snapshot.metrics.find((metric) => metric.id === 'ems-arrivals')?.value).toBeTruthy();
    expect(snapshot.metrics.find((metric) => metric.id === 'doctors-available')?.value).toBe(1);
    expect(snapshot.metrics.find((metric) => metric.id === 'nurses-available')?.value).toBe(1);
    expect(snapshot.statusLine.length).toBeGreaterThan(0);
  });

  it('prefers backend unified operational intelligence for bottlenecks and recommendations', () => {
    const snapshot = buildHospitalCommandCenterSnapshot({
      unifiedOperationalSnapshot: {
        engineId: 'unified-operational-intelligence',
        generatedAt: '2026-07-03T12:00:00.000Z',
        source: 'backend',
        domainStatuses: [],
        insights: [
          {
            id: 'uoi-bottleneck-1',
            domain: 'patient_flow',
            type: 'bottleneck',
            title: 'Backend queue bottleneck',
            summary: 'Derived from backend evaluate event.',
            severity: 'warning',
            ownerRole: 'charge_nurse',
            reasonCodes: ['queue_breach'],
            confidence: 0.9,
            humanReviewRequired: true,
            advisoryOnly: true,
            source: 'backend',
            updatedAt: '2026-07-03T12:00:00.000Z',
          },
          {
            id: 'uoi-rec-1',
            domain: 'ai_recommendations',
            type: 'intervention',
            title: 'Review triage queue',
            summary: 'Backend intervention recommendation.',
            severity: 'info',
            route: '/emergency/queues',
            ownerRole: 'ed_manager',
            reasonCodes: ['queue_breach'],
            confidence: 0.88,
            humanReviewRequired: true,
            advisoryOnly: true,
            source: 'backend',
            updatedAt: '2026-07-03T12:00:00.000Z',
          },
        ],
        metrics: {
          activePatients: 8,
          waitingPatients: 2,
          capacityScore: 70,
          capacityBand: 'Orange',
          inboundEms: 1,
          activeBottlenecks: 1,
          unresolvedAlerts: 0,
          degradedServices: 0,
          workflowPendingReview: 0,
          aiRecommendationCount: 1,
          congestionPredictions: 0,
        },
        safetyStatement: 'Advisory only.',
        backendEndpoints: [],
      },
    });

    expect(snapshot.bottlenecks[0]?.title).toBe('Backend queue bottleneck');
    expect(snapshot.aiRecommendations[0]?.action).toBe('Review triage queue');
    expect(snapshot.metrics.find((metric) => metric.id === 'service-bottlenecks')?.value).toBe(1);
  });

  it('projects core metrics from authoritative unified operational intelligence', () => {
    const snapshot = buildHospitalCommandCenterSnapshot({
      patients: [
        {
          id: 'p1',
          state: PatientState.Waiting,
          priority: Priority.P3,
          arrivalTime: new Date().toISOString(),
          flags: [],
        } as never,
      ],
      alerts: [
        {
          id: 'a1',
          severity: 'Critical',
          message: 'Local alert',
          acknowledged: false,
          dismissed: false,
        } as never,
      ],
      emsArrivals: [{ id: 'ems1', status: 'Inbound', eta: 8 } as never],
      capacity: { band: 'Green', occupancyPercent: 40 } as never,
      unifiedOperationalSnapshot: {
        engineId: 'unified-operational-intelligence',
        generatedAt: '2026-07-04T12:00:00.000Z',
        source: 'backend',
        domainStatuses: [],
        insights: [],
        metrics: {
          activePatients: 9,
          waitingPatients: 4,
          capacityScore: 82,
          capacityBand: 'Orange',
          inboundEms: 3,
          activeBottlenecks: 2,
          unresolvedAlerts: 5,
          degradedServices: 0,
          workflowPendingReview: 0,
          aiRecommendationCount: 2,
          congestionPredictions: 0,
        },
        safetyStatement: 'Advisory only.',
        backendEndpoints: [],
      },
    });

    expect(snapshot.metrics.find((metric) => metric.id === 'waiting-patients')?.value).toBe(4);
    expect(snapshot.metrics.find((metric) => metric.id === 'department-occupancy')?.value).toBe('82%');
    expect(snapshot.metrics.find((metric) => metric.id === 'ems-arrivals')?.value).toBe(3);
    expect(snapshot.metrics.find((metric) => metric.id === 'unresolved-alerts')?.value).toBe(5);
    expect(snapshot.metrics.find((metric) => metric.id === 'ai-recommendations')?.value).toBe(2);
  });

  it('filters metrics by role priority order', () => {
    const snapshot = buildHospitalCommandCenterSnapshot();
    const triageIds = resolveHospitalCommandMetricsForRole(EMERGENCY_ROLE_IDS.triageNurse);
    const filtered = filterHospitalCommandMetrics(snapshot, triageIds);
    expect(filtered[0]?.id).toBe('three-minute-compliance');
    expect(filtered.length).toBeLessThanOrEqual(triageIds.length);
  });
});