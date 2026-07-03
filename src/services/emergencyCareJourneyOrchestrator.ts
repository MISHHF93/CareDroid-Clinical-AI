/**
 * Emergency care journey orchestrator — connects prehospital and in-hospital stages
 * through EmergencySignalService traces, the live EMS store, and the 3-minute response objective.
 */

import {
  PatientState,
  Priority,
  type CallPriority,
  type DispatchAssignment,
  type EMSArrival,
  type EmergencyCall,
  type EmergencyCallStatus,
  type EntityId,
  type Patient,
  type Sex,
} from '../types/emergency';
import { useEmergencyStore } from '../store/emergencyStore';
import {
  advanceJourney,
  getTraceByCallId,
  getTraceByPatientId,
  markThreeMinuteBreach,
  startJourney,
  type EmergencyJourneyTrace,
  type JourneyStage,
} from './emergencySignalService';
import { linkCallToEmsArrival, linkCallToPatient } from './dispatchIntakeService';
import { createPrehospitalAssessment } from './prehospitalAssessmentService';
import { registerLinkedInboundPatient } from './emsPreArrivalPipelineService';
import { startResponseTimer } from '../engine/threeMinuteTimerEngine';

type ActorMeta = {
  actorId?: EntityId;
  actorRole?: string;
};

function priorityToEmsSeverity(priority: CallPriority): EMSArrival['severity'] {
  if (priority === 'Echo' || priority === 'Delta') return 'Critical';
  if (priority === 'Charlie') return 'High';
  return 'Moderate';
}

function normalizePatientSex(value: EmergencyCall['patientSex'] | undefined): Sex {
  if (value === 'male') return 'Male';
  if (value === 'female') return 'Female';
  return 'Unknown';
}

function priorityToPatientPriority(priority: CallPriority): Priority {
  if (priority === 'Echo') return Priority.P1;
  if (priority === 'Delta') return Priority.P2;
  if (priority === 'Charlie') return Priority.P3;
  return Priority.P4;
}

function advanceTrace(
  trace: EmergencyJourneyTrace | null,
  stage: JourneyStage,
  meta?: ActorMeta & { patientId?: EntityId; linkedEmsArrivalId?: EntityId; payload?: Record<string, unknown> },
): EmergencyJourneyTrace | null {
  if (!trace) return null;
  return advanceJourney(trace.traceId, stage, meta);
}

function buildEmsArrivalFromDispatch(call: EmergencyCall, assignment: DispatchAssignment): EMSArrival {
  const etaMinutes = assignment.estimatedResponseMinutes ?? 8;
  const dispatchTime = assignment.assignedAt || new Date().toISOString();
  return {
    id: `ems-${call.id}`,
    unitId: assignment.unit.id,
    unitName: assignment.unit.callSign,
    crewNames: ['Field Crew'],
    patientAge: call.patientAge ?? 0,
    patientSex: normalizePatientSex(call.patientSex),
    chiefComplaint: call.chiefComplaint,
    mechanismOfInjury: undefined,
    eta: etaMinutes,
    severity: priorityToEmsSeverity(call.callPriority),
    dispatchTime,
    estimatedArrivalTime: new Date(Date.now() + etaMinutes * 60_000).toISOString(),
    notes: assignment.specialInstructions || `Dispatched for ${call.location.address}`,
    status: 'Inbound',
    prearrivalComplaint: call.chiefComplaint,
    priority: priorityToPatientPriority(call.callPriority),
    preArrivalNotification: {
      framework: 'mist',
      submittedAt: dispatchTime,
      submittedBy: assignment.unit.callSign,
      source: 'integration',
    },
  };
}

export function onEmergencyCallLogged(call: EmergencyCall, meta: ActorMeta = {}): EmergencyJourneyTrace {
  return startJourney({
    callId: call.id,
    initialStage: 'call_received',
    actorId: meta.actorId ?? call.dispatcherId,
    actorRole: meta.actorRole ?? 'dispatcher',
  });
}

