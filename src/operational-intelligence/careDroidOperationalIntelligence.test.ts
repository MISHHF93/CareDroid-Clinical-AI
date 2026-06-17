import { describe, expect, it } from 'vitest';
import { buildCareDroidCentralNodeSnapshot } from '../central-node/careDroidCentralNode';
import { buildCareDroidOperationalIntelligenceSnapshot } from './careDroidOperationalIntelligence';
import {
  CARE_DROID_OPERATIONAL_INTELLIGENCE_LAYER,
  DEFAULT_OPERATIONAL_INTELLIGENCE_SETTINGS,
} from './operationalIntelligence.types';

const baseSource = {
  patients: [],
  capacity: {
    score: 72,
    band: 'Orange',
    totalPatients: 0,
    occupiedRooms: 0,
    boardingCount: 0,
    reassessmentDue: 0,
    updatedAt: new Date().toISOString(),
  },
  alerts: [],
  emsArrivals: [],
  emsIncomingPatients: [],
  emsUnits: [],
  referrals: [],
  workflowLogs: [],
  emergencySettings: {
    tenantName: 'Test ED',
    defaultScreenMode: 'COMMAND_CENTER_DISPLAY',
    enabledScreenModes: ['COMMAND_CENTER_DISPLAY'],
    readOnlyDisplayMode: false,
    commandCenterMode: true,
    wallDisplayRefreshInterval: 30000,
    aiSettings: { enabled: true, humanReviewRequired: true },
  },
  websocket: {
    status: 'connected',
    mode: 'polling',
    lastSyncedAt: new Date().toISOString(),
    message: 'ok',
  },
  copilotMessages: [],
  integrationEvents: [],
  selectedPatientId: null,
  activeQueueFilter: null,
  whiteboardSearchQuery: '',
  loading: false,
  backendAvailable: true,
} as const;

describe('CareDroidOperationalIntelligence', () => {
  it('builds an advisory snapshot linked to central node', () => {
    const centralSnapshot = buildCareDroidCentralNodeSnapshot(
      baseSource,
      {
        role: 'charge_nurse',
        roleLabel: 'Charge Nurse',
        readOnly: false,
        allowedRoutes: ['/emergency/whiteboard'],
      },
      { screenMode: 'COMMAND_CENTER_DISPLAY', source: 'store' },
    );

    const snapshot = buildCareDroidOperationalIntelligenceSnapshot({
      centralSnapshot,
      settings: DEFAULT_OPERATIONAL_INTELLIGENCE_SETTINGS,
      tenantId: 'Test ED',
      workflowLogs: [],
    });

    expect(snapshot.layer).toBe(CARE_DROID_OPERATIONAL_INTELLIGENCE_LAYER);
    expect(snapshot.enabled).toBe(true);
    expect(snapshot.centralNodeLinked).toBe(true);
    expect(snapshot.recommendations.every((rec) => rec.humanReviewRequired)).toBe(true);
    expect(snapshot.blockedAutonomousActions).toContain('diagnose');
    expect(snapshot.disclaimers.operational).toMatch(/advisory/i);
  });
});
