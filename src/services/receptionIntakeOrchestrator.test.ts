import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  generateCollisionSafeReceptionMrn,
  mapQuickIntakeInputToDraft,
  resolveUnifiedIntakePrimaryAction,
  routeQuickIntakeThroughOrchestrator,
  runReceptionAiIntakeAssist,
  syncReceptionPatientToBackend,
  flushReceptionIntakeBackgroundWork,
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
  // createPatientAndRouteFromReception starts two fire-and-forget handoffs that
  // dynamically import the journey orchestrator and the automation engine. Without
  // waiting for them, this file ended while those graphs were still loading and the
  // torn-down environment produced 85 EnvironmentTeardownErrors -- every test passed
  // and the run still exited 1.
  afterEach(async () => {
    await flushReceptionIntakeBackgroundWork();
    // The automation refresh is debounced 1.5s out, well past the end of these
    // tests; left armed it fires against a torn-down module graph.
    // emergencyCareJourneyOrchestrator starts its own untracked fire-and-forget
    // import of the engine, so the debounce can be re-armed after the flush
    // above drains. Let the macrotask queue turn over first, then cancel.
    await new Promise((resolve) => setTimeout(resolve, 0));
    const { cancelWorkflowAutomationRefresh } =
      await import('../engine/unifiedWorkflowAutomationEngine');
    cancelWorkflowAutomationRefresh();
  });

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

    const patient = useEmergencyStore
      .getState()
      .patients.find((entry) => entry.id === result.patientId);
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

      const patient = useEmergencyStore
        .getState()
        .patients.find((entry) => entry.id === result.patientId);
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

      const patient = useEmergencyStore
        .getState()
        .patients.find((entry) => entry.id === result.patientId);
      expect(patient?.allergies).toEqual([]);
      expect(patient?.medications).toEqual([]);
    });

    it('leaves allergies/medications empty when status is left unknown', async () => {
      const result = await createPatientAndRouteFromReception(baseDraft(), {
        actorName: 'Reception Clerk',
        now: '2026-08-12T12:10:00.000Z',
      });

      const patient = useEmergencyStore
        .getState()
        .patients.find((entry) => entry.id === result.patientId);
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
        baseDraft({
          chiefComplaint: 'Chest pain radiating to left arm',
          redFlagSymptoms: ['Chest pain'],
        }),
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
    // A generic sync failure (network down, no HTTP status) must NOT be
    // mistaken for a backend-detected duplicate -- see the dedicated
    // duplicate-flagging test below.
    expect(useEmergencyStore.getState().patients[0].flags).not.toContain(
      PatientFlag.PossibleDuplicate,
    );
  });

  it('HEAL follow-up: flags the local record as a possible duplicate, distinctly from a generic sync failure, when the backend duplicate guard blocks the create sync', async () => {
    // Mirrors the shape requestEmergencyJson (emergencyOsApi.ts) attaches to a
    // thrown error for a non-2xx response: the real HTTP status from
    // SmartIntakeService.guardAgainstUnconfirmedDuplicate's 409 ConflictException.
    const duplicateBlockedError: any = new Error(
      'Possible duplicate patient detected. Review the candidates and resubmit with confirmDuplicateOverride to proceed.',
    );
    duplicateBlockedError.status = 409;
    createSmartIntakePatient.mockRejectedValueOnce(duplicateBlockedError);

    const result = await createPatientAndRouteFromReception(baseDraft(), {
      actorName: 'Reception Clerk',
      now: '2026-06-29T12:22:00.000Z',
    });

    expect(result.backendSyncStatus).toBe('failed');
    // The local record was already added to the board (local-first create) --
    // this proves it's still there, now visibly flagged rather than silently
    // left as a duplicate-looking, un-reviewed card.
    expect(useEmergencyStore.getState().patients).toHaveLength(1);
    const localPatient = useEmergencyStore.getState().patients[0];
    expect(localPatient.flags).toContain(PatientFlag.PossibleDuplicate);
    expect(localPatient).toMatchObject({ handoffSyncPending: true });
    // Distinctly-flagged, not just handoffSyncPending: true looking like
    // every other transient sync failure -- the surfaced message names the
    // duplicate specifically, not the generic sync-failed copy.
    expect((localPatient as any).handoffSyncError).toMatch(/duplicate/i);
    expect((localPatient as any).handoffSyncError).toMatch(/reception review/i);
    // Same signal must also reach the caller's result, not just the store --
    // ReceptionWorkspace.tsx surfaces backendSyncError directly in its toast.
    expect(result.patient.flags).toContain(PatientFlag.PossibleDuplicate);
    expect(result.backendSyncError).toMatch(/duplicate/i);
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
      assertReceptionMutationAllowed(
        EMERGENCY_ROLE_IDS.registrationClerk,
        EMERGENCY_ACTIONS.triage,
      ),
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
    const merged = applyExtractedFieldsToReceptionDraft(
      baseDraft({ chiefComplaint: 'Abdominal pain' }),
      [
        { field: 'firstName', value: 'Jordan', status: 'accepted' },
        { field: 'lastName', value: 'Lee', status: 'accepted' },
        { field: 'dateOfBirth', value: '1990-04-12', status: 'accepted' },
        { field: 'sex', value: 'F', status: 'accepted' },
        { field: 'phone', value: '555-9999', status: 'edited', editedValue: '555-1111' },
        { field: 'healthCardNumber', value: 'HC-123', status: 'accepted' },
      ],
    );
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
    expect(
      useEmergencyStore.getState().patients.some((entry) => entry.id === result.patientId),
    ).toBe(true);
  });

  it('resolves a single primary action label for critical arrivals', () => {
    const action = resolveUnifiedIntakePrimaryAction(
      baseDraft({
        chiefComplaint: 'Not breathing',
        breathingStatus: 'not-breathing',
        painLevel: 10,
      }),
      runReceptionAiIntakeAssist(
        baseDraft({
          chiefComplaint: 'Not breathing',
          breathingStatus: 'not-breathing',
          painLevel: 10,
        }),
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
      expect(detectReceptionRedFlags(baseDraft({ chiefComplaint: 'Seizure witnessed' }))).toContain(
        'Seizure',
      );
      expect(detectReceptionRedFlags(baseDraft({ chiefComplaint: 'Found unconscious' }))).toContain(
        'Unconscious',
      );
    });

    it('picks up canonical-registry-only synonyms (stroke FAST-positive, anaphylaxis epipen) the local list never had', async () => {
      const { detectReceptionRedFlags } = await import('./receptionIntakeOrchestrator');
      expect(
        detectReceptionRedFlags(baseDraft({ chiefComplaint: 'facial droop, slurred speech' })),
      ).toContain('Stroke symptoms');
      expect(
        detectReceptionRedFlags(baseDraft({ chiefComplaint: 'used epipen for allergic reaction' })),
      ).toContain('Anaphylaxis concern');
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

  describe('generateCollisionSafeReceptionMrn (MRN collision safety, HEAL follow-up)', () => {
    // Exact Math.random() fraction that makes `ED-${Math.floor(100000 + Math.random() * 900000)}`
    // produce `ED-<sixDigitMrn>`.
    const randomFractionFor = (sixDigitMrn: number) => (sixDigitMrn - 100000) / 900000;

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('retries with a new MRN when the first randomly-generated candidate collides with an existing patient', () => {
      const existing = [{ mrn: 'ED-123456' }] as any;
      const randomSpy = vi
        .spyOn(Math, 'random')
        .mockReturnValueOnce(randomFractionFor(123456)) // 1st attempt collides
        .mockReturnValueOnce(randomFractionFor(654321)); // 2nd attempt is free

      const mrn = generateCollisionSafeReceptionMrn(existing);

      expect(randomSpy).toHaveBeenCalledTimes(2);
      expect(mrn).toBe('ED-654321');
    });

    it('falls back to a guaranteed-unique MRN after exhausting all retry attempts against a saturated board', () => {
      const existing = [{ mrn: 'ED-500000' }] as any;
      // Every attempt (all 5) collides with the one existing patient's MRN.
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(randomFractionFor(500000));

      const mrn = generateCollisionSafeReceptionMrn(existing);

      // 5 retry attempts + 1 more inside the timestamp-based fallback.
      expect(randomSpy).toHaveBeenCalledTimes(6);
      expect(mrn).not.toBe('ED-500000');
      expect(mrn).toMatch(/^ED-\d+-\d+$/);
    });

    it('confirms two patients can never end up with the same MRN across many auto-generated creates (real randomness)', () => {
      const existingPatients: Array<{ mrn: string }> = [];
      for (let i = 0; i < 100; i += 1) {
        existingPatients.push({ mrn: generateCollisionSafeReceptionMrn(existingPatients as any) });
      }
      const mrns = existingPatients.map((patient) => patient.mrn);
      expect(new Set(mrns).size).toBe(mrns.length);
      expect(mrns.every((mrn) => /^ED-\d{6}$/.test(mrn))).toBe(true);
    });

    it('integration: createPatientAndRouteFromReception never reuses an MRN already on the local board', async () => {
      const first = await createPatientAndRouteFromReception(baseDraft(), {
        actorName: 'Reception Clerk',
        now: '2026-06-29T12:40:00.000Z',
      });
      expect(first.patient.mrn).toMatch(/^ED-\d{6}$/);
      const collidingDigits = Number(first.patient.mrn.replace('ED-', ''));

      // Force the second create's MRN generation to always collide with the
      // first patient's real, already-on-the-board MRN.
      const randomSpy = vi
        .spyOn(Math, 'random')
        .mockReturnValue(randomFractionFor(collidingDigits));

      const second = await createPatientAndRouteFromReception(
        baseDraft({ firstName: 'Other', lastName: 'Person' }),
        { actorName: 'Reception Clerk', now: '2026-06-29T12:41:00.000Z' },
      );

      expect(second.patient.mrn).not.toBe(first.patient.mrn);
      randomSpy.mockRestore();
    });
  });
});
