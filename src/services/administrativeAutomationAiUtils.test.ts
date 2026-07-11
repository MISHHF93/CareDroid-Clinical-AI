import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient } from '../types/emergency';
import type { AdministrativeAutomationTask } from '../types/administrativeAutomation';
import {
  patientsNeedingAiEnrichment,
  taskHasAiDecision,
  taskNeedsAiEnrichment,
} from './administrativeAutomationAiUtils';

function makeTask(
  partial: Partial<AdministrativeAutomationTask> & Pick<AdministrativeAutomationTask, 'category'>,
): AdministrativeAutomationTask {
  return {
    id: 'task-1',
    status: 'pending_review',
    title: 'Test task',
    summary: 'Summary',
    proposedAction: 'Review',
    proposedPayload: {},
    ownerRole: 'charge_nurse',
    priority: 'medium',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    humanReviewRequired: true,
    aiGenerated: true,
    ...partial,
  } as AdministrativeAutomationTask;
}

describe('administrativeAutomationAiUtils', () => {
  it('detects stamped aiDecision payloads', () => {
    expect(taskHasAiDecision(makeTask({ category: 'patient_routing' }))).toBe(false);
    expect(
      taskHasAiDecision(
        makeTask({
          category: 'patient_routing',
          proposedPayload: { aiDecision: { requiresClinicianReview: true } },
        }),
      ),
    ).toBe(true);
  });

  it('skips tasks that already have aiDecision or non-enriched categories', () => {
    expect(taskNeedsAiEnrichment(makeTask({ category: 'documentation_handoff' }))).toBe(false);
    expect(
      taskNeedsAiEnrichment(
        makeTask({
          category: 'patient_routing',
          proposedPayload: { aiDecision: { requiresClinicianReview: true } },
        }),
      ),
    ).toBe(false);
    expect(
      taskNeedsAiEnrichment(makeTask({ category: 'patient_routing', patientId: 'p-1' })),
    ).toBe(true);
    expect(
      taskNeedsAiEnrichment(
        makeTask({
          category: 'triage_preparation',
          proposedPayload: { arrivalId: 'ems-1' },
        }),
      ),
    ).toBe(true);
  });

  it('returns only patients linked to tasks needing enrichment in journey states', () => {
    const patient = {
      id: 'p-1',
      mrn: 'MRN-1',
      state: PatientState.Registration,
      priority: Priority.P3,
      flags: [],
      notes: [],
      timeline: [],
    } as unknown as Patient;
    const discharged = { ...patient, id: 'p-2', state: PatientState.Discharge } as Patient;

    const tasks = [
      makeTask({ category: 'patient_routing', patientId: 'p-1' }),
      makeTask({ category: 'patient_routing', patientId: 'p-2' }),
    ];

    expect(patientsNeedingAiEnrichment(tasks, [patient, discharged])).toEqual([patient]);
    expect(patientsNeedingAiEnrichment([], [patient])).toEqual([]);
  });
});