import { afterEach, describe, expect, it } from 'vitest';
import { hasPatientFlag, selectActiveAlerts, selectReassessmentQueue, useEmergencyStore } from './emergencyStore';
import { movePatientToState as movePatientWithJourneyRules } from '../engine/journeyEngine';
import { PatientState, Priority } from '../types/emergency';

const originalState = useEmergencyStore.getState();

afterEach(() => {
  useEmergencyStore.setState(originalState, true);
});

describe('emergencyStore EMS arrival conversion', () => {
  it('converts an EMS arrival into an Arrival-state whiteboard patient with EMS flag', () => {
    const store = useEmergencyStore.getState();
    const arrival = store.emsArrivals.find((candidate) => candidate.status === 'Inbound');

    expect(arrival).toBeTruthy();

    store.prepareEMSBay(arrival!.id);
    const preparedArrival = useEmergencyStore
      .getState()
      .emsArrivals.find((candidate) => candidate.id === arrival!.id);

    useEmergencyStore.getState().convertEMSArrivalToPatient(arrival!.id);

    const nextState = useEmergencyStore.getState();
    const convertedArrival = nextState.emsArrivals.find((candidate) => candidate.id === arrival!.id);
    const patient = nextState.patients.find((candidate) => candidate.id === convertedArrival?.patientId);

    expect(convertedArrival).toEqual(
      expect.objectContaining({
        status: 'Handoff',
        patientId: expect.any(String),
      })
    );
    expect(patient).toEqual(
      expect.objectContaining({
        state: PatientState.Arrival,
        chiefComplaint: arrival!.chiefComplaint,
        roomId: preparedArrival?.preparedRoomId,
      })
    );
    expect(patient && hasPatientFlag(patient, 'EMSArrival')).toBe(true);
  });

  it('auto-prepares critical EMS arrivals and saves checklist status to the patient record', () => {
    const arrival = {
      id: 'ems-critical-stemi-test',
      unitId: 'ems-unit-critical-test',
      unitName: 'Medic 99',
      crewNames: ['Paramedic Test'],
      patientAge: 58,
      patientSex: 'Male' as const,
      chiefComplaint: 'STEMI',
      vitals: {
        recordedAt: '2026-06-11T21:20:00-04:00',
        hr: 122,
        bpSystolic: 88,
        bpDiastolic: 60,
        spo2: 94,
        temp: null,
        rr: null,
        gcs: null,
        pain: null,
      },
      eta: 4,
      severity: 'Critical' as const,
      dispatchTime: '2026-06-11T21:16:00-04:00',
      estimatedArrivalTime: new Date(Date.now() + 4 * 60_000).toISOString(),
      notes: 'Diaphoretic, cath lab concern.',
      status: 'Inbound' as const,
      prearrivalComplaint: 'STEMI male 58, BP 88/60',
      priority: Priority.P1,
    };

    useEmergencyStore.getState().addEMSArrival(arrival);

    const preparedState = useEmergencyStore.getState();
    const preparedArrival = preparedState.emsArrivals.find((candidate) => candidate.id === arrival.id);
    const preparedRoom = preparedState.rooms.find((room) => room.id === preparedArrival?.preparedRoomId);

    expect(preparedArrival?.criticalChecklist).toMatchObject({
      type: 'stemi',
      title: 'STEMI Preparation Checklist',
      assignedRoomId: preparedRoom?.id,
    });
    expect(preparedRoom?.status).toBe('Reserved');

    useEmergencyStore.getState().checkCriticalEMSChecklistItem(arrival.id, {
      itemId: 'activate-cath-lab',
      label: 'Activate cath lab (if applicable)',
      checked: true,
      staffId: 'staff-priya-nair',
      staffName: 'Priya Nair',
      timestamp: '2026-06-11T21:17:00-04:00',
    });

    expect(
      useEmergencyStore
        .getState()
        .emsArrivals.find((candidate) => candidate.id === arrival.id)?.criticalChecklist?.completions[0]
    ).toMatchObject({
      itemId: 'activate-cath-lab',
      checkedByStaffName: 'Priya Nair',
    });

    useEmergencyStore.getState().convertEMSArrivalToPatient(arrival.id);

    const convertedArrival = useEmergencyStore
      .getState()
      .emsArrivals.find((candidate) => candidate.id === arrival.id);
    const patient = useEmergencyStore
      .getState()
      .patients.find((candidate) => candidate.id === convertedArrival?.patientId);

    expect(patient).toMatchObject({
      state: PatientState.Arrival,
      chiefComplaint: 'STEMI',
      criticalChecklist: expect.objectContaining({
        type: 'stemi',
        savedToPatientAt: expect.any(String),
      }),
    });
    expect(patient?.timeline.some((event) => event.type === 'EMSCriticalChecklistSaved')).toBe(true);
  });
});

