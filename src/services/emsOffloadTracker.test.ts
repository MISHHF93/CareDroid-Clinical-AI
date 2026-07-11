import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type EMSArrival } from '../types/emergency';
import {
  buildEmsOffloadAlerts,
  buildEmsOffloadTrackerRow,
  buildEmsOffloadTrackerSummary,
  normalizeEmsArrivalOffloadPatch,
  syncEmsOffloadOperationalSurfaces,
} from './emsOffloadTracker';

describe('emsOffloadTracker', () => {
  const now = Date.parse('2026-06-20T12:00:00.000Z');

  it('tracks dispatch ETA for inbound units', () => {
    const row = buildEmsOffloadTrackerRow(
      {
        id: 'ems-1',
        unitId: 'Medic 2',
        unitName: 'Medic 2',
        crewNames: ['A. Lee'],
        patientAge: 55,
        patientSex: 'M',
        chiefComplaint: 'Chest pain',
        prearrivalComplaint: 'Chest pain',
        eta: 8,
        severity: 'High',
        dispatchTime: '2026-06-20T11:50:00.000Z',
        estimatedArrivalTime: '2026-06-20T12:08:00.000Z',
        notes: '',
        status: 'Inbound',
        priority: Priority.P2,
      },
      { now },
    );

    expect(row.phase).toBe('inbound');
    expect(row.dispatchEtaMinutes).toBe(8);
    expect(row.dispatchEtaLabel).toMatch(/ETA/);
  });

  it('tracks arrival, handoff start, complete, and offload delay', () => {
    const row = buildEmsOffloadTrackerRow(
      {
        id: 'ems-2',
        unitId: 'Medic 9',
        unitName: 'Medic 9',
        crewNames: ['B. Kim'],
        patientAge: 40,
        patientSex: 'F',
        chiefComplaint: 'Stroke symptoms',
        prearrivalComplaint: 'Stroke symptoms',
        eta: 0,
        severity: 'Critical',
        dispatchTime: '2026-06-20T11:30:00.000Z',
        estimatedArrivalTime: '2026-06-20T11:45:00.000Z',
        notes: '',
        status: 'Handoff',
        priority: Priority.P1,
        patientId: 'patient-1',
        arrivedAt: '2026-06-20T11:45:00.000Z',
        handoffStartedAt: '2026-06-20T11:50:00.000Z',
        handoffCompletedAt: '2026-06-20T12:05:00.000Z',
        preparedRoomId: 'resus-1',
      },
      {
        now,
        patients: [
          {
            id: 'patient-1',
            mrn: 'ED-1',
            firstName: 'Pat',
            lastName: 'Smith',
            dob: '1980-01-01',
            age: 45,
            sex: 'F',
            arrivalTime: '2026-06-20T11:45:00.000Z',
            chiefComplaint: 'Stroke symptoms',
            complaintCategory: 'Neuro/Stroke',
            state: PatientState.Triage,
            priority: Priority.P1,
            vitals: [],
            flags: [],
            notes: [],
            timeline: [],
            assignedStaffId: 'rn-1',
          },
        ],
        staff: [{ id: 'rn-1', name: 'N. Nurse', role: 'RN', active: true }],
        rooms: [{ id: 'resus-1', name: 'Resus 1', type: 'Resus', status: 'Occupied' } as any],
        offloadTargetMinutes: 15,
      },
    );

    expect(row.ambulanceArrivalTime).toBe('2026-06-20T11:45:00.000Z');
    expect(row.triageHandoffStart).toBe('2026-06-20T11:50:00.000Z');
    expect(row.handoffCompleteTime).toBe('2026-06-20T12:05:00.000Z');
    expect(row.offloadDelayMinutes).toBe(20);
    expect(row.assignedReceivingArea).toBe('Resus 1');
    expect(row.handoffOwner).toBe('N. Nurse');
    expect(row.isDelayed).toBe(true);
  });

  it('builds notification center alerts for delayed offloads', () => {
    const summary = buildEmsOffloadTrackerSummary(
      [
        {
          id: 'ems-3',
          unitId: 'Medic 15',
          unitName: 'Medic 15',
          crewNames: [],
          patientAge: 30,
          patientSex: 'M',
          chiefComplaint: 'Trauma',
          prearrivalComplaint: 'Trauma',
          eta: 0,
          severity: 'High',
          dispatchTime: '2026-06-20T11:00:00.000Z',
          estimatedArrivalTime: '2026-06-20T11:20:00.000Z',
          notes: '',
          status: 'Arrived',
          priority: Priority.P2,
          arrivedAt: '2026-06-20T11:20:00.000Z',
        },
      ],
      { now, offloadTargetMinutes: 15 },
    );

    const alerts = buildEmsOffloadAlerts(summary, new Date(now));
    expect(summary.awaitingOffloadCount).toBe(1);
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].source).toBe('ems-offload-tracker');
  });

  it('normalizes offload timestamps when status advances', () => {
    const arrival: EMSArrival = {
      id: 'ems-4',
      unitId: 'Medic 4',
      unitName: 'Medic 4',
      crewNames: [],
      patientAge: 50,
      patientSex: 'M',
      chiefComplaint: 'SOB',
      prearrivalComplaint: 'SOB',
      eta: 0,
      severity: 'High',
      dispatchTime: '2026-06-20T11:00:00.000Z',
      estimatedArrivalTime: '2026-06-20T11:20:00.000Z',
      notes: '',
      status: 'Inbound' as const,
      priority: Priority.P2,
    };

    const patch = normalizeEmsArrivalOffloadPatch(
      arrival,
      { status: 'Handoff', patientId: 'patient-2' },
      '2026-06-20T12:00:00.000Z',
    );
    expect(patch.arrivedAt).toBeTruthy();
    expect(patch.handoffStartedAt).toBeTruthy();
  });

  it('builds attention snapshot and sync payload surfaces', () => {
    const dispatched: Array<Record<string, unknown>> = [];
    const snapshot = syncEmsOffloadOperationalSurfaces(
      {
        emsArrivals: [
          {
            id: 'ems-5',
            unitId: 'Medic 5',
            unitName: 'Medic 5',
            crewNames: [],
            patientAge: 44,
            patientSex: 'F',
            chiefComplaint: 'Fall',
            prearrivalComplaint: 'Fall',
            eta: 6,
            severity: 'Moderate',
            dispatchTime: '2026-06-20T11:50:00.000Z',
            estimatedArrivalTime: '2026-06-20T12:06:00.000Z',
            notes: '',
            status: 'Inbound',
            priority: Priority.P3,
          },
        ],
        dispatchWebSocketEvent: (event) => {
          dispatched.push(event.payload);
        },
      },
      { arrivalId: 'ems-5', source: 'test' },
    );

    expect(snapshot.previewRows).toHaveLength(1);
    expect(dispatched[0]?.surfaces).toContain('notification-center');
    expect(dispatched[0]?.surfaces).toContain('operational-snapshot');
  });
});
