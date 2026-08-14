import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EMERGENCY_ACTIONS, EMERGENCY_ROLE_IDS } from '../config/emergencyRolePermissions';
import { useEmergencyStore } from '../store/emergencyStore';
import { PatientFlag, PatientState, Priority } from '../types/emergency';

const createSmartIntakePatient = vi.fn();
const capabilityEnabled = vi.fn((_capability?: string) => true);

vi.mock('../config/backendApiCapabilities', () => ({
  isBackendCapabilityEnabled: (capability: string) => capabilityEnabled(capability),
}));

vi.mock('./emergencyOsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./emergencyOsApi')>();
  return {
    ...actual,
    createSmartIntakePatient: (...args: unknown[]) => createSmartIntakePatient(...args),
  };
});

const {
  assertReceptionMutationAllowed,
  applyExtractedFieldsToReceptionDraft,
  createPatientAndRouteFromReception,
  mapQuickIntakeInputToDraft,
  resolveUnifiedIntakePrimaryAction,
  routeQuickIntakeThroughOrchestrator,
  runReceptionAiIntakeAssist,
  syncReceptionPatientToBackend,
} = await import('./receptionIntakeOrchestrator');

import type { ReceptionIntakeDraft } from './receptionIntakeOrchestrator';

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
    vi.clearAllMocks();
    capabilityEnabled.mockReturnValue(true);
    createSmartIntakePatient.mockImplementation(async (patient: { id?: string }) => ({
      module: 'Smart Intake',
      data: { patient: { id: patient?.id || 'backend-patient-1' } },
    }));
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
    expect(result.backendSyncStatus).toBe('synced');
    expect(result.duplicateCandidates).toEqual(expect.any(Array));
    expect(createSmartIntakePatient).toHaveBeenCalled();
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
    expect(result.backendSyncStatus).toBe('synced');
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

  describe('structured allergies/medications population (HEAL-188)', () => {
    it('splits reported allergies and medications into arrays when known', async () => {
      const result = await createPatientAndRouteFromReception(
        baseDraft({
          allergiesKnown: 'yes',
          allergies: 'Penicillin, Latex ; Shellfish',
          medicationsKnown: 'yes',
          medications: 'Metformin, Lisinopril',
        }),
        { actorName: 'Reception Clerk', now: '2026-08-12T12:00:00.000Z' },
      );

      const patient = useEmergencyStore.getState().patients.find((entry) => entry.id === result.patientId);
      expect(patient?.allergies).toEqual(['Penicillin', 'Latex', 'Shellfish']);
      expect(patient?.medications).toEqual(['Metformin', 'Lisinopril']);
    });

    it('leaves allergies/medications empty when status is "no" even if free text is stray', async () => {
      const result = await createPatientAndRouteFromReception(
        baseDraft({
          allergiesKnown: 'no',
          allergies: 'should not appear',
          medicationsKnown: 'no',
          medications: 'should not appear either',
        }),
        { actorName: 'Reception Clerk', now: '2026-08-12T12:05:00.000Z' },
      );

      const patient = useEmergencyStore.getState().patients.find((entry) => entry.id === result.patientId);
      expect(patient?.allergies).toEqual([]);
      expect(patient?.medications).toEqual([]);
    });

    it('leaves allergies/medications empty when status is left unknown', async () => {
      const result = await createPatientAndRouteFromReception(baseDraft(), {
        actorName: 'Reception Clerk',
        now: '2026-08-12T12:10:00.000Z',
      });

      const patient = useEmergencyStore.getState().patients.find((entry) => entry.id === result.patientId);
      expect(patient?.allergies).toEqual([]);
      expect(patient?.medications).toEqual([]);
    });
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

  describe('runReceptionAiIntakeAssist confidence (HEAL-176)', () => {
    // Previously a flat `0.72 + redFlags.length * 0.04`: a completely blank
    // intake showed the same 72% floor as a fully-documented one, and the
    // number barely moved since it ignored every other field this function
    // already computes. Now also factors in missingCriticalFields so an
    // intake with real gaps reads lower, and a complete one reads higher,
    // independent of red-flag matches.
    it('gives a low confidence to a near-empty draft with several missing critical fields', () => {
      const assist = runReceptionAiIntakeAssist(
        baseDraft({
          chiefComplaint: '',
          consciousnessStatus: 'unknown',
          breathingStatus: 'unknown',
          visibleDistress: 'unknown',
          painLevel: '',
          estimatedAge: '',
          dob: '',
        }),
      );

      expect(assist.missingCriticalFields.length).toBeGreaterThan(0);
      expect(assist.confidence).toBeLessThan(0.6);
      expect(assist.confidence).toBeGreaterThanOrEqual(0.35);
    });

    it('gives a moderate confidence to a fully-documented but low-risk draft', () => {
      // baseDraft() has a non-empty complaint, no unknown/empty safety fields,
      // and zero red-flag matches -- standard mode, zero missing fields.
      const assist = runReceptionAiIntakeAssist(baseDraft());

      expect(assist.missingCriticalFields).toHaveLength(0);
      expect(assist.redFlags).toHaveLength(0);
      expect(assist.confidence).toBeCloseTo(0.6, 5);
    });

    it('raises confidence for each matched red flag, independent of the completeness penalty', () => {
      const noFlags = runReceptionAiIntakeAssist(baseDraft());
      const oneFlag = runReceptionAiIntakeAssist(
        baseDraft({ chiefComplaint: 'Chest pain radiating to left arm', redFlagSymptoms: ['Chest pain'] }),
      );

      expect(oneFlag.redFlags.length).toBeGreaterThanOrEqual(1);
      expect(oneFlag.confidence).toBeGreaterThan(noFlags.confidence);
    });

    it('never exceeds 0.94 or drops below 0.35, and reports the 0.42 manual-fallback value unmodified when AI is unavailable', () => {
      const heavy = runReceptionAiIntakeAssist(
        baseDraft({
          chiefComplaint: 'Unconscious, not breathing, seizure, severe bleeding',
          consciousnessStatus: 'unresponsive',
          breathingStatus: 'not-breathing',
        }),
      );
      expect(heavy.confidence).toBeLessThanOrEqual(0.94);

      const empty = runReceptionAiIntakeAssist(
        baseDraft({
          chiefComplaint: '',
          consciousnessStatus: 'unknown',
          breathingStatus: 'unknown',
          visibleDistress: 'unknown',
          painLevel: '',
          estimatedAge: '',
          dob: '',
        }),
      );
      expect(empty.confidence).toBeGreaterThanOrEqual(0.35);

      const unavailable = runReceptionAiIntakeAssist(baseDraft(), { aiUnavailable: true });
      expect(unavailable.confidence).toBe(0.42);
    });
  });

  it('still routes locally when backend create fails and reports sync failure', async () => {
    createSmartIntakePatient.mockRejectedValueOnce(new Error('Network down'));
    const result = await createPatientAndRouteFromReception(baseDraft(), {
      actorName: 'Reception Clerk',
      now: '2026-06-29T12:20:00.000Z',
    });
    expect(result.patientId).toBeTruthy();
    expect(result.backendSyncStatus).toBe('failed');
    expect(result.backendSyncError).toBeTruthy();
    expect(useEmergencyStore.getState().patients).toHaveLength(1);
    expect(useEmergencyStore.getState().patients[0].state).toBe(PatientState.Triage);
  });

  it('skips backend sync when intake capabilities are disabled', async () => {
    capabilityEnabled.mockReturnValue(false);
    const result = await createPatientAndRouteFromReception(baseDraft(), {
      actorName: 'Reception Clerk',
      now: '2026-06-29T12:25:00.000Z',
    });
    expect(result.backendSyncStatus).toBe('skipped');
    expect(createSmartIntakePatient).not.toHaveBeenCalled();
  });

  it('syncReceptionPatientToBackend returns synced on successful create envelope', async () => {
    const sync = await syncReceptionPatientToBackend({
      id: 'patient-local-1',
      firstName: 'A',
      lastName: 'B',
    } as any);
    expect(sync.status).toBe('synced');
    expect(sync.backendPatientId).toBe('patient-local-1');
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

  it('maps compact quick intake into a routable draft with inferred critical defaults', () => {
    const draft = mapQuickIntakeInputToDraft({
      firstName: 'Alex',
      lastName: 'Rivera',
      complaint: 'Chest pain with shortness of breath',
      arrivalMode: 'walk-in',
      quickSafetyFlags: [PatientFlag.HighRisk],
    });
    expect(draft.chiefComplaint).toContain('Chest pain');
    expect(draft.consciousnessStatus).not.toBe('unknown');
    expect(draft.breathingStatus).not.toBe('unknown');
    expect(draft.painLevel).toBeGreaterThanOrEqual(2);
  });

  it('merges OCR-extracted identity fields into the reception draft without overwriting complaint', () => {
    const merged = applyExtractedFieldsToReceptionDraft(baseDraft({ chiefComplaint: 'Abdominal pain' }), [
      { field: 'firstName', value: 'Jordan', status: 'accepted' },
      { field: 'lastName', value: 'Lee', status: 'accepted' },
      { field: 'dateOfBirth', value: '1990-04-12', status: 'accepted' },
      { field: 'sex', value: 'F', status: 'accepted' },
      { field: 'phone', value: '555-9999', status: 'edited', editedValue: '555-1111' },
      { field: 'healthCardNumber', value: 'HC-123', status: 'accepted' },
    ]);
    expect(merged.chiefComplaint).toBe('Abdominal pain');
    expect(merged.firstName).toBe('Jordan');
    expect(merged.lastName).toBe('Lee');
    expect(merged.dob).toBe('1990-04-12');
    expect(merged.contactCallback).toBe('555-1111');
    expect(merged.documentStatus).toBe('captured');
  });

  it('routes quick intake through the same orchestrator path as reception command desk', async () => {
    const result = await routeQuickIntakeThroughOrchestrator(
      {
        firstName: 'Sam',
        lastName: 'Lee',
        complaint: 'Feeling faint',
        arrivalMode: 'walk-in',
      },
      { actorName: 'Reception Clerk', now: '2026-06-29T12:30:00.000Z' },
    );
    expect(result.patientId).toBeTruthy();
    expect(result.backendSyncStatus).toBe('synced');
    expect(useEmergencyStore.getState().patients.some((entry) => entry.id === result.patientId)).toBe(true);
  });

  it('resolves a single primary action label for critical arrivals', () => {
    const action = resolveUnifiedIntakePrimaryAction(
      baseDraft({ chiefComplaint: 'Not breathing', breathingStatus: 'not-breathing', painLevel: 10 }),
      runReceptionAiIntakeAssist(
        baseDraft({ chiefComplaint: 'Not breathing', breathingStatus: 'not-breathing', painLevel: 10 }),
      ),
    );
    expect(action.startsThreeMinuteResponse).toBe(true);
    expect(action.label).toContain('3-minute');
  });

  it('labels standard create action as create-and-route to triage', () => {
    const action = resolveUnifiedIntakePrimaryAction(baseDraft(), null);
    expect(action.label.toLowerCase()).toContain('create');
    expect(action.label.toLowerCase()).toContain('triage');
  });

  it('uses crash validation mode so incomplete safety fields do not block critical route', async () => {
    const { resolveReceptionRouteValidationMode, validateReceptionMinimumCriticalData } =
      await import('./receptionIntakeOrchestrator');
    const draft = baseDraft({
      chiefComplaint: 'Not breathing',
      breathingStatus: 'not-breathing',
      consciousnessStatus: 'unknown',
      painLevel: '',
      visibleDistress: 'unknown',
    });
    const mode = resolveReceptionRouteValidationMode(draft);
    expect(mode).toBe('crash');
    expect(validateReceptionMinimumCriticalData(draft, 'crash')).toEqual([]);
    expect(validateReceptionMinimumCriticalData(draft, 'standard').length).toBeGreaterThan(0);
  });

  describe('detectReceptionRedFlags — canonical high-risk registry merge (2026-08-08 regression)', () => {
    // detectReceptionRedFlags previously matched complaint text ONLY against this
    // file's own local HIGH_RISK_TERMS list (18 plain-substring terms) — a materially
    // weaker, independently-maintained duplicate of highRiskComplaintFlags.ts's
    // canonical, regex-based registry (used by the whiteboard, notification center,
    // quick intake, ambulance handoff checklist, and arrival control layer). A patient
    // typed into the Reception Command Desk's real chief-complaint field as "SOB" got
    // NO red flag and NO priority bump, even though "sob" is a recognized
    // shortness-of-breath synonym everywhere else in the app.

    it('recognizes "SOB" as a red flag (previously matched nothing — HIGH_RISK_TERMS has no "sob" entry)', async () => {
      const { detectReceptionRedFlags } = await import('./receptionIntakeOrchestrator');
      const flags = detectReceptionRedFlags(baseDraft({ chiefComplaint: 'SOB' }));
      expect(flags).toContain('Shortness of breath');
    });

    it('still recognizes "Seizure" and "Unconscious" — categories only in the local list, not the canonical registry', async () => {
      const { detectReceptionRedFlags } = await import('./receptionIntakeOrchestrator');
      expect(detectReceptionRedFlags(baseDraft({ chiefComplaint: 'Seizure witnessed' }))).toContain('Seizure');
      expect(detectReceptionRedFlags(baseDraft({ chiefComplaint: 'Found unconscious' }))).toContain('Unconscious');
    });

    it('picks up canonical-registry-only synonyms (stroke FAST-positive, anaphylaxis epipen) the local list never had', async () => {
      const { detectReceptionRedFlags } = await import('./receptionIntakeOrchestrator');
      expect(detectReceptionRedFlags(baseDraft({ chiefComplaint: 'facial droop, slurred speech' }))).toContain(
        'Stroke symptoms',
      );
      expect(detectReceptionRedFlags(baseDraft({ chiefComplaint: 'used epipen for allergic reaction' }))).toContain(
        'Anaphylaxis concern',
      );
    });

    it('bumps suggested priority to P2 for a SOB-only complaint via runReceptionAiIntakeAssist (previously fell through to P3/standard)', async () => {
      const draft = baseDraft({
        chiefComplaint: 'SOB',
        breathingStatus: 'unknown',
        consciousnessStatus: 'unknown',
        visibleDistress: 'unknown',
        painLevel: '',
      });
      const assist = runReceptionAiIntakeAssist(draft);
      expect(assist.redFlags).toContain('Shortness of breath');
      expect(assist.urgencySuggestion).not.toBe('standard');
    });
  });
});
