import { Priority } from '../../src/types/emergency';
import { HUMAN_REVIEW_DISCLAIMER } from '../ai/safetyPolicy';
import {
  suggestTriagePriority,
  type TriageSuggestionInput,
  type TriageVitalsInput,
} from '../../engine/triageEngine';
import type {
  TriageAssistBuildContext,
  TriageAssistEnvelope,
  TriageAssistLlmEnrichment,
  TriageAssistOperationalContext,
  TriageAssistPatientInput,
  TriageAssistSource,
} from './types';

export function mapPriorityToSuggestedQueue(priority: Priority): string {
  switch (priority) {
    case Priority.P1:
      return 'Resuscitation';
    case Priority.P2:
      return 'Emergent';
    case Priority.P3:
      return 'Urgent';
    case Priority.P4:
      return 'Semi-urgent';
    default:
      return 'Standard waiting';
  }
}

export function buildOperationalContextFromCounts(input: {
  triageCount?: number;
  waitingCount?: number;
  emsInboundCount?: number;
  capacityBand?: string;
}): TriageAssistOperationalContext {
  const triageQueueCount = input.triageCount ?? 0;
  const waitingQueueCount = input.waitingCount ?? 0;
  const emsInboundCount = input.emsInboundCount ?? 0;
  const totalPressure = triageQueueCount + waitingQueueCount + emsInboundCount;
  const queuePressure =
    totalPressure >= 12 || emsInboundCount >= 3
      ? 'high'
      : totalPressure >= 6
        ? 'medium'
        : 'low';

  return {
    triageQueueCount,
    waitingQueueCount,
    emsInboundCount,
    capacityBand: input.capacityBand,
    queuePressure,
  };
}

function complaintText(patient: TriageAssistPatientInput): string {
  return (
    patient.complaintText ||
    patient.chiefComplaint ||
    patient.arrivalReason ||
    ''
  ).trim();
}

function toTriageEngineInput(
  patient: TriageAssistPatientInput,
  context?: TriageAssistBuildContext,
): TriageSuggestionInput {
  return {
    complaintCategory: patient.complaintCategory,
    complaintText: complaintText(patient),
    vitals: (patient.vitals || {}) as TriageVitalsInput,
    overridePriority: context?.overridePriority ?? null,
  };
}

function operationalRationale(context?: TriageAssistOperationalContext): string[] {
  if (!context) return [];
  const lines: string[] = [];
  if (typeof context.triageQueueCount === 'number') {
    lines.push(`${context.triageQueueCount} patient(s) currently awaiting triage.`);
  }
  if (typeof context.emsInboundCount === 'number' && context.emsInboundCount > 0) {
    lines.push(`${context.emsInboundCount} inbound EMS arrival(s) may affect queue placement.`);
  }
  if (context.queuePressure === 'high') {
    lines.push('Queue pressure is elevated — prioritize rapid nurse confirmation.');
  }
  if (context.capacityBand) {
    lines.push(`Department capacity band: ${context.capacityBand}.`);
  }
  return lines;
}

export function buildTriageAssistEnvelope(
  patient: TriageAssistPatientInput,
  context: TriageAssistBuildContext = {},
): TriageAssistEnvelope {
  const ruleResult = suggestTriagePriority(toTriageEngineInput(patient, context));
  const operationalContext = context.operationalContext;
  const oiLines = operationalRationale(operationalContext);
  const rationale = [ruleResult.reason, ...oiLines].filter(Boolean);
  const source: TriageAssistSource = operationalContext ? 'rules+oi' : 'rules';

  return {
    suggestedPriority: ruleResult.suggestedPriority,
    suggestedQueue: mapPriorityToSuggestedQueue(ruleResult.suggestedPriority),
    rationale,
    confidence: ruleResult.confidence,
    ruleTriggered: ruleResult.ruleTriggered,
    disclaimers: [HUMAN_REVIEW_DISCLAIMER],
    requiresHumanReview: true,
    generatedAt: new Date().toISOString(),
    source,
    llmEnrichment: null,
    operationalContext,
    dismissedAt: null,
    acceptedAt: null,
  };
}

export function mergeLlmTriageEnrichment(
  envelope: TriageAssistEnvelope,
  enrichment: TriageAssistLlmEnrichment | null | undefined,
): TriageAssistEnvelope {
  if (!enrichment) return envelope;

  const extraRationale = [
    ...(enrichment.additionalRationale || []),
    enrichment.summary ? `AI summary: ${enrichment.summary}` : '',
  ].filter(Boolean);

  return {
    ...envelope,
    source: 'rules+llm',
    rationale: [...envelope.rationale, ...extraRationale],
    llmEnrichment: enrichment,
    disclaimers: [...envelope.disclaimers, HUMAN_REVIEW_DISCLAIMER],
  };
}

export function patientInputFromEmergencyRecord(patient: {
  complaintCategory?: string;
  chiefComplaint?: string;
  complaint?: string;
  priority?: Priority | string;
  vitals?: Array<Record<string, unknown>> | Record<string, unknown>;
  currentVitals?: Record<string, unknown> | null;
  source?: string;
}): TriageAssistPatientInput {
  const latestVitals = Array.isArray(patient.vitals)
    ? patient.vitals.at(-1)
    : patient.vitals;
  return {
    complaintCategory: patient.complaintCategory,
    complaintText: patient.complaint || patient.chiefComplaint,
    chiefComplaint: patient.chiefComplaint,
    priority: patient.priority,
    vitals: (patient.currentVitals || latestVitals || {}) as Record<string, unknown>,
    source: patient.source,
    arrivalReason: patient.chiefComplaint || patient.complaint,
  };
}
