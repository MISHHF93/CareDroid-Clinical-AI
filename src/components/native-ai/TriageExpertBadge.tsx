import { useMemo } from 'react';
import { PriorityLabel, type Patient } from '../../types/emergency';
import { inferTriageFromExpertSystem } from '../../services/nativeAiCore';
import { AiTruthLabel, fromNativeAiSourceState } from '../ai/AiTruthLabel';
import './TriageExpertBadge.css';

type TriageExpertBadgeProps = {
  patient: Patient;
  compact?: boolean;
  className?: string;
};

export default function TriageExpertBadge({
  patient,
  compact = false,
  className = '',
}: TriageExpertBadgeProps) {
  const inference = useMemo(() => inferTriageFromExpertSystem(patient), [patient]);

  const differsFromAssigned = inference.suggestedPriority !== patient.priority;
  if (!differsFromAssigned && !patient.triagePending) return null;

  const truthLabel = fromNativeAiSourceState(inference.sourceState, {
    sourceContext: 'NLP triage rules engine + baseline acuity heuristic (not a trained model)',
    reviewRequired: inference.requiresHumanReview,
  });

  return (
    <span
      className={[
        'triage-expert-badge',
        compact ? 'triage-expert-badge--compact' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      title={[...inference.rationale, 'Staff confirmation required before assigning acuity.'].join(' ')}
      aria-label={`Suggested triage ${inference.suggestedPriority}, ${Math.round(inference.confidence * 100)} percent confidence, pending review`}
    >
      Suggested triage: {inference.suggestedPriority}
      <small>{PriorityLabel[inference.suggestedPriority] || inference.suggestedPriority}</small>
      <span className="triage-expert-badge__review">pending review</span>
      <AiTruthLabel {...truthLabel} compact />
    </span>
  );
}