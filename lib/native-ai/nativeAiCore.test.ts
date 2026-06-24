import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient } from '../../src/types/emergency';
import {
  inferTriageFromExpertSystem,
  parseNaturalLanguageTriageRule,
  predictPostEdOrientation,
  routePatientToClinicalSpecialists,
  runClinicalSpecialistInference,
  buildNativeAiDriftEvaluations,
} from './index';

function basePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'p-native-ai',
    mrn: 'ED-AI-1',
    firstName: 'Jordan',
    lastName: 'Lee',
    dob: '1960-04-04',
    age: 66,
    sex: 'M',
    arrivalTime: '2026-06-24T10:00:00.000Z',
    chiefComplaint: 'Chest pain radiating to left arm',
    complaintCategory: 'Cardiac',
    state: PatientState.Triage,
    priority: Priority.P3,
    vitals: [{ hr: 104, sbp: 88, spo2: 95, recordedAt: '2026-06-24T10:05:00.000Z' }],
    flags: [],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

describe('native AI core', () => {
  it('routes chest pain with abnormal vitals to cardiac specialist', () => {
    const decision = routePatientToClinicalSpecialists(basePatient());
    expect(decision.primaryDomain).toBe('cardiac_vascular');
    expect(decision.specialistDomains).toContain('cardiac_vascular');
    expect(decision.keySignals.length).toBeGreaterThan(0);
  });

  it('parses natural language triage rules into structured JSON', () => {
    const rule = parseNaturalLanguageTriageRule(
      'Patients with severe burns >25% TBS must be triage class 1',
    );
    expect(rule.priority).toBe(Priority.P1);
    expect(rule.conditions.length).toBeGreaterThan(0);
  });

  it('infers triage class from expert system rules', () => {
    const inference = inferTriageFromExpertSystem(
      basePatient({ chiefComplaint: 'Severe burns 25% TBSA' }),
    );
    expect(inference.suggestedPriority).toBe(Priority.P1);
    expect(inference.requiresHumanReview).toBe(true);
  });

  it('predicts post-ED orientation with key predictors', () => {
    const prediction = predictPostEdOrientation(basePatient());
    expect(['admit', 'edou', 'discharge']).toContain(prediction.orientation);
    expect(prediction.keyPredictors.length).toBeGreaterThan(0);
    expect(prediction.requiresHumanReview).toBe(true);
  });

  it('runs cardiac specialist inference with key predictors', () => {
    const inference = runClinicalSpecialistInference(basePatient(), 'cardiac_vascular');
    expect(inference.domainId).toBe('cardiac_vascular');
    expect(inference.keyPredictors.length).toBeGreaterThan(0);
    expect(inference.confidence).toBeGreaterThan(0.4);
    expect(inference.requiresHumanReview).toBe(true);
  });

  it('builds drift evaluations for all registered models', () => {
    const evaluations = buildNativeAiDriftEvaluations();
    expect(evaluations.length).toBeGreaterThan(5);
    expect(evaluations[0]?.snapshot.modelId).toBeTruthy();
    expect(evaluations[0]?.snapshot.value).toBeGreaterThan(0);
  });
});