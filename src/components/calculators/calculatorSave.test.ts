import { beforeEach, describe, expect, it } from 'vitest';
import { PatientFlag, PatientState, Priority, type Patient } from '../../types/emergency';
import { useEmergencyStore } from '../../store/emergencyStore';
import { saveCalculatorResult } from './calculatorSave';
import { listCompletedScoreIds } from '../../../lib/patient-orchestration/scoreCompletion';
import { getRecentSavedScores } from '../../utils/clinicalScoreEvents';

function seedPatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-score-test',
    mrn: 'MRN-SCORE',
    firstName: 'Taylor',
    lastName: 'Case',
    dob: '1985-05-05',
    age: 40,
    sex: 'F',
    arrivalTime: new Date().toISOString(),
    chiefComplaint: 'Chest pain',
    complaint: 'Chest pain',
    complaintCategory: 'Cardiac',
    state: PatientState.Triage,
    priority: Priority.P3,
    vitals: [],
    flags: [PatientFlag.ScoreReassessmentRecommended],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

describe('saveCalculatorResult', () => {
  beforeEach(() => {
    useEmergencyStore.setState((state) => ({
      ...state,
      patients: [seedPatient()],
      workflowLogs: [],
      auditLog: [],
    }));
  });

  it('writes structured note metadata and ClinicalScoreSaved timeline event', () => {
    const saved = saveCalculatorResult({
      patientId: 'patient-score-test',
      scoreId: 'heart-score',
      scoreName: 'HEART Score',
      total: 7,
      max: 10,
      band: 'High risk',
      fields: { history: 2 },
      staffId: 'staff-1',
    });

    expect(saved).toBe(true);

    const patient = useEmergencyStore
      .getState()
      .patients.find((candidate) => candidate.id === 'patient-score-test');
    expect(patient).toBeTruthy();

    const note = patient?.notes.at(-1);
    expect(note?.metadata?.scoreId).toBe('heart-score');
    expect(note?.metadata?.scoreTotal).toBe('7');
    expect(note?.metadata?.band).toBe('High risk');

    const timelineEvent = patient?.timeline.find((event) => event.type === 'ClinicalScoreSaved');
    expect(timelineEvent).toBeTruthy();
    expect(timelineEvent?.metadata?.scoreId).toBe('heart-score');
    expect(timelineEvent?.metadata?.scoreTotal).toBe('7');

    expect(
      useEmergencyStore.getState().workflowLogs.some((log) => log.type === 'clinical_score_saved'),
    ).toBe(true);
  });

  it('feeds orchestration completion and patient card score badges', () => {
    saveCalculatorResult({
      patientId: 'patient-score-test',
      scoreId: 'heart-score',
      scoreName: 'HEART Score',
      total: 4,
      max: 10,
      band: 'Moderate risk',
      fields: {},
    });

    const patient = useEmergencyStore
      .getState()
      .patients.find((candidate) => candidate.id === 'patient-score-test');
    expect(patient).toBeTruthy();
    if (!patient) return;

    expect(listCompletedScoreIds(patient)).toContain('heart-score');
    expect(getRecentSavedScores(patient).some((score) => score.shortLabel === 'HEART')).toBe(true);
  });

  it('clears ScoreReassessmentRecommended when complaint-route scores are complete', () => {
    saveCalculatorResult({
      patientId: 'patient-score-test',
      scoreId: 'heart-score',
      scoreName: 'HEART Score',
      total: 3,
      max: 10,
      band: 'Low risk',
      fields: {},
    });

    const patient = useEmergencyStore
      .getState()
      .patients.find((candidate) => candidate.id === 'patient-score-test');
    expect(patient?.flags.includes(PatientFlag.ScoreReassessmentRecommended)).toBe(false);
  });
});
