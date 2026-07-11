import { describe, expect, it } from 'vitest';
import { Priority, PatientState, type Patient } from '../types/emergency';
import { buildAdministrativeAutomationSnapshot } from './unifiedClinicalWorkflowOrchestrator';
import { enrichAdministrativeAutomationSnapshotWithAi } from './enrichAdministrativeAutomationsWithAi';

describe('enrichAdministrativeAutomationsWithAi', () => {
  it('stamps AI triage decisions onto registration routing tasks', async () => {
    const patient = {
      id: 'p-chest',
      mrn: 'MRN-22',
      firstName: 'Jamie',
      lastName: 'Lee',
      age: 61,
      sex: 'F',
      state: PatientState.Registration,
      priority: Priority.P3,
      chiefComplaint: 'Chest pain and shortness of breath',
      vitals: [{ sbp: 90, hr: 120, spo2: 89, pain: 8, recordedAt: new Date().toISOString() }],
      flags: [],
      notes: [],
      timeline: [],
    } as unknown as Patient;

    const base = buildAdministrativeAutomationSnapshot({
      patients: [patient],
      staff: [],
      referrals: [],
      alerts: [],
      emsArrivals: [],
      existingTasks: [],
    });

    const enriched = await enrichAdministrativeAutomationSnapshotWithAi(base, {
      patients: [patient],
      emsArrivals: [],
    });

    const routingTask = enriched.tasks.find((task) => task.category === 'patient_routing');
    expect(routingTask).toBeTruthy();
    expect(routingTask?.summary).toContain('AI triage advisory');
    expect(routingTask?.proposedPayload.aiDecision).toBeTruthy();
    expect(
      (routingTask?.proposedPayload.aiDecision as { requiresClinicianReview?: boolean } | undefined)
        ?.requiresClinicianReview,
    ).toBe(true);
  });

  it('skips re-enrichment when backend already stamped aiDecision on tasks', async () => {
    const patient = {
      id: 'p-pre-enriched',
      mrn: 'MRN-99',
      firstName: 'Casey',
      lastName: 'Morgan',
      age: 45,
      sex: 'F',
      state: PatientState.Registration,
      priority: Priority.P3,
      chiefComplaint: 'Shortness of breath',
      vitals: [{ sbp: 120, hr: 98, spo2: 94, recordedAt: new Date().toISOString() }],
      flags: [],
      notes: [],
      timeline: [],
    } as unknown as Patient;

    const base = buildAdministrativeAutomationSnapshot({
      patients: [patient],
      staff: [],
      referrals: [],
      alerts: [],
      emsArrivals: [],
      existingTasks: [],
    });

    const routingTask = base.tasks.find((task) => task.category === 'patient_routing');
    expect(routingTask).toBeTruthy();

    const preEnrichedBase = {
      ...base,
      tasks: base.tasks.map((task) =>
        task.id === routingTask?.id
          ? {
              ...task,
              summary: 'Backend enriched summary',
              proposedPayload: {
                ...task.proposedPayload,
                aiDecision: {
                  nodeId: 'CareDroidUnifiedAINode',
                  requiresClinicianReview: true,
                  triage: { data: { recommendedTriageLevel: 'P2' } },
                },
              },
            }
          : task,
      ),
    };

    const enriched = await enrichAdministrativeAutomationSnapshotWithAi(preEnrichedBase, {
      patients: [patient],
      emsArrivals: [],
    });

    const enrichedRouting = enriched.tasks.find((task) => task.category === 'patient_routing');
    expect(enrichedRouting?.summary).toBe('Backend enriched summary');
    expect(enrichedRouting?.proposedPayload.aiDecision).toMatchObject({
      requiresClinicianReview: true,
      triage: { data: { recommendedTriageLevel: 'P2' } },
    });
  });
});