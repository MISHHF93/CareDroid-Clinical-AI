/**
 * Reassessment completion propagation chain (Triage schedules → queue/timeline update →
 * overdue notification → completion removes/updates alerts everywhere).
 *
 * Before this fix, recording fresh vitals (the real-world completion act, reached via
 * ReassessmentDrawer "Assess Now" → PatientDetailPanel → addVitals) never cleared the
 * ReassessmentDue flag, never completed due reminders, and never dismissed their alerts —
 * a Waiting patient stayed "overdue" on the safety board, notification center, and
 * capacity/crisis counts forever, because the timer engine's isOverdue reads the flag
 * itself and the background engine only clears it after the patient reaches Assessment+.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { hasPatientFlag, useEmergencyStore } from './emergencyStore';
import {
  buildReassessmentTimerAlerts,
  buildWaitingPatientReassessmentTimers,
  evaluateReassessmentDueFlag,
} from '../engine/reassessmentTimerEngine';
import { PatientFlag, PatientState, Priority } from '../types/emergency';

const PATIENT_ID = 'pt-reassess-chain';
const REMINDER_ID = 'rem-chain-1';

function seedWaitingPatientWithOverdueReassessment() {
  useEmergencyStore.setState(
    (state) =>
      ({
        ...state,
        patients: [
          ...state.patients.filter((patient) => patient.id !== PATIENT_ID),
          {
            id: PATIENT_ID,
            mrn: 'ED-500001',
            firstName: 'Nora',
            lastName: 'Okafor',
            name: 'Nora Okafor',
            dob: '1980-02-02',
            age: 46,
            sex: 'Female',
            arrivalTime: new Date(Date.now() - 90 * 60_000).toISOString(),
            triageTime: new Date(Date.now() - 80 * 60_000).toISOString(),
            chiefComplaint: 'Abdominal pain',
            complaintCategory: 'Gastrointestinal',
            state: PatientState.Waiting,
            priority: Priority.P3,
            vitals: [
              {
                hr: 88,
                sbp: 124,
                dbp: 78,
                spo2: 97,
                temp: 36.8,
                rr: 16,
                gcs: 15,
                pain: 4,
                recordedAt: new Date(Date.now() - 75 * 60_000).toISOString(),
              },
            ],
            assignedStaffId: 'staff-aisha-thompson',
            roomId: null,
            // Record-style flag, as created by the operational-sync layer.
            flags: [
              {
                type: PatientFlag.ReassessmentDue,
                reason: 'Scheduled recheck reminder due',
                severity: 'Warning',
                detectedAt: new Date(Date.now() - 40 * 60_000).toISOString(),
              },
            ],
            timeline: [],
            notes: [],
            reassessmentReminders: [
              {
                id: REMINDER_ID,
                patientId: PATIENT_ID,
                status: 'pending',
                dueAt: new Date(Date.now() - 30 * 60_000).toISOString(),
                scheduledBy: 'staff-aisha-thompson',
                note: 'q30min abdominal pain recheck',
              },
            ],
            vitalsAlerts: [],
          },
        ],
        alerts: [
          ...state.alerts,
          {
            id: `alert-reassessment-reminder-overdue-${REMINDER_ID}`,
            type: 'Reassessment',
            severity: 'Critical',
            title: 'Reassessment overdue — Nora Okafor',
            message: 'Scheduled recheck overdue.',
            patientId: PATIENT_ID,
            reminderId: REMINDER_ID,
            createdAt: new Date(Date.now() - 20 * 60_000).toISOString(),
            dismissed: false,
            source: 'reassessment-timer-engine',
          },
        ],
      }) as never,
  );
}

function getPatient() {
  const patient = useEmergencyStore
    .getState()
    .patients.find((candidate) => candidate.id === PATIENT_ID);
  expect(patient).toBeTruthy();
  return patient!;
}

const NORMAL_VITALS = {
  hr: 82,
  sbp: 126,
  dbp: 80,
  spo2: 98,
  temp: 36.7,
  rr: 15,
  gcs: 15,
  pain: 2,
  recordedBy: 'staff-aisha-thompson',
  recordedAt: new Date().toISOString(),
};

const originalState = useEmergencyStore.getState();

afterEach(() => {
  useEmergencyStore.setState(originalState, true);
});

describe('reassessment completion propagation chain', () => {
  it('clears the ReassessmentDue flag, completes the due reminder, and dismisses its alert when fresh normal vitals are recorded', () => {
    seedWaitingPatientWithOverdueReassessment();

    useEmergencyStore.getState().addVitals(PATIENT_ID, NORMAL_VITALS);

    const patient = getPatient();
    expect(hasPatientFlag(patient, PatientFlag.ReassessmentDue)).toBe(false);

    const reminder = patient.reassessmentReminders?.find((entry) => entry.id === REMINDER_ID);
    expect(reminder).toEqual(
      expect.objectContaining({
        status: 'completed',
        completedBy: 'staff-aisha-thompson',
        completedAt: NORMAL_VITALS.recordedAt,
      }),
    );

    const reminderAlert = useEmergencyStore
      .getState()
      .alerts.find((alert) => alert.reminderId === REMINDER_ID);
    expect(reminderAlert?.dismissed).toBe(true);

    const timelineTypes = (patient.timeline || []).map((event) => event.type);
    expect(timelineTypes).toContain('ReassessmentReminderCompleted');
    expect(timelineTypes).toContain('FlagRemoved');

    expect(useEmergencyStore.getState().workflowLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'reassessment_completed', patientId: PATIENT_ID }),
      ]),
    );
  });

  it('propagates completion to the timer engine: no re-flag and no notification-center alert afterwards', () => {
    seedWaitingPatientWithOverdueReassessment();

    useEmergencyStore.getState().addVitals(PATIENT_ID, NORMAL_VITALS);
    const patient = getPatient();

    // Background engine evaluation must not re-add the flag on its next tick.
    expect(evaluateReassessmentDueFlag(patient).shouldFlag).toBe(false);

    // Notification-center/safety-board derived alerts must be gone too.
    const timers = buildWaitingPatientReassessmentTimers([patient]);
    expect(timers[0]?.isOverdue).toBe(false);
    expect(buildReassessmentTimerAlerts(timers)).toHaveLength(0);
  });

  it('re-flags with a fresh reason instead of clearing when the new vitals are themselves critical', () => {
    seedWaitingPatientWithOverdueReassessment();

    useEmergencyStore.getState().addVitals(PATIENT_ID, {
      ...NORMAL_VITALS,
      spo2: 85,
    });

    const patient = getPatient();
    expect(hasPatientFlag(patient, PatientFlag.ReassessmentDue)).toBe(true);
    const flagRecord = (patient.flags as Array<{ type?: string; reason?: string }>).find(
      (flag) => typeof flag === 'object' && flag.type === PatientFlag.ReassessmentDue,
    );
    // Fresh evidence, not the stale pre-recheck reason.
    expect(flagRecord?.reason).toMatch(/Critical vitals/);
    expect(flagRecord?.reason).not.toMatch(/Scheduled recheck reminder due/);

    // The reminder is still completed — the recheck happened; the NEW concern re-flags.
    const reminder = patient.reassessmentReminders?.find((entry) => entry.id === REMINDER_ID);
    expect(reminder?.status).toBe('completed');
  });

  it('fires the NEWS2 auto-score alert from the canonical pipeline (previously dead code)', () => {
    seedWaitingPatientWithOverdueReassessment();

    useEmergencyStore.getState().addVitals(PATIENT_ID, {
      ...NORMAL_VITALS,
      spo2: 85,
      rr: 26,
      hr: 132,
    });

    const news2Alert = useEmergencyStore
      .getState()
      .alerts.find(
        (alert) => alert.source === 'news2-auto-score' && alert.patientId === PATIENT_ID,
      );
    expect(news2Alert).toBeTruthy();
    expect(news2Alert?.title).toMatch(/NEWS2/);
  });

  it('clears DeteriorationRisk and ScoreReassessmentRecommended when the fresh reading is clean (HEAL-054)', () => {
    seedWaitingPatientWithOverdueReassessment();
    useEmergencyStore.setState(
      (state) =>
        ({
          ...state,
          patients: state.patients.map((patient) =>
            patient.id === PATIENT_ID
              ? {
                  ...patient,
                  flags: [
                    ...patient.flags,
                    {
                      type: PatientFlag.DeteriorationRisk,
                      reason: 'Critical vitals: SpO2 88%',
                      severity: 'Critical',
                      detectedAt: new Date(Date.now() - 50 * 60_000).toISOString(),
                    },
                    {
                      type: PatientFlag.ScoreReassessmentRecommended,
                      reason: 'Critical vitals: SpO2 88%',
                      severity: 'Critical',
                      detectedAt: new Date(Date.now() - 50 * 60_000).toISOString(),
                    },
                  ],
                }
              : patient,
          ),
        }) as never,
    );

    useEmergencyStore.getState().addVitals(PATIENT_ID, NORMAL_VITALS);

    const patient = getPatient();
    expect(hasPatientFlag(patient, PatientFlag.DeteriorationRisk)).toBe(false);
    expect(hasPatientFlag(patient, PatientFlag.ScoreReassessmentRecommended)).toBe(false);
    const removedFlags = (patient.timeline || [])
      .filter((event) => event.type === 'FlagRemoved')
      .map((event) => event.metadata?.flag);
    expect(removedFlags).toEqual(
      expect.arrayContaining([
        PatientFlag.ReassessmentDue,
        PatientFlag.DeteriorationRisk,
        PatientFlag.ScoreReassessmentRecommended,
      ]),
    );
  });

  it('keeps DeteriorationRisk when the fresh reading still meets deterioration criteria, even without a critical per-vital alert', () => {
    seedWaitingPatientWithOverdueReassessment();
    useEmergencyStore.setState(
      (state) =>
        ({
          ...state,
          patients: state.patients.map((patient) =>
            patient.id === PATIENT_ID
              ? {
                  ...patient,
                  flags: [
                    ...patient.flags,
                    {
                      type: PatientFlag.DeteriorationRisk,
                      reason: 'Critical vitals: SpO2 88%',
                      severity: 'Critical',
                      detectedAt: new Date(Date.now() - 50 * 60_000).toISOString(),
                    },
                  ],
                }
              : patient,
          ),
        }) as never,
    );

    // HR 125 meets the shared deterioration criteria (hr > 120).
    useEmergencyStore.getState().addVitals(PATIENT_ID, { ...NORMAL_VITALS, hr: 125 });

    expect(hasPatientFlag(getPatient(), PatientFlag.DeteriorationRisk)).toBe(true);
  });

  it('re-adds the full risk trio (including ScoreReassessmentRecommended) on a critical fresh reading', () => {
    seedWaitingPatientWithOverdueReassessment();

    useEmergencyStore.getState().addVitals(PATIENT_ID, { ...NORMAL_VITALS, spo2: 85 });

    const patient = getPatient();
    expect(hasPatientFlag(patient, PatientFlag.DeteriorationRisk)).toBe(true);
    expect(hasPatientFlag(patient, PatientFlag.ScoreReassessmentRecommended)).toBe(true);
    expect(hasPatientFlag(patient, PatientFlag.ReassessmentDue)).toBe(true);
  });

  it('never auto-clears any escalation-pinned flag while a manual escalation is active, and clears again once cancelled', () => {
    seedWaitingPatientWithOverdueReassessment();
    useEmergencyStore.setState(
      (state) =>
        ({
          ...state,
          patients: state.patients.map((patient) =>
            patient.id === PATIENT_ID
              ? {
                  ...patient,
                  flags: [
                    ...patient.flags,
                    {
                      type: PatientFlag.DeteriorationRisk,
                      reason: 'Manual escalation',
                      severity: 'Critical',
                    },
                    {
                      type: PatientFlag.ScoreReassessmentRecommended,
                      reason: 'Manual escalation',
                      severity: 'Critical',
                    },
                  ],
                  timeline: [
                    ...(patient.timeline || []),
                    {
                      id: 'evt-esc-1',
                      patientId: PATIENT_ID,
                      type: 'ESCALATION',
                      timestamp: new Date(Date.now() - 10 * 60_000).toISOString(),
                      summary: 'Manual escalation by charge nurse.',
                    },
                  ],
                }
              : patient,
          ),
        }) as never,
    );

    useEmergencyStore.getState().addVitals(PATIENT_ID, NORMAL_VITALS);

    let patient = getPatient();
    expect(hasPatientFlag(patient, PatientFlag.DeteriorationRisk)).toBe(true);
    expect(hasPatientFlag(patient, PatientFlag.ScoreReassessmentRecommended)).toBe(true);
    expect(hasPatientFlag(patient, PatientFlag.ReassessmentDue)).toBe(true);

    // Cancel the escalation (timeline event, as cancelEscalation records) and
    // recheck again: automatic clearing applies once the human override ends.
    useEmergencyStore.setState(
      (state) =>
        ({
          ...state,
          patients: state.patients.map((entry) =>
            entry.id === PATIENT_ID
              ? {
                  ...entry,
                  timeline: [
                    ...(entry.timeline || []),
                    {
                      id: 'evt-esc-cancel-1',
                      patientId: PATIENT_ID,
                      type: 'ESCALATION_CANCELLED',
                      timestamp: new Date().toISOString(),
                      summary: 'Escalation cancelled by charge nurse.',
                    },
                  ],
                }
              : entry,
          ),
        }) as never,
    );
    useEmergencyStore.getState().addVitals(PATIENT_ID, {
      ...NORMAL_VITALS,
      recordedAt: new Date().toISOString(),
    });

    patient = getPatient();
    expect(hasPatientFlag(patient, PatientFlag.DeteriorationRisk)).toBe(false);
    expect(hasPatientFlag(patient, PatientFlag.ScoreReassessmentRecommended)).toBe(false);
    expect(hasPatientFlag(patient, PatientFlag.ReassessmentDue)).toBe(false);
  });

  it('removeFlag removes record-style flags, not only bare string flags', () => {
    seedWaitingPatientWithOverdueReassessment();

    expect(hasPatientFlag(getPatient(), PatientFlag.ReassessmentDue)).toBe(true);
    useEmergencyStore.getState().removeFlag(PATIENT_ID, PatientFlag.ReassessmentDue);

    const patient = getPatient();
    expect(hasPatientFlag(patient, PatientFlag.ReassessmentDue)).toBe(false);
    expect((patient.timeline || []).map((event) => event.type)).toContain('FlagRemoved');
  });
});
