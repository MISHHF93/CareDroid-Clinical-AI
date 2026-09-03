import type { TriageAssistEnvelope } from '../../lib/patient-orchestration';
import { Priority, type Patient } from '../types/emergency';
import {
  buildNativeAiPatientSnapshot,
  formatRoutingLabel,
  inferTriageFromExpertSystem,
} from './nativeAiCore';
import { NATIVE_AI_TRIAGE_RATIONALE_MARKER } from '../components/ai/AiTruthLabel';

const PRIORITY_RANK: Record<Priority, number> = {
  [Priority.P1]: 1,
  [Priority.P2]: 2,
  [Priority.P3]: 3,
  [Priority.P4]: 4,
  [Priority.P5]: 5,
};

function moreUrgentPriority(left: Priority, right: Priority): Priority {
  return PRIORITY_RANK[left] <= PRIORITY_RANK[right] ? left : right;
}

export function enrichTriageAssistWithNativeAi(
  envelope: TriageAssistEnvelope,
  patient: Patient,
): TriageAssistEnvelope {
  const inference = inferTriageFromExpertSystem(patient);
  const snapshot = buildNativeAiPatientSnapshot(patient);
  const routingLabel = formatRoutingLabel(snapshot.routing);

  const primarySpecialist = snapshot.specialistInferences[0];
  const nativeRationale = [
    ...inference.rationale,
    `${NATIVE_AI_TRIAGE_RATIONALE_MARKER} ${inference.suggestedPriority} (${Math.round(inference.confidence * 100)}% confidence).`,
    `Panel-of-experts routing: ${routingLabel}.`,
    primarySpecialist
      ? `${primarySpecialist.specialistLabel}: ${primarySpecialist.prediction} (${Math.round(primarySpecialist.confidence * 100)}%).`
      : null,
    snapshot.orientation
      ? `Post-ED orientation signal: ${snapshot.orientation.orientation} (${Math.round(snapshot.orientation.confidence * 100)}%).`
      : null,
  ].filter(Boolean) as string[];

  const suggestedPriority = moreUrgentPriority(
    envelope.suggestedPriority,
    inference.suggestedPriority,
  );
  const confidence =
    inference.confidence >= 0.8 || inference.matchedRules.length > 0 ? 'high' : envelope.confidence;

  return {
    ...envelope,
    suggestedPriority,
    rationale: [...envelope.rationale, ...nativeRationale],
    confidence,
    ruleTriggered: inference.matchedRules[0] || envelope.ruleTriggered,
    llmEnrichment: {
      ...(envelope.llmEnrichment || {}),
      additionalRationale: [
        ...(envelope.llmEnrichment?.additionalRationale || []),
        ...nativeRationale,
      ],
    },
  };
}