describe('first customer walkthrough', () => {
  it('creates a patient, triages, reassesses, dispositions, and discharges', () => {
    const now = '2026-06-12T05:30:00.000Z';
    const patient = {
      id: 'walkthrough-patient-001',
      mrn: 'ED-WALK-001',
      firstName: 'Pilot',
      lastName: 'Patient',
      dob: '1975-03-01',
      age: 51,
      sex: 'Female' as const,
      arrivalTime: now,
      triageTime: now,
      lastAssessedTime: null,
      chiefComplaint: 'Chest pain',
      complaint: 'Chest pain',
      complaintCategory: 'Chest Pain',
      state: PatientState.Triage,
      priority: Priority.P3,
      vitals: {
        hr: 92,
        bpSystolic: 144,
        bpDiastolic: 88,
        spo2: 97,
        temp: 36.8,
        rr: 18,
        gcs: 15,
        pain: 6,
        recordedAt: now,
      },
      assignedStaffId: null,
      roomId: null,
      flags: [],
      timeline: [
        {
          id: 'walkthrough-arrival',
          patientId: 'walkthrough-patient-001',
          type: 'Triage' as const,
          timestamp: now,
          summary: 'Walkthrough patient created from quick intake.',
        },
      ],
      notes: [],
    };

    useEmergencyStore.getState().addPatient(patient);
    let activePatient = useEmergencyStore
      .getState()
      .patients.find((candidate) => candidate.id === patient.id);

    expect(activePatient).toMatchObject({
      state: PatientState.Triage,
      priority: Priority.P3,
    });

    movePatientWithJourneyRules(patient.id, PatientState.Waiting, {
      staffId: 'staff-priya-nair',
      timestamp: '2026-06-12T05:35:00.000Z',
    });
    useEmergencyStore.getState().addFlag(patient.id, 'ReassessmentDue', {
      reason: 'First customer walkthrough reassessment',
      detectedAt: '2026-06-12T05:40:00.000Z',
    });

    expect(selectReassessmentQueue(useEmergencyStore.getState())[0]).toMatchObject({
      patientId: patient.id,
    });

    useEmergencyStore.getState().removeFlag(patient.id, 'ReassessmentDue');
    useEmergencyStore.getState().addNote(patient.id, {
      id: 'walkthrough-reassessment-note',
      patientId: patient.id,
      authorStaffId: 'staff-priya-nair',
      type: 'Clinical',
      body: 'Walkthrough reassessment completed; patient safe to move to assessment.',
      createdAt: '2026-06-12T05:45:00.000Z',
    });

    activePatient = useEmergencyStore
      .getState()
      .patients.find((candidate) => candidate.id === patient.id);
    expect(activePatient && hasPatientFlag(activePatient, 'ReassessmentDue')).toBe(false);
    expect(activePatient?.notes.at(-1)?.body).toMatch(/reassessment completed/i);

    movePatientWithJourneyRules(patient.id, PatientState.Assessment, {
      staffId: 'staff-priya-nair',
      timestamp: '2026-06-12T05:50:00.000Z',
    });
    movePatientWithJourneyRules(patient.id, PatientState.Disposition, {
      staffId: 'staff-priya-nair',
      timestamp: '2026-06-12T06:15:00.000Z',
    });
    movePatientWithJourneyRules(patient.id, PatientState.Discharge, {
      staffId: 'staff-priya-nair',
      timestamp: '2026-06-12T06:30:00.000Z',
    });

    const discharged = useEmergencyStore
      .getState()
      .patients.find((candidate) => candidate.id === patient.id);

    expect(discharged).toMatchObject({
      state: PatientState.Discharge,
      roomId: null,
      assignedStaffId: null,
    });
    expect(discharged?.timeline.map((event) => event.to)).toEqual(
      expect.arrayContaining([PatientState.Waiting, PatientState.Assessment, PatientState.Disposition, PatientState.Discharge])
    );
  });
});

