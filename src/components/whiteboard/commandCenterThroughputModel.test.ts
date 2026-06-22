import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient } from '../../types/emergency';
import { buildCommandCenterThroughputSnapshot } from './commandCenterThroughputModel';

function buildPatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-1',
    mrn: 'MRN-100',
    firstName: 'Alex',
    lastName: 'Lee',
    state: PatientState.Waiting,
    priority: Priority.P3,
    arrivalTime: '2026-06-20T08:00:00.000Z',
    triageTime: '2026-06-20T08:15:00.000Z',
    chiefComplaint: 'Chest pain',
    flags: [],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

describe('commandCenterThroughputModel', () => {
  it('builds director throughput snapshot from operational artifacts', () => {
    const now = new Date('2026-06-20T12:00:00.000Z');
    const snapshot = buildCommandCenterThroughputSnapshot({
      now,
      updatedAt: now.toISOString(),
      patients: [
        buildPatient({ id: 'w1', state: PatientState.Waiting }),
        buildPatient({ id: 'w2', state: PatientState.Waiting, arrivalTime: '2026-06-20T10:00:00.000Z' }),
        buildPatient({ id: 't1', state: PatientState.Triage, arrivalTime: '2026-06-20T11:30:00.000Z' }),
      ],
      capacity: {
        score: 82,
        band: 'Orange',
        updatedAt: now.toISOString(),
        totalPatients: 3,
        occupiedRooms: 20,
        boardingCount: 2,
        reassessmentDue: 1,
        waitingCount: 2,
        maxCapacity: 24,
        averageWaitMinutes: 55,
      },
      referrals: [{ id: 'r1', patientId: 'w1', status: 'Pending', reason: 'Cardiology' }],
      boardingMetrics: {
        medianBoardTimeMinutes: 180,
        patientsBoarding: [{ id: 'b1', boardingMinutes: 240 }],
        exceedingThresholds: [],
        updatedAt: now.toISOString(),
        raw: null,
      },
      hourlyArrivals: [
        { hour: '08:00', count: 2 },
        { hour: '09:00', count: 5 },
      ],
      bragPeakBand: 'Amber',
      bragDetail: 'Peak crowding expected in 2 hours',
      centralSnapshot: {
        sync: { source: 'backend-snapshot', lastSyncedAt: now.toISOString(), stale: false, message: 'Synced' },
        generatedAt: now.toISOString(),
        currentDepartmentStatus: { waitingPatients: 2, averageWait: 55 },
        capacityStatus: { score: 82, band: 'Orange' },
        boardingStatus: { boarders: 2, risk: 'watch' },
        referralStatus: { pending: 1 },
        queueHealth: [{ label: 'Waiting', breached: true }],
      } as never,
      intelligenceSnapshot: {
        modelHealth: { status: 'healthy' },
      } as never,
      analyticsSource: 'backend',
    });

    expect(snapshot.hourlyArrivals).toHaveLength(2);
    expect(snapshot.peakHourLabel).toContain('09:00');
    expect(snapshot.metrics.find((metric) => metric.id === 'waiting-room-occupancy')?.value).toBe('2 / 24');
    expect(snapshot.metrics.find((metric) => metric.id === 'referrals-backlog')?.value).toBe(1);
    expect(snapshot.crowdingForecast.available).toBe(true);
    expect(snapshot.crowdingForecast.label).toBe('Amber');
    expect(snapshot.systemHealth.label).toBe('Data fresh');
    expect(snapshot.summaryLine).toContain('waiting');
  });

  it('falls back when crowding forecast is unavailable', () => {
    const snapshot = buildCommandCenterThroughputSnapshot({
      patients: [buildPatient()],
      capacity: {
        score: 40,
        band: 'Green',
        updatedAt: new Date().toISOString(),
        totalPatients: 1,
        occupiedRooms: 8,
        boardingCount: 0,
        reassessmentDue: 0,
      },
    });

    expect(snapshot.crowdingForecast.available).toBe(true);
    expect(snapshot.crowdingForecast.label).toContain('Green');
  });
});
