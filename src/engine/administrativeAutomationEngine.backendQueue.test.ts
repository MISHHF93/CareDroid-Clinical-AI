import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PatientState, Priority, type Patient } from '../types/emergency';
import type { AdministrativeAutomationTask } from '../types/administrativeAutomation';
import { taskNeedsAiEnrichment } from '../services/administrativeAutomationAiUtils';

vi.mock('../services/enrichAdministrativeAutomationsWithAi', () => ({
  enrichAdministrativeAutomationSnapshotWithAi: vi.fn(async (snapshot) => snapshot),
}));

vi.mock('../store/emergencyStore', () => ({
  useEmergencyStore: {
    getState: vi.fn(() => ({
      patients: [],
      emsArrivals: [],
      administrativeAutomationQueue: [],
      setAdministrativeAutomationQueue: vi.fn(),
      backendAvailable: true,
    })),
  },
}));

import { mergeBackendAdministrativeAutomationTasks } from './administrativeAutomationEngine';
import { enrichAdministrativeAutomationSnapshotWithAi } from '../services/enrichAdministrativeAutomationsWithAi';
import { useEmergencyStore } from '../store/emergencyStore';

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

describe('mergeBackendAdministrativeAutomationTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns backend tasks unchanged when aiDecision is already stamped', async () => {
    const backendTasks = [
      makeTask({
        category: 'patient_routing',
        patientId: 'p-1',
        proposedPayload: {
          aiDecision: { requiresClinicianReview: true },
        },
      }),
    ];

    const merged = await mergeBackendAdministrativeAutomationTasks(backendTasks);
    expect(merged).toEqual(backendTasks);
    expect(enrichAdministrativeAutomationSnapshotWithAi).not.toHaveBeenCalled();
    expect(taskNeedsAiEnrichment(backendTasks[0])).toBe(false);
  });

  it('enriches only when backend tasks still need AI decisions', async () => {
    const backendTasks = [
      makeTask({
        category: 'patient_routing',
        patientId: 'p-1',
      }),
    ];

    await mergeBackendAdministrativeAutomationTasks(backendTasks);
    expect(enrichAdministrativeAutomationSnapshotWithAi).toHaveBeenCalledTimes(1);
  });

  it('reuses aiDecision from the existing queue instead of re-calling /api/ai/node', async () => {
    const existingTask = makeTask({
      id: 'task-1',
      category: 'patient_routing',
      patientId: 'p-1',
      proposedPayload: {
        aiDecision: { requiresClinicianReview: true, triage: { recommendedTriageLevel: 'P2' } },
      },
    });
    vi.mocked(useEmergencyStore.getState).mockReturnValue({
      patients: [],
      emsArrivals: [],
      administrativeAutomationQueue: [existingTask],
      setAdministrativeAutomationQueue: vi.fn(),
      backendAvailable: true,
    } as ReturnType<typeof useEmergencyStore.getState>);

    const backendTasks = [
      makeTask({
        id: 'task-1',
        category: 'patient_routing',
        patientId: 'p-1',
      }),
    ];

    const merged = await mergeBackendAdministrativeAutomationTasks(backendTasks);
    expect(enrichAdministrativeAutomationSnapshotWithAi).not.toHaveBeenCalled();
    expect(merged[0]?.proposedPayload?.aiDecision).toEqual(existingTask.proposedPayload.aiDecision);
  });
});