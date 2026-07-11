import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CARE_DROID_SCREEN_MODES,
  buildCareDroidCentralNodeSnapshot,
} from './careDroidCentralNode';
import { PatientState, Priority, type Patient } from '../types/emergency';
import type { CareDroidCentralNodeSource } from './careDroidCentralNode';

const now = new Date('2026-06-13T12:00:00.000Z');

function patient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-1234',
    mrn: 'MRN-SENSITIVE-1',
    firstName: 'Avery',
    lastName: 'Stone',
    dob: '1970-01-01',
    age: 56,
    sex: 'F',
    arrivalTime: '2026-06-13T11:30:00.000Z',
    chiefComplaint: 'Chest pain with private clinical notes',
    complaintCategory: 'Cardiac',
    state: PatientState.Waiting,
    priority: Priority.P2,
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

function source(overrides: Partial<CareDroidCentralNodeSource> = {}): CareDroidCentralNodeSource {
  return {
    patients: [patient()],
    staff: [],
    rooms: [],
    capacity: {
      score: 72,
      band: 'Yellow',
      totalPatients: 1,
      occupiedRooms: 0,
      boardingCount: 0,
      reassessmentDue: 0,
      updatedAt: now.toISOString(),
    },
    alerts: [
      {
        id: 'alert-1',
        type: 'Reassessment',
        severity: 'Critical',
        title: 'Avery Stone needs reassessment',
        message: 'MRN-SENSITIVE-1 chest pain note',
        patientId: 'patient-1234',
        createdAt: now.toISOString(),
        dismissed: false,
      },
    ],
    emsArrivals: [],
    emsIncomingPatients: [],
    emsUnits: [],
    referrals: [],
    workflowLogs: [],
    emergencySettings: {
      tenantName: 'CareDroid Test ED',
      defaultWorkspace: 'emergency-whiteboard',
      defaultScreenMode: CARE_DROID_SCREEN_MODES.chargeNurse,
      enabledScreenModes: Object.values(CARE_DROID_SCREEN_MODES),
      readOnlyDisplayMode: false,
      commandCenterMode: true,
      wallDisplayRefreshInterval: 30000,
      enabledModules: [{ id: 'whiteboard', label: 'Whiteboard', enabled: true }],
      aiSettings: { enabled: true, humanReviewRequired: true },
      integrationSettings: {},
      provincialHealthSettings: {},
      notificationSettings: {},
      reassessmentThresholds: {},
      capacityThresholds: {},
      emsThresholds: {},
      boardingThresholds: { maxBoarders: 8 },
      ctasThresholds: { P1: 0, P2: 15, P3: 30, P4: 60, P5: 120 },
      thresholds: {
        waitWarningMinutes: 45,
        waitCriticalMinutes: 60,
        capacityWarningPercent: 75,
        emsOffloadTargetMinutes: 15,
        reassessmentIntervals: { P3: 60 },
        ctasTargets: { P1: 0, P2: 15, P3: 30, P4: 60, P5: 120 },
      },
      departmentCapacityTarget: 85,
      alertRules: {},
      centralControl: {},
    } as unknown as CareDroidCentralNodeSource['emergencySettings'],
    websocket: {
      connected: true,
      status: 'connected',
      mode: 'polling',
      url: null,
      lastConnectedAt: now.toISOString(),
      lastDisconnectedAt: null,
      lastEventAt: now.toISOString(),
      updatedAt: now.toISOString(),
      message: 'connected',
      error: null,
    },
    copilotMessages: [],
    integrationEvents: [],
    selectedPatientId: null,
    activeQueueFilter: null,
    whiteboardSearchQuery: '',
    loading: false,
    backendAvailable: true,
    ...overrides,
  };
}