describe('emergencyStore manual escalation', () => {
  it('flags patient, dispatches critical alert, logs timeline, and tops reassessment queue', () => {
    const patient = useEmergencyStore.getState().patients.find((candidate) => candidate.id === 'pt-005');

    expect(patient).toBeTruthy();

    useEmergencyStore.getState().escalatePatient(patient!.id, {
      staffId: 'staff-priya-nair',
      staffName: 'Priya Nair',
      timestamp: '2026-06-11T20:30:00-04:00',
    });

    const state = useEmergencyStore.getState();
    const escalated = state.patients.find((candidate) => candidate.id === patient!.id);
    const activeAlerts = selectActiveAlerts(state);
    const reassessmentQueue = selectReassessmentQueue(state);

    expect(escalated && hasPatientFlag(escalated, 'HighRisk')).toBe(true);
    expect(escalated && hasPatientFlag(escalated, 'DeteriorationRisk')).toBe(true);
    expect(escalated && hasPatientFlag(escalated, 'ReassessmentDue')).toBe(true);
    expect(escalated?.timeline.at(-1)).toMatchObject({
      type: 'ESCALATION',
      by: 'staff-priya-nair',
      reason: 'Manual',
    });
    expect(activeAlerts.find((alert) => alert.id === `alert-escalation-${patient!.id}`)).toMatchObject({
      id: `alert-escalation-${patient!.id}`,
      severity: 'Critical',
      title: 'ESCALATION — Aarav Patel',
      patientId: patient!.id,
    });
    expect(reassessmentQueue[0]).toMatchObject({
      patientId: patient!.id,
      flaggedAt: '2026-06-11T20:30:00-04:00',
    });
  });

  it('cancels manual escalation and logs cancellation', () => {
    const patientId = 'pt-005';
    useEmergencyStore.getState().escalatePatient(patientId, {
      staffId: 'staff-priya-nair',
      staffName: 'Priya Nair',
      timestamp: '2026-06-11T20:30:00-04:00',
    });

    useEmergencyStore.getState().cancelEscalation(patientId, {
      staffId: 'staff-priya-nair',
      staffName: 'Priya Nair',
      timestamp: '2026-06-11T20:31:00-04:00',
    });

    const state = useEmergencyStore.getState();
    const patient = state.patients.find((candidate) => candidate.id === patientId);
    const alert = state.alerts.find((candidate) => candidate.id === `alert-escalation-${patientId}`);

    expect(patient && hasPatientFlag(patient, 'HighRisk')).toBe(false);
    expect(patient?.timeline.at(-1)).toMatchObject({
      type: 'ESCALATION_CANCELLED',
      by: 'staff-priya-nair',
      reason: 'Manual cancellation',
    });
    expect(alert?.dismissedAt).toBe('2026-06-11T20:31:00-04:00');
  });

  it('prevents non-escalating non-charge staff from cancelling escalation', () => {
    const patientId = 'pt-005';
    useEmergencyStore.getState().escalatePatient(patientId, {
      staffId: 'staff-priya-nair',
      staffName: 'Priya Nair',
      timestamp: '2026-06-11T20:30:00-04:00',
    });

    useEmergencyStore.getState().cancelEscalation(patientId, {
      staffId: 'staff-aisha-thompson',
      staffName: 'Aisha Thompson',
      timestamp: '2026-06-11T20:31:00-04:00',
    });

    const patient = useEmergencyStore.getState().patients.find((candidate) => candidate.id === patientId);

    expect(patient && hasPatientFlag(patient, 'HighRisk')).toBe(true);
    expect(patient?.timeline.some((event) => event.type === 'ESCALATION_CANCELLED')).toBe(false);
  });
});

