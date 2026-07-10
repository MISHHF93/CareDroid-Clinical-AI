import { PatientState, Priority, type Patient } from '../../../../src/types/emergency';
import type { AdministrativeAutomationTask } from '../../../../src/types/administrativeAutomation';
import {
  buildBackendEnrichedAdministrativeAutomationSnapshot,
  reviewBackendAdministrativeAutomationWithExecution,
} from './administrative-automation-orchestration.lib';

describe('administrative-automation-orchestration.lib', () => {
  it('builds all automation categories with AI decision payloads', async () => {
    const patient = {
      id: 'p-backend',
      mrn: 'MRN-B1',
      firstName: 'Sam',
      lastName: 'Rivera',
      age: 52,
      sex: 'M',
      state: PatientState.Registration,
      priority: Priority.P3,
      chiefComplaint: 'Chest pain',
      vitals: [{ sbp: 88, hr: 118, spo2: 91, pain: 7, recordedAt: new Date().toISOString() }],
      flags: [],
      notes: [],
      timeline: [],
    } as Patient;

    const snapshot = await buildBackendEnrichedAdministrativeAutomationSnapshot({
      patients: [patient],
      staff: [],
      referrals: [],
      alerts: [],
      emsArrivals: [],
      existingTasks: [],
      entitlementContext: {
        strictEntitlements: false,
        entitledAssetIds: ['agent-clinical', 'agent-operations'],
      },
    });

    const categories = new Set(snapshot.tasks.map((task) => task.category));
    expect(categories.has('patient_routing')).toBe(true);

    const routingTask = snapshot.tasks.find((task) => task.category === 'patient_routing');
    const aiDecision = routingTask?.proposedPayload.aiDecision as
      | { requiresClinicianReview?: boolean }
      | undefined;
    expect(aiDecision).toBeTruthy();
    expect(aiDecision?.requiresClinicianReview).toBe(true);
  });

  it('filters routing tasks when strict entitlements exclude mapped operations asset', async () => {
    const patient = {
      id: 'p-filter',
      mrn: 'MRN-B2',
      firstName: 'Alex',
      lastName: 'Nguyen',
      age: 40,
      sex: 'F',
      state: PatientState.Registration,
      priority: Priority.P3,
      chiefComplaint: 'Abdominal pain',
      flags: [],
      notes: [],
      timeline: [],
    } as Patient;

    const snapshot = await buildBackendEnrichedAdministrativeAutomationSnapshot({
      patients: [patient],
      staff: [],
      referrals: [],
      alerts: [],
      emsArrivals: [],
      existingTasks: [],
      entitlementContext: {
        strictEntitlements: true,
        entitledAssetIds: ['calculators'],
      },
    });

    expect(snapshot.tasks.some((task) => task.category === 'patient_routing')).toBe(false);
  });

  it('executes staff assignment and documentation handoff on backend approval', () => {
    const patientService = {
      movePatientToState: jest.fn(),
      assignStaffToPatient: jest.fn(),
      addPatientNote: jest.fn(),
      dispatchOperationalAlert: jest.fn(),
      escalatePatient: jest.fn(),
    };
    const workflowLogService = { record: jest.fn() };

    const tasks: AdministrativeAutomationTask[] = [
      {
        id: 'auto-staff-p1',
        category: 'staff_assignment',
        status: 'pending_review',
        patientId: 'p1',
        patientName: 'Jamie Lee',
        title: 'Assign staff',
        summary: 'Proposed assignment',
        proposedAction: 'Assign nurse',
        proposedPayload: { proposedStaffId: 's2', proposedStaffName: 'Nurse Rivera' },
        ownerRole: 'charge_nurse',
        priority: 'high',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        humanReviewRequired: true,
        aiGenerated: true,
      } as AdministrativeAutomationTask,
      {
        id: 'auto-handoff-p1',
        category: 'documentation_handoff',
        status: 'pending_review',
        patientId: 'p1',
        patientName: 'Jamie Lee',
        title: 'Handoff draft',
        summary: 'Disposition handoff draft ready',
        proposedAction: 'Stage handoff draft',
        proposedPayload: { handoffType: 'disposition', template: 'SBAR' },
        ownerRole: 'registered_nurse',
        priority: 'high',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        humanReviewRequired: true,
        aiGenerated: true,
      } as AdministrativeAutomationTask,
    ];

    reviewBackendAdministrativeAutomationWithExecution(
      tasks,
      {
        taskId: 'auto-staff-p1',
        decision: 'approve',
        actorStaffId: 'charge-nurse',
        actorName: 'Charge Nurse',
      },
      patientService as any,
      workflowLogService as any,
    );

    reviewBackendAdministrativeAutomationWithExecution(
      tasks,
      {
        taskId: 'auto-handoff-p1',
        decision: 'approve',
        actorStaffId: 'charge-nurse',
        actorName: 'Charge Nurse',
      },
      patientService as any,
      workflowLogService as any,
    );

    expect(patientService.assignStaffToPatient).toHaveBeenCalledWith('p1', 's2', 'charge-nurse');
    expect(patientService.addPatientNote).toHaveBeenCalled();
  });
});
