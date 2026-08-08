/**
 * Canonical patient workflow orchestrator — single implementation for arrival through discharge.
 * Carries context, synchronizes operational surfaces, triggers automation/AI, and notifies roles.
 */
import { movePatientToState as journeyMovePatientToState } from '../engine/journeyEngine';
import {
  estimateWorkflowClicksSaved,
  resolveWorkflowRouteForState,
  resolveWorkflowStepForState,
  type PatientWorkflowStepId,
} from '../config/unifiedPatientWorkflowModel';
import { isWorkflowAutomationTriggerEvent } from '../config/unifiedWorkflowAutomationModel';
import { getArrivalReasonFromPatient } from './intakeEncounterChain';
import { syncArrivalOperationalSurfaces } from './arrivalControlLayer';
import { buildClientTriageAssist } from './triageAssist';
import { PatientState, type Patient } from '../types/emergency';
import type { useEmergencyStore } from '../store/emergencyStore';
import { startWorkflowTrace } from './observabilityTrace';

export type PatientWorkflowStore = Pick<
  ReturnType<typeof useEmergencyStore.getState>,
  | 'patients'
  | 'emergencySettings'
  | 'referrals'
  | 'dispatchWebSocketEvent'
  | 'recordWorkflowAction'
  | 'updatePatient'
  | 'updateCapacity'
  | 'updateAlerts'
  | 'refreshAdministrativeAutomationsAsync'
  | 'selectPatient'
>;

export type PatientWorkflowTransitionSource =
  | 'intake-handoff'
  | 'patient-journey-engine'
  | 'whiteboard'
  | 'queues'
  | 'reception'
  | 'smart-intake'
  | 'quick-intake'
  | 'express-register'
  | 'capacity-crisis'
  | 'referral-panel'
  | 'manual';

export type PatientWorkflowTransitionOptions = Readonly<{
  patientId: string;
  fromState: PatientState;
  toState: PatientState;
  source?: PatientWorkflowTransitionSource;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  note?: string;
  encounterId?: string | null;
  skipJourneyEngine?: boolean;
  skipStoreTransition?: boolean;
}>;

export type PatientWorkflowContext = Readonly<{
  patientId: string;
  patientName: string;
  fromState: PatientState;
  toState: PatientState;
  fromStepId: PatientWorkflowStepId | null;
  toStepId: PatientWorkflowStepId | null;
  encounterId: string | null;
  arrivalReason: string;
  chiefComplaint: string;
  route: string;
  ownerRole: string;
  automationEvent: string;
  clicksSavedEstimate: number;
}>;

export type PatientWorkflowTransitionResult = Readonly<{
  ok: boolean;
  context: PatientWorkflowContext | null;
  nextRoute: string;
}>;

function patientLabel(patient: Patient): string {
  return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.mrn || patient.id;
}

function resolveEncounterId(patient: Patient, override?: string | null): string | null {
  if (override !== undefined) return override;
  const encounter = (patient as Patient & { encounterId?: string }).encounterId;
  return encounter || null;
}

export function buildPatientWorkflowContext(
  patient: Patient,
  fromState: PatientState,
  toState: PatientState,
  encounterId?: string | null,
): PatientWorkflowContext {
  const fromStep = resolveWorkflowStepForState(fromState);
  const toStep = resolveWorkflowStepForState(toState);
  return Object.freeze({
    patientId: patient.id,
    patientName: patientLabel(patient),
    fromState,
    toState,
    fromStepId: fromStep?.id || null,
    toStepId: toStep?.id || null,
    encounterId: resolveEncounterId(patient, encounterId),
    arrivalReason: getArrivalReasonFromPatient(patient),
    chiefComplaint: patient.chiefComplaint || '',
    route: resolveWorkflowRouteForState(toState, patient.id),
    ownerRole: toStep?.ownerRole || 'charge_nurse',
    automationEvent: toStep?.automationEvent || 'journey_state_changed',
    clicksSavedEstimate: estimateWorkflowClicksSaved(fromState, toState),
  });
}

/**
 * Post-transition sync: dashboards, alerts, automation queue, AI Chief, and role notifications.
 * Call after any patient state change or intake handoff.
 */