export function onDispatcherTriage(callId: EntityId, meta: ActorMeta = {}): EmergencyJourneyTrace | null {
  const trace = getTraceByCallId(callId);
  return advanceTrace(trace, 'dispatcher_triage', {
    actorId: meta.actorId,
    actorRole: meta.actorRole ?? 'dispatcher',
    payload: { source: 'dispatch-console' },
  });
}

export function onEmsUnitDispatched(
  call: EmergencyCall,
  assignment: DispatchAssignment,
  meta: ActorMeta = {},
): { trace: EmergencyJourneyTrace | null; emsArrival: EMSArrival } {
  const store = useEmergencyStore.getState();
  const emsArrival = buildEmsArrivalFromDispatch(call, assignment);

  store.addEMSArrival(emsArrival);
  linkCallToEmsArrival(call.id, emsArrival.id);

  registerLinkedInboundPatient({
    id: emsArrival.id,
    patientLabel: `CAD ${call.callNumber}`,
    unit: emsArrival.unitName,
    etaMinutes: emsArrival.eta,
    complaint: emsArrival.chiefComplaint,
    vitals: {},
    riskScoreBundle: [],
    riskIndicators: call.patientConscious === false || call.patientBreathing === false ? ['life-threat'] : [],
    riskLevel: emsArrival.severity === 'Critical' ? 'critical' : 'high',
    handoffSummary: emsArrival.notes,
    notificationStatus: 'pending',
    journeyState: 'ems-en-route',
    handoffStatus: 'En Route',
    linkedCallId: call.id,
  });

  let trace = getTraceByCallId(call.id);
  if (!trace) {
    trace = onEmergencyCallLogged(call, meta);
  }
  trace = advanceTrace(trace, 'ems_dispatched', {
    actorId: meta.actorId ?? assignment.dispatchedBy,
    actorRole: meta.actorRole ?? 'dispatcher',
    linkedEmsArrivalId: emsArrival.id,
    payload: { unit: assignment.unit.callSign, etaMinutes: assignment.estimatedResponseMinutes },
  });
  trace = advanceTrace(trace, 'ems_en_route', {
    linkedEmsArrivalId: emsArrival.id,
    payload: { unit: assignment.unit.callSign },
  });

  createPrehospitalAssessment({
    callId: call.id,
    assignmentId: assignment.id,
    crewLeadId: assignment.unit.id,
    crewLeadName: assignment.unit.callSign,
    mechanism: 'Field response',
    chiefComplaint: call.chiefComplaint,
    pediatricPatient: Boolean(call.patientAge && call.patientAge < 18),
  });

  return { trace, emsArrival };
}

export function onHospitalPreAlert(callId: EntityId, emsArrivalId?: EntityId, meta: ActorMeta = {}): EmergencyJourneyTrace | null {
  const trace = getTraceByCallId(callId);
  let updated = advanceTrace(trace, 'hospital_pre_notification', {
    actorId: meta.actorId,
    actorRole: meta.actorRole ?? 'dispatcher',
    linkedEmsArrivalId: emsArrivalId,
  });
  updated = advanceTrace(updated, 'ed_readiness_activated', {
    actorId: meta.actorId,
    actorRole: meta.actorRole ?? 'charge_nurse',
    linkedEmsArrivalId: emsArrivalId,
  });
  return updated;
}

function resolveTraceForEmsArrival(arrival: EMSArrival): EmergencyJourneyTrace | null {
  const linkedCallId = resolveLinkedCallIdForEmsArrival(arrival);
  return (
    (linkedCallId ? getTraceByCallId(linkedCallId) : null) ||
    (arrival.patientId ? getTraceByPatientId(arrival.patientId) : null)
  );
}