describe('emergencyStore crisis staffing requests', () => {
  it('records an additional staffing request with current capacity context', () => {
    useEmergencyStore.getState().requestAdditionalStaff({
      requestedByStaffId: 'staff-priya-nair',
      reason: 'Capacity crisis Orange at 68/100',
      capacityScore: 68,
      capacityRiskLevel: 'Orange',
    });

    expect(useEmergencyStore.getState().staffingRequests[0]).toMatchObject({
      requestedByStaffId: 'staff-priya-nair',
      reason: 'Capacity crisis Orange at 68/100',
      capacityScore: 68,
      capacityRiskLevel: 'Orange',
      status: 'Open',
    });
  });
});

describe('emergencyStore staff reassignment', () => {
  it('updates assigned staff lists and logs reassignment context', () => {
    const patientId = 'pt-005';

    useEmergencyStore.getState().assignStaff(patientId, 'staff-michael-chen', {
      actorStaffId: 'staff-priya-nair',
      actorName: 'Priya Nair',
      fromStaffName: 'Priya Nair',
      toStaffName: 'Michael Chen',
      reason: 'Workload balance panel reassignment',
    });

    const state = useEmergencyStore.getState();
    const patient = state.patients.find((candidate) => candidate.id === patientId);
    const fromStaff = state.staff.find((candidate) => candidate.id === 'staff-priya-nair');
    const toStaff = state.staff.find((candidate) => candidate.id === 'staff-michael-chen');

    expect(patient?.assignedStaffId).toBe('staff-michael-chen');
    expect(fromStaff?.assignedPatientIds).not.toContain(patientId);
    expect(toStaff?.assignedPatientIds).toContain(patientId);
    expect(patient?.timeline.at(-1)).toMatchObject({
      type: 'StaffAssignment',
      summary: 'Reassigned from Priya Nair to Michael Chen.',
      metadata: expect.objectContaining({
        fromStaffId: 'staff-priya-nair',
        toStaffId: 'staff-michael-chen',
        reason: 'Workload balance panel reassignment',
      }),
    });
  });
});

describe('emergencyStore fast referrals', () => {
  it('sends referral from patient record and raises immediate receiving-service alert', () => {
    const patientId = 'pt-005';

    useEmergencyStore.getState().createReferral({
      patientId,
      requestingStaffId: 'staff-priya-nair',
      targetDepartment: 'Cardiology',
      urgency: 'Urgent',
      reason: 'Chest pain requiring cardiology review',
      clinicalSummary: 'Aarav Patel, 54, Male. Chest pain with abnormal ECG concern.',
      status: 'Sent',
    });

    const state = useEmergencyStore.getState();
    const referral = state.referrals.find(
      (candidate) => candidate.patientId === patientId && candidate.targetDepartment === 'Cardiology'
    );
    const patient = state.patients.find((candidate) => candidate.id === patientId);
    const activeAlerts = selectActiveAlerts(state);

    expect(referral).toMatchObject({
      status: 'Sent',
      urgency: 'Urgent',
      clinicalSummary: expect.stringContaining('Chest pain'),
    });
    expect(patient?.referral?.id).toBe(referral?.id);
    expect(patient?.timeline.at(-1)).toMatchObject({
      type: 'ReferralCreated',
      metadata: expect.objectContaining({
        targetDepartment: 'Cardiology',
        urgency: 'Urgent',
      }),
    });
    expect(activeAlerts.find((alert) => alert.id === `alert-referral-sent-${referral?.id}`)).toMatchObject({
      type: 'Referral',
      title: 'Referral sent to Cardiology',
      patientId,
    });
  });

  it('escalates urgent referrals when they remain unacknowledged', () => {
    const patientId = 'pt-005';
    useEmergencyStore.getState().createReferral({
      patientId,
      requestingStaffId: 'staff-priya-nair',
      targetDepartment: 'Cardiology',
      urgency: 'Urgent',
      reason: 'Chest pain requiring cardiology review',
      clinicalSummary: 'Referral summary.',
      status: 'Sent',
    });

    const referral = useEmergencyStore
      .getState()
      .referrals.find((candidate) => candidate.patientId === patientId && candidate.targetDepartment === 'Cardiology');

    useEmergencyStore.setState((state) => ({
      referrals: state.referrals.map((candidate) =>
        candidate.id === referral?.id
          ? { ...candidate, requestedAt: new Date(Date.now() - 31 * 60_000).toISOString() }
          : candidate
      ),
    }));
    useEmergencyStore.getState().updateAlerts();

    const activeAlerts = selectActiveAlerts(useEmergencyStore.getState());
    expect(activeAlerts.find((alert) => alert.id === `alert-referral-critical-unacknowledged-${referral?.id}`)).toMatchObject({
      severity: 'Critical',
      message: expect.stringMatching(/without acknowledgement/i),
      patientId,
    });
  });
});

