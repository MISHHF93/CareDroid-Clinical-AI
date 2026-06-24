import { suggestTriagePriority } from '../../engine/triageEngine';
import {
  buildOperationalScoreEnvelope,
  type CareStreamingLane,
  priorityToEsiLabel,
} from '../config/edOperationalStandards';
import { Priority, type HighRiskComplaintFlagId } from '../types/emergency';

export type SelfArrivalInput = {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  phone?: string;
  complaintText?: string;
  complaintCategory?: string;
  highRiskFlags?: HighRiskComplaintFlagId[];
  vitals?: {
    hr?: number;
    bpSystolic?: number;
    spo2?: number;
    temp?: number;
  };
};

export type SelfArrivalTriageResult = {
  suggestedPriority: Priority;
  esiLabel: string;
  streamingLane: CareStreamingLane;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  humanReviewRequired: true;
  envelope: ReturnType<typeof buildOperationalScoreEnvelope<SelfArrivalTriageResult['summary']>>;
  summary: {
    suggestedPriority: Priority;
    streamingLane: CareStreamingLane;
    esiLabel: string;
  };
};

function mapPriorityToStreamingLane(priority: Priority, complaint: string): CareStreamingLane {
  const normalized = complaint.toLowerCase();
  if (priority === Priority.P1) return 'resus';
  if (priority === Priority.P2) return 'majors';
  if (/\b(minor|laceration|prescription|rash|uti|sprain)\b/.test(normalized)) return 'minors';
  if (priority === Priority.P4 || priority === Priority.P5) return 'utc';
  if (/\b(observation|overnight|social)\b/.test(normalized)) return 'observation';
  if (priority === Priority.P3) return 'fast-track';
  return 'majors';
}

export function suggestSelfArrivalTriage(input: SelfArrivalInput): SelfArrivalTriageResult {
  const triage = suggestTriagePriority({
    complaintCategory: input.complaintCategory,
    complaintText: input.complaintText,
    vitals: input.vitals,
  });

  const highRiskBoost =
    (input.highRiskFlags?.length || 0) > 0 && triage.suggestedPriority === Priority.P4
      ? Priority.P3
      : triage.suggestedPriority;

  const suggestedPriority = highRiskBoost;
  const streamingLane = mapPriorityToStreamingLane(
    suggestedPriority,
    `${input.complaintCategory || ''} ${input.complaintText || ''}`,
  );

  const summary = {
    suggestedPriority,
    streamingLane,
    esiLabel: priorityToEsiLabel(suggestedPriority),
  };

  return {
    suggestedPriority,
    esiLabel: summary.esiLabel,
    streamingLane,
    confidence: triage.confidence,
    reason: triage.reason,
    humanReviewRequired: true,
    summary,
    envelope: buildOperationalScoreEnvelope({
      value: summary,
      maturity: 'partial',
      rationale: [
        triage.reason,
        `Suggested streaming lane: ${streamingLane}`,
        (input.highRiskFlags?.length || 0) > 0
          ? 'High-risk complaint flags present — nurse review required before final acuity.'
          : 'Initial acuity is provisional until nurse triage.',
      ],
      sourceFields: ['complaintText', 'complaintCategory', 'vitals', 'highRiskFlags'],
    }),
  };
}