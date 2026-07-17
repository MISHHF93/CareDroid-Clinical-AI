import { describe, expect, it } from 'vitest';
import { findCigNode, projectFromNeutralDto } from '../projectFromNeutralDto';
import {
  adaptFeEmergencyBoardToNeutralDto,
  type FeEmergencyBoardSource,
} from './feEmergencyStoreAdapter';

const sampleBoard: FeEmergencyBoardSource = {
  tenantId: 'tenant-fe-1',
  generatedAt: '2026-07-16T15:00:00.000Z',
  snapshotVersion: 3,
  patients: [
    {
      id: 'pt-1',
      firstName: 'Alex',
      lastName: 'Rivera',
      mrn: 'MRN-001',
      state: 'Waiting',
      priority: 'P2',
      chiefComplaint: 'Chest pain',
      assignedStaffId: 'staff-1',
      arrivalTime: '2026-07-16T14:00:00.000Z',
    },
    {
      id: 'pt-2',
      firstName: 'Lee',
      lastName: 'Ng',
      state: 'Results',
      priority: 2,
      roomId: '12',
      assignedStaffId: 'staff-1',
      arrivalTime: '2026-07-16T12:00:00.000Z',
      updatedAt: '2026-07-16T13:30:00.000Z',
    },
  ],
  staff: [
    {
      id: 'staff-1',
      name: 'Jordan Lee',
      role: 'RN',
      status: 'OnShift',
      active: true,
      activePatients: 2,
    },
  ],
  rooms: [
    {
      id: '12',
      name: 'Room 12',
      type: 'Treatment',
      status: 'Occupied',
      patientId: 'pt-2',
    },
  ],
  queues: [
    {
      id: 'queue-waiting',
      label: 'Waiting',
      count: 1,
      breached: true,
      type: 'Waiting',
    },
  ],
  alerts: [
    {
      id: 'alert-1',
      title: 'Queue breach',
      message: 'Waiting queue breached',
      severity: 'Critical',
      patientId: 'pt-1',
      acknowledged: false,
      dismissed: false,
      ownerRole: 'triage_nurse',
      createdAt: '2026-07-16T14:30:00.000Z',
    },
  ],
  emsArrivals: [
    {
      id: 'ems-1',
      unitName: 'Medic 9',
      status: 'Inbound',
      eta: 8,
      chiefComplaint: 'Stroke',
      patientId: 'pt-1',
    },
  ],
  recommendations: [
    {
      id: 'rec-1',
      action: 'Reassess vitals',
      rationale: 'Long wait with cardiac complaint',
      patientId: 'pt-1',
      confidence: 0.8,
      humanReviewRequired: true,
    },
  ],
  serviceSignals: [
    {
      serviceName: 'emergencyOperatingSystem',
      status: 'degraded',
      errorRate: 0.05,
      latencyMs: 400,
    },
  ],
};

describe('adaptFeEmergencyBoardToNeutralDto', () => {
  it('maps FE store-like slices into neutral DTO fields', () => {
    const dto = adaptFeEmergencyBoardToNeutralDto(sampleBoard);

    expect(dto.tenantId).toBe('tenant-fe-1');
    expect(dto.durability).toBe('session');
    expect(dto.snapshotVersion).toBe(3);
    expect(dto.patients).toHaveLength(2);
    expect(dto.patients?.[0]?.label).toBe('Alex Rivera');
    expect(dto.patients?.[0]?.workflowStepId).toBe('waiting');
    expect(dto.patients?.[1]?.priority).toBe('P2');
    expect(dto.patients?.[1]?.roomId).toBe('12');
    expect(dto.staff?.[0]?.activePatientCount).toBe(2);
    expect(dto.rooms?.[0]?.patientId).toBe('pt-2');
    expect(dto.queues?.[0]?.breached).toBe(true);
    expect(dto.alerts?.[0]?.severity).toBe('critical');
    expect(dto.emsUnits?.[0]?.etaMinutes).toBe(8);
    expect(dto.recommendations?.[0]?.humanReviewRequired).toBe(true);
    expect(dto.services?.[0]?.health).toBe('degraded');
    expect(dto.diagnostics?.some((d) => d.patientId === 'pt-2')).toBe(true);
  });

  it('defaults tenant and durability for session-local FE boards', () => {
    const dto = adaptFeEmergencyBoardToNeutralDto({
      patients: [{ id: 'p', state: 'Arrival', firstName: 'A' }],
    });
    expect(dto.tenantId).toBe('session-local');
    expect(dto.durability).toBe('session');
  });

  it('projects through pure CIG builder without FE runtime imports', () => {
    const dto = adaptFeEmergencyBoardToNeutralDto(sampleBoard);
    const snapshot = projectFromNeutralDto(dto);

    expect(snapshot.meta.tenantId).toBe('tenant-fe-1');
    expect(findCigNode(snapshot, 'patient', 'pt-1')).toBeDefined();
    expect(findCigNode(snapshot, 'room', '12')).toBeDefined();
    expect(findCigNode(snapshot, 'ems_unit', 'ems-1')).toBeDefined();
    expect(
      snapshot.edges.some(
        (e) =>
          e.type === 'located_in' &&
          e.fromId.includes('patient:pt-2') &&
          e.toId.includes('room:12'),
      ),
    ).toBe(true);
    expect(snapshot.degraded).toBe(true);
  });

  it('skips dismissed alerts when projected', () => {
    const dto = adaptFeEmergencyBoardToNeutralDto({
      tenantId: 't',
      alerts: [
        { id: 'a1', title: 'Keep', severity: 'Info', dismissed: false },
        { id: 'a2', title: 'Drop', severity: 'Info', dismissed: true },
      ],
    });
    const snapshot = projectFromNeutralDto(dto);
    expect(findCigNode(snapshot, 'alert', 'a1')).toBeDefined();
    expect(findCigNode(snapshot, 'alert', 'a2')).toBeUndefined();
  });
});