describe('emergencyStore long wait rescue', () => {
  it('flags a P3 waiting 45 minutes as critical and moves them to the top of reassessment', () => {
    const basePatient = useEmergencyStore.getState().patients.find((candidate) => candidate.id === 'pt-005');
    expect(basePatient).toBeTruthy();
    const arrivalTime = new Date(Date.now() - 45 * 60_000).toISOString();
    const waitingPatient = {
      ...basePatient!,
      id: 'pt-long-wait-p3',
      firstName: 'Mrs.',
      lastName: 'Chen',
      name: 'Mrs. Chen',
      state: PatientState.Waiting,
      priority: Priority.P3,
      arrivalTime,
      flags: [],
      timeline: [],
      notes: [],
    };

    useEmergencyStore.setState((state) => ({
      ...state,
      patients: [waitingPatient],
      alerts: [],
      activeQueueFilter: null,
    }));
    useEmergencyStore.getState().updateAlerts();

    const state = useEmergencyStore.getState();
    const patient = state.patients.find((candidate) => candidate.id === waitingPatient.id);
    const activeAlerts = selectActiveAlerts(state);
    const reassessmentQueue = selectReassessmentQueue(state);

    expect(patient && hasPatientFlag(patient, 'LongWait')).toBe(true);
    expect(patient && hasPatientFlag(patient, 'ReassessmentDue')).toBe(true);
    expect(patient?.flags.find((flag) => flag.type === 'ReassessmentDue')).toMatchObject({
      reason: 'Critical wait time breach',
      severity: 'Critical',
    });
    expect(reassessmentQueue[0]).toMatchObject({
      patientId: waitingPatient.id,
      reasons: expect.arrayContaining(['Critical wait time breach']),
    });
    expect(activeAlerts.find((alert) => alert.id === `alert-long-wait-critical-${waitingPatient.id}`)).toMatchObject({
      severity: 'Critical',
      title: 'Critical long wait breach',
      patientId: waitingPatient.id,
    });
  });
});

describe('emergencyStore reassessment reminders', () => {
  it('schedules a reminder, alerts when due, and adds patient to reassessment queue', () => {
    const patientId = 'pt-005';
    const reminder = useEmergencyStore.getState().scheduleReassessmentReminder(patientId, {
      scheduledBy: 'staff-priya-nair',
      dueAt: new Date(Date.now() - 60_000).toISOString(),
      note: 'Recheck BP after metoprolol',
    });

    expect(reminder).toBeTruthy();

    useEmergencyStore.getState().updateAlerts();

    const state = useEmergencyStore.getState();
    const patient = state.patients.find((candidate) => candidate.id === patientId);
    const activeAlerts = selectActiveAlerts(state);

    expect(patient?.reassessmentReminders?.[0]).toMatchObject({
      id: reminder!.id,
      status: 'pending',
      note: 'Recheck BP after metoprolol',
    });
    expect(patient && hasPatientFlag(patient, 'ReassessmentDue')).toBe(true);
    expect(selectReassessmentQueue(state).some((item) => item.patientId === patientId)).toBe(true);
    expect(activeAlerts.find((alert) => alert.reminderId === reminder!.id)).toMatchObject({
      actionType: 'REASSESSMENT_REMINDER',
      patientId,
    });
  });

  it('snoozes and completes reminders while logging timeline events', () => {
    const patientId = 'pt-005';
    const reminder = useEmergencyStore.getState().scheduleReassessmentReminder(patientId, {
      scheduledBy: 'staff-priya-nair',
      dueAt: new Date(Date.now() - 60_000).toISOString(),
    });

    useEmergencyStore.getState().updateAlerts();
    useEmergencyStore.getState().snoozeReassessmentReminder(patientId, reminder!.id, 10);

    let patient = useEmergencyStore.getState().patients.find((candidate) => candidate.id === patientId);
    expect(patient?.reassessmentReminders?.[0]).toMatchObject({
      id: reminder!.id,
      status: 'snoozed',
    });
    expect(patient?.timeline.at(-1)).toMatchObject({
      type: 'ReassessmentReminderSnoozed',
    });

    useEmergencyStore.getState().completeReassessmentReminder(patientId, reminder!.id, {
      completedBy: 'staff-priya-nair',
      timestamp: '2026-06-11T20:55:00-04:00',
    });

    patient = useEmergencyStore.getState().patients.find((candidate) => candidate.id === patientId);
    expect(patient?.reassessmentReminders?.[0]).toMatchObject({
      id: reminder!.id,
      status: 'completed',
      completedAt: '2026-06-11T20:55:00-04:00',
    });
    expect(patient?.timeline.at(-1)).toMatchObject({
      type: 'ReassessmentReminderCompleted',
    });
  });
});

