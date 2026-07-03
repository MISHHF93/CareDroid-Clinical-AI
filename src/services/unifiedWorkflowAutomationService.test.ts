import { beforeEach, describe, expect, it } from 'vitest';
import { useEmergencyStore } from '../store/emergencyStore';
import { buildUnifiedWorkflowAutomationSnapshot } from './unifiedWorkflowAutomationService';
import type { AdministrativeAutomationTask } from '../types/administrativeAutomation';
import { PatientState } from '../types/emergency';

function makeTask(
  partial: Partial<AdministrativeAutomationTask> & Pick<AdministrativeAutomationTask, 'id' | 'category' | 'title'>,
): AdministrativeAutomationTask {
  const now = new Date().toISOString();
  return Object.freeze({
    status: 'pending_review',
    summary: 'Automated summary',
    proposedAction: 'Approve automated action',
    ownerRole: 'triage_nurse',
    priority: 'high',
    aiGenerated: true,
    humanReviewRequired: true,
    proposedPayload: {},
    createdAt: now,
    updatedAt: now,
    patientId: 'patient-1',
    patientName: 'Test Patient',
    ...partial,
  });
}

describe('unifiedWorkflowAutomationService', () => {
  beforeEach(() => {
    useEmergencyStore.setState({
      patients: [],
      alerts: [],
      emsArrivals: [],
      administrativeAutomationQueue: [],
    });
  });

  it('merges administrative automation tasks into unified workflow items', () => {
    const snapshot = buildUnifiedWorkflowAutomationSnapshot({
      administrativeTasks: [
        makeTask({
          id: 'auto-route-1',
          category: 'patient_routing',
          title: 'Route Test Patient to triage',
        }),
        makeTask({
          id: 'auto-handoff-1',
          category: 'documentation_handoff',
          title: 'Draft disposition handoff',
        }),
      ],
    });

    expect(snapshot.items.length).toBeGreaterThanOrEqual(2);
    expect(snapshot.metrics.byDomain.patient_routing).toBeGreaterThanOrEqual(1);
    expect(snapshot.metrics.byDomain.documentation).toBeGreaterThanOrEqual(1);
    expect(snapshot.metrics.bySource.admin_automation).toBe(2);
    expect(snapshot.pendingReview).toBe(2);
  });

  it('deduplicates ai chief recommendations when admin task already covers the patient', () => {
    const snapshot = buildUnifiedWorkflowAutomationSnapshot({
      administrativeTasks: [
        makeTask({
          id: 'auto-summary-1',
          category: 'ai_patient_summary',
          title: 'AI summary ready',
          patientId: 'patient-1',
        }),
      ],
    });

    const aiItems = snapshot.items.filter((item) => item.source === 'ai_chief' && item.patientId === 'patient-1');
    expect(aiItems).toHaveLength(0);
  });

  it('surfaces reception intake gaps and patient flow detections', () => {
    const snapshot = buildUnifiedWorkflowAutomationSnapshot({
      patients: [
        {
          id: 'patient-reg-1',
          mrn: 'MRN-1',
          firstName: 'Alex',
          lastName: 'Kim',
          state: PatientState.Registration,
          priority: 'P3',
        } as import('../types/emergency').Patient,
      ],
      patientFlowSnapshot: {
        engineId: 'continuous-patient-flow-engine',
        generatedAt: new Date().toISOString(),
        patients: [],
        departments: [],
        detections: [
          {
            id: 'det-1',
            type: 'delayed_handoff',
            severity: 'warning',
            title: 'Handoff delayed',
            message: 'Disposition handoff waiting 42 minutes.',
            ownerRole: 'registered_nurse',
            recommendedAction: 'Draft and review handoff note.',
          },
        ],
        aiRecommendations: [],
        metrics: {
          trackedPatients: 1,
          congestedDepartments: 0,
          overloadedDepartments: 0,
          prolongedWaits: 0,
          delayedHandoffs: 1,
          activeDetections: 1,
        },
      },
    });

    expect(snapshot.items.some((item) => item.domain === 'reception')).toBe(true);
    expect(snapshot.items.some((item) => item.domain === 'handoffs')).toBe(true);
  });

  it('estimates administrative clicks saved for pending review tasks', () => {
    const snapshot = buildUnifiedWorkflowAutomationSnapshot({
      administrativeTasks: [
        makeTask({ id: 'task-1', category: 'staff_assignment', title: 'Assign owner' }),
        makeTask({ id: 'task-2', category: 'queue_prioritization', title: 'Reprioritize queue' }),
      ],
    });

    expect(snapshot.metrics.clicksSavedEstimate).toBeGreaterThanOrEqual(6);
  });
});