export function syncPatientWorkflowSurfaces(
  store: PatientWorkflowStore,
  options: PatientWorkflowTransitionOptions & { context: PatientWorkflowContext },
): void {
  const { patientId, toState, source = 'patient-journey-engine', actorName, context } = options;
  const automationEvent = isWorkflowAutomationTriggerEvent(context.automationEvent)
    ? context.automationEvent
    : 'journey_state_changed';

  store.dispatchWebSocketEvent?.({
    type: automationEvent,
    payload: {
      patientId,
      fromState: context.fromState,
      toState,
      encounterId: context.encounterId,
      arrivalReason: context.arrivalReason,
      route: context.route,
      ownerRole: context.ownerRole,
      source,
      surfaces: 'whiteboard,queues,analytics,workflow-automation,ai-chief',
      clicksSavedEstimate: context.clicksSavedEstimate,
      generatedAt: new Date().toISOString(),
    },
  });

  store.recordWorkflowAction({
    type: automationEvent,
    summary: `${context.patientName} advanced from ${context.fromState} to ${toState}.`,
    patientId,
    actorName,
    source,
    metadata: {
      workflow: 'unified-patient-workflow',
      fromState: context.fromState,
      toState,
      encounterId: context.encounterId,
      arrivalReason: context.arrivalReason,
      ownerRole: context.ownerRole,
      nextRoute: context.route,
      clicksSavedEstimate: context.clicksSavedEstimate,
    },
  });

  if (toState === PatientState.Triage || context.fromState === PatientState.Registration) {
    syncArrivalOperationalSurfaces(store as Parameters<typeof syncArrivalOperationalSurfaces>[0], patientId, {
      destination: 'triage-queue',
      source,
    });
  }

  const patient = store.patients.find((entry) => entry.id === patientId);
  if (patient && (toState === PatientState.Triage || toState === PatientState.Assessment) && !patient.triageAssist) {
    const triageAssist = buildClientTriageAssist(patient, store.patients, {
      arrivalReason: context.arrivalReason,
      complaintCategory: patient.complaintCategory,
      handoffSource: source,
    });
    store.updatePatient(patientId, {
      triageAssist,
      triageAssistGeneratedAt: triageAssist.generatedAt,
    });
  }

  store.updateCapacity?.();
  store.updateAlerts?.();
  void store.refreshAdministrativeAutomationsAsync?.();

  void import('../engine/unifiedWorkflowAutomationEngine').then(({ scheduleWorkflowAutomationRefresh }) =>
    scheduleWorkflowAutomationRefresh(automationEvent),
  );

  void import('./emergencyCareJourneyOrchestrator').then(({ syncJourneyFromPatientStateTransition }) =>
    syncJourneyFromPatientStateTransition(patientId, context.fromState, toState, {
      actorId: options.actorId,
      actorRole: options.actorRole || options.actorName,
    }),
  );
}

export function afterPatientWorkflowTransition(
  store: PatientWorkflowStore,
  options: PatientWorkflowTransitionOptions,
): PatientWorkflowTransitionResult {
  const trace = startWorkflowTrace('patient-workflow-transition', {
    patientId: options.patientId,
    source: options.source,
    summary: `Transition ${options.fromState} → ${options.toState}`,
    metadata: {
      fromState: options.fromState,
      toState: options.toState,
      actorId: options.actorId,
    },
  });

  const patient = store.patients.find((entry) => entry.id === options.patientId);
  if (!patient) {
    trace.end('error', { reason: 'patient_not_found' });
    return Object.freeze({
      ok: false,
      context: null,
      nextRoute: resolveWorkflowRouteForState(options.toState),
    });
  }

  const context = buildPatientWorkflowContext(
    patient,
    options.fromState,
    options.toState,
    options.encounterId,
  );

  syncPatientWorkflowSurfaces(store, { ...options, context });
  store.selectPatient?.(options.patientId);
  trace.end('success', {
    toStepId: context.toStepId,
    nextRoute: context.route,
    automationEvent: context.automationEvent,
  });

  return Object.freeze({
    ok: true,
    context,
    nextRoute: context.route,
  });
}

/**
 * Canonical state transition — validates FSM, moves patient via journeyEngine.
 * Post-transition sync runs from emergencyStore.movePatientToState / dischargePatient.
 */
export function advancePatientWorkflow(
  store: PatientWorkflowStore,
  patientId: string,
  targetState: PatientState,
  options: Omit<PatientWorkflowTransitionOptions, 'patientId' | 'fromState' | 'toState'> = {},
): PatientWorkflowTransitionResult {
  const patient = store.patients.find((entry) => entry.id === patientId);
  if (!patient) {
    return Object.freeze({
      ok: false,
      context: null,
      nextRoute: resolveWorkflowRouteForState(targetState),
    });
  }

  const fromState = patient.state;

  if (!options.skipStoreTransition) {
    journeyMovePatientToState(patientId, targetState, {
      staffId: options.actorId,
      note: options.note,
    });
  } else {
    return afterPatientWorkflowTransition(store, {
      patientId,
      fromState,
      toState: targetState,
      ...options,
    });
  }

  const latest = store.patients.find((entry) => entry.id === patientId);
  const context = latest
    ? buildPatientWorkflowContext(latest, fromState, targetState, options.encounterId)
    : null;

  return Object.freeze({
    ok: Boolean(latest),
    context,
    nextRoute: context?.route || resolveWorkflowRouteForState(targetState, patientId),
  });
}