describe('CareDroidCentralNode contract', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds one operational snapshot from existing emergency store state', () => {
    const snapshot = buildCareDroidCentralNodeSnapshot(source(), {
      role: 'charge_nurse',
      roleLabel: 'Charge Nurse',
      readOnly: false,
      allowedRoutes: ['/emergency/whiteboard'],
    });

    expect(snapshot.node).toBe('CareDroidCentralNode');
    expect(snapshot.currentDepartmentStatus).toMatchObject({
      activePatients: 1,
      waitingPatients: 1,
      activeAlerts: 1,
    });
    expect(snapshot.operationalSummary.metrics.map((metric) => metric.key)).toEqual(
      expect.arrayContaining(['capacityScore', 'emsInbound', 'reassessmentsDue']),
    );
    expect(snapshot.queueHealth.map((queue) => queue.id)).toEqual(
      expect.arrayContaining(['referral', 'discharge', 'reassessment']),
    );
  });

  it('harmonizes the backend central-node envelope into the visible operational snapshot', () => {
    const snapshot = buildCareDroidCentralNodeSnapshot(
      source(),
      {
        role: 'charge_nurse',
        roleLabel: 'Charge Nurse',
        readOnly: false,
        allowedRoutes: ['/emergency/whiteboard'],
      },
      {
        backendSnapshot: {
          module: 'CareDroid Central Node',
          generatedAt: '2026-06-13T12:05:00.000Z',
          source: 'backend-fixture',
          status: 'active',
          data: {
            node: 'CareDroidCentralNode',
            generatedAt: '2026-06-13T12:05:00.000Z',
            patientsToday: 18,
            activePatients: 14,
            waitingPatients: 6,
            longestWait: 88,
            averageWait: 42,
            emsInbound: 3,
            emsPressure: 'strained',
            reassessmentsDue: 5,
            capacityStatus: {
              score: 91,
              band: 'Red',
              totalPatients: 14,
              occupiedRooms: 10,
              boardingCount: 4,
              reassessmentDue: 5,
              criticalEmsInboundCount: 1,
              updatedAt: '2026-06-13T12:05:00.000Z',
            },
            boarders: 4,
            boardingRisk: 'strained',
            referralsPending: 2,
            operationalAlerts: [
              {
                id: 'backend-alert-1',
                severity: 'Critical',
                title: 'Capacity critical',
                message: 'Backend central node alert.',
                createdAt: '2026-06-13T12:04:00.000Z',
                dismissed: false,
              },
            ],
            queueMetrics: [
              {
                id: 'waiting',
                label: 'Waiting',
                count: 6,
                oldestWaitMinutes: 88,
                targetMinutes: 45,
                breached: true,
              },
            ],
          },
        },
      },
    );

    expect(snapshot.sync).toMatchObject({
      source: 'backend-snapshot',
      status: 'connected',
      stale: false,
      lastSyncedAt: '2026-06-13T12:05:00.000Z',
    });
    expect(snapshot.currentDepartmentStatus).toMatchObject({
      patientsToday: 18,
      activePatients: 14,
      waitingPatients: 6,
      longestWait: 88,
      averageWait: 42,
      capacityBand: 'Red',
      activeAlerts: 1,
    });
    expect(snapshot.capacityStatus).toMatchObject({
      score: 91,
      band: 'Red',
      totalPatients: 14,
      boardingCount: 4,
      reassessmentDue: 5,
    });
    expect(snapshot.emsPressure).toMatchObject({
      inbound: 3,
      criticalInbound: 1,
      status: 'strained',
    });
    expect(snapshot.boardingStatus).toEqual({ boarders: 4, risk: 'strained' });
    expect(snapshot.referralStatus.pending).toBe(2);
    expect(snapshot.queueHealth[0]).toMatchObject({
      id: 'waiting',
      count: 6,
      breached: true,
    });
    expect(snapshot.operationalSummary.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'averageWait', value: '42m' }),
        expect.objectContaining({ key: 'capacityScore', value: '91 Red' }),
        expect.objectContaining({ key: 'emsInbound', value: 3 }),
        expect.objectContaining({ key: 'reassessmentsDue', value: 5 }),
      ]),
    );
  });

  it('redacts patient-sensitive fields for public display modes', () => {
    const snapshot = buildCareDroidCentralNodeSnapshot(
      source(),
      {
        role: 'read_only_viewer',
        roleLabel: 'Read-Only Viewer',
        readOnly: true,
        allowedRoutes: ['/emergency/whiteboard'],
      },
      { screenMode: CARE_DROID_SCREEN_MODES.publicWaiting },
    );
    const serialized = JSON.stringify(snapshot);

    expect(snapshot.screenContext.sensitiveDataRedacted).toBe(true);
    expect(snapshot.roleContext.readOnly).toBe(true);
    expect(serialized).not.toContain('Avery');
    expect(serialized).not.toContain('Stone');
    expect(serialized).not.toContain('MRN-SENSITIVE-1');
    expect(serialized).not.toContain('Chest pain');
    expect(snapshot.operationalAlerts[0]).toMatchObject({
      title: 'Operational alert',
      message: 'Sensitive clinical details hidden for public display.',
    });
  });

  it('redacts identifiers for read-only whiteboard minimal monitor privacy', () => {
    const snapshot = buildCareDroidCentralNodeSnapshot(
      {
        ...source(),
        emergencySettings: {
          ...source().emergencySettings,
          wallDisplayMonitorPrivacy: 'minimal',
        },
      },
      {
        role: 'read_only_viewer',
        roleLabel: 'Read-Only Viewer',
        readOnly: true,
        allowedRoutes: ['/emergency/whiteboard'],
      },
      { screenMode: CARE_DROID_SCREEN_MODES.readOnlyWhiteboard },
    );
    const serialized = JSON.stringify(snapshot);

    expect(snapshot.screenContext.sensitiveDataRedacted).toBe(true);
    expect(serialized).not.toContain('Avery');
    expect(serialized).not.toContain('Chest pain');
  });
});
