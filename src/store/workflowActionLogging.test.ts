import { afterEach, describe, expect, it } from 'vitest';
import { useEmergencyStore } from './emergencyStore';
import { PatientState, Priority } from '../types/emergency';

const originalState = useEmergencyStore.getState();

afterEach(() => {
  useEmergencyStore.setState(originalState, true);
});

describe('CareDroid workflow action logging', () => {
  it('records and selects normalized logs across patient, EMS, reassessment, referral, and external workflows', () => {
    const initial = useEmergencyStore.getState();
    const template = initial.patients[0];
    const primaryStaff = initial.staff[0]?.id || 'staff-system';
    const reassignedStaff = initial.staff[1]?.id || primaryStaff;
    const patient = {
      ...template,
      id: 'workflow-log-patient-local',
      mrn: 'MRN-WORKFLOW-LOCAL',
      firstName: 'Workflow',
      lastName: 'Local',
      state: PatientState.Triage,
      priority: Priority.P3,
      assignedStaffId: primaryStaff,
      roomId: null,
      flags: [],
      timeline: [],
      notes: [],
      reassessmentReminders: [],
      referral: undefined,
    };

    useEmergencyStore.getState().addPatient(patient, { syncToBackend: false });
    useEmergencyStore.getState().assignStaff(patient.id, reassignedStaff, {
      actorStaffId: primaryStaff,
      reason: 'Workflow logging validation',
    });
    useEmergencyStore.getState().movePatientToState(patient.id, PatientState.Admission);
    const reminder = useEmergencyStore.getState().scheduleReassessmentReminder(patient.id, {
      scheduledBy: reassignedStaff,
      dueAt: new Date(Date.now() + 10 * 60_000).toISOString(),
      note: 'Workflow logging validation',
    });
    expect(reminder).toBeTruthy();
    useEmergencyStore.getState().completeReassessmentReminder(patient.id, reminder!.id, {
      completedBy: reassignedStaff,
    });
    useEmergencyStore.getState().createReferral({
      patientId: patient.id,
      requestingStaffId: reassignedStaff,
      targetDepartment: 'Cardiology',
      urgency: 'Urgent',
      reason: 'Workflow logging validation',
      clinicalSummary: 'Workflow logging validation referral.',
      status: 'Sent',
    });

    const arrival = {
      id: 'workflow-log-ems-arrival',
      unitId: 'workflow-log-ems-unit',
      unitName: 'Medic Workflow',
      crewNames: ['Workflow Crew'],
      patientAge: 44,
      patientSex: 'Male' as const,
      chiefComplaint: 'Workflow EMS validation',
      eta: 0,
      severity: 'High' as const,
      dispatchTime: new Date(Date.now() - 10 * 60_000).toISOString(),
      estimatedArrivalTime: new Date(Date.now() - 60_000).toISOString(),
      notes: 'Workflow logging validation.',
      status: 'Arrived' as const,
      prearrivalComplaint: 'Workflow EMS validation',
      priority: Priority.P2,
    };
    useEmergencyStore.getState().addEMSArrival(arrival);
    useEmergencyStore.getState().convertEMSArrivalToPatient(arrival.id);

    useEmergencyStore.getState().recordWorkflowAction({
      type: 'copilot_used',
      title: 'Copilot used',
      summary: 'Workflow logging validation Copilot prompt.',
      source: 'workflow-test',
      metadata: { promptLength: 42 },
    });
    useEmergencyStore.getState().recordWorkflowAction({
      type: 'provincial_data_viewed',
      title: 'Provincial data viewed',
      summary: 'Workflow logging validation provincial lookup.',
      patientId: patient.id,
      source: 'workflow-test',
      metadata: { recordCount: 1 },
    });
    useEmergencyStore.getState().recordWorkflowAction({
      type: 'integration_event_received',
      title: 'Integration event received',
      summary: 'Workflow logging validation integration event.',
      source: 'workflow-test',
      metadata: { sourceId: 'test' },
    });

    const allLogs = useEmergencyStore.getState().workflowLogs;
    expect(allLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'patient_created', patientId: patient.id }),
        expect.objectContaining({ type: 'journey_state_changed', patientId: patient.id }),
        expect.objectContaining({ type: 'clinician_assigned', patientId: patient.id }),
        expect.objectContaining({ type: 'reassessment_created', patientId: patient.id }),
        expect.objectContaining({ type: 'reassessment_completed', patientId: patient.id }),
        expect.objectContaining({ type: 'boarding_started', patientId: patient.id }),
        expect.objectContaining({ type: 'referral_created', patientId: patient.id }),
        expect.objectContaining({ type: 'ems_arrival_created' }),
        expect.objectContaining({ type: 'ems_converted_to_patient' }),
        expect.objectContaining({ type: 'copilot_used' }),
        expect.objectContaining({ type: 'provincial_data_viewed', patientId: patient.id }),
        expect.objectContaining({ type: 'integration_event_received' }),
      ]),
    );
    const patientTimeline = useEmergencyStore
      .getState()
      .workflowLogs.filter((log) => log.patientId === patient.id);
    expect(patientTimeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'patient_created', patientId: patient.id }),
        expect.objectContaining({ type: 'referral_created', patientId: patient.id }),
      ]),
    );
  });
});
