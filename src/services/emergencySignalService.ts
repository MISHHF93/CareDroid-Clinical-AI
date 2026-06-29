/**
 * EmergencySignalService — full-journey signal tracker.
 *
 * Captures the lifecycle signal for each emergency event from first contact
 * (911 call) through to hospital outcome. Provides a read-only audit trail
 * that connects prehospital and in-hospital phases without duplicating state
 * owned by other services.
 */

import type { EntityId, ISODateString } from '../types/emergency';

export type JourneyStage =
  | 'emergency_event'
  | 'call_received'
  | 'dispatcher_triage'
  | 'ems_dispatched'
  | 'ems_en_route'
  | 'ems_on_scene'
  | 'prehospital_assessment'
  | 'ems_transporting'
  | 'hospital_pre_notification'
  | 'ed_readiness_activated'
  | 'patient_arrival'
  | 'rapid_intake'
  | 'triage_assigned'
  | 'ai_chief_reviewed'
  | 'clinical_action'
  | 'diagnostics_ordered'
  | 'treatment_in_progress'
  | 'disposition_decided'
  | 'handoff_complete'
  | 'outcome_recorded'
  | 'analytics_fed';

export interface JourneySignal {
  id: EntityId;
  stage: JourneyStage;
  eventAt: ISODateString;
  actorId?: EntityId;
  actorRole?: string;
  linkedCallId?: EntityId;
  linkedPatientId?: EntityId;
  linkedEmsArrivalId?: EntityId;
  payload?: Record<string, unknown>;
  durationFromPreviousMs?: number;
}

export interface EmergencyJourneyTrace {
  traceId: EntityId;
  callId?: EntityId;
  patientId?: EntityId;
  emsArrivalId?: EntityId;
  startedAt: ISODateString;
  lastUpdatedAt: ISODateString;
  currentStage: JourneyStage;
  signals: JourneySignal[];
  threeMinuteTimerStartedAt?: ISODateString;
  threeMinuteBreachOccurred: boolean;
}

const journeyTraces = new Map<EntityId, EmergencyJourneyTrace>();
const callToTrace = new Map<EntityId, EntityId>();
const patientToTrace = new Map<EntityId, EntityId>();

function generateId(): string {
  return `trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function signalId(): string {
  return `sig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function startJourney(params: {
  callId?: EntityId;
  patientId?: EntityId;
  initialStage?: JourneyStage;
  actorId?: EntityId;
  actorRole?: string;
}): EmergencyJourneyTrace {
  const traceId = generateId();
  const now = new Date().toISOString();
  const stage: JourneyStage = params.initialStage ?? 'emergency_event';

  const firstSignal: JourneySignal = {
    id: signalId(),
    stage,
    eventAt: now,
    actorId: params.actorId,
    actorRole: params.actorRole,
    linkedCallId: params.callId,
    linkedPatientId: params.patientId,
  };

  const trace: EmergencyJourneyTrace = {
    traceId,
    callId: params.callId,
    patientId: params.patientId,
    startedAt: now,
    lastUpdatedAt: now,
    currentStage: stage,
    signals: [firstSignal],
    threeMinuteBreachOccurred: false,
  };

  journeyTraces.set(traceId, trace);
  if (params.callId) callToTrace.set(params.callId, traceId);
  if (params.patientId) patientToTrace.set(params.patientId, traceId);
  return trace;
}

export function advanceJourney(
  traceId: EntityId,
  stage: JourneyStage,
  meta?: {
    actorId?: EntityId;
    actorRole?: string;
    payload?: Record<string, unknown>;
    linkedEmsArrivalId?: EntityId;
    patientId?: EntityId;
  },
): EmergencyJourneyTrace | null {
  const trace = journeyTraces.get(traceId);
  if (!trace) return null;

  const now = new Date().toISOString();
  const prevSignal = trace.signals[trace.signals.length - 1];
  const durationFromPreviousMs = prevSignal
    ? Date.now() - new Date(prevSignal.eventAt).getTime()
    : undefined;

  const signal: JourneySignal = {
    id: signalId(),
    stage,
    eventAt: now,
    actorId: meta?.actorId,
    actorRole: meta?.actorRole,
    linkedCallId: trace.callId,
    linkedPatientId: meta?.patientId ?? trace.patientId,
    linkedEmsArrivalId: meta?.linkedEmsArrivalId ?? trace.emsArrivalId,
    payload: meta?.payload,
    durationFromPreviousMs,
  };

  const updated: EmergencyJourneyTrace = {
    ...trace,
    currentStage: stage,
    lastUpdatedAt: now,
    signals: [...trace.signals, signal],
    patientId: meta?.patientId ?? trace.patientId,
    emsArrivalId: meta?.linkedEmsArrivalId ?? trace.emsArrivalId,
  };

  if (meta?.patientId && meta.patientId !== trace.patientId) {
    patientToTrace.set(meta.patientId, traceId);
  }

  if (stage === 'triage_assigned' && !updated.threeMinuteTimerStartedAt) {
    (updated as EmergencyJourneyTrace).threeMinuteTimerStartedAt = now;
  }

  journeyTraces.set(traceId, updated);
  return updated;
}

export function markThreeMinuteBreach(traceId: EntityId): void {
  const trace = journeyTraces.get(traceId);
  if (!trace) return;
  journeyTraces.set(traceId, { ...trace, threeMinuteBreachOccurred: true });
}

export function getTraceByCallId(callId: EntityId): EmergencyJourneyTrace | null {
  const traceId = callToTrace.get(callId);
  return traceId ? (journeyTraces.get(traceId) ?? null) : null;
}

export function getTraceByPatientId(patientId: EntityId): EmergencyJourneyTrace | null {
  const traceId = patientToTrace.get(patientId);
  return traceId ? (journeyTraces.get(traceId) ?? null) : null;
}

export function getTrace(traceId: EntityId): EmergencyJourneyTrace | null {
  return journeyTraces.get(traceId) ?? null;
}

export function getAllTraces(): EmergencyJourneyTrace[] {
  return [...journeyTraces.values()];
}

export function getActiveTraces(): EmergencyJourneyTrace[] {
  const terminalStages: JourneyStage[] = ['outcome_recorded', 'analytics_fed'];
  return getAllTraces().filter((t) => !terminalStages.includes(t.currentStage));
}

export type JourneyMetrics = {
  activeJourneys: number;
  stageDistribution: Partial<Record<JourneyStage, number>>;
  avgPrehospitalMinutes: number | null;
  breachCount: number;
};

export function getJourneyMetrics(): JourneyMetrics {
  const all = getAllTraces();
  const stageDistribution: Partial<Record<JourneyStage, number>> = {};

  for (const trace of all) {
    stageDistribution[trace.currentStage] = (stageDistribution[trace.currentStage] ?? 0) + 1;
  }

  const prehospitalDurations: number[] = [];
  for (const trace of all) {
    const dispatch = trace.signals.find((s) => s.stage === 'ems_dispatched');
    const arrival = trace.signals.find((s) => s.stage === 'patient_arrival');
    if (dispatch && arrival) {
      const ms = new Date(arrival.eventAt).getTime() - new Date(dispatch.eventAt).getTime();
      prehospitalDurations.push(ms / 60_000);
    }
  }

  return {
    activeJourneys: getActiveTraces().length,
    stageDistribution,
    avgPrehospitalMinutes:
      prehospitalDurations.length
        ? Math.round(prehospitalDurations.reduce((a, b) => a + b, 0) / prehospitalDurations.length)
        : null,
    breachCount: all.filter((t) => t.threeMinuteBreachOccurred).length,
  };
}
