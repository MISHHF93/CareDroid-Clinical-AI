import { beforeEach, describe, expect, it } from 'vitest';
import { EMERGENCY_ACTIONS, EMERGENCY_ROLE_IDS } from '../config/emergencyRolePermissions';
import { useEmergencyStore } from '../store/emergencyStore';
import { PatientFlag, PatientState, Priority } from '../types/emergency';
import {
  assertReceptionMutationAllowed,
  createPatientAndRouteFromReception,
  runReceptionAiIntakeAssist,
  type ReceptionIntakeDraft,
} from './receptionIntakeOrchestrator';

const originalState = useEmergencyStore.getState();

function resetStore() {
  useEmergencyStore.setState(
    {
      ...originalState,
      patients: [],
      alerts: [],
      workflowLogs: [],
      emsArrivals: [],
      referrals: [],
      selectedPatientId: null,
      activeQueueFilter: null,
    },
    true,
  );
}

function baseDraft(patch: Partial<ReceptionIntakeDraft> = {}): ReceptionIntakeDraft {
  return {
    arrivalType: 'walk-in',
    chiefComplaint: 'Cough',
    estimatedAge: 42,
    dob: '',
    sex: 'F',
    consciousnessStatus: 'alert',
    breathingStatus: 'normal',
    visibleDistress: 'none',
    painLevel: 2,
    redFlagSymptoms: [],
    allergiesKnown: 'unknown',
    medicationsKnown: 'unknown',
    insuranceStatus: 'unknown',
    consentStatus: 'unknown',
    documentStatus: 'unknown',
    firstName: 'Test',
    lastName: 'Patient',
    contactCallback: '555-0101',
    ...patch,
  };
}

describe('receptionIntakeOrchestrator', () => {
  beforeEach(() => {
    resetStore();
  });

  it('routes walk-in chest pain as a critical reception arrival with a 3-minute timer', async () => {
    const result = await createPatientAndRouteFromReception(
      baseDraft({
        chiefComplaint: 'Chest pain radiating to left arm',
        painLevel: 9,
        redFlagSymptoms: ['Chest pain'],
      }),
      { actorName: 'Reception Clerk', now: '2026-06-29T12:00:00.000Z' },
    );

    const state = useEmergencyStore.getState();
    const patient = state.patients.find((entry) => entry.id === result.patientId);
    expect(patient?.state).toBe(PatientState.Triage);
    expect(patient?.priority).toBe(Priority.P1);
    expect(patient?.flags).toContain(PatientFlag.HighRisk);
    expect(result.criticalAlertId).toBeTruthy();
    expect(result.responseTimerId).toBeTruthy();
    expect(state.alerts.some((alert) => alert.source === 'reception-critical-intake')).toBe(true);
  });

  it('routes minor cough without creating a critical alert', async () => {
    const result = await createPatientAndRouteFromReception(baseDraft(), {
      actorName: 'Reception Clerk',
      now: '2026-06-29T12:05:00.000Z',
    });

    const state = useEmergencyStore.getState();
    const patient = state.patients.find((entry) => entry.id === result.patientId);
    expect(patient?.priority).toBe(Priority.P3);
    expect(patient?.state).toBe(PatientState.Triage);
    expect(result.criticalAlertId).toBeUndefined();
    expect(state.alerts.some((alert) => alert.source === 'reception-critical-intake')).toBe(false);
  });

  it('allows unknown identity and missing insurance when critical care cannot wait', async () => {
    const result = await createPatientAndRouteFromReception(
      baseDraft({
        chiefComplaint: 'Unconscious patient at entrance',
        firstName: '',
        lastName: '',
        estimatedAge: '',
        consciousnessStatus: 'unresponsive',
        breathingStatus: 'labored',
        visibleDistress: 'severe',
        insuranceStatus: 'missing',
        documentStatus: 'missing',
      }),
      { actorName: 'Reception Clerk', now: '2026-06-29T12:10:00.000Z' },
    );

    const patient = useEmergencyStore.getState().patients.find((entry) => entry.id === result.patientId);
    expect(patient?.firstName).toBe('Unknown');
    expect(patient?.registrationStatus).toBe('provisional');
    expect(patient?.flags).toContain(PatientFlag.IdentityPending);
    expect(result.criticalAlertId).toBeTruthy();
  });

  it('keeps manual routing available when AI is unavailable', async () => {
    const assist = runReceptionAiIntakeAssist(baseDraft(), { aiUnavailable: true });
    expect(assist.manualFallback).toBe(true);

    const result = await createPatientAndRouteFromReception(baseDraft(), {
      actorName: 'Reception Clerk',
      aiUnavailable: true,
      now: '2026-06-29T12:15:00.000Z',
    });
    expect(result.aiAssist.manualFallback).toBe(true);
    expect(useEmergencyStore.getState().patients).toHaveLength(1);
  });

  it('blocks reception clinical override attempts', () => {
    expect(
      assertReceptionMutationAllowed(EMERGENCY_ROLE_IDS.registrationClerk, EMERGENCY_ACTIONS.triage),
    ).toEqual(
      expect.objectContaining({
        allowed: false,
      }),
    );
  });
});

