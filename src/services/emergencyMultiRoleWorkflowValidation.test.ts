import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type CapacitySnapshot, type Patient } from '../types/emergency';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { CARE_DROID_SCREEN_MODES } from '../config/careDroidScreenModes';
import {
  EMERGENCY_ROLE_ID,
  resolveEmergencyScreenMode,
} from '../config/emergencyRoleScreenMatrix';
import {
  buildScreenModeKpiSnapshot,
  resolveChargeNurseStripMetricIds,
  resolveCommandCenterMetricIds,
  resolvePublicWaitingKpiWidgets,
  resolveReceptionStripMetricIds,
  resolveScreenModeKpiIds,
  resolveTriageStripMetricIds,
} from '../config/emergencyScreenKpiPolicy';
import { resolveOperationalPresentation } from '../config/emergencyOperationalPresentationModel';
import { selectReceptionQueues } from '../components/reception/receptionQueueModel';
import { selectReceptionOperationalStripMetrics } from '../components/reception/receptionQueueModel';
import { selectTriageOperationalStripMetrics } from '../components/triage/triageWorkflowModel';
import {
  selectChargeNurseOperationalStrip,
  shouldShowChargeNurseOperationalStrip,
} from '../components/whiteboard/chargeNurseWorkflowModel';
import {
  selectPhysicianOperationalStrip,
  shouldShowPhysicianOperationalStrip,
} from '../components/whiteboard/physicianWorkflowModel';
import {
  matchesWhiteboardQueueFilter,
  WHITEBOARD_QUEUE_FILTER,
} from './queueAssignment';
import { resolvePatientExperienceStatus } from './patientExperienceStatus';
import { resolvePatientWaitingRoomMessage } from './waitingRoomStatusMessaging';
import { assertWaitingRoomMessagingIsPhiSafe } from './waitingRoomStatusMessaging';
import { buildPublicWaitingDisplaySnapshot } from '../components/whiteboard/publicWaitingDisplayModel';
import { buildCommandCenterThroughputSnapshot } from '../components/whiteboard/commandCenterThroughputModel';
import { isPublicDisplayScreenMode } from '../config/emergencyRoleScreenMatrix';

const NOW = new Date('2026-06-20T10:00:00.000Z');

function buildPatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-arrival-1',
    mrn: 'MRN-SECRET-001',
    firstName: 'Jordan',
    lastName: 'Lee',
    dob: '1992-04-12',
    age: 33,
    sex: 'F',
    arrivalTime: '2026-06-20T09:30:00.000Z',
    chiefComplaint: 'Chest pressure',
    complaintCategory: 'Cardiac',
    state: PatientState.Registration,
    priority: Priority.P3,
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

function buildCapacity(overrides: Partial<CapacitySnapshot> = {}): CapacitySnapshot {
  return {
    score: 72,
    band: 'Yellow',
    updatedAt: NOW.toISOString(),
    totalPatients: 6,
    occupiedRooms: 16,
    boardingCount: 1,
    reassessmentDue: 0,
    waitingCount: 2,
    averageWaitMinutes: 55,
    longestWaitMinutes: 95,
    ...overrides,
  };
}

