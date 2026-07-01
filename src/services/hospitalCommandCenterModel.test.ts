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

  it('filters metrics by role priority order', () => {
    const snapshot = buildHospitalCommandCenterSnapshot();
    const triageIds = resolveHospitalCommandMetricsForRole(EMERGENCY_ROLE_IDS.triageNurse);
    const filtered = filterHospitalCommandMetrics(snapshot, triageIds);
    expect(filtered[0]?.id).toBe('three-minute-compliance');
    expect(filtered.length).toBeLessThanOrEqual(triageIds.length);
  });
});