export function onEmsArrivalStatusChange(
  arrival: EMSArrival,
  previousStatus: EMSArrival['status'],
  meta: ActorMeta = {},
): EmergencyJourneyTrace | null {
  const trace = resolveTraceForEmsArrival(arrival);
  if (!trace) return null;

  if (arrival.status === 'Arrived' && previousStatus !== 'Arrived') {
    let updated = advanceTrace(trace, 'ems_on_scene', {
      linkedEmsArrivalId: arrival.id,
      actorRole: meta.actorRole ?? 'paramedic',
    });
    updated = advanceTrace(updated, 'prehospital_assessment', {
      linkedEmsArrivalId: arrival.id,
      patientId: arrival.patientId,
    });
    if (arrival.patientId) {
      updated = advanceTrace(updated, 'patient_arrival', {
        patientId: arrival.patientId,
        linkedEmsArrivalId: arrival.id,
        actorRole: 'paramedic',
      });
    }
    return updated;
  }

  if (arrival.status === 'Handoff' && previousStatus !== 'Handoff') {
    return advanceTrace(trace, 'ems_transporting', {
      linkedEmsArrivalId: arrival.id,
      patientId: arrival.patientId,
      actorRole: meta.actorRole ?? 'paramedic',
    });
  }

  if (arrival.status === 'Complete' && arrival.patientId) {
    return advanceTrace(trace, 'rapid_intake', {
      patientId: arrival.patientId,
      linkedEmsArrivalId: arrival.id,
      actorRole: meta.actorRole ?? 'registered_nurse',
      payload: { emsHandoffComplete: true },
    });
  }

  return trace;
}

export function onDispatchCallStatusChange(
  callId: EntityId,
  status: EmergencyCallStatus,
  meta: ActorMeta = {},
): EmergencyJourneyTrace | null {
  const trace = getTraceByCallId(callId);
  if (!trace) return null;

  switch (status) {
    case 'ems_en_route':
      return advanceTrace(trace, 'ems_en_route', { actorRole: meta.actorRole ?? 'paramedic' });
    case 'ems_on_scene':
      return advanceTrace(trace, 'ems_on_scene', { actorRole: meta.actorRole ?? 'paramedic' });
    case 'ems_transporting':
      return advanceTrace(trace, 'ems_transporting', { actorRole: meta.actorRole ?? 'paramedic' });
    case 'hospital_notified':
      return onHospitalPreAlert(callId, trace.emsArrivalId, meta);
    default:
      return trace;
  }
}

export function syncJourneyFromPatientStateTransition(
  patientId: EntityId,
  fromState: PatientState,
  toState: PatientState,
  meta: ActorMeta = {},
): EmergencyJourneyTrace | null {
  if (fromState === toState) return getTraceByPatientId(patientId);

  switch (toState) {
    case PatientState.Registration:
    case PatientState.Arrival:
      return onPatientArrivalAtReception(patientId, { actorName: meta.actorRole });
    case PatientState.Triage:
      return onTriageAcuityConfirmed(patientId, meta);
    case PatientState.Assessment:
      return onClinicalActionStarted(patientId, meta);
    case PatientState.Orders:
      return onDiagnosticsOrdered(patientId, meta);
    case PatientState.Results:
    case PatientState.Waiting:
      return onTreatmentInProgress(patientId);
    case PatientState.Disposition:
    case PatientState.Admission:
      return onDispositionDecided(patientId, meta);
    case PatientState.Discharge:
    case PatientState.Deceased:
      return onHandoffComplete(patientId, meta);
    default:
      return getTraceByPatientId(patientId);
  }
}

export function onPatientArrivalAtReception(
  patientId: EntityId,
  options: { callId?: EntityId; emsArrivalId?: EntityId; actorName?: string } = {},
): EmergencyJourneyTrace | null {
  if (options.callId) {
    linkCallToPatient(options.callId, patientId);
  }

  const trace =
    (options.callId ? getTraceByCallId(options.callId) : null) ||
    getTraceByPatientId(patientId);

  let updated = trace;
  if (!updated && options.callId) {
    updated = startJourney({ callId: options.callId, patientId, initialStage: 'patient_arrival' });
  } else {
    updated = advanceTrace(updated, 'patient_arrival', {
      patientId,
      linkedEmsArrivalId: options.emsArrivalId,
      actorRole: 'registration_clerk',
      payload: { actorName: options.actorName },
    });
  }
  return updated;
}

