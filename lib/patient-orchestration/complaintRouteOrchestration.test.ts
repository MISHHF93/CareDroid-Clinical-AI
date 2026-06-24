import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState, Priority, type Patient } from '../../src/types/emergency';
import { buildPatientCardOrchestrationContext } from './recommendTools';
import { mergeComplaintRouteCalculatorTools } from './complaintRouteTools';
import { ORCHESTRATION_TOOL_CATALOG } from './toolCatalog';

function basePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'p-route',
    mrn: 'MRN-ROUTE',
    firstName: 'Case',
    lastName: 'Patient',
    dob: '1980-01-01',
    age: 45,
    sex: 'M',
    arrivalTime: new Date(Date.now() - 30 * 60_000).toISOString(),
    chiefComplaint: 'Chest pain',
    complaint: 'Chest pain',
    state: PatientState.Triage,
    priority: Priority.P3,
    vitals: [{ hr: 88, sbp: 130, dbp: 80, spo2: 98, rr: 18, temp: 37, recordedAt: new Date().toISOString() }],
    flags: [],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

function recommendationIds(context: ReturnType<typeof buildPatientCardOrchestrationContext>): string[] {
  return [
    ...context.prioritizedRecommendations,
    ...context.secondaryRecommendations,
  ].map((rec) => rec.registryId || rec.toolId);
}

describe('complaint-route calculator orchestration', () => {
  const routeCases = [
    {
      complaint: 'Chest pain',
      expectedCalculators: ['heart-score'],
    },
    {
      complaint: 'Weakness and facial droop',
      expectedCalculators: ['nihss'],
    },
    {
      complaint: 'Possible sepsis',
      expectedCalculators: ['qsofa', 'news2'],
    },
    {
      complaint: 'MVC trauma',
      expectedCalculators: ['shock-index', 'revised-trauma-score'],
    },
    {
      complaint: 'Shortness of breath',
      expectedCalculators: ['wells-pe'],
    },
    {
      complaint: 'Abdominal pain',
      expectedCalculators: ['ranson-criteria', 'bisap-score', 'glasgow-blatchford-score'],
    },
    {
      complaint: 'Suicidal ideation',
      expectedCalculators: ['columbia-suicide-severity-workflow', 'phq9', 'gad7'],
    },
  ] as const;

  it.each(routeCases)(
    'surfaces $expectedCalculators for "$complaint"',
    ({ complaint, expectedCalculators }) => {
      const context = buildPatientCardOrchestrationContext({
        patient: basePatient({ chiefComplaint: complaint, complaint }),
        role: 'triage_nurse',
      });

      expect(context.complaintRoute).toBeTruthy();
      for (const calculatorId of expectedCalculators) {
        expect(recommendationIds(context)).toContain(calculatorId);
      }
      expect(context.scoresMissing).toEqual(
        expect.arrayContaining([...expectedCalculators]),
      );
    },
  );

  it('merges dynamic catalog entries for every complaint-route calculator', () => {
    const context = buildPatientCardOrchestrationContext({
      patient: basePatient({ chiefComplaint: 'Abdominal pain', complaint: 'Abdominal pain' }),
      role: 'physician',
    });
    const merged = mergeComplaintRouteCalculatorTools(context.complaintRoute);
    expect(merged.length).toBeGreaterThanOrEqual(ORCHESTRATION_TOOL_CATALOG.length);
    expect(context.complaintRoute?.scoreIds.every((scoreId) =>
      merged.some((tool) => tool.registryId === scoreId || tool.toolId === scoreId),
    )).toBe(true);
  });

  it('prioritizes multiple missing sepsis calculators on the patient card', () => {
    const context = buildPatientCardOrchestrationContext({
      patient: basePatient({
        chiefComplaint: 'Possible sepsis',
        complaint: 'Possible sepsis',
      }),
      role: 'physician',
    });

    const primaryIds = context.prioritizedRecommendations.map((rec) => rec.registryId || rec.toolId);
    expect(primaryIds).toEqual(expect.arrayContaining(['qsofa', 'news2']));
    expect(context.prioritizedRecommendations.length).toBeGreaterThanOrEqual(2);
  });

  it('boosts missing route calculators when score reassessment is recommended', () => {
    const context = buildPatientCardOrchestrationContext({
      patient: basePatient({
        flags: [PatientFlag.ScoreReassessmentRecommended],
      }),
      role: 'triage_nurse',
    });

    const heart = context.prioritizedRecommendations.find((rec) => rec.toolId === 'heart-score');
    expect(heart).toBeTruthy();
    expect(heart?.reasonCodes).toContain('score_reassessment_due');
  });

  it('surfaces pediatric dosing for pediatric patients', () => {
    const context = buildPatientCardOrchestrationContext({
      patient: basePatient({ age: 8, chiefComplaint: 'Fever', complaint: 'Fever' }),
      role: 'physician',
    });

    expect(recommendationIds(context)).toContain('pediatric-dose-safety-checker');
  });
});