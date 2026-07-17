import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient } from '../types/emergency';
import { buildCigSnapshotFromEmergencyBoard } from './cigFeProjection';
import { findCigNode } from '../../lib/cig';

const patient: Patient = {
  id: 'pt-graph-1',
  mrn: 'MRN-001',
  firstName: 'Alex',
  lastName: 'Rivera',
  dob: '1990-01-01',
  age: 36,
  sex: 'M',
  chiefComplaint: 'Chest pain',
  complaintCategory: 'Cardiac',
  state: PatientState.Waiting,
  priority: Priority.P2,
  vitals: [],
  flags: [],
  notes: [],
  timeline: [],
  arrivalTime: '2026-07-02T10:00:00.000Z',
  assignedStaffId: 'staff-1',
};

describe('buildCigSnapshotFromEmergencyBoard', () => {
  it('projects emergency types through CIG without multi-user claim', () => {
    const snapshot = buildCigSnapshotFromEmergencyBoard({
      tenantId: 'org-test',
      generatedAt: '2026-07-16T16:00:00.000Z',
      snapshotVersion: 2,
      patients: [patient],
      staff: [
        {
          id: 'staff-1',
          name: 'Jordan Lee',
          role: 'RN',
          status: 'OnShift',
          active: true,
        },
      ],
      queues: [
        {
          id: 'queue-waiting',
          label: 'Waiting',
          count: 1,
          breached: true,
        },
      ],
      alerts: [
        {
          id: 'alert-1',
          type: 'QueueBreach',
          severity: 'Critical',
          message: 'Waiting queue breached',
          title: 'Queue breach',
          patientId: 'pt-graph-1',
          acknowledged: false,
          dismissed: false,
          createdAt: '2026-07-02T10:05:00.000Z',
          ownerRole: 'triage_nurse',
        },
      ],
    });

    expect(snapshot.meta.tenantId).toBe('org-test');
    expect(snapshot.durability).toBe('session');
    expect(snapshot.degraded).toBe(true);
    expect(findCigNode(snapshot, 'patient', 'pt-graph-1')?.label).toContain('Alex');
    expect(findCigNode(snapshot, 'staff', 'staff-1')).toBeDefined();
    expect(findCigNode(snapshot, 'alert', 'alert-1')?.severity).toBe('critical');
  });
});