export function onRapidIntakeCompleted(
  patient: Patient,
  options: { criticalAlertId?: string; actorName?: string } = {},
): EmergencyJourneyTrace | null {
  let trace = getTraceByPatientId(patient.id);
  if (!trace) {
    trace = startJourney({ patientId: patient.id, initialStage: 'rapid_intake' });
  }

  let updated = advanceTrace(trace, 'rapid_intake', {
    patientId: patient.id,
    actorRole: 'registration_clerk',
    payload: { actorName: options.actorName, chiefComplaint: patient.chiefComplaint },
  });

  updated = advanceTrace(updated, 'triage_assigned', {
    patientId: patient.id,
    actorRole: 'triage_nurse',
    payload: { priority: patient.priority, triagePending: true },
  });

  const needsThreeMinute =
    patient.priority === Priority.P1 ||
    patient.priority === Priority.P2 ||
    options.criticalAlertId;

  if (needsThreeMinute && options.criticalAlertId) {
    startResponseTimer(patient.id, options.criticalAlertId, 'triage_nurse');
  } else if (needsThreeMinute) {
    const store = useEmergencyStore.getState();
    const alert = store.alerts.find(
      (entry) => entry.patientId === patient.id && entry.severity === 'Critical' && !entry.dismissed,
    );
    if (alert) {
      startResponseTimer(patient.id, alert.id, 'triage_nurse');
    }
  }

  void import('../engine/unifiedWorkflowAutomationEngine').then(({ scheduleWorkflowAutomationRefresh }) =>
    scheduleWorkflowAutomationRefresh('journey_state_changed'),
  );

  return updated;
}

export function onTriageAcuityConfirmed(patientId: EntityId, meta: ActorMeta = {}): EmergencyJourneyTrace | null {
  const trace = getTraceByPatientId(patientId);
  return advanceTrace(trace, 'triage_assigned', {
    patientId,
    actorId: meta.actorId,
    actorRole: meta.actorRole ?? 'triage_nurse',
  });
}

export function onClinicalActionStarted(patientId: EntityId, meta: ActorMeta = {}): EmergencyJourneyTrace | null {
  const trace = getTraceByPatientId(patientId);
  let updated = advanceTrace(trace, 'ai_chief_reviewed', { patientId, actorRole: meta.actorRole ?? 'emergency_physician' });
  updated = advanceTrace(updated, 'clinical_action', { patientId, actorRole: meta.actorRole ?? 'emergency_physician' });
  return updated;
}

export function onDiagnosticsOrdered(patientId: EntityId, meta: ActorMeta = {}): EmergencyJourneyTrace | null {
  const trace = getTraceByPatientId(patientId);
  return advanceTrace(trace, 'diagnostics_ordered', { patientId, actorRole: meta.actorRole ?? 'emergency_physician' });
}

export function onTreatmentInProgress(patientId: EntityId): EmergencyJourneyTrace | null {
  const trace = getTraceByPatientId(patientId);
  return advanceTrace(trace, 'treatment_in_progress', { patientId, actorRole: 'registered_nurse' });
}

export function onDispositionDecided(patientId: EntityId, meta: ActorMeta = {}): EmergencyJourneyTrace | null {
  const trace = getTraceByPatientId(patientId);
  return advanceTrace(trace, 'disposition_decided', { patientId, actorRole: meta.actorRole ?? 'emergency_physician' });
}

export function onHandoffComplete(patientId: EntityId, meta: ActorMeta = {}): EmergencyJourneyTrace | null {
  const trace = getTraceByPatientId(patientId);
  let updated = advanceTrace(trace, 'handoff_complete', { patientId, actorRole: meta.actorRole ?? 'registered_nurse' });
  updated = advanceTrace(updated, 'outcome_recorded', { patientId, actorRole: 'quality_safety_officer' });
  updated = advanceTrace(updated, 'analytics_fed', { patientId, actorRole: 'hospital_administrator' });
  return updated;
}

export function onThreeMinuteBreachForPatient(patientId: EntityId): void {
  const trace = getTraceByPatientId(patientId);
  if (trace) {
    markThreeMinuteBreach(trace.traceId);
  }
}

export function resolveLinkedCallIdForEmsArrival(arrival: EMSArrival): EntityId | undefined {
  if (!arrival.id.startsWith('ems-')) return undefined;
  return arrival.id.slice(4);
}