describe('emergencyMultiRoleWorkflowValidation', () => {
  it('resolves role-to-screen mappings across the ED workflow personas', () => {
    expect(
      resolveEmergencyScreenMode({
        pathname: CANONICAL_ROUTES.emergencyReception,
        role: EMERGENCY_ROLE_ID.registrationClerk,
      }),
    ).toBe(CARE_DROID_SCREEN_MODES.reception);
    expect(
      resolveEmergencyScreenMode({
        pathname: CANONICAL_ROUTES.emergencyReception,
        role: EMERGENCY_ROLE_ID.triageNurse,
        queueParam: 'pretriage',
      }),
    ).toBe(CARE_DROID_SCREEN_MODES.triage);
    expect(
      resolveEmergencyScreenMode({
        pathname: CANONICAL_ROUTES.emergencyWhiteboard,
        role: EMERGENCY_ROLE_ID.chargeNurse,
      }),
    ).toBe(CARE_DROID_SCREEN_MODES.chargeNurse);
    expect(
      resolveEmergencyScreenMode({
        pathname: CANONICAL_ROUTES.emergencyWhiteboard,
        role: EMERGENCY_ROLE_ID.physician,
      }),
    ).toBe(CARE_DROID_SCREEN_MODES.physician);
    expect(
      resolveEmergencyScreenMode({
        pathname: CANONICAL_ROUTES.emergencyAnalytics,
        role: EMERGENCY_ROLE_ID.edManager,
      }),
    ).toBe(CARE_DROID_SCREEN_MODES.commandCenter);
    expect(
      resolveEmergencyScreenMode({
        displayParam: 'waiting-room',
        role: EMERGENCY_ROLE_ID.readOnlyViewer,
      }),
    ).toBe(CARE_DROID_SCREEN_MODES.publicWaiting);
  });

  it('walks patient arrival through reception → triage → whiteboard with role-specific payloads', () => {
    const registered = buildPatient({ state: PatientState.Registration });
    const receptionQueues = selectReceptionQueues([registered]);
    expect(receptionQueues.counts.awaitingVerification).toBe(1);
    expect(receptionQueues.counts.awaitingTriage).toBe(0);
    expect(resolvePatientExperienceStatus(registered).id).toBe('registered');
    expect(resolveOperationalPresentation(CARE_DROID_SCREEN_MODES.reception).emphasis).toBe('speed');

    const receptionMetrics = selectReceptionOperationalStripMetrics([registered], 0, {
      metricIds: resolveReceptionStripMetricIds(CARE_DROID_SCREEN_MODES.reception) || [],
    });
    expect(receptionMetrics.some((metric) => metric.id === 'awaiting-triage')).toBe(true);

    const triageQueued = buildPatient({
      state: PatientState.Triage,
    });
    const triageQueues = selectReceptionQueues([triageQueued]);
    expect(triageQueues.counts.awaitingTriage).toBe(1);
    expect(resolvePatientExperienceStatus(triageQueued).id).toBe('waiting-for-triage');
    expect(resolvePatientWaitingRoomMessage(triageQueued)).toBe('Waiting for triage');

    const triageMetrics = selectTriageOperationalStripMetrics([triageQueued], [], {
      metricIds: resolveTriageStripMetricIds(CARE_DROID_SCREEN_MODES.triage) || [],
      now: NOW,
    });
    expect(triageMetrics.find((metric) => metric.id === 'triage-pending')?.value).toBe(1);
    expect(resolveOperationalPresentation(CARE_DROID_SCREEN_MODES.triage).emphasis).toBe('assessment');

    expect(matchesWhiteboardQueueFilter(triageQueued, WHITEBOARD_QUEUE_FILTER.triage)).toBe(true);

    const waiting = buildPatient({
      state: PatientState.Waiting,
      priority: Priority.P3,
      triageTime: '2026-06-20T09:50:00.000Z',
      assignedStaffId: 'physician-1',
    });
    expect(matchesWhiteboardQueueFilter(waiting, WHITEBOARD_QUEUE_FILTER.waiting)).toBe(true);
    expect(resolvePatientExperienceStatus(waiting).id).toBe('waiting-for-clinician');
    expect(resolvePatientWaitingRoomMessage(waiting)).toBe('Waiting for clinician');

    const chargeMetrics = selectChargeNurseOperationalStrip({
      patients: [waiting, triageQueued],
      settings: {},
      kpiMetricIds: resolveChargeNurseStripMetricIds(CARE_DROID_SCREEN_MODES.chargeNurse),
      now: NOW,
    });
    expect(chargeMetrics.some((metric) => metric.id === 'waiting-count')).toBe(true);
    expect(
      shouldShowChargeNurseOperationalStrip({
        screenMode: CARE_DROID_SCREEN_MODES.chargeNurse,
        roleId: EMERGENCY_ROLE_ID.chargeNurse,
      }),
    ).toBe(true);
    expect(resolveOperationalPresentation(CARE_DROID_SCREEN_MODES.chargeNurse).emphasis).toBe('flow');

    const physicianMetrics = selectPhysicianOperationalStrip({
      patients: [waiting],
      physicianStaffId: 'physician-1',
      now: NOW,
    });
    expect(physicianMetrics.find((metric) => metric.id === 'provider-awaiting')?.value).toBeGreaterThan(0);
    expect(
      shouldShowPhysicianOperationalStrip({
        screenMode: CARE_DROID_SCREEN_MODES.physician,
        roleId: EMERGENCY_ROLE_ID.physician,
      }),
    ).toBe(true);
    expect(resolveOperationalPresentation(CARE_DROID_SCREEN_MODES.physician).emphasis).toBe('patient');
  });

  it('surfaces throughput metrics for the department manager and PHI-safe public messaging', () => {
    const patients = [
      buildPatient({ id: 'w1', state: PatientState.Waiting }),
      buildPatient({
        id: 'w2',
        state: PatientState.Waiting,
        arrivalTime: '2026-06-20T08:00:00.000Z',
      }),
      buildPatient({ id: 't1', state: PatientState.Triage }),
    ];
    const capacity = buildCapacity({ band: 'Orange', waitingCount: 2 });

    const managerKpis = buildScreenModeKpiSnapshot({
      screenMode: CARE_DROID_SCREEN_MODES.commandCenter,
      patients,
      emsInbound: 1,
      emsArrivals: [],
      capacity,
      settings: {},
      operationalMetrics: [],
      now: NOW,
    });
    expect(managerKpis.kpiIds).toEqual(
      resolveScreenModeKpiIds(CARE_DROID_SCREEN_MODES.commandCenter),
    );
    expect(resolveCommandCenterMetricIds(CARE_DROID_SCREEN_MODES.commandCenter)?.length).toBeGreaterThan(
      0,
    );
    expect(managerKpis.kpis.length).toBeGreaterThan(0);
    expect(resolveOperationalPresentation(CARE_DROID_SCREEN_MODES.commandCenter).emphasis).toBe(
      'throughput',
    );

    const throughputSnapshot = buildCommandCenterThroughputSnapshot({
      now: NOW,
      patients,
      capacity,
      referrals: [],
      emsArrivals: [],
    });
    expect(throughputSnapshot.metrics.length).toBeGreaterThan(0);

    const publicSnapshot = buildPublicWaitingDisplaySnapshot({
      now: NOW,
      updatedAt: NOW.toISOString(),
      patients,
      capacity,
    });
    const serialized = JSON.stringify(publicSnapshot);
    expect(serialized).not.toContain('Jordan');
    expect(serialized).not.toContain('Lee');
    expect(serialized).not.toContain('MRN-SECRET');
    expect(serialized).not.toContain('Chest pressure');
    expect(assertWaitingRoomMessagingIsPhiSafe(publicSnapshot.statusMessaging)).toBe(true);
    expect(publicSnapshot.statusMessaging.statusLines.length).toBeGreaterThan(0);
    expect(publicSnapshot.statusMessaging.advisories.some((line) => line.id === 'symptom-escalation')).toBe(
      true,
    );
    expect(resolvePublicWaitingKpiWidgets(CARE_DROID_SCREEN_MODES.publicWaiting)?.length).toBeGreaterThan(
      0,
    );
    expect(isPublicDisplayScreenMode(CARE_DROID_SCREEN_MODES.publicWaiting)).toBe(true);
    expect(resolveOperationalPresentation(CARE_DROID_SCREEN_MODES.publicWaiting).emphasis).toBe(
      'reassuring',
    );
  });
});