describe('emergencyStore vitals alert pipeline', () => {
  it('fires critical response, flags patient, and broadcasts alert for SpO2 below 88', () => {
    const patientId = 'pt-005';

    useEmergencyStore.getState().addVitals(patientId, {
      hr: 88,
      bpSystolic: 122,
      bpDiastolic: 76,
      spo2: 85,
      temp: 36.7,
      rr: 18,
      gcs: 15,
      pain: 2,
      recordedAt: '2026-06-11T21:04:00-04:00',
    });

    const state = useEmergencyStore.getState();
    const patient = state.patients.find((candidate) => candidate.id === patientId);
    const activeAlerts = selectActiveAlerts(state);

    expect(patient && hasPatientFlag(patient, 'DeteriorationRisk')).toBe(true);
    expect(patient && hasPatientFlag(patient, 'HighRisk')).toBe(true);
    expect(patient && hasPatientFlag(patient, 'ReassessmentDue')).toBe(true);
    expect(patient?.vitalsAlerts?.[0]).toMatchObject({
      severity: 'critical',
      status: 'active',
      vital: 'SpO2',
      value: 85,
    });
    expect(activeAlerts.find((alert) => alert.actionType === 'VITALS_CRITICAL')).toMatchObject({
      severity: 'Critical',
      patientId,
      title: expect.stringMatching(/CRITICAL: SpO2 85%/),
    });
  });

  it('fires warning response and can mark vitals alert addressed', () => {
    const patientId = 'pt-005';

    useEmergencyStore.getState().addVitals(patientId, {
      hr: 130,
      bpSystolic: 122,
      bpDiastolic: 76,
      spo2: 97,
      temp: 36.7,
      rr: 18,
      gcs: 15,
      pain: 2,
      recordedAt: '2026-06-11T21:04:00-04:00',
    });

    let patient = useEmergencyStore.getState().patients.find((candidate) => candidate.id === patientId);
    const alertId = patient?.vitalsAlerts?.[0]?.id;

    expect(alertId).toBeTruthy();
    expect(patient && hasPatientFlag(patient, 'ReassessmentDue')).toBe(true);
    expect(patient?.vitalsAlerts?.[0]).toMatchObject({
      severity: 'warning',
      status: 'active',
      vital: 'HR',
      value: 130,
    });

    useEmergencyStore.getState().acknowledgeVitalsAlert(patientId, alertId!, 'staff-priya-nair');

    patient = useEmergencyStore.getState().patients.find((candidate) => candidate.id === patientId);
    expect(patient?.vitalsAlerts?.[0]).toMatchObject({
      status: 'addressed',
      acknowledgedBy: 'staff-priya-nair',
    });
    expect(patient?.timeline.at(-1)).toMatchObject({
      type: 'VitalsAlertAddressed',
    });
  });
});
