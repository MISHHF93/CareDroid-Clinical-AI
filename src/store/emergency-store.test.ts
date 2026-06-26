import { describe, expect, it } from 'vitest';
import { createInitialEmergencyStoreState, DEFAULT_EMERGENCY_THRESHOLDS, useEmergencyStore } from './emergencyStore';

describe('CareDroid store shim', () => {
  it('re-exports the canonical CareDroid store', () => {
    expect(useEmergencyStore.getState().patients.length).toBeGreaterThan(0);
    expect(useEmergencyStore.getState().capacity).toEqual(
      expect.objectContaining({ score: expect.any(Number), band: expect.any(String) }),
    );
  });

  it('creates a canonical reset snapshot with merged frontend store fields', () => {
    const snapshot = createInitialEmergencyStoreState();

    expect(snapshot).toEqual(
      expect.objectContaining({
        patients: expect.any(Array),
        rooms: expect.any(Array),
        activeShift: expect.objectContaining({ chargeStaffId: expect.any(String) }),
        selectedPatientId: null,
        copilotOpen: false,
        activeQueueFilter: null,
        capacityMetrics: expect.objectContaining({ score: expect.any(Number) }),
        boardingMetrics: expect.objectContaining({ patientsBoarding: expect.any(Array) }),
        surgeStatus: expect.objectContaining({ active: false }),
        copilotMessages: expect.any(Array),
        emsIncomingPatients: expect.any(Array),
        ui: expect.objectContaining({ selectedPatientId: null }),
        websocket: expect.objectContaining({ status: expect.any(String) }),
        integrationEvents: expect.any(Array),
        flags: expect.any(Object),
        auditLog: expect.any(Array),
        thresholds: expect.objectContaining({
          waitTimeWarningMin: expect.any(Number),
          waitTimeCtiticalMin: expect.any(Number),
          capacityOrangePct: expect.any(Number),
          reassessP2Min: expect.any(Number),
        }),
      }),
    );
  });

  it('stores configurable operational thresholds and resets to defaults', () => {
    const store = useEmergencyStore.getState();

    store.setThreshold('capacityOrangePct', 0.82);
    expect(useEmergencyStore.getState().thresholds.capacityOrangePct).toBe(0.82);
    expect(useEmergencyStore.getState().emergencySettings.thresholds.capacityOrangePercent).toBe(82);

    useEmergencyStore.getState().resetThresholds();
    expect(useEmergencyStore.getState().thresholds).toEqual(DEFAULT_EMERGENCY_THRESHOLDS);
  });

  it('routes realtime central node snapshots through canonical CareDroid state', () => {
    const store = useEmergencyStore.getState();
    const generatedAt = '2026-06-14T06:30:00.000Z';
    const capacity = {
      ...store.capacity,
      score: store.capacity.score + 1,
      updatedAt: generatedAt,
    };

    store.dispatchWebSocketEvent({
      type: 'central_node_snapshot',
      payload: {
        data: {
          generatedAt,
          capacityStatus: capacity,
          operationalAlerts: [
            {
              id: 'alert-realtime-test',
              type: 'Capacity',
              severity: 'warning',
              title: 'Capacity pressure changed',
              message: 'Central node reported updated pressure.',
              createdAt: generatedAt,
              source: 'central-node',
            },
          ],
          recentEvents: [
            {
              id: 'workflow-realtime-test',
              type: 'capacity_score_changed',
              title: 'Capacity score changed',
              summary: 'Central node snapshot updated capacity score.',
              timestamp: generatedAt,
              source: 'central-node',
              severity: 'Info',
              status: 'recorded',
              metadata: {},
            },
          ],
        },
      },
    });

    const next = useEmergencyStore.getState();
    expect(next.capacity.score).toBe(capacity.score);
    expect(next.alerts.find((alert) => alert.id === 'alert-realtime-test')).toEqual(
      expect.objectContaining({
        severity: 'Warning',
        source: 'central-node',
      }),
    );
    expect(next.workflowLogs.find((log) => log.id === 'workflow-realtime-test')).toEqual(
      expect.objectContaining({
        type: 'capacity_score_changed',
        source: 'central-node',
      }),
    );
    expect(next.websocket.lastEventAt).toEqual(expect.any(String));
  });

  it('routes whiteboard_snapshot events through canonical patient state', () => {
    const store = useEmergencyStore.getState();
    const generatedAt = '2026-06-14T06:32:00.000Z';
    const patient = {
      ...store.patients[0],
      id: 'whiteboard-realtime-patient',
      mrn: 'WB-RT-1',
      firstName: 'Board',
      lastName: 'Realtime',
      timeline: [],
    };

    store.dispatchWebSocketEvent({
      type: 'whiteboard_snapshot',
      payload: {
        data: {
          generatedAt,
          patients: [patient],
          alerts: [],
          rooms: store.rooms,
          staff: store.staff,
          capacity: {
            ...store.capacity,
            score: store.capacity.score + 2,
            updatedAt: generatedAt,
          },
        },
      },
    });

    const next = useEmergencyStore.getState();
    expect(next.patients.find((candidate) => candidate.id === patient.id)).toEqual(
      expect.objectContaining({ mrn: 'WB-RT-1' }),
    );
    expect(next.capacity.score).toBe(store.capacity.score + 2);
    expect(next.websocket.lastEventAt).toEqual(expect.any(String));
  });

  it('hydrates single-record realtime patient, referral, and settings events', () => {
    const store = useEmergencyStore.getState();
    const patient = {
      ...store.patients[0],
      id: 'realtime-patient-created-test',
      mrn: 'RT-STATE-1',
      firstName: 'Realtime',
      lastName: 'Patient',
      timeline: [],
    };

    store.dispatchWebSocketEvent({
      type: 'patient_created',
      payload: {
        patient,
        summary: 'Realtime patient created.',
      },
    });

    useEmergencyStore.getState().dispatchWebSocketEvent({
      type: 'referral_created',
      payload: {
        referral: {
          id: 'realtime-referral-created-test',
          patientId: patient.id,
          targetDepartment: 'Cardiology',
          urgency: 'Emergent',
          reason: 'Realtime consult requested.',
          clinicalSummary: 'Realtime patient requires cardiology review.',
          status: 'Sent',
          workflow: 'Referral',
          requestedAt: '2026-06-14T06:31:00.000Z',
        },
      },
    });

    useEmergencyStore.getState().dispatchWebSocketEvent({
      type: 'settings_updated',
      payload: {
        settings: {
          thresholds: {
            waitWarningMinutes: 37,
          },
        },
      },
    });

    const next = useEmergencyStore.getState();
    expect(next.patients.find((candidate) => candidate.id === patient.id)).toEqual(
      expect.objectContaining({ mrn: 'RT-STATE-1' }),
    );
    expect(next.referrals.find((referral) => referral.id === 'realtime-referral-created-test')).toEqual(
      expect.objectContaining({
        patientId: patient.id,
        status: 'Sent',
      }),
    );
    expect(next.thresholds.waitTimeWarningMin).toBe(37);
    expect(next.workflowLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'patient_created', patientId: patient.id }),
        expect.objectContaining({ type: 'referral_created', patientId: patient.id }),
      ]),
    );
  });

  it('handles intake_handoff_complete websocket by selecting patient and triage queue filter', () => {
    const store = useEmergencyStore.getState();
    const patientId = store.patients[0]?.id;
    expect(patientId).toBeTruthy();

    store.setQueueFilter(null);
    store.selectPatient(null);

    store.dispatchWebSocketEvent({
      type: 'intake_handoff_complete',
      payload: {
        patientId,
        encounterId: 'encounter-ws-test',
        queue: 'Triage',
        surfaces: ['triage-queue', 'whiteboard', 'operational-snapshot'],
      },
    });

    const next = useEmergencyStore.getState();
    expect(next.activeQueueFilter).toBe('Triage');
    expect(next.selectedPatientId).toBe(patientId);
    expect(next.websocket.lastEventAt).toBeTruthy();
    expect(next.workflowLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'integration_event_received',
          patientId,
        }),
      ]),
    );
  });
});
