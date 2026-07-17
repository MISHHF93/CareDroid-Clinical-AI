import { describe, expect, it } from 'vitest';
import { findCigNode, projectFromNeutralDto } from '../projectFromNeutralDto';
import {
  adaptNestEmergencyOsToNeutralDto,
  deriveQueuesFromNestPatients,
} from './nestEmergencyOsAdapter';

describe('adaptNestEmergencyOsToNeutralDto', () => {
  it('maps Nest fixture-like patients/rooms/staff/alerts into CIG snapshot', () => {
    const dto = adaptNestEmergencyOsToNeutralDto({
      tenantId: 'nest-tenant',
      generatedAt: '2026-07-16T17:00:00.000Z',
      snapshotVersion: 4,
      patients: [
        {
          id: 'p1',
          mrn: 'ED-001',
          firstName: 'Marcus',
          lastName: 'Chen',
          state: 'Assessment',
          priority: 'P2',
          chiefComplaint: 'Chest pain',
          assignedStaffId: 's1',
          roomId: 'r3',
          arrivalTime: '2026-07-16T15:00:00.000Z',
        },
        {
          id: 'p3',
          mrn: 'ED-003',
          firstName: 'Dorothy',
          lastName: 'Walsh',
          state: 'Results',
          priority: 'P2',
          assignedStaffId: 's1',
          roomId: 'r2',
          arrivalTime: '2026-07-16T14:00:00.000Z',
        },
      ],
      rooms: [
        { id: 'r3', name: 'Room 3', type: 'Treatment', status: 'Occupied', patientId: 'p1' },
        { id: 'r2', name: 'Room 2', type: 'Treatment', status: 'Occupied', patientId: 'p3' },
      ],
      staff: [{ id: 's1', name: 'Nurse One', role: 'RN', active: true }],
      alerts: [
        {
          id: 'a1',
          severity: 'Critical',
          title: 'Sepsis watch',
          message: 'Review lactate',
          patientId: 'p3',
          createdAt: '2026-07-16T16:30:00.000Z',
          dismissed: false,
        },
      ],
    });

    expect(dto.tenantId).toBe('nest-tenant');
    expect(dto.durability).toBe('session');
    expect(dto.patients).toHaveLength(2);
    expect(dto.patients?.[0]?.label).toBe('Marcus Chen');
    expect(dto.diagnostics?.some((d) => d.patientId === 'p3')).toBe(true);
    expect(dto.queues?.length).toBeGreaterThan(0);

    const snapshot = projectFromNeutralDto(dto);
    expect(findCigNode(snapshot, 'patient', 'p1')?.state.status).toBe('Assessment');
    expect(findCigNode(snapshot, 'room', 'r3')).toBeDefined();
    expect(findCigNode(snapshot, 'alert', 'a1')?.severity).toBe('critical');
    expect(snapshot.degraded).toBe(true);
  });

  it('derives queues from Nest patient states when queues omitted', () => {
    const queues = deriveQueuesFromNestPatients([
      { id: '1', state: 'Waiting' },
      { id: '2', state: 'Waiting' },
      { id: '3', state: 'Waiting' },
      { id: '4', state: 'Results' },
    ]);
    const waiting = queues.find((q) => q.id === 'queue-waiting');
    expect(waiting?.count).toBe(3);
    expect(waiting?.breached).toBe(true);
  });

  it('prefers explicit Nest queues over derived ones', () => {
    const dto = adaptNestEmergencyOsToNeutralDto({
      tenantId: 't',
      patients: [{ id: '1', state: 'Waiting' }],
      queues: [{ id: 'custom', label: 'Custom Queue', count: 9, breached: false }],
    });
    expect(dto.queues).toHaveLength(1);
    expect(dto.queues?.[0]?.id).toBe('custom');
  });

  it('uses arrival.arrivalTimestamp when present', () => {
    const dto = adaptNestEmergencyOsToNeutralDto({
      tenantId: 't',
      patients: [
        {
          id: 'p',
          state: 'Triage',
          arrivalTime: '2026-01-01T00:00:00.000Z',
          arrival: { arrivalTimestamp: '2026-07-16T12:00:00.000Z' },
        },
      ],
    });
    expect(dto.patients?.[0]?.arrivedAt).toBe('2026-07-16T12:00:00.000Z');
  });
});
