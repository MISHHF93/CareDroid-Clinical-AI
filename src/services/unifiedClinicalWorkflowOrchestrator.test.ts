import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PatientFlag, PatientState, Priority, type Patient } from '../types/emergency';
import { resetAutomationAuditTrail } from '../data/automationAuditTrail';
import {
  buildAdministrativeAutomationSnapshot,
  reviewAdministrativeAutomationTask,
} from './unifiedClinicalWorkflowOrchestrator';

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'p-auto',
    mrn: 'ED-AUTO',
    firstName: 'Auto',
    lastName: 'Patient',
    dob: '1988-01-01',
    age: 38,
    sex: 'M',
    arrivalTime: new Date(Date.now() - 60 * 60000).toISOString(),
    chiefComplaint: 'Chest pain',
    state: PatientState.Registration,
    priority: Priority.P2,
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

describe('unifiedClinicalWorkflowOrchestrator', () => {
  beforeEach(() => {
    resetAutomationAuditTrail([]);
  });

  it('generates reviewable administrative automation tasks across categories', () => {
    const snapshot = buildAdministrativeAutomationSnapshot({
      patients: [
        makePatient(),
        makePatient({
          id: 'p-wait',
          state: PatientState.Waiting,
          priority: Priority.P1,
        }),
        makePatient({
          id: 'p-escalate',
          state: PatientState.Waiting,
          flags: [PatientFlag.ReassessmentDue],
        }),
      ],
      staff: [{ id: 's1', name: 'Dr. Lee', role: 'MD', status: 'Available', active: true }],
      alerts: [
        {
          id: 'a-critical',
          severity: 'Critical',
          title: 'Test alert',
          message: 'Needs acknowledgement',
          dismissed: false,
          acknowledged: false,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    expect(snapshot.engineId).toBe('unified-clinical-workflow-orchestrator');
    expect(snapshot.tasks.length).toBeGreaterThan(0);
    expect(snapshot.tasks.some((task) => task.category === 'patient_routing')).toBe(true);
    expect(snapshot.tasks.some((task) => task.category === 'staff_assignment')).toBe(true);
    expect(snapshot.tasks.every((task) => task.humanReviewRequired)).toBe(true);
    expect(snapshot.metrics.pendingReview).toBeGreaterThan(0);
  });

  it('records audit trail and workflow action when a clinician reviews a task', () => {
    const tasks = buildAdministrativeAutomationSnapshot({
      patients: [makePatient()],
    }).tasks;
    const task = tasks.find((entry) => entry.category === 'patient_routing');
    expect(task).toBeTruthy();

    const recordWorkflowAction = vi.fn();
    const assignStaff = vi.fn();
    const addNote = vi.fn();

    const result = reviewAdministrativeAutomationTask(tasks, {
      taskId: task!.id,
      decision: 'approve',
      actorStaffId: 's1',
      actorName: 'Charge Nurse',
      executeOnApprove: false,
    }, {
      patients: [makePatient()],
      movePatientToState: vi.fn(),
      updatePatient: vi.fn(),
      setQueueFilter: vi.fn(),
      selectPatient: vi.fn(),
      recordWorkflowAction,
      emergencySettings: {},
      assignStaff,
      addNote,
    });

    expect(result.task?.status).toBe('approved');
    expect(result.task?.auditTrailId).toBeTruthy();
    expect(recordWorkflowAction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'administrative_automation_reviewed',
        source: 'unified-clinical-workflow-orchestrator',
      }),
    );
